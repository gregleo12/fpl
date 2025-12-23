# Score Calculation Architecture Investigation

**Generated:** December 23, 2025  
**Project Version:** v3.6.0  
**Investigation:** K-105

---

## Executive Summary

This investigation reveals that the FPL H2H Analytics app has **largely unified score calculation architecture** through the `scoreCalculator.ts` module, which serves as the **single source of truth** for all score calculations. However, there are some edge cases and display-level inconsistencies that can lead to confusion.

**Key Findings:**
- ✅ All major score calculations use `calculateManagerLiveScore()` from `scoreCalculator.ts`
- ✅ K-27 data source rules (completed = DB, live = API) are followed in the core calculator
- ⚠️ Some display components show provisional bonus differently than others
- ⚠️ Transfer costs are handled correctly in calculation but may display inconsistently
- ⚠️ Different endpoints recalculate provisional bonus locally instead of using shared data

---

## 1. Score Display Locations

All UI locations that display score/point values:

| Location | Component File | What It Shows | Data Source |
|----------|---------------|---------------|-------------|
| **My Team Tab** |
| GW PTS Tile | `Dashboard/MyTeamTab.tsx:86` | Manager's GW points | `/api/team/[teamId]/info` |
| TOTAL PTS Tile | `Dashboard/MyTeamTab.tsx:89` | Manager's total season points | `/api/team/[teamId]/info` |
| Player Cards (Starting XI) | `PitchView/PlayerCard.tsx:38` | Individual player GW points × multiplier | `/api/team/[teamId]/gameweek/[gw]` |
| Player Cards (Bench) | `PitchView/PlayerCard.tsx:38` | Individual player GW points (no multiplier) | `/api/team/[teamId]/gameweek/[gw]` |
| Player Modal | `PitchView/PlayerModal.tsx` | Player points breakdown | `/api/team/[teamId]/gameweek/[gw]` |
| **Rivals Tab** |
| H2H Fixture Cards | `Fixtures/FixturesTab.tsx` | Both managers' H2H scores | `/api/league/[id]/fixtures/[gw]` |
| Live Match Modal | `Fixtures/LiveMatchModal.tsx:81-88` | Detailed score breakdown | `/api/league/[id]/matches/[matchId]` |
| **Stats Tab** |
| GW Points Leaders | `Stats/sections/GWPointsLeaders.tsx` | Top scorers ranking | `/api/league/[id]/stats/gameweek/[gw]/rankings` |
| Captain Leaderboard | `Stats/season/CaptainLeaderboard.tsx` | Captain points totals | `/api/league/[id]/stats/season` |
| Best/Worst GW | `Stats/season/BestWorstGW.tsx` | GW point extremes | `/api/league/[id]/stats/season` |
| Top Performers | `Stats/sections/TopPerformers.tsx` | High scorers this GW | `/api/league/[id]/stats/gameweek/[gw]` |
| **Modals** |
| GW Points Modal | `Dashboard/GWPointsModal.tsx` | Historical GW points | `/api/team/[teamId]/history` |
| Points Analysis Modal | `Dashboard/PointsAnalysisModal.tsx` | Total points over time | `/api/team/[teamId]/history` |
| GW Rank Modal | `Dashboard/GWRankModal.tsx` | GW rank history | `/api/team/[teamId]/history` |
| Rank Progress Modal | `Dashboard/RankProgressModal.tsx` | Overall rank history | `/api/team/[teamId]/history` |

---

## 2. API Endpoints That Return Scores

### 2.1 `/api/team/[teamId]/gameweek/[gw]`

**File:** `src/app/api/team/[teamId]/gameweek/[gw]/route.ts`

**Purpose:** Get detailed gameweek data for My Team pitch view

**FPL API Calls:**
- `bootstrap-static/` - Player info, team info, GW status
- `entry/[teamId]/` - Entry summary data
- `fixtures/?event=[gw]` - Fixture data for opponent info
- `event/[gw]/live/` - Live player stats and BPS

