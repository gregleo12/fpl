# K-111: Data Pipeline K-108c Compatibility Audit

**Date:** December 23, 2025
**Auditor:** Claude Code
**Priority:** 🔴 **CRITICAL - Production Blocker**

---

## Executive Summary

⚠️ **CRITICAL FINDING:** The current data sync pipeline does **NOT** populate K-108c data (`player_gameweek_stats.calculated_points`) during standard league syncs.

**Impact:**
- First-time league loads: ❌ Missing K-108c data
- Settings sync button: ❌ Missing K-108c data
- Quick sync: ❌ Missing K-108c data
- New GW completion: ❌ Missing K-108c data

**K-108c endpoints will FAIL** for any league that hasn't had manual K-108 sync run via `npm run sync:player-gw-stats`.

---

## 1. Sync Mechanism Inventory

### 1.1 User-Facing Sync Entry Points

| Entry Point | API Route | Function Called | K-108c Compatible? |
|-------------|-----------|-----------------|-------------------|
| **First-time league setup** | `/api/league/[id]/sync` (POST) | `syncLeagueData()` | ❌ **NO** |
| **Settings sync button** | `/api/league/[id]/sync` (POST) | `syncLeagueData()` | ❌ **NO** |
| **Quick sync** | `/api/league/[id]/quick-sync` (POST) | `syncMissingGWs()` | ❌ **NO** |
| **Admin player sync** | `/api/admin/sync/players` (POST) | `syncPlayers()` + `syncPlayerHistory()` | ⚠️ **PARTIAL** (no calculated_points) |

### 1.2 Manual Sync Scripts

| Script | Command | Tables Updated | K-108c Compatible? |
|--------|---------|----------------|-------------------|
| **K-108 Sync** | `npm run sync:player-gw-stats` | `player_gameweek_stats` (with calculated_points) | ✅ **YES** |
| Manager History | `npm run sync:manager-history` | `manager_gw_history` | N/A (manager data) |
| Manager Picks | `npm run sync:manager-picks` | `manager_picks` | N/A (manager data) |
| Manager Chips | `npm run sync:manager-chips` | `manager_chips` | N/A (manager data) |
| Manager Transfers | `npm run sync:manager-transfers` | `manager_transfers` | N/A (manager data) |
| PL Fixtures | `npm run sync:pl-fixtures` | `pl_fixtures` | N/A (fixture data) |

### 1.3 No Automated Syncs Found

**Result:** No cron jobs, scheduled tasks, or automated sync mechanisms found in codebase.

**Implication:** All syncs must be manually triggered by user or admin.

---

## 2. Analysis: `syncLeagueData()` (Main League Sync)

**File:** `src/lib/leagueSync.ts:311-413`

### What It Does

1. ✅ Updates `sync_status` to 'syncing'
2. ✅ Syncs PL fixtures (`syncPLFixtures()`)
3. ✅ Optionally clears old data if `forceClear=true`
4. ✅ Syncs each manager via `syncManagerData()`:
   - `manager_chips`
   - `manager_transfers`
   - `manager_gw_history`
   - `manager_picks`
   - `entry_captains`
5. ✅ Updates `sync_status` to 'completed'

### What It DOESN'T Do

❌ **Does NOT sync `player_gameweek_stats.calculated_points`**
❌ **Does NOT call K-108 sync script**
❌ **Does NOT populate K-108c data**

### K-108c Compatibility

**Status:** ❌ **INCOMPATIBLE**

---

## 3. Analysis: `syncMissingGWs()` (Quick Sync)

**File:** `src/lib/leagueSync.ts:103-285`

### What It Does

1. ✅ Checks for missing gameweeks
2. ✅ Syncs only missing GWs (incremental)
3. ✅ Updates same tables as `syncLeagueData()`

### K-108c Compatibility

**Status:** ❌ **INCOMPATIBLE** (same issue as main sync)

---

## 4. Analysis: K-108 Sync Script

**File:** `src/scripts/sync-player-gw-stats.ts`

### What It Does

✅ **ONLY** K-108 sync mechanism in the codebase:

1. Fetches bootstrap-static for all players
2. Fetches live data for each GW
3. Calculates points using `pointsCalculator.ts`
4. Populates `player_gameweek_stats.calculated_points`
5. Populates `player_gameweek_stats.points_breakdown`
6. Verifies calculated vs FPL points (logs mismatches)

### Usage

```bash
npm run sync:player-gw-stats        # All completed GWs
npm run sync:player-gw-stats 17     # Only GW17
```

### K-108c Compatibility

**Status:** ✅ **FULLY COMPATIBLE** (this IS K-108c!)

**Problem:** Must be run **manually** - not called by any user-facing sync!

---

## 5. New Gameweek Data Flow (Current State)

### Scenario: GW18 Completes (Dec 26)

**Current flow:**

1. ❌ User clicks "Sync" in Settings
2. ❌ `syncLeagueData()` runs
3. ✅ Syncs manager data (picks, history, chips, transfers)
4. ❌ **Does NOT sync player_gameweek_stats.calculated_points**
5. ❌ K-108c endpoints return 0 points for all players
6. ❌ App shows wrong scores

**Missing step:** Manual run of `npm run sync:player-gw-stats 18` required!

---

## 6. Gap Analysis

### 6.1 First-Time League Loading

**Flow:**
1. User enters league ID in setup
2. API: `/api/league/[id]/sync` (POST)
3. Function: `syncLeagueData()`
4. **Result:** ❌ Manager data synced, K-108c data MISSING

