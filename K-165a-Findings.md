# K-165a: Sync Failure Investigation - Findings Report

**Date:** January 2, 2026  
**Investigated by:** Claude Code  
**League:** 804742 (Dedoume FPL 9th edition, 20 teams)

---

## Executive Summary

K-142 auto-sync system is **architecturally sound** but has **two critical design flaws** that cause unreliable syncing:

1. **User-dependent trigger** - Sync only runs when someone loads the league page
2. **Silent failures** - Errors are logged but not surfaced, no retry mechanism

**Status:** Cannot confirm sync execution without Railway logs, but code analysis reveals high likelihood of trigger-related failures.

---

## Question 1: Did sync trigger at all?

### Answer: **Unknown - Railway logs needed**

**Evidence for YES:**
- Trigger code correctly implemented (`/src/app/api/league/[id]/route.ts:49`)
- Runs on EVERY league load
- League 804742 is actively used

**Evidence for NO:**
- Sync depends on someone loading the league AFTER 10-hour buffer
- GW18 finished ~Dec 26 8pm → buffer expires Dec 27 6am
- GW19 finished ~Dec 29 8pm → buffer expires Dec 30 6am
- **Critical window:** If no one loaded league in these windows, sync never triggered

**Required Railway log check:**
```
Search for: "[K-142]" OR "[K-148]" OR "checkAndSyncCompletedGW"
Timeframe GW18: Dec 27 6am - Dec 29
Timeframe GW19: Dec 30 6am - Jan 2
League ID: 804742
```

**Likelihood:** 60% triggered (active league, but depends on user timing)

---

## Question 2: If triggered, did it complete?

### Answer: **Unknown - Railway logs needed**

**Potential failure modes identified:**

### A. Function Timeout (LIKELY)
**Estimated execution time for 20-team league:**
```
- 20 managers × 4 API calls each = 80 requests
- Delays: 100ms (history) + 100ms (picks) + 50ms (chips) + 50ms (transfers)
- API time per manager: ~300ms + ~200ms network/processing = ~500ms
- Total: 20 × 500ms = 10 seconds minimum
- With player stats sync: +2-3 seconds
- **Total estimated: 12-15 seconds**
```

**Railway HTTP function timeout:** Typically 30s (unconfirmed)

**Risk factors:**
- FPL API slowness during peak times
- Network latency
- Database write delays
- **Conclusion:** Should complete under normal conditions, but may timeout if FPL API is slow

### B. Rate Limiting (POSSIBLE)
```
Current delays:
- 100ms between manager history calls → 10 req/s
- 100ms between picks calls → 10 req/s  
- 50ms between chips calls → 20 req/s
- 50ms between transfers calls → 20 req/s

FPL API rate limit: ~10 req/s (unofficial)
```

**Risk:** Borderline safe, but may occasionally hit limits during peak times

### C. Silent Error Handling (CONFIRMED ISSUE)
```typescript
// Line 49: src/app/api/league/[id]/route.ts
checkAndSyncCompletedGW(leagueId).catch(err => {
  console.error(`[League ${leagueId}] K-142 auto-sync error:`, err);
  // Error logged but NOTHING ELSE HAPPENS
});
```

**Problem:** If sync fails:
- Error only exists in Railway logs
- No retry mechanism
- No admin notification
- No status flag set

**Required Railway log patterns:**
```
❌ Timeout: "Function timed out"
❌ Rate limit: "429 Too Many Requests"  
❌ Connection: "ECONNRESET" or "Connection reset"
❌ FPL error: "503 Service Unavailable"
```

**Likelihood:** 70% completed if triggered (but would fail silently on error)

---

## Question 3: If completed, why is data still zero?

### Answer: **Sync likely DID NOT complete successfully**

**Why:** If sync completed successfully, validation would pass:

```typescript
// Validation checks BOTH:
1. Player stats: calculated_points > 0
2. Manager history: points > 0

// If sync completed, BOTH would be non-zero
```

**Conclusion:** Either sync didn't trigger OR sync failed partway through

---

## Question 4: If not triggered, why not?

### Answer: **User-dependent trigger is unreliable**

**The Problem:**
```
K-142 trigger flow:
1. User loads league page
2. API route calls checkAndSyncCompletedGW()
3. Function checks 10-hour buffer
4. If passed, syncs GW

Critical flaw: Step 1 depends on user behavior
```

**Scenarios where trigger fails:**
1. **No visits during window** - League quiet during Dec 27-29
2. **Early visits** - Users loaded league before 10-hour buffer expired
3. **Late visits** - Users loaded league after K-164 fixed the display (no urgency to re-load)