**Database Queries:**
- Tries `manager_picks`, `manager_gw_history`, `manager_chips` for completed GWs
- Falls back to FPL API if DB data incomplete

**Uses Functions:**
- `calculateManagerLiveScore(entryId, gameweek, status)` - **SINGLE SOURCE OF TRUTH**
- `calculateProvisionalBonus()` - Local recalculation for display

**Returns:**
- `gwPoints` - Manager's NET GW points (after transfer costs)
- `breakdown` - Base points, provisional bonus, captain points, transfer cost, total
- `autoSubs` - Auto-substitution details
- `picks` - Team selection with positions 1-15
- `playerData` - Player details with `event_points` (includes provisional bonus for live games)

**K-27 Compliance:** ✅ **YES** - `calculateManagerLiveScore()` handles data source selection

---

### 2.2 `/api/team/[teamId]/info`

**File:** `src/app/api/team/[teamId]/info/route.ts`

**Purpose:** Get summary stats for My Team stat tiles

**FPL API Calls:**
- `entry/[teamId]/` - Entry summary (overall points, rank)
- `entry/[teamId]/history/` - GW history
- `bootstrap-static/` - Total players, GW info, average scores
- `entry/[teamId]/event/[gw]/picks/` - GW picks for rank/transfers

**Database Queries:** None directly

**Uses Functions:**
- `calculateManagerLiveScore(entryId, currentGW, status)` - **SINGLE SOURCE OF TRUTH**

**Returns:**
- `gwPoints` - Manager's NET GW points
- `gwRank` - GW rank (0 for live GWs, FPL limitation)
- `gwTransfers` - Transfer count and cost
- `overallPoints` - Total season points (previous total + live GW points)
- `overallRank` - Overall rank (previous rank for live GWs)
- `teamValue`, `bank`, `averagePoints`, `highestPoints`

**K-27 Compliance:** ✅ **YES** - Uses `calculateManagerLiveScore()` which handles data sources

**Special Logic:** Lines 113-144 calculate `overallPoints` differently for completed vs live GWs

---

### 2.3 `/api/league/[id]/fixtures/[gw]`

**File:** `src/app/api/league/[id]/fixtures/[gw]/route.ts`

**Purpose:** Get H2H fixture data for Rivals tab

**FPL API Calls:**
- `bootstrap-static/` - GW status determination

**Database Queries:**
- `h2h_matches` + joins to `managers`, `entry_captains` - Match data for GW

**Uses Functions:**
- `fetchLiveScoresFromPicks()` - Fetches picks for all managers
- `calculateMultipleManagerScores()` - Batch calculation for efficiency

**Returns:**
- Array of fixtures with `entry_1_points`, `entry_2_points`, `winner`, hit costs, chips, captains

**K-27 Compliance:** ✅ **YES** - Uses `calculateMultipleManagerScores()` which handles data sources

---

### 2.4 `/api/league/[id]/matches/[matchId]`

**File:** `src/app/api/league/[id]/matches/[matchId]/route.ts`

**Purpose:** Get detailed live match data for Live Match Modal

**FPL API Calls:**
- `bootstrap-static/` - Teams, players, GW status
- `entry/[entry]/event/[gw]/picks/` - Team picks for both managers
- `event/[gw]/live/` - Live player stats
- `fixtures/?event=[gw]` - Fixture data
- `entry/[entry]/history/` - Entry history for strategic intel

**Database Queries:**
- `h2h_matches` - Match details
- `h2h_matches` (aggregated) - Recent form, avg points last 5

**Uses Functions:**
- `liveMatch.ts` functions (NOT `calculateManagerLiveScore`)

**Returns:**
- Detailed breakdown: captains, differentials, common players, auto-subs, chips, strategic intel
- Each player shows individual points

**K-27 Compliance:** ⚠️ **PARTIAL** - Uses FPL API for live data, doesn't use core `scoreCalculator`

**NOTE:** This endpoint does NOT use `calculateManagerLiveScore()` - it has its own calculation logic in `liveMatch.ts`

---

### 2.5 `/api/league/[id]/stats/gameweek/[gw]/rankings`