**Impact:** New users get NO player points data for any GW!

### 6.2 Settings Sync Button

**Flow:**
1. User clicks "Sync" in Settings
2. API: `/api/league/[id]/sync` (POST)
3. Function: `syncLeagueData()`
4. **Result:** ❌ Same issue as first-time load

**Impact:** Sync button does NOT update player points!

### 6.3 Quick Sync (Missing GWs)

**Flow:**
1. API: `/api/league/[id]/quick-sync` (POST)
2. Function: `syncMissingGWs()`
3. **Result:** ❌ Syncs manager data only, K-108c missing

**Impact:** Incremental sync doesn't help with K-108c!

### 6.4 New Gameweek Completion

**Current state:** ❌ **NO AUTOMATED SYNC**

**Required actions after each GW:**
1. Admin must manually run: `npm run sync:player-gw-stats [gw]`
2. Users can then click sync to get manager data
3. K-108c endpoints will work (after step 1)

**Impact:** Production app will show wrong scores until admin runs manual sync!

---

## 7. Critical Findings Summary

| Finding | Severity | Impact |
|---------|----------|--------|
| League sync doesn't call K-108 sync | 🔴 **CRITICAL** | Users get wrong points |
| No automated K-108 sync | 🔴 **CRITICAL** | Admin must manually sync after each GW |
| Quick sync doesn't include K-108 | 🔴 **CRITICAL** | Incremental sync incomplete |
| First-time load missing K-108 data | 🔴 **CRITICAL** | New leagues broken |
| K-108 sync is separate script | 🔴 **CRITICAL** | Disconnected from user flows |

---

## 8. Recommended Fixes

### Option A: Integrate K-108 Sync into League Sync (Recommended)

**File:** `src/lib/leagueSync.ts`

**Change:** Add K-108 sync call to `syncManagerData()`:

```typescript
// After syncing picks for each GW (line 572)
console.log(`[Sync] Manager ${entryId} completed`);

// NEW: Sync K-108 data for all gameweeks
console.log(`[Sync] Syncing K-108 player stats for completed GWs...`);
await syncPlayerGameweekStats(gameweeks); // Import from sync-player-gw-stats
```

**Pros:**
- ✅ Single sync button does everything
- ✅ First-time load gets K-108 data
- ✅ No manual intervention needed

**Cons:**
- ⚠️ Slower sync (adds ~10-30s for K-108 calculation)
- ⚠️ More FPL API calls (rate limiting concern)

---

### Option B: Separate "Sync Player Stats" Button

**UI:** Add second button in Settings: "Sync Player Stats (K-108)"

**API:** Create `/api/admin/sync/player-stats/[gw]`

**Pros:**
- ✅ User has control
- ✅ Can sync player stats independently
- ✅ Less load on standard sync

**Cons:**
- ❌ User confusion (two sync buttons?)
- ❌ Users might forget to sync player stats
- ❌ Data consistency issues

---

### Option C: Automated Daily K-108 Sync (Vercel Cron)

**Setup:** Vercel Cron job runs daily after GW completion

**Endpoint:** `/api/cron/sync-player-stats` (protected)

**Pros:**
- ✅ Fully automated
- ✅ Users don't need to think about it
- ✅ Consistent data

**Cons:**
- ⚠️ Requires Vercel Pro plan (cron jobs)
- ⚠️ Timing issues (when does GW "finish"?)
- ⚠️ Fails silently if cron doesn't run

---

## 9. Decision Matrix

| Option | User Experience | Admin Effort | Data Consistency | Implementation Cost |
|--------|----------------|--------------|------------------|-------------------|
| **A: Integrate K-108** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔨 **Medium** |
| B: Separate Button | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 🔨🔨 Low |
| C: Automated Cron | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🔨🔨🔨 High |

---

## 10. Production Deployment Blocker

⚠️ **CANNOT DEPLOY TO PRODUCTION** until one of these is implemented:

1. ✅ Option A: Integrate K-108 into league sync (Recommended)
2. ✅ Option B: Add separate sync button + admin process
3. ✅ Option C: Setup automated cron job

**Current state:** Production users will see WRONG SCORES because K-108c data won't exist!

---

## 11. Immediate Action Items

- [ ] **Decision:** Choose Option A, B, or C
- [ ] **Implementation:** Code the chosen solution
- [ ] **Testing:** Verify K-108c data populated on sync
- [ ] **Documentation:** Update user guide on how to sync
- [ ] **Deployment:** Deploy to staging first
- [ ] **Verification:** Test full sync flow end-to-end
- [ ] **Production:** Only then deploy to production

---

## 12. Files Referenced

| File | Purpose |
|------|---------|
| `src/lib/leagueSync.ts` | Main league sync logic |
| `src/app/api/league/[id]/sync/route.ts` | League sync API endpoint |
| `src/app/api/league/[id]/quick-sync/route.ts` | Quick sync API endpoint |
| `src/scripts/sync-player-gw-stats.ts` | K-108 sync script (manual) |
| `src/lib/sync/playerSync.ts` | Player bootstrap sync |

---

## Conclusion

**The K-108c system is NOT integrated with the user-facing data sync pipeline.**

This is a **critical production blocker** that must be resolved before deployment.

**Recommendation:** Implement Option A (integrate K-108 into league sync) for best user experience and data consistency.

---

**Audit completed:** December 23, 2025
**Next steps:** Implement recommended fix
