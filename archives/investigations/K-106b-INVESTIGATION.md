# K-106b: Investigate H2H Card -2pt Discrepancy

**Status:** In Progress - Debug Logging Added, Awaiting K-106a Deployment
**Date Started:** December 23, 2025
**Priority:** HIGH

---

## Problem Summary

H2H fixture cards showing -2pt discrepancy for GW17:
- **Greg** (entry_id: 5293769): Shows 95 instead of 97 (-2)
- **Guillaume** (entry_id: 5229266): Shows 88 instead of 90 (-2)

Both managers consistently showing 2 points lower than official FPL totals.

---

## Investigation Steps Completed

### 1. Examined H2H Fixtures Endpoint
**File:** `src/app/api/league/[id]/fixtures/[gw]/route.ts`

**Finding:** ✅ Correctly uses core scoreCalculator
- Line 186-235: `fetchLiveScoresFromPicks()` calls `calculateMultipleManagerScores()`
- Line 105-153: Formats matches using scores from calculator
- **Conclusion:** H2H endpoint is using the correct unified architecture

### 2. Reviewed Completed GW Score Calculation
**File:** `src/lib/scoreCalculator.ts`

**Finding:** ✅ Uses official FPL points for completed GWs
- Lines 374-412: `calculateScoreFromData()` for completed GWs
- Uses `picksData.entry_history.points` (official FPL score)
- Subtracts `event_transfers_cost` to get NET score
- **Conclusion:** Core logic appears correct

### 3. Added Comprehensive Debug Logging
**File:** `src/lib/scoreCalculator.ts` (lines 380-396)

Added detailed logging for completed GW calculations:
```typescript
// K-106b: Debug logging to investigate -2pt discrepancy
console.log(`[K-106b DEBUG] Entry ${entryId} GW${gw} (COMPLETED):`);
console.log(`[K-106b DEBUG] - Official Points (GROSS): ${officialPoints}`);
console.log(`[K-106b DEBUG] - Transfer Cost: ${transferCost}`);
console.log(`[K-106b DEBUG] - Final Score (NET): ${finalScore}`);
console.log(`[K-106b DEBUG] - Data Source: ${picksData.entry_history ? 'entry_history' : 'FALLBACK TO 0'}`);
console.log(`[K-106b DEBUG] - Active Chip: ${activeChip || 'none'}`);

// Squad composition verification
console.log(`[K-106b DEBUG] - Starting XI total (raw): ${squadTotal}`);
console.log(`[K-106b DEBUG] - Bench total (raw): ${benchTotal}`);
console.log(`[K-106b DEBUG] - Captain: ${captain?.name || 'none'} (×${captain?.multiplier || 1})`);
```

**Purpose:** This will reveal:
- Exact official points from FPL API
- Transfer cost being applied
- Final calculated score
- Whether data is coming from entry_history or falling back to 0
- Active chip status
- Squad composition and captain info

---

## Next Steps

### 1. ⏳ Wait for K-106a Deployment
**Dependency:** K-106a must be deployed to staging/production first
- K-106a fixes provisional bonus being added to completed GWs
- The -2pt issue might be related to the bonus bug
- Need to verify if issue persists after K-106a is live

### 2. Test with Real GW17 Data
**After K-106a is deployed:**
- Navigate to league 804742 H2H fixtures for GW17
- Check if Greg still shows 95 (should be 97)
- Check if Guillaume still shows 88 (should be 90)
- Review Railway logs for `[K-106b DEBUG]` entries

### 3. Analyze Debug Output
**Look for patterns in the logs:**
- Is `officialPoints` correct (97 for Greg, 90 for Guillaume)?
- Is `transferCost` being double-deducted?
- Is data coming from `entry_history` or falling back to 0?
- Are captain multipliers correct?
- Do squad totals match expectations?

### 4. Identify Root Cause
**Based on debug output, determine:**
- Transfer cost issue (most likely hypothesis)
- Auto-sub not applied (possible)
- Captain bonus miscalculation (less likely after K-106a)
- Database data stale/incorrect (check sync status)

### 5. Implement Fix
**Once root cause identified:**
- Make targeted fix to scoreCalculator or H2H endpoint
- Add test to prevent regression
- Update VERSION_HISTORY.md
- Commit and deploy

---

## Hypotheses (From Brief)

1. **Transfer cost double-deduction** ⭐ Most likely
   - FPL API `points` field might already be NET (after transfer cost)
   - We might be subtracting transfer cost again
   - Would explain consistent -2pt if both had -1 hit

2. **Auto-subs not applied**
   - Completed GW path might not apply auto-substitutions
   - Would cause incorrect totals

3. **Captain bonus issue** (Less likely after K-106a)
   - If provisional bonus was causing issue, K-106a should fix it
   - Captain multipliers might not be applied correctly

4. **Database data issue**
   - `manager_gw_history` might have incorrect data
   - Last sync might have failed or data corrupted

---

## Files Modified

- `src/lib/scoreCalculator.ts` - Added debug logging (lines 378-396)

---

## Status

✅ **Completed:**
- Examined H2H fixtures endpoint
- Added comprehensive debug logging
- Documented investigation approach
- Build tested successfully

⏳ **Waiting:**
- K-106a deployment to staging/production
- Real GW17 data testing with debug logs

❌ **Blocked:**
- Cannot proceed until K-106a is deployed
- Need live data to see debug output

---

## Related Tasks

- **K-106a**: Fix Provisional Bonus for Completed GWs (MUST deploy first)
- **K-105**: Score Calculation Architecture Investigation (completed)

---

**Last Updated:** December 23, 2025
**Next Action:** Wait for K-106a deployment, then test with real data