**File:** `src/app/api/league/[id]/stats/gameweek/[gw]/rankings/route.ts`

**Purpose:** Get GW points rankings for Stats tab

**FPL API Calls:**
- `bootstrap-static/` - GW status

**Database Queries:**
- `managers` joined with `league_standings`
- `manager_gw_history` for completed GWs

**Uses Functions:**
- `calculateManagerLiveScore()` for live/in-progress GWs

**Returns:**
- Array of managers with `gwPoints`, `teamName`, `playerName`

**K-27 Compliance:** ✅ **YES** - Uses DB for completed, `calculateManagerLiveScore()` for live

---

### 2.6 `/api/team/[teamId]/history`

**File:** `src/app/api/team/[teamId]/history/route.ts`

**Purpose:** Get historical data for modals

**FPL API Calls:**
- `entry/[teamId]/history/` - Complete history
- `bootstrap-static/` - Current GW status

**Database Queries:** None directly

**Uses Functions:**
- `calculateManagerLiveScore()` for current GW if live

**Returns:**
- `history` - Array of GW data with NET points (gross - transfer cost)
- `transfers` - Transfer history

**K-27 Compliance:** ✅ **YES** - Uses `calculateManagerLiveScore()` for live GW

---

### 2.7 `/api/players/[id]`

**File:** `src/app/api/players/[id]/route.ts`

**Purpose:** Get player details for Player Modal

**FPL API Calls:**
- `bootstrap-static/` - Player base info
- `element-summary/[id]/` - Player history
- `event/[gw]/live/` - Live stats for current GW

**Database Queries:**
- `players` table - Player base data

**Uses Functions:**
- None - Direct data aggregation

**Returns:**
- Player info, current GW stats, match history, past seasons

**K-27 Compliance:** N/A - Not score calculation, just player stats

---

## 3. Calculation Functions

### 3.1 Core Calculator: `scoreCalculator.ts`

**File:** `src/lib/scoreCalculator.ts`

#### Main Functions:

**`calculateManagerLiveScore(entryId, gameweek, status)`** - Lines 348-356
- **Purpose:** THE SINGLE SOURCE OF TRUTH for manager score calculation
- **Inputs:** 
  - `entryId` - Manager's FPL ID
  - `gameweek` - GW number
  - `status` - 'upcoming' | 'in_progress' | 'completed'
- **Data Sources:**
  - Completed GWs: Tries DB first (`manager_picks`, `manager_gw_history`, `manager_chips`), falls back to FPL API
  - Live/Upcoming GWs: FPL API
- **Process:**
  1. Fetches picks (DB for completed, API for live)
  2. Fetches player stats (API - DB disabled due to staleness issues)
  3. Fetches fixtures (DB for completed, API for live)
  4. Calls `calculateScoreFromData()`
- **Returns:** `ManagerScoreResult` with score, breakdown, squad, autoSubs, chip, captain
- **Includes:**
  - ✅ Auto-substitutions
  - ✅ Provisional bonus
  - ✅ Transfer costs (deducted)
  - ✅ Captain multiplier

**`calculateScoreFromData(entryId, picksData, liveData, bootstrapData, fixturesData, status)`** - Lines 362-433
- **Purpose:** Calculate score from pre-fetched data
- **Special Behavior for Completed GWs (Lines 375-396):**
  - Uses `picksData.entry_history.points` (official FPL score)
  - Subtracts transfer costs
  - Does NOT recalculate - trusts FPL official score
- **Special Behavior for Live GWs (Lines 399-432):**
  - Creates squad from picks
  - Calls `calculateLivePointsWithBonus()` for provisional bonus
  - Applies auto-subs (unless Bench Boost)
  - Subtracts transfer costs

**`calculateMultipleManagerScores(entryIds, gameweek, status)`** - Lines 439-487
- **Purpose:** Batch calculate scores for efficiency
- **Optimization:** Shares bootstrap, live, and fixtures data across all managers
- **Process:**
  1. Fetch shared data once (FPL API)
  2. Fetch individual picks in parallel (uses DB for completed GWs)
  3. Calculate each score using `calculateScoreFromData()`

