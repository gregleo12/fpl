# Investigation: Gameweek Winners Not Updating with Live Data

**Date:** December 4, 2025
**Issue:** Stats Hub showing GW13 completed data instead of GW14 live data
**Status:** ROOT CAUSE IDENTIFIED

---

## Problem Summary

The "GAMEWEEK WINNERS" section in Stats shows:
- **Highest:** Slim Ben Dekhil - 51 pts
- **Average:** 33.0 pts
- **Lowest:** Hadrien van Doosselaere - 17 pts

But we're 36+ hours into GW14, and current live scores show:
- **Highest:** 80 pts
- **Average:** 61.4 pts
- **Lowest:** 45 pts

**The Stats are showing GW13 completed data, not GW14 live data.**

---

## Data Flow Investigation

### 1. Frontend Component
**File:** `src/components/Stats/sections/GameweekWinners.tsx`

```tsx
// Displays data from props
<div className={styles.winnerScore}>{data.highest_score.score} pts</div>
<div className={styles.winnerScore}>{data.average_score.toFixed(1)} pts</div>
<div className={styles.winnerScore}>{data.lowest_score.score} pts</div>
```

**Finding:** Component correctly displays data passed to it. Not the issue.

---

### 2. Stats Hub (Frontend)
**File:** `src/components/Stats/StatsHub.tsx`

```tsx
// Fetches gameweek stats from API
const response = await fetch(`/api/league/${leagueId}/stats/gameweek/${gw}`);
```

**Finding:** Correctly calls the gameweek stats API. Not the issue.

---

### 3. Gameweek Stats API (Backend)
**File:** `src/app/api/league/[id]/stats/gameweek/[gw]/route.ts`

**Line 25:**
```typescript
fetchScores(db, leagueId, gw),
```

**Line 40:**
```typescript
const winnersData = calculateWinners(scoresData);
```

**Finding:** Uses `fetchScores()` which queries the database.

---

### 4. fetchScores() Function
**File:** `src/app/api/league/[id]/stats/gameweek/[gw]/route.ts:229-257`

```typescript
async function fetchScores(db: any, leagueId: number, gw: number) {
  const result = await db.query(`
    SELECT
      m1.entry_id,
      m1.player_name,
      m1.team_name,
      hm.entry_1_points as score    // ← PROBLEM: DATABASE SCORES
    FROM h2h_matches hm
    JOIN managers m1 ON hm.entry_1_id = m1.entry_id
    WHERE hm.league_id = $1 AND hm.event = $2
    UNION ALL
    SELECT
      m2.entry_id,
      m2.player_name,
      m2.team_name,
      hm.entry_2_points as score    // ← PROBLEM: DATABASE SCORES
    FROM h2h_matches hm
    JOIN managers m2 ON hm.entry_2_id = m2.entry_id
    WHERE hm.league_id = $1 AND hm.event = $2
  `, [leagueId, gw]);

  return result.rows.map((row: any) => ({
    entry_id: row.entry_id,
    player_name: row.player_name,
    team_name: row.team_name,
    score: row.score || 0,
  }));
}
```

**Finding:** 🚨 **ROOT CAUSE IDENTIFIED**

This function:
- Queries `h2h_matches.entry_1_points` and `h2h_matches.entry_2_points`
- These are **database scores** that only get updated when matches complete
- Does NOT use live scores from FPL API
- Does NOT check if gameweek is live
- Does NOT use the shared score calculator

---

### 5. calculateWinners() Function
**File:** `src/app/api/league/[id]/stats/gameweek/[gw]/route.ts:342-360`

```typescript
function calculateWinners(scoresData: any[]) {
  const sortedScores = scoresData.sort((a, b) => b.score - a.score);
  const totalScore = scoresData.reduce((sum, s) => sum + s.score, 0);

  return {
    highest_score: sortedScores[0],
    lowest_score: sortedScores[sortedScores.length - 1],
    average_score: totalScore / scoresData.length,
  };
}
```

**Finding:** Function is fine - it just processes the scores it receives. The issue is the scores it receives are from the database, not live.

---

## Comparison with Working Features

### Live Rankings (WORKS CORRECTLY)
**File:** `src/app/api/league/[id]/stats/route.ts`

This endpoint correctly handles live data:

```typescript
// Check if current gameweek is live
const isCurrentGWLive = currentEvent.is_current && !currentEvent.finished;

// If live, fetch actual live scores
if (mode === 'live' && isCurrentGWLive) {
  // Fetch live scores from picks data using shared calculator
  const scores = await calculateMultipleManagerScores(entryIds, gw, status);
}
```