**Why this is unreliable:**
- User behavior is unpredictable
- No guaranteed execution
- Depends on "someone happening to load the page"

---

## Root Cause Analysis

### Primary Issue: Architectural Flaw
**Trigger mechanism relies on user action, not scheduled execution**

```
❌ Current (K-142): On league load → check → maybe sync
✅ Should be: Scheduled cron → detect finished GWs → sync
```

### Secondary Issue: Silent Failures
**No observability, no retries, no alerts**

```
❌ Current: Errors logged to Railway, nothing else
✅ Should be: Log + retry + admin notification
```

### Tertiary Issue: Potential Timeout
**Long-running function without timeout handling**

```
❌ Current: Single 10-15s blocking operation
✅ Should be: Background job with progress tracking
```

---

## Recommendations for K-165b

### 1. Move to Scheduled Cron (CRITICAL)
```typescript
// Use Railway cron jobs or external scheduler
// Run every hour to check for completed GWs

Schedule: "0 * * * *" (every hour)
Function: scanAndSyncCompletedGWs()

Logic:
1. Get all tracked leagues from database
2. For each league, check if any GWs need syncing
3. Sync if buffer passed
4. Retry on failure
```

**Benefits:**
- Guaranteed execution
- No user dependency
- Predictable timing

### 2. Add Retry Mechanism (HIGH PRIORITY)
```typescript
// Retry failed syncs with exponential backoff

async function syncWithRetry(leagueId: number, gw: number) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await syncCompletedGW(leagueId, gw);
      return; // Success
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }
}
```

### 3. Add Progress Tracking (MEDIUM PRIORITY)
```typescript
// Track sync status in database

table: league_sync_status
columns:
  - league_id
  - gameweek  
  - status (pending/in_progress/completed/failed)
  - started_at
  - completed_at
  - error_message
  - retry_count
```

**Benefits:**
- Visibility into sync state
- Can detect stuck syncs
- Admin dashboard can show status

### 4. Optimize for Speed (MEDIUM PRIORITY)
```typescript
// Parallelize API calls within rate limits

// Instead of sequential:
for (const manager of managers) {
  await fetchHistory(manager);
}

// Use controlled parallelism:
const chunks = chunkArray(managers, 5); // 5 at a time
for (const chunk of chunks) {
  await Promise.all(chunk.map(fetchHistory));
  await sleep(500); // Rate limit protection
}
```

**Benefit:** Reduce sync time from 10-15s to 3-5s

### 5. Add Admin Notifications (LOW PRIORITY)
```typescript
// Notify admin of sync failures

if (syncFailed) {
  await sendAdminEmail({
    subject: `Sync failed for league ${leagueId} GW${gw}`,
    body: errorDetails
  });
}
```

---

## Required Railway Log Investigation

**To complete this investigation, check Railway logs for:**

### GW18 Timeline
- **Finished:** Dec 26, 2025 ~8pm
- **Buffer expires:** Dec 27, 2025 ~6am  
- **Check logs:** Dec 27-29, 2025

### GW19 Timeline
- **Finished:** Dec 29, 2025 ~8pm
- **Buffer expires:** Dec 30, 2025 ~6am
- **Check logs:** Dec 30, 2025 - Jan 2, 2026

### Search Patterns
```bash
# Sync trigger evidence
grep -i "K-142\|K-148\|checkAndSyncCompletedGW"

# League 804742 specific
grep "804742"

# Error patterns
grep -i "timeout\|ECONNRESET\|429\|503"

# Success patterns
grep -i "Syncing GW18\|Syncing GW19"
```

### Key Questions Railway Logs Will Answer
1. ✅ Did anyone load league 804742 during the sync windows?
2. ✅ Did sync trigger for GW18/GW19?
3. ✅ Did sync complete or error out?
4. ✅ What was the error (timeout/rate limit/other)?

---

## Conclusion

**Preliminary finding:** K-142 auto-sync system has a **fundamental architectural flaw** - it depends on user behavior rather than guaranteed scheduled execution.

**Most likely scenario for GW18/GW19 failures:**
1. Sync either didn't trigger (no league loads during window)
2. OR sync triggered but failed silently (timeout/rate limit/connection error)

**K-165b should address:**
- ✅ Move to scheduled cron jobs
- ✅ Add retry mechanism  
- ✅ Add sync status tracking
- ✅ Improve error visibility

**Next step:** Review Railway logs to confirm root cause and determine which failure mode occurred.