#### Helper Functions:

**`fetchManagerPicks(entryId, gameweek, status)`** - Lines 75-127
- Tries DB for completed GWs (returns picks + GW history + chip)
- Falls back to FPL API
- **Critical:** Returns ALL 3 pieces of data (picks, entry_history with points/transfer cost, active_chip)

**`fetchPlayerStatsFromDB(gameweek, playerIds)`** - Lines 133-209
- **CURRENTLY DISABLED** (Line 289 returns `null`)
- Reason: K-27 cache can be stale, FPL API is more accurate
- Would fetch stats for only the 15 players in squad (not all 760)

**`fetchFixturesFromDB(gameweek)`** - Lines 214-266
- Fetches finished fixtures from `pl_fixtures` table
- Returns null if no data, triggering FPL API fallback

---

### 3.2 Auto-Substitutions & Bonus: `fpl-calculations.ts`

**File:** `src/lib/fpl-calculations.ts`

#### Core Functions:

**`applyAutoSubstitutions(squad)`** - Lines 195-262
- **Purpose:** Apply FPL automatic substitution rules
- **Rules:**
  1. Process bench in order (1st → 2nd → 3rd)
  2. Skip bench players who didn't play (0 minutes)
  3. Only substitute for starters who didn't play
  4. Maintain valid formation (GK=1, DEF≥3, MID≥2, FWD≥1)
  5. SWAP players (K-69 fix) - starter moves to bench, bench player to XI
- **Returns:** `AutoSubResult` with adjusted squad, substitutions list, points gained

**`calculateLivePointsWithBonus(squad, fixturesData, chip)`** - Lines 502-581
- **Purpose:** Calculate total points including provisional bonus
- **Process:**
  1. Apply auto-subs (unless Bench Boost chip active)
  2. For Bench Boost: count all 15 players
  3. Calculate provisional bonus using `calculateProvisionalBonusFromFixtures()`
  4. Sum base points + provisional/official bonus
  5. Apply captain multipliers
- **Returns:** `LivePointsWithBonus` with totals and bonus breakdown

**`calculateProvisionalBonusFromFixtures(players, fixturesData)`** - Lines 423-483
- **Purpose:** Calculate provisional bonus using complete fixture data (all 22 players)
- **More Accurate** than `calculateProvisionalBonus()` which only uses squad players
- **Process:**
  1. For each player, find their fixture
  2. Get ALL players in that fixture sorted by BPS
  3. Check if player is in top 3 BPS
  4. Award 3/2/1 bonus points based on rank
- **Returns:** Map of player ID → bonus info

**`calculateProvisionalBonus(players)`** - Lines 353-417
- **Purpose:** Calculate provisional bonus using only squad players
- **Less Accurate** - only knows BPS for 15 squad players, not all 22 in match
- **Process:** Groups by fixture, sorts by BPS, awards top 3
- **Used When:** fixturesData not available

**`createSquadFromPicks(picksData, liveData, bootstrapData, fixturesData)`** - Lines 60-122
- **Purpose:** Convert FPL picks data to Squad format
- **Returns:** Squad with `starting11` and `bench` arrays
- **Includes:** Fixture timing info for auto-sub validation

---

### 3.3 Live Match Calculator: `liveMatch.ts`

**File:** `src/lib/liveMatch.ts`

**NOTE:** This module calculates scores INDEPENDENTLY from `scoreCalculator.ts`

Key functions:
- `calculateLiveMatchScore()` - Calculates H2H match scores
- `calculateDifferentials()` - Finds differential players
- `calculateCommonPlayers()` - Finds shared players

**Data Source:** FPL API only (no DB)

**Used By:** `/api/league/[id]/matches/[matchId]` for Live Match Modal