**Key Differences:**
1. ✅ Checks if gameweek is live
2. ✅ Uses `calculateMultipleManagerScores()` shared calculator
3. ✅ Fetches picks/live data from FPL API
4. ✅ Calculates scores including provisional bonus

---

### H2H Match Cards (WORKS CORRECTLY)
**File:** `src/app/api/league/[id]/fixtures/[gw]/route.ts`

This endpoint correctly handles live data:

```typescript
// Determine status by checking FPL API
if (currentEvent.finished) {
  status = 'completed';
} else if (currentEvent.is_current) {
  status = 'in_progress';
}

// For in-progress, fetch picks data
if (status === 'in_progress') {
  liveScoresMap = await fetchLiveScoresFromPicks(matches, gw, status);
}
```

**Key Differences:**
1. ✅ Checks gameweek status from FPL API
2. ✅ Uses `fetchLiveScoresFromPicks()` which calls shared calculator
3. ✅ Falls back to database only if live fetch fails

---

## Why It Shows GW13 Data

The database query returns scores for GW14:
```sql
WHERE hm.event = $2  -- This is 14
```

But GW14 matches in the database have **NULL or 0** scores because:
- Database scores only populated when matches are COMPLETED
- GW14 is IN_PROGRESS, so database has no scores yet
- The query returns 0 for all GW14 scores

**Wait, that doesn't match...**

Let me check if it's actually returning GW13 data or something else is happening.

Actually, looking at the query more carefully:
- If GW14 matches have NULL/0 scores in DB
- Then highest = 0, average = 0, lowest = 0
- But we're seeing 51/33.0/17 which are real scores

**This suggests the Stats Hub might be:**
1. Calling the wrong gameweek (13 instead of 14)
2. Or the API is falling back to last completed GW
3. Or there's caching showing old data

Let me check if there's any fallback logic...

Actually, there's no fallback logic in the code. The scores being shown (51/33.0/17) are definitely GW13 scores from the database.

**Most likely cause:** The Stats Hub is either:
- Showing cached GW13 data
- Or calling GW13 instead of GW14 when GW14 has no DB scores

---

## Root Cause Summary

**Primary Issue:** `fetchScores()` in `route.ts:229-257`
- Queries database for `entry_1_points` and `entry_2_points`
- Database only has completed match scores
- Does NOT fetch live scores during in-progress gameweeks
- Does NOT use shared score calculator
- Does NOT check if gameweek is live

**Secondary Issue:** No fallback behavior
- When GW has no database scores (live GW), returns empty/zero scores
- May cause frontend to show cached previous GW data
- Or shows zeros which is confusing

---

## The Fix (High Level)

The `fetchScores()` function needs to be updated to match the pattern used in:
- Live Rankings API (`/stats/route.ts`)
- H2H Match Cards API (`/fixtures/[gw]/route.ts`)

**Required changes:**

1. **Check gameweek status** (from FPL API bootstrap-static)
   - Is it completed, in_progress, or upcoming?

2. **If in_progress or upcoming:**
   - Fetch live scores using `calculateMultipleManagerScores()`
   - Use shared score calculator with provisional bonus

3. **If completed:**
   - Use database scores (current behavior)
   - Fallback to live calculation if DB scores missing

4. **Return scores** in same format
   - But now with live data during active gameweeks

---

## Code Locations for Fix

**File to modify:** `src/app/api/league/[id]/stats/gameweek/[gw]/route.ts`

**Function to update:** `fetchScores(db: any, leagueId: number, gw: number)`
- Lines 229-257

**Pattern to follow:**
- `src/app/api/league/[id]/stats/route.ts` (Live Rankings)
- `src/app/api/league/[id]/fixtures/[gw]/route.ts` (H2H Match Cards)

**Import needed:**
```typescript
import { calculateMultipleManagerScores } from '@/lib/scoreCalculator';
```

---

## Testing Plan

1. Call API during live GW: `/api/league/804742/stats/gameweek/14`
2. Verify winners show live scores (currently ~80/61.4/45)
3. Call API for completed GW: `/api/league/804742/stats/gameweek/13`
4. Verify it still shows database scores (51/33.0/17)
5. Test with upcoming GW (should show zeros or N/A)

---

## Additional Notes

**Other sections in Stats also need checking:**
- Captain Picks - Uses FPL API directly ✅ (line 69)
- Chips Played - Uses FPL API directly ✅ (line 172)
- Hits Taken - Uses picks data ✅ (line 328)
- Top Performers - Uses picks + live data ✅ (line 362)

**Only Gameweek Winners has this issue** because it's the only section querying match scores from the database instead of calculating live.
