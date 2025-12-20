# GW17 Transfers Bug Investigation Report

**Date:** December 20, 2025
**Reporter:** Greg (User)
**Investigator:** Claude (Sonnet 4.5)
**League ID:** 804742
**Status:** Complete - NO MODIFICATIONS MADE YET

---

## Bug Summary

**Symptoms:**
1. My Team → GW17 Transfers shows **"No transfers made"** (but user made 3 transfers)
2. Settings → Full Re-sync shows **"Sync failed. Please try again."**
3. Settings → Quick Sync says **"✅ Already up to date!"** (but data is stale)
4. Last synced: **18/12/2025, 22:57:50** (2 days ago)

**User's Theory:** "I think this should be API based given it's a live GW and not a completed one." ✅ **CORRECT**

---

## Root Cause

**Primary Issue: League Stuck in 'syncing' Status**

```sql
SELECT sync_status, last_synced FROM leagues WHERE id = 804742;

 sync_status |        last_synced
-------------+----------------------------
 syncing     | 2025-12-18 21:57:50.653058
```

**What Happened:**
1. Full Re-sync was triggered on **Dec 18, 2025 at 21:57:50**
2. Sync process **started** but **never completed or failed**
3. League has been **stuck in 'syncing' status for ~48 hours**
4. All new sync attempts are **blocked** (can't start while already 'syncing')

**Why Transfers Don't Show:**
1. GW17 is a **live gameweek** (started today, Dec 20)
2. `/api/team/[teamId]/transfers` endpoint **queries database only** (line 20-43)
3. Database has **0 GW17 transfers** (sync hasn't run since Dec 18)
4. Endpoint returns empty array → "No transfers made"

---

## Investigation Findings

### 1. FPL API Status

**Current Status:** ✅ **Operational** (as of Dec 20, 2025)

```bash
$ curl https://fantasy.premierleague.com/api/bootstrap-static/
HTTP 200 OK

Current GW: 17
Name: Gameweek 17
Finished: False
Deadline: 2025-12-20T11:00:00Z
```

**Earlier Today:** FPL API was returning **503 "The game is being updated"** during K-58 investigation. It's back online now.

---

### 2. Database State

**GW17 Transfers in Database:**

```sql
SELECT COUNT(*) FROM manager_transfers WHERE league_id = 804742 AND event = 17;

 count
-------
     0
```

**❌ Zero GW17 transfers** - Database is stale, no data for live GW17.

**League Sync Status:**

```sql
SELECT sync_status, last_synced FROM leagues WHERE id = 804742;

 sync_status |        last_synced
-------------+----------------------------
 syncing     | 2025-12-18 21:57:50.653058
```

**❌ Stuck in 'syncing'** - Has been for 48 hours.

---

### 3. Transfers Endpoint Analysis

**File:** `src/app/api/team/[teamId]/transfers/route.ts`

**How It Works:**

```typescript
// Line 19-43: Fetches transfers from DATABASE
const transfersResult = await db.query(`
  SELECT ...
  FROM manager_transfers mt
  WHERE mt.entry_id = $1
  ...
`, [parseInt(teamId)]);

// Line 91: Filters for target GW
const targetGWTransfers = transfers.filter((t: any) => t.event === targetGW);

// Line 192: Returns database results
return NextResponse.json({
  currentGWTransfers: targetGWTransfersWithPoints  // Empty if not in DB!
});
```

**The Problem:**
- For **completed GWs**: Database is correct (synced data)
- For **live GWs**: Database is missing/stale → returns empty

**What It SHOULD Do:**
- For **completed GWs**: Use database (K-27 cache)
- For **live GWs**: Fetch from FPL API directly

**Note:** The endpoint DOES call FPL API for:
- Line 48-56: Bootstrap data (current GW)
- Line 97-117: Player picks/points
- Line 110-132: Live data for points
- Line 160-181: Entry history for hits

But the **source of transfers list** is database only!

---

### 4. Full Re-sync Failure Analysis

**File:** `src/components/Settings/SettingsTab.tsx`

**How Full Re-sync Works:**

```typescript
// Line 95-96: Calls sync endpoint with force=true
const response = await fetch(`/api/league/${state.leagueId}/sync?force=true`, {
  method: 'POST',
});

// Line 110-144: Polls for status every 3 seconds
const statusRes = await fetch(`/api/league/${state.leagueId}/sync`);
const statusData = await statusRes.json();

if (statusData.status === 'completed') {
  // Success!
} else if (statusData.status === 'failed') {
  // Show error
}
```

**File:** `src/app/api/league/[id]/sync/route.ts`

**Sync Prevention When Already Syncing:**

```typescript
// Line 24-38: Check current sync status
const result = await db.query(`
  SELECT sync_status FROM leagues WHERE id = $1
`, [leagueId]);

const currentStatus = result.rows[0]?.sync_status;

// Don't start new sync if already syncing
if (currentStatus === 'syncing') {
  return NextResponse.json({
    status: 'syncing',
    message: 'Sync already in progress'
  });
}
```

**Why It Fails:**
- League status is 'syncing' (stuck)
- New sync requests are **rejected** with "Sync already in progress"
- User sees: **"Sync failed. Please try again."**

---

### 5. Sync Logic Analysis

**File:** `src/lib/leagueSync.ts`

**Sync Process:**

```typescript
// Line 315-318: Mark as syncing
await db.query(`
  UPDATE leagues SET sync_status = 'syncing' WHERE id = $1
`, [leagueId]);

// Line 322-384: Sync all data (PL fixtures, managers, transfers, picks, etc.)
await syncPLFixtures(db);
for (const entryId of managerIds) {
  await syncManagerData(db, leagueId, entryId, completedGWs, bootstrap);
}

// Line 387-391: Mark as completed
await db.query(`
  UPDATE leagues
  SET sync_status = 'completed', last_synced = NOW()
  WHERE id = $1
`, [leagueId]);

// Line 395-400: Catch errors and mark as failed
} catch (error) {
  console.error(`[Sync] League ${leagueId} sync failed:`, error);

  await db.query(`
    UPDATE leagues SET sync_status = 'failed' WHERE id = $1
  `, [leagueId]);
}
```

**Why Status Got Stuck:**

The sync started on Dec 18 but never reached:
- Line 389 (completion), OR
- Line 399 (failure)

**Possible Causes:**
1. **Railway container restart** - Mid-sync, process killed, status never updated
2. **Database connection lost** - Query failed, never reached error handler
3. **FPL API 503 error** - During gameweek transition, caused timeout/hang
4. **Uncaught exception** - Outside try/catch block
5. **Process crash** - Out of memory, killed by OS

**Evidence:** FPL was updating on Dec 18-19 (GW16→GW17 transition), likely returned 503 errors during sync.

---

### 6. Quick Sync Analysis

**File:** `src/components/Settings/SettingsTab.tsx`

**How It Works:**

```typescript
// Line 56-58: Calls quick-sync endpoint
const response = await fetch(`/api/league/${state.leagueId}/quick-sync`, {
  method: 'POST',
});

const result = await response.json();

if (result.synced.length === 0) {
  setQuickSyncResult('✅ Already up to date!');  // User sees this
}
```

**Why It Says "Already up to date":**
- Quick sync checks for **missing completed GWs** in database
- GW17 is **not finished** yet (live GW)
- Quick sync only syncs **completed GWs**
- Database has GW1-16 → Quick sync thinks it's up to date

**The Issue:** Quick sync doesn't handle live/in-progress gameweeks.

---

## Timeline of Events

| Date/Time | Event | Impact |
|-----------|-------|--------|
| **Dec 18, 21:57:50** | Full Re-sync triggered | League status → 'syncing' |
| **Dec 18, ~22:00** | Sync process starts | Fetching from FPL API |
| **Dec 18-19** | **GW16→GW17 transition** | **FPL API likely down (503)** |
| **Dec 18, 22:00+** | Sync never completes | Status stuck at 'syncing' |
| **Dec 20, 11:00** | GW17 deadline passes | Live GW starts |
| **Dec 20** | User makes 3 transfers | Only in FPL, not in database |
| **Dec 20** | User tries Full Re-sync | **Blocked** - "already syncing" |
| **Dec 20** | User checks GW Transfers | **Empty** - database has no GW17 data |

---

## Why User's Theory Is Correct

**User said:** "I think this should be API based given it's a live GW and not a completed one."

**Analysis:** ✅ **100% CORRECT**

**CLAUDE.md K-27 Data Source Rules:**

```markdown
| Gameweek Status | Data Source |
|-----------------|-------------|
| Completed | Use database tables (K-27 cache) |
| Live / In Progress | Use FPL API |
| Upcoming | Use FPL API |
```

**Current Implementation:**
- `/api/team/[teamId]/transfers` **always uses database**
- For live GWs, database is stale/missing
- Result: Wrong data shown

**Correct Implementation:**
- Check if GW is completed
- If completed → use database (fast, cached)
- If live/upcoming → use FPL API (accurate, real-time)

---

## Immediate Fix Required

### Fix #1: Unstuck the League (URGENT)

**Manually set sync status to 'failed' to allow new syncs:**

```sql
UPDATE leagues SET sync_status = 'failed' WHERE id = 804742;
```

**Then user can trigger Full Re-sync again** (should work now that FPL API is back online).

---

### Fix #2: Live GW Transfers Data Source (Root Fix)

**File:** `src/app/api/team/[teamId]/transfers/route.ts`

**Current Logic:**
```typescript
// ALWAYS queries database
const transfersResult = await db.query(`
  SELECT ... FROM manager_transfers WHERE entry_id = $1
`, [teamId]);
```

**Should Be:**
```typescript
// Check if target GW is completed
const bootstrapRes = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
const bootstrap = await bootstrapRes.json();
const targetGWEvent = bootstrap.events.find((e: any) => e.id === targetGW);
const isCompleted = targetGWEvent?.finished || false;

let transfers;
if (isCompleted) {
  // Use database for completed GWs (K-27 cache)
  transfers = await db.query(`SELECT ... FROM manager_transfers WHERE entry_id = $1`, [teamId]);
} else {
  // Use FPL API for live/upcoming GWs (real-time)
  const transfersRes = await fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/transfers/`);
  const allTransfers = await transfersRes.json();
  transfers = allTransfers.filter((t: any) => t.event === targetGW);
}
```

---

### Fix #3: Sync Robustness (Prevent Future Stuck Status)

**File:** `src/lib/leagueSync.ts`

**Add timeout protection:**

```typescript
export async function syncLeagueData(leagueId: number, forceClear: boolean = false): Promise<void> {
  const db = await getDatabase();

  try {
    // Set a maximum sync duration (e.g., 10 minutes)
    const SYNC_TIMEOUT_MS = 10 * 60 * 1000;
    const syncStartTime = Date.now();

    // Mark as syncing
    await db.query(`UPDATE leagues SET sync_status = 'syncing' WHERE id = $1`, [leagueId]);

    // ... existing sync logic ...

    // Check for timeout
    if (Date.now() - syncStartTime > SYNC_TIMEOUT_MS) {
      throw new Error('Sync timeout - exceeded 10 minutes');
    }

    // Mark as completed
    await db.query(`
      UPDATE leagues SET sync_status = 'completed', last_synced = NOW() WHERE id = $1
    `, [leagueId]);

  } catch (error) {
    console.error(`[Sync] League ${leagueId} sync failed:`, error);

    // ALWAYS set to 'failed' on error
    await db.query(`UPDATE leagues SET sync_status = 'failed' WHERE id = $1`, [leagueId]);
  }
}
```

**Or simpler: Add status check before sync:**

```typescript
// Line 311 in leagueSync.ts
export async function syncLeagueData(leagueId: number, forceClear: boolean = false): Promise<void> {
  const db = await getDatabase();

  try {
    // Reset stuck 'syncing' status if older than 10 minutes
    await db.query(`
      UPDATE leagues
      SET sync_status = 'failed'
      WHERE id = $1
        AND sync_status = 'syncing'
        AND last_synced < NOW() - INTERVAL '10 minutes'
    `, [leagueId]);

    // Now proceed with sync...
```

---

### Fix #4: Better Error Messages

**User saw:** "Sync failed. Please try again."

**Should show:**
- If sync already running: "⏳ Sync in progress. Please wait..."
- If sync stuck (>10 min): "⚠️ Previous sync stuck. Click 'Force Reset' to unstick."
- If FPL API down: "🔄 FPL is updating. Please try again in a few minutes."

---

## Testing Recommendations

### Test #1: Verify Fix #1 (Unstuck League)

```sql
-- 1. Check current status
SELECT sync_status, last_synced FROM leagues WHERE id = 804742;

-- 2. Unstuck it
UPDATE leagues SET sync_status = 'failed' WHERE id = 804742;

-- 3. Verify
SELECT sync_status, last_synced FROM leagues WHERE id = 804742;

-- Expected: sync_status = 'failed'
```

### Test #2: Trigger Full Re-sync

1. In app, go to Settings
2. Click "Full Re-sync"
3. Should start successfully now
4. Wait 30-60 seconds
5. Check if GW17 transfers appear

### Test #3: Verify Live GW Transfers (After Fix #2)

1. In app, go to My Team → GW17
2. Check GW17 TRANSFERS section
3. Should show user's 3 transfers
4. Should fetch from FPL API (not database)

---

## Summary for Greg

**What Happened:**
1. Full Re-sync on Dec 18 got stuck mid-sync (probably due to FPL API being down for GW16→GW17 transition)
2. League status stuck at 'syncing' for 48 hours
3. All new sync attempts blocked ("already syncing")
4. Database missing GW17 data (sync hasn't run since Dec 18)
5. GW Transfers endpoint reads from database → shows empty

**Immediate Fix (Manual):**
```sql
UPDATE leagues SET sync_status = 'failed' WHERE id = 804742;
```
Then trigger Full Re-sync in app.

**Proper Fix (Code):**
1. Change `/api/team/[teamId]/transfers` to use FPL API for live GWs (matches K-27 rules)
2. Add timeout protection to prevent future stuck syncs
3. Better error messages for stuck sync status

**User's Theory:**
✅ Correct - Live GWs should use FPL API, not database.

---

## Next Steps

1. ✅ Report findings to Greg
2. ⏳ Get approval on immediate fix (manual SQL)
3. ⏳ Get approval on code fixes
4. ⏳ Create K-59 brief for Fix #2 (Live GW data source)
5. ⏳ Create K-60 brief for Fix #3 (Sync robustness)

---

**Conclusion:** The bug is well understood. The league is stuck in 'syncing' status, blocking all syncs. The transfers endpoint incorrectly reads from stale database for live GWs instead of fetching from FPL API. Both issues have clear fixes.