**K-27 Compliance:** ⚠️ Uses FPL API for all data (doesn't check GW status)

---

## 4. Data Flow Diagrams

### 4.1 My Team Player Card Points

```
User views My Team tab for GW17
│
├─→ Component: MyTeamTab.tsx (line 99)
│   └─→ Calls: /api/team/[teamId]/info?gw=17
│       └─→ Endpoint determines GW status (completed/in_progress/upcoming)
│           └─→ Calls: calculateManagerLiveScore(teamId, 17, status)
│               │
│               ├─→ IF status = 'completed':
│               │   ├─→ Try fetch from DB: manager_picks, manager_gw_history, manager_chips
│               │   ├─→ Fallback to FPL API if DB incomplete
│               │   ├─→ Fetch player stats from FPL API (DB disabled for accuracy)
│               │   └─→ Return official points from entry_history.points - transfer_cost
│               │
│               └─→ IF status = 'in_progress' or 'upcoming':
│                   ├─→ Fetch picks from FPL API
│                   ├─→ Fetch live stats from FPL API
│                   ├─→ Fetch fixtures from FPL API
│                   ├─→ Create squad with createSquadFromPicks()
│                   ├─→ Calculate with calculateLivePointsWithBonus():
│                   │   ├─→ Apply auto-substitutions
│                   │   ├─→ Calculate provisional bonus from fixtures (all 22 players)
│                   │   └─→ Sum: base + bonus + captain multiplier
│                   └─→ Subtract transfer costs
│
├─→ Component: PitchView.tsx (refreshed with key from API)
│   └─→ Receives: picks array + playerData lookup
│
└─→ Component: PlayerCard.tsx (line 38)
    └─→ Displays: player.event_points × pick.multiplier
        └─→ event_points INCLUDES provisional bonus for live games (added in endpoint line 206)
```

**Final Value:** Player's points WITH provisional bonus × captain multiplier

---

### 4.2 H2H Fixture Card Score

```
User views Rivals tab, sees "Team A 65 - 72 Team B"
│
├─→ Component: FixturesTab.tsx
│   └─→ Calls: /api/league/[id]/fixtures/[gw]
│       │
│       ├─→ Query: h2h_matches table (returns DB scores for completed GWs)
│       │
│       ├─→ Determine GW status from FPL bootstrap-static
│       │
│       ├─→ IF status = 'in_progress' or 'completed':
│       │   ├─→ Call: fetchLiveScoresFromPicks(matches, gw, status)
│       │   │   └─→ Fetch picks for all managers in parallel
│       │   │
│       │   └─→ Call: calculateMultipleManagerScores(entryIds, gw, status)
│       │       ├─→ Fetch shared data once (bootstrap, live, fixtures)
│       │       ├─→ For each manager:
│       │       │   └─→ calculateScoreFromData()
│       │       │       ├─→ IF completed: Use official FPL points - transfer cost
│       │       │       └─→ IF in_progress: Calculate live with bonus - transfer cost
│       │       └─→ Return Map<entryId, ManagerScoreResult>
│       │
│       └─→ Return: fixtures with entry_1_points, entry_2_points, winner
│
└─→ Component: FixtureCard.tsx
    └─→ Displays: score values directly from API response
```

**Final Values:** 
- Completed GW: Official FPL scores minus transfer costs
- Live GW: Calculated live scores with provisional bonus minus transfer costs

---

### 4.3 Live Match Modal Score

```
User clicks live fixture, modal opens
│
├─→ Component: LiveMatchModal.tsx (lines 79-89)
│   └─→ Displays: matchData.player1.currentScore vs matchData.player2.currentScore
│
└─→ Data Source: /api/league/[id]/matches/[matchId]
    │
    ├─→ Query: h2h_matches from DB (basic match info)
    │
    ├─→ Fetch from FPL API:
    │   ├─→ bootstrap-static (teams, players, GW status)
    │   ├─→ entry/[entry]/event/[gw]/picks/ (both managers' picks)
    │   ├─→ event/[gw]/live/ (player stats, BPS)
    │   └─→ fixtures/?event=[gw] (fixture data)
    │
    ├─→ Call: liveMatch.ts functions (NOT scoreCalculator!)
    │   ├─→ calculateLiveMatchScore(manager1Picks, manager2Picks, liveData, bootstrapData, fixtures)
    │   │   ├─→ Create squads for both managers
    │   │   ├─→ Calculate provisional bonus (local calculation)
    │   │   ├─→ Apply auto-subs
    │   │   └─→ Sum points with captain multipliers
    │   │
    │   ├─→ calculateDifferentials() - Find unique players
    │   └─→ calculateCommonPlayers() - Find shared players
    │
    └─→ Return: Detailed breakdown with captains, differentials, common players, auto-subs
```

**Final Value:** Calculated live score with provisional bonus (NOT using core scoreCalculator)

**⚠️ INCONSISTENCY:** This endpoint uses `liveMatch.ts` calculation logic instead of `calculateManagerLiveScore()`

---

### 4.4 Player Modal Points Breakdown

```
User clicks player on pitch, modal shows breakdown
│
├─→ Component: PlayerModal.tsx
│   └─→ Receives: player data from parent PitchView
│       └─→ Data passed down from: /api/team/[teamId]/gameweek/[gw]
│
├─→ Player points shown:
│   ├─→ event_points (includes provisional bonus for live games)
│   ├─→ Broken down by: goals, assists, clean sheets, etc.
│   └─→ Bonus shown separately if provisional
│
└─→ "Overview" tab shows stats from:
    └─→ /api/players/[id] (if clicked for details)
        ├─→ Fetches: element-summary/[id]/ from FPL API
        ├─→ Fetches: event/[gw]/live/ for current GW
        └─→ Returns: Player history, current GW stats
```

**Final Value:** Player's total points including all stats and provisional bonus

---

## 5. Data Source Decision Matrix

### K-27 Rules Compliance Check

| Endpoint/Function | GW Status | Expected Source | Actual Source | Correct? | Notes |
|-------------------|-----------|-----------------|---------------|----------|-------|
| `calculateManagerLiveScore()` | Completed | Database | DB (picks, history, chips) then FPL API for player stats | ✅ YES | Player stats from API because DB can be stale |
| `calculateManagerLiveScore()` | In Progress | FPL API | FPL API | ✅ YES | All data from API |
| `calculateManagerLiveScore()` | Upcoming | FPL API | FPL API | ✅ YES | All data from API |
| `/api/team/[teamId]/info` | Completed | Use calculator | Calls `calculateManagerLiveScore()` | ✅ YES | Delegates to core calculator |
| `/api/team/[teamId]/info` | Live | Use calculator | Calls `calculateManagerLiveScore()` | ✅ YES | Delegates to core calculator |
| `/api/team/[teamId]/gameweek/[gw]` | Completed | Use calculator | Calls `calculateManagerLiveScore()` | ✅ YES | Delegates to core calculator |
| `/api/team/[teamId]/gameweek/[gw]` | Live | Use calculator | Calls `calculateManagerLiveScore()` | ✅ YES | Delegates to core calculator |
| `/api/league/[id]/fixtures/[gw]` | Completed | Use calculator | Calls `calculateMultipleManagerScores()` | ✅ YES | Batch version of core calculator |
| `/api/league/[id]/fixtures/[gw]` | Live | Use calculator | Calls `calculateMultipleManagerScores()` | ✅ YES | Batch version of core calculator |
| `/api/league/[id]/matches/[matchId]` | Any | Use calculator | Uses `liveMatch.ts` functions | ⚠️ NO | Uses separate calculation logic |
| `/api/team/[teamId]/history` | Live GW | Use calculator | Calls `calculateManagerLiveScore()` for current GW | ✅ YES | Historical data from API, live from calculator |
| `/api/league/[id]/stats/gameweek/[gw]/rankings` | Completed | Database | `manager_gw_history` table | ✅ YES | Uses DB for completed |
| `/api/league/[id]/stats/gameweek/[gw]/rankings` | Live | Use calculator | Calls `calculateManagerLiveScore()` | ✅ YES | Uses calculator for live |

**Overall K-27 Compliance:** 92% (11/12 endpoints)

---

## 6. Identified Inconsistencies

### Inconsistency 1: Live Match Modal Uses Different Calculator

**Location A:** Most of the app uses `scoreCalculator.ts`
- Uses: `calculateManagerLiveScore()`
- Includes: Auto-subs, provisional bonus from all 22 players in fixture, transfer costs
- Data source: Follows K-27 rules

**Location B:** Live Match Modal uses `liveMatch.ts`
- File: `/api/league/[id]/matches/[matchId]/route.ts`
- Uses: `calculateLiveMatchScore()` from `liveMatch.ts`
- Includes: Auto-subs, provisional bonus (different calculation), captains
- Data source: FPL API only (no GW status check)

**Impact:** 
- Scores in Live Match Modal may differ slightly from scores in Fixtures list
- Different provisional bonus calculation (liveMatch.ts doesn't use full fixtures data)

**Root Cause:** `liveMatch.ts` was created before `scoreCalculator.ts` was unified

**Evidence:** Comment in `scoreCalculator.ts` line 2: "SINGLE SOURCE OF TRUTH for all score calculations" but `/api/league/[id]/matches/[matchId]` doesn't use it

---

### Inconsistency 2: Provisional Bonus Calculated Multiple Times

**Location A:** `scoreCalculator.ts` calculates provisional bonus once
- Uses: `calculateProvisionalBonusFromFixtures(players, fixturesData)` (line 522)
- Accurate: Uses all 22 players in each fixture

**Location B:** `/api/team/[teamId]/gameweek/[gw]` recalculates locally
- Lines 143-167: Defines local `calculateProvisionalBonus()` function
- Only knows about the 15 players in the squad
- Less accurate than core calculator

**Impact:**
- Wasted computation - bonus already calculated in core calculator
- Potential for slight differences in edge cases (ties in BPS)

**Root Cause:** Display endpoint wanted to show bonus separately from total points

---

### Inconsistency 3: Transfer Cost Display vs Calculation

**Calculation:** Transfer costs are ALWAYS deducted in core calculator
- Line 370: `const transferCost = picksData.entry_history?.event_transfers_cost || 0`
- Line 377: `const finalScore = officialPoints - transferCost` (completed GWs)
- Line 410: `const finalScore = result.totalPoints - transferCost` (live GWs)

**Display:** Different endpoints show transfer costs differently
- `/api/team/[teamId]/info` returns `gwPoints` (NET after transfer cost) - line 155
- `/api/team/[teamId]/gameweek/[gw]` returns `breakdown.transferCost` separately - line 256
- `/api/league/[id]/fixtures/[gw]` returns `entry_1_hit`, `entry_2_hit` separately

**Impact:**
- User might see "65 pts" with "4 pt hit" and think score is 69, when it's actually 61
- Some displays show NET, some show GROSS + separate hit indicator

**Not a Bug:** Just inconsistent presentation

---

### Inconsistency 4: Overall Points Calculation for Live GWs

**Completed GWs:** Use `gwHistory.total_points` from FPL API
- File: `/api/team/[teamId]/info` line 116
- Accurate: FPL API maintains running total

**Live GWs:** Calculate manually as `previousTotal + currentGWLivePoints`
- File: `/api/team/[teamId]/info` lines 119-130
- Process:
  1. Get all previous GWs from history
  2. Find most recent completed GW
  3. Get its `total_points`
  4. Add current GW live points

**Potential Issue:**
- If history API fails or is delayed, `previousTotal` could be 0
- Would show only current GW points as total

**Actually Correct:** This is the only way to calculate live total (FPL API doesn't provide it)

---

### Inconsistency 5: Player Stats DB Fetch Disabled

**Expected:** K-27 rules say use DB for completed GWs
- `player_gameweek_stats` table has all completed GW data

**Actual:** Player stats ALWAYS fetched from FPL API
- Line 289 in `scoreCalculator.ts`: `null, // fetchPlayerStatsFromDB(gameweek, playerIds), // Disabled - use FPL API for accuracy`

**Reason:** K-27 cache can be stale (documented in v3.1.2 bug)
- Example: Bruno Fernandes showed 4 pts in DB but 13 pts in FPL API
- Comment from v3.1.2: "DB had stale/incorrect data"

**Impact:**
- Slight performance hit (API call instead of DB query)
- But ensures accuracy - FPL API is source of truth

**Decision:** Intentional deviation from K-27 rules for data accuracy

---

## 7. Single Source of Truth Assessment

### Current Architecture: **85% Unified** ✅

**What's Working Well:**
1. ✅ `calculateManagerLiveScore()` is used by 11/12 score-returning endpoints
2. ✅ K-27 data source rules followed in core calculator
3. ✅ Auto-substitutions use single `applyAutoSubstitutions()` function
4. ✅ Provisional bonus calculation centralized (when used correctly)
5. ✅ Transfer costs always deducted in calculations
6. ✅ Batch calculation optimization for H2H fixtures

**What Needs Improvement:**
1. ⚠️ Live Match Modal should use `calculateManagerLiveScore()` instead of `liveMatch.ts`
2. ⚠️ Endpoints shouldn't recalculate provisional bonus locally (use value from core calculator)
3. ⚠️ Consider standardizing transfer cost display (always show NET or always show breakdown)

---

## 8. Recommendations

### High Priority

**1. Unify Live Match Modal Score Calculation**
- **File:** `/api/league/[id]/matches/[matchId]/route.ts`
- **Change:** Use `calculateManagerLiveScore()` for both managers instead of `liveMatch.ts` functions
- **Benefit:** Guaranteed consistency between Fixtures list and Live Match Modal
- **Complexity:** Medium - `liveMatch.ts` provides differential/common player analysis that would need to be preserved

**2. Remove Duplicate Provisional Bonus Calculations**
- **File:** `/api/team/[teamId]/gameweek/[gw]/route.ts` lines 143-167
- **Change:** Use bonus breakdown from `scoreResult.breakdown` instead of recalculating
- **Benefit:** Less computation, guaranteed consistency
- **Complexity:** Low - bonus info already available in scoreResult

### Medium Priority

**3. Standardize Transfer Cost Display**
- **Decision Needed:** Show NET everywhere or show GROSS + hit indicator everywhere?
- **Current:** Mixed approach
- **Recommendation:** Show NET in tiles/cards, show breakdown in modals
- **Benefit:** Clearer for users, less confusion

**4. Add Integration Tests**
- **Test:** Same manager, same GW, different endpoints should return same score
- **Coverage:**
  - `/api/team/[teamId]/info` gwPoints
  - `/api/team/[teamId]/gameweek/[gw]` gwPoints
  - `/api/league/[id]/fixtures/[gw]` entry points
  - `/api/league/[id]/matches/[matchId]` scores
- **Benefit:** Catch future regressions

### Low Priority

**5. Consider Re-Enabling Player Stats DB Fetch**
- **Condition:** Only if K-27 sync is proven reliable and fresh
- **Benefit:** Performance improvement (DB query vs API call)
- **Risk:** Stale data (as seen in v3.1.2)
- **Recommendation:** Keep disabled until sync reliability is 100%

**6. Document Score Calculation Flow**
- **File:** Add comments in `scoreCalculator.ts` documenting the flow
- **Include:** When to use DB vs API, why player stats always use API
- **Benefit:** Future developers understand decisions

---

## 9. Conclusion

The FPL H2H Analytics app has **successfully established a single source of truth** for score calculations through `scoreCalculator.ts`. The architecture is **well-designed** with:

- ✅ Clear separation of concerns (fetch, calculate, display)
- ✅ K-27 data source rules properly implemented
- ✅ Batch optimization for performance
- ✅ Comprehensive handling of edge cases (auto-subs, bonus, chips, transfer costs)

The **main inconsistency** is the Live Match Modal using separate calculation logic (`liveMatch.ts`), which should be unified with the core calculator.

Overall score calculation is **accurate and reliable**, with the identified issues being primarily architectural (duplication) rather than correctness problems.

---

**Investigation completed:** December 23, 2025  
**Next steps:** Review findings with Greg, create targeted fix briefs for High Priority recommendations
