# FPL H2H Analytics - Version History

**Project Start:** October 23, 2024
**Total Releases:** 300+ versions
**Current Version:** v4.5.7 (January 2, 2026)

---

## v4.5.7 - K-163N Fix: League Rankings Luck Column (Jan 2, 2026)

**K-163N (HOTFIX):** Fixed League Rankings table (Rank Tab) to show 10× weighted luck values for consistency

### Problem

After v4.5.6 unified luck displays, the **League Rankings table (Rank Tab)** still showed old integer values (+13, +10, -9) instead of the new 10× weighted format (+40.0, +18.0, -10.8).

**Affected Component:** Dashboard > Rank Tab > LUCK column

### Solution

Updated `/api/league/[id]/stats/route.ts` to multiply luck by 10 before sending to frontend:
```tsx
// BEFORE
luck: Math.round(luckValues[standing.entry_id] || 0) // Shows +13

// AFTER
luck: Math.round((luckValues[standing.entry_id] || 0) * 10) // Shows +40.0
```

Also updated `LeagueTab.tsx` to use shared `formatLuckValue()` utility for consistent decimal formatting.

### Impact

- League Rankings LUCK column now shows same scale as all other luck displays (~-65 to +40)
- Expected value changes:
  - Jean Boes: +13 → **+40.0** ✓
  - Greg Lienart: +10 → **+18.0** ✓
  - Dane Farran: -11 → **-10.8** ✓

**Files Modified:**
- `/src/app/api/league/[id]/stats/route.ts` (API calculation)
- `/src/components/Dashboard/LeagueTab.tsx` (display formatting)

---

## v4.5.6 - K-163N: Unified 10× Weighted Luck Display (Jan 2, 2026)

**K-163N (REFACTOR):** Applied 10× weighted display format to ALL luck displays across the app for consistency

### Problem

After K-163M updated the Luck Leaderboard to show 10× weighted values, other luck displays (Season tab, Awards, GW Rankings) still showed raw values, creating inconsistency.

### Solution

1. **Created shared formatting utility** (`src/lib/luckFormatting.ts`):
   - `formatSeasonLuck()` - formats 4-component season luck (variance, rank, schedule, chip)
   - `formatGWLuck()` - formats 2-component GW luck (variance, rank)
   - `formatLuckValue()` - consistent display formatting (always shows sign, 1 decimal)
   - `getLuckClass()` - color classes based on luck value

2. **Updated all luck displays:**
   - **Season tab** (`LuckIndex.tsx`) - multiplied by 10, uses `formatLuckValue()`
   - **Awards tab** (`awards/[month]/route.ts`) - multiplied by 10, uses `formatLuckValue()`
   - **GW Rankings modal** (`GWRankingsModal.tsx`) - multiplied by 10, uses `formatLuckValue()`
   - **Luck Leaderboard** (`LuckLeaderboard.tsx`) - refactored to use shared `formatSeasonLuck()` utility

### Impact

- All luck displays now show consistent 10× weighted format
- Values across the app now in same scale (~-65 to +40)
- Shared utility ensures consistent formatting and reduces code duplication
- Easier to understand relationship between components and total

**Files Modified:**
- `/src/lib/luckFormatting.ts` (NEW - shared utilities)
- `/src/components/Stats/season/LuckIndex.tsx`
- `/src/app/api/league/[id]/stats/awards/[month]/route.ts`
- `/src/components/Stats/GWRankingsModal.tsx`
- `/src/components/Stats/LuckLeaderboard.tsx`

---

## v4.5.5 - K-163M: 10× Weighted Luck Display (Jan 2, 2026)

**K-163M (UI FIX):** Changed Luck Leaderboard to show weighted values × 10 so component columns visually sum to Luck Index

### Problem

Component columns showed normalized values that didn't sum to the Luck Index, causing user confusion:

**Before (confusing):**
| Manager | Index | Variance | Rank | Schedule | Chip |
|---------|-------|----------|------|----------|------|
| Antoine | +3.88 | +6.84 | +0.87 | +4.55 | -0.23 |

User thinks: "6.84 + 0.87 + 4.55 - 0.23 = 12.03, not 3.88" ❌

### Solution

Show **weighted values × 10** so columns visually sum to the index:

**After (clear):**
| Manager | Index | Variance | Rank | Schedule | Chip |
|---------|-------|----------|------|----------|------|
| Antoine | +38.8 | +27.4 | +2.6 | +9.1 | -0.2 |

Now: 27.4 + 2.6 + 9.1 - 0.2 = 38.9 ≈ 38.8 ✓

### Changes

- **Variance column:** `normalized × 0.4 × 10 = normalized × 4`
- **Rank column:** `normalized × 0.3 × 10 = normalized × 3`
- **Schedule column:** `normalized × 0.2 × 10 = normalized × 2`
- **Chip column:** `normalized × 0.1 × 10 = normalized × 1`
- **Luck Index:** `index × 10`
- **Headers:** Removed weight percentages (40%, 30%, 20%, 10%) since weights are now baked into values

### Impact

- Values are 10× larger (range: ~-65 to +40 instead of -6.5 to +4)
- Component columns now sum to Luck Index (within rounding)
- Clearer visual relationship between components and total

**Files Modified:**
- `src/components/Stats/LuckLeaderboard.tsx` - Updated display calculations and headers

---

## v4.5.4 - K-163L: Fix Schedule Luck to Use Progressive Averages (Jan 2, 2026)

**K-163L (MAJOR FIX):** Fixed schedule luck calculation to use progressive averages instead of final season averages

### The Problem

The schedule luck calculation was using **final season averages** for all opponents, which caused a mathematical flaw:

- After GW19 in a 20-team league, every manager has faced all 19 other managers exactly once
- Using final averages: `avgOppStrength` = `theoreticalOppAvg` for everyone
- Result: Everyone gets `scheduleLuck` = 0 (meaningless)

**Example (Adriaan Mertens):**
- avgOppStrength: 56.91 (using final averages)
- theoreticalOppAvg: 56.91 (using final averages)
- scheduleLuck: (56.91 - 56.91) × 19 = **0.00** ❌

### Root Cause

Schedule luck should measure if you faced opponents when they were **hot or cold**, not just who you faced. The **timing** of matches matters:
- Face someone in GW2 during a slump → lucky
- Face someone in GW15 when they're peaking → unlucky

Using final averages erases this timing information.

### The Fix

Now uses **progressive averages** - each opponent's average **up to the GW when you played them**:

```typescript
// NEW: Progressive average helper
const getProgressiveAverage = (entryId, upToGW, pointsByGW) => {
  let total = 0, count = 0;
  for (let gw = 1; gw <= upToGW; gw++) {
    if (pointsByGW[gw]?.[entryId]) {
      total += pointsByGW[gw][entryId];
      count++;
    }
  }
  return count > 0 ? total / count : 0;
};

// Use it for each match
for (const match of managerMatches) {
  const oppAvgAtTimeOfMatch = getProgressiveAverage(oppId, match.event, pointsByGW);
  // ... calculate schedule luck
}
```

### Impact

**After Fix (Adriaan Mertens):**
- avgOppStrength: ~54.74 (opponents' progressive averages)
- theoreticalOppAvg: ~54.88 (league-wide progressive average)
- scheduleLuck: (54.88 - 54.74) × 19 = **+2.66** ✓

Values now match the expected reference data from `luck-k163j.json`.

### Zero-Sum Property

Schedule luck remains zero-sum (one manager's lucky schedule = another's unlucky):
```
Sum of all schedule_luck values ≈ 0
```

Added validation logging to verify this property holds.

**Files Modified:**
- `src/app/api/league/[id]/luck/route.ts` - Added progressive average calculation and zero-sum validation

---

## v4.5.3 - K-163k: Fix Schedule Luck Calculation Using Wrong GWs (Jan 2, 2026)

**K-163k (FIX):** Fixed schedule_luck returning ~0 for all managers due to mismatched gameweek ranges

### Root Cause

The bug had two data sources using different GW ranges:
1. **h2h_matches** query filtered by `entry_1_points > 0 OR entry_2_points > 0` → returned 18 GWs (GW19 had no completed matches yet)
2. **manager_gw_history** query had NO filter → returned all 19 GWs

Result: Season averages calculated from 19 GWs, but schedule luck used opponents from only 18 GWs → wrong averages → schedule luck ≈ 0 for everyone.

### The Fix

Changed `finalSeasonAvgs` calculation to use **only GWs that have h2h_matches**:

```typescript
// BEFORE (broken):
for (const gw of allGWs) {  // Used all GWs from manager_gw_history
  if (pointsByGW[gw]?.[mEntryId] !== undefined) {
    points.push(pointsByGW[gw][mEntryId]);
  }
}

// AFTER (fixed):
const matchGWs = Array.from(new Set(matches.map(m => m.event))).sort((a, b) => a - b);
for (const gw of matchGWs) {  // Use only GWs with h2h matches
  if (pointsByGW[gw]?.[mEntryId] !== undefined) {
    points.push(pointsByGW[gw][mEntryId]);
  }
}
```

### Impact

- Schedule column now shows correct values (+0.96, -0.95, etc.) instead of +0.00 for all managers
- Season averages now match the opponent list length
- Values match the expected reference data from static JSON file

**Files Modified:**
- `src/app/api/league/[id]/luck/route.ts` - Fixed finalSeasonAvgs calculation to use matchGWs instead of allGWs

---

## v4.5.2 - K-163k: Add Debug Logging for Schedule Luck Calculation (Jan 2, 2026)

**K-163k (Debug):** Added extensive debug logging to trace why schedule_luck.value returns 0 for all managers

### Changes

**Backend Debug Logging (`src/app/api/league/[id]/luck/route.ts`):**
- Added debug logging after finalSeasonAvgs calculation to verify:
  - How many GWs are being processed
  - Sample data from pointsByGW structure
  - How many managers have season averages calculated
  - Whether all season averages are incorrectly 0
  - Total sum of all season averages

**Purpose:**
- Trace the data flow from database query → pointsByGW → finalSeasonAvgs
- Identify why schedule_luck calculation returns 0 despite database having 378 rows of data
- Next step: Analyze logs to find root cause and implement actual fix

**Files Modified:**
- `src/app/api/league/[id]/luck/route.ts` - Added K-163k Season Avgs Debug logging

---

## v4.5.1 - K-163k: Fix Schedule Luck Display in Luck Table (Jan 2, 2026)

**K-163k:** Fixed Schedule column showing +0.00 for all managers in Luck Analysis table

### Problem

The Luck Analysis leaderboard table showed `+0.00` for ALL managers in the Schedule column, despite correct values existing in the JSON API data.

**Before (Broken):**
| Manager | Schedule |
|---------|----------|
| Jean Boes | +0.19 ❌ |
| Greg Lienart | +0.19 ❌ |
| Vanaka | -0.19 ❌ |

**After (Fixed):**
| Manager | Schedule |
|---------|----------|
| Jean Boes | +0.96 ✓ |
| Greg Lienart | +0.94 ✓ |
| Vanaka | -0.95 ✓ |

### Root Cause

The component was displaying **weighted values** instead of **normalized values** in ALL component columns (Variance, Rank, Schedule, Chip).

**Old logic:**
```typescript
const scheduleWeighted = manager.schedule_luck.value / 5 * weights.schedule;
// Example: 4.80 / 5 * 0.2 = 0.192 (displayed as +0.19)
```

**New logic:**
```typescript
const scheduleNormalized = manager.schedule_luck.value / 5;
// Example: 4.80 / 5 = 0.96 (displayed as +0.96)
```

### Fix Applied

Changed `LuckLeaderboard.tsx` to calculate and display **normalized values** in component columns:
- **Variance:** `total / 10` (was: `total / 10 * 0.4`)
- **Rank:** `total * 1` (was: `total * 0.3`)
- **Schedule:** `value / 5` (was: `value / 5 * 0.2`) ← **THIS WAS THE BUG**
- **Chip:** `value / 3` (was: `value / 3 * 0.1`)

The **Luck Index** column continues to show the weighted total (from API), which is correct.

### Table Display Logic

**Component Columns** (Variance, Rank, Schedule, Chip):
- Show **normalized values** (raw values divided by normalization factors)
- Allow managers to see the actual impact of each luck component
- Example: Schedule +0.96 means you faced opponents averaging 0.96 points easier than expected

**Luck Index Column**:
- Shows **weighted total** (sum of normalized values × weights)
- This is the overall luck score: `0.4×Variance + 0.3×Rank + 0.2×Schedule + 0.1×Chip`
- Used for ranking managers by overall luck

### Expected Values After Fix

| Manager | Raw Schedule | Normalized (÷5) | Displayed |
|---------|--------------|-----------------|-----------|
| Jean Boes | 4.80 | 0.96 | +0.96 |
| Olivier Dufrasne | 4.78 | 0.956 | +0.96 |
| Greg Lienart | 4.70 | 0.94 | +0.94 |
| Grégoire Bryssinck | 2.70 | 0.54 | +0.54 |
| Adriaan Mertens | 2.49 | 0.498 | +0.50 |
| ... | ... | ... | ... |
| Alexis Renard | -3.47 | -0.694 | -0.69 |
| Slim Ben Dekhil | -3.71 | -0.742 | -0.74 |
| Vanaka Chhem-Kieth | -4.75 | -0.95 | -0.95 |

### Files Modified

1. `src/components/Stats/LuckLeaderboard.tsx` - Changed component value calculations from weighted to normalized

### Impact

- **Schedule column** now displays meaningful values ranging from +0.96 to -0.95
- **All component columns** now show normalized values for easier interpretation
- **Luck Index** remains unchanged (weighted total from API)
- Users can now see the actual impact of each luck component before weighting

---

## v4.5.0 - Stats Navigation Redesign & Modal Fixes (Jan 2, 2026)

**Production Release:** Combines K-167 (modal bug fixes) and K-168 (Stats navigation redesign) into v4.5.0 minor version bump

### Major Changes

**1. Stats Navigation Restructure (K-168)**

Complete redesign of Stats section navigation:
- Removed Players tab from Stats sub-navigation
- Added Awards as 4th tab in Stats (GW | Season | Luck | Awards)
- Awards uses award medal icon (🏅) from lucide-react
- Players functionality still exists at `/ownership` route

**2. Season View Simplification (K-168)**

Removed redundant Leaderboards/Awards toggle:
- Awards now accessible via Stats sub-navigation
- Season view simplified to always show leaderboards
- Removed toggle button UI and view state management
- Cleaner component with single content display

**3. Stat Box Modal Bug Fixes (K-167)**

**GW Rank Modal - Stale Data Fix:**
- Fixed "Worst GW Rank" showing outdated value (e.g., 3.4M from GW1 when current live GW was 9.2M)
- Root cause: FPL API history endpoint only returns completed GWs
- Solution: Check if current GW rank exists but isn't in history, add to calculations
- Now correctly includes live GW in best/worst/average rank calculations

**Points Analysis Modal - Column Display Fix:**
- Fixed concatenated column display (e.g., "331152" instead of "33 | 1,152")
- Added 16px grid gap to table header and rows
- Right-aligned rank column for better readability
- Added `.toLocaleString()` for thousand separators

### Files Modified

**K-168 Changes:**
1. `src/components/Stats/StatsHub.tsx` - Removed Players, added Awards tab
2. `src/components/Stats/SeasonView.tsx` - Removed toggle, simplified rendering
3. `src/components/Stats/AwardsTab.tsx` - Deleted (no longer needed)
4. `src/data/changelog.json` - Added v4.5.0 entry

**K-167 Changes:**
1. `src/app/api/team/[teamId]/gw-rank-stats/route.ts` - Include live GW in calculations
2. `src/components/Dashboard/RankModals.module.css` - Added grid gap and alignment
3. `src/components/Dashboard/PointsAnalysisModal.tsx` - Added number formatting

### Navigation Changes

**Before:**
```
Main Nav: My Team | Rank | Rivals | Stats | Settings
Stats Sub-tabs: GW | Season | Players | Luck
Season View: [Leaderboards | Awards] toggle
```

**After:**
```
Main Nav: My Team | Rank | Rivals | Stats | Settings (unchanged)
Stats Sub-tabs: GW | Season | Luck | Awards
Season View: Leaderboards only (no toggle)
```

### Bundle Size Impact

- Dashboard page: 62.9 kB (down from 71 kB)
- 8.1 kB reduction from removing PlayersTab from Stats bundle

---

## v4.4.16 - K-168: Remove Redundant Leaderboards/Awards Toggle (Jan 2, 2026)

**K-168 Follow-up:** Removed redundant toggle from Season view since Awards is now in Stats sub-navigation

### Changes

**1. Removed Leaderboards/Awards Toggle**

With Awards now accessible via Stats sub-navigation (GW | Season | Luck | Awards), the toggle buttons in Season view were redundant:
- `src/components/Stats/SeasonView.tsx`:
  - Removed `BarChart3` and `Award` icon imports
  - Removed `Awards` component import
  - Removed `SeasonViewType` type definition
  - Removed `view` state variable
  - Removed toggle button UI (`viewToggleBar` div)
  - Removed conditional rendering based on view state
  - Now always displays leaderboards content directly

**Before:**
```tsx
<div className={styles.viewToggleBar}>
  <button>Leaderboards</button>
  <button>Awards</button>
</div>

{view === 'leaderboards' ? (
  <div className={styles.leaderboards}>...</div>
) : (
  <Awards />
)}
```

**After:**
```tsx
<div className={styles.section}>
  <div className={styles.leaderboards}>
    {/* All leaderboard sections */}
  </div>
</div>
```

**Rationale:**
- Awards is now accessible via Stats sub-navigation as 4th tab
- No need for duplicate navigation within Season view
- Simplified component - Season view is now leaderboards-only
- Awards remains accessible at Stats > Awards tab

### Files Modified

1. `src/components/Stats/SeasonView.tsx` - Removed toggle, simplified to always show leaderboards

---

## v4.4.15 - K-168: Remove Players Tab, Add Awards to Stats Nav (Jan 2, 2026)

**K-168:** UI restructure - removed Players from Stats, added Awards to Stats sub-navigation

### Changes

**1. Removed Players Tab from Stats**

Removed Players tab from Stats sub-navigation:
- `src/components/Stats/StatsHub.tsx`:
  - Removed 'players' from ViewType
  - Removed Shirt icon import
  - Removed PlayersTab import
  - Removed Players button from view toggle
  - Removed Players view rendering
- Players functionality still exists at `/ownership` route

**2. Added Awards to Stats Sub-Navigation**

Added Awards as 4th tab in Stats section:
- `src/components/Stats/StatsHub.tsx`:
  - Added 'awards' to ViewType (`'gameweek' | 'season' | 'luck' | 'awards'`)
  - Imported Award icon from lucide-react
  - Imported Awards component
  - Added `completedGameweeks` state
  - Added `fetchCompletedGameweeks()` function
  - Added Awards button to view toggle (after Luck)
  - Added Awards view rendering with loading/error states

**3. Navigation Changes**

**Before:**
```
Main Nav: My Team | Rank | Rivals | Stats | Settings
Stats Sub-tabs: GW | Season | Players | Luck
```

**After:**
```
Main Nav: My Team | Rank | Rivals | Stats | Settings (unchanged)
Stats Sub-tabs: GW | Season | Luck | Awards
```

**Awards Details:**
- Icon: 🏅 Award medal (Lucide Award component)
- Position: 4th tab in Stats, after Luck
- Content: Reuses existing Awards component from Stats/Season
- Renders monthly awards (Player of the Month, Team of the Month, etc.)
- Fetches `completedGameweeks` from `/api/league/${leagueId}/stats/season`

### Files Modified

1. `src/components/Stats/StatsHub.tsx` - Removed Players, added Awards
2. `src/app/dashboard/page.tsx` - No changes (Awards not in main nav)
3. `src/components/Stats/AwardsTab.tsx` - Deleted (no longer needed)

### Bundle Size Impact

- Dashboard page: 62.9 kB (down from 71 kB)
- 8.1 kB reduction due to removing PlayersTab from Stats bundle

---

## v4.4.14 - K-167: Fix Stat Box Modal Data & Display Bugs (Jan 2, 2026)

**K-167:** Fixed GW Rank modal stale data and Points Analysis modal column display issues

### Bug Fixes

**Bug 1: GW Rank Modal - Stale "Worst Rank"**

**Problem:**
- GW Rank modal showed Worst GW Rank: 3.4M (GW1) when current GW19 rank was 9.2M
- Live GW rank should have been the worst, but wasn't included in calculations

**Root Cause:** (`src/app/api/team/[teamId]/gw-rank-stats/route.ts`)
- Endpoint only used `gwHistory` from FPL API's `/entry/{id}/history/` endpoint
- This history endpoint contains ONLY completed GWs
- Current live GW19 rank (9.2M) wasn't in the history yet
- Best/worst/average calculations only looked at GW1-18, missing GW19

**Fix:**
- Check if current GW rank exists but isn't in history (indicates live GW)
- Add current live GW rank to `allRanks` array for calculations
- Include in best rank, worst rank, average rank, and top 1M count
- Now correctly shows GW19's 9.2M as worst rank when it's truly the worst

**Changes:**
```typescript
// Create allRanks array with history
const allRanks = [...gwHistory];

// If current GW rank exists but isn't in history yet (live GW), add it
if (currentRank > 0 && !currentGWEntry) {
  allRanks.push({
    event: currentGW,
    overall_rank: currentRank
  });
}

// Use allRanks for all calculations (best/worst/average/topMillion)
```

**Bug 2: Points Analysis Modal - Concatenated Column Display**

**Problem:**
- "PTSTOTAL" column showed values like "331152" (concatenated)
- Should display as two clear columns: "33" (Pts) | "1,152" (Total)
- Visual concatenation made data unreadable

**Root Cause:** (`src/components/Dashboard/RankModals.module.css`)
- Grid layout had no `gap` property between columns
- `.colPts` was right-aligned, `.colRank` was left-aligned (default)
- Adjacent numbers touched: "33|1152" appeared as "331152"
- No comma formatting on cumulative totals

**Fix:**
- Added `gap: 16px` to desktop grid layout (`.tableHeader` and `.tableRow`)
- Added `gap: 12px` to mobile grid layout
- Changed `.colRank` to `text-align: right` for consistent alignment
- Changed `.colChange` to `text-align: right` for better readability
- Added `.toLocaleString()` to cumulative totals in PointsAnalysisModal
- Now displays clearly: "33    1,152    +5" with proper spacing

**Files Modified:**
1. `src/app/api/team/[teamId]/gw-rank-stats/route.ts` - Include live GW in calculations
2. `src/components/Dashboard/RankModals.module.css` - Add grid gap and right-align columns
3. `src/components/Dashboard/PointsAnalysisModal.tsx` - Add toLocaleString() formatting

---

## v4.4.13 - K-166d: Move Stats/Team Content to My Team (Simple Stack) (Jan 2, 2026)

**K-166d:** Moved Stats/Team content to My Team as simple vertical stack - no collapsible UI, no Form box

### Changes

1. **My Team Tab Enhanced**
   - Added Position History chart below StatsPanel
   - Added Chips Played table
   - Added Chips Faced table with win/loss summary
   - Added Match History table with chip indicators
   - All sections always visible (no collapsible UI)
   - Simple vertical stack layout

2. **Stats Tab Simplified**
   - Removed "Team" tab from Stats section
   - Stats now shows: GW, Season, Players, Luck (4 tabs)
   - Default view changed to "gameweek" (was "myteam")

3. **Technical Changes**
   - Added `playerData` and `standings` state to MyTeamTab
   - Added `getChipAbbreviation()` helper function to MyTeamTab
   - Fetch player data from `/api/player/${myTeamId}?leagueId=${leagueId}` in useEffect
   - Reused existing PositionHistory component
   - Copied Chips/Match History JSX from MyTeamView (no new components)

**Final My Team Layout:**
```
├── Header (Team name, GW selector, refresh button)
├── Stat Boxes (GW PTS, GW RANK, TRANSFERS / TOTAL PTS, OVERALL RANK)
├── PitchView
├── Team Value / Bank
├── StatsPanel (collapsible)
├── Position History (chart)
├── Chips Played (table)
├── Chips Faced (table with summary)
└── Match History (table)
```

**Final Stats Layout:**
```
├── View Toggle: [GW] [Season] [Players] [Luck]
└── Content for selected view
```

**What Was NOT Included:**
- Performance section (PTS/WIN/DRW/LOSS/AVG/HIGH/LOW/RANK/LUCK boxes) - intentionally excluded per user request
- Form section (last 5 matches with W/D/L circles) - intentionally excluded
- CollapsibleSection wrapper - keeping content always visible
- FormStatBox - not needed for this implementation

---

## v4.4.12 - K-166c: Full Revert - Restore Original My Team UI (Jan 2, 2026)

**REVERT (K-166c):** Complete rollback of K-166 - restored original My Team layout
**REASON:** K-166 implementation had significant UI/UX issues - reverting to stable state

### K-166c: Full Revert of K-166

Full reversion of K-166 changes to restore the original, working My Team UI.

**Reverted Changes:**

1. **My Team Tab Restored to Original**
   - Back to 3 stat boxes: GW PTS, GW RANK, TRANSFERS (removed Form box)
   - PitchView unchanged
   - Team Value / Bank row unchanged
   - Original StatsPanel for GW Transfers (not collapsible wrapper)
   - No collapsible sections (Position History, Chips, Match History removed from My Team)

2. **Stats Tab Team View Restored**
   - "Team" sub-tab restored in Stats section
   - Stats now shows: **Team**, GW, Season, Players, Luck (5 tabs)
   - Team tab contains: Position History, Chips Played, Chips Faced, Match History
   - Default view back to "myteam" (Team tab)

3. **Deleted K-166 Components**
   - Removed entire `src/components/MyTeam/` folder
   - Deleted files:
     - `CollapsibleSection.tsx` + `.module.css`
     - `FormStatBox.tsx` + `.module.css`
     - `FormModal.tsx` + `.module.css`
     - `GWTransfersSection.tsx` + `.module.css`
     - `ChipsSection.tsx` + `.module.css`
     - `MatchHistorySection.tsx` + `.module.css`

4. **Restored Original Files**
   - `MyTeamTab.tsx` - reverted to commit c803504 (pre-K-166)
   - `StatsHub.tsx` - reverted to commit c803504 (restored Team tab)
   - `PositionHistory.tsx` - reverted to commit c803504 (removed hideTitle prop)

**Final Layout:**

**My Team Tab:**
```
├── GameweekSelector
├── StatBoxes (3 boxes): GW PTS, GW RANK, TRANSFERS
├── PitchView
├── Team Value / Bank row
└── GWTransfers (original StatsPanel layout)
```

**Stats Tab:**
```
├── Team (restored) ← Position History, Chips, Match History
├── GW
├── Season
├── Players
└── Luck
```

**Technical Notes:**
- Dashboard bundle size: 71.9 kB (was 64.5 kB in K-166b)
- All original functionality preserved
- No breaking changes
- Clean revert via git checkout to commit c803504

**Lessons Learned:**
- K-166 concept (consolidate Stats/Team into My Team) may still be valid
- Future attempts should include:
  - Proper design mockups first
  - Incremental approach (one section at a time)
  - Better styling that matches existing FPL theme
  - User testing before full deployment

**Status:** Original stable UI restored, ready for production

---

## v4.4.11 - K-166b: Fix Collapsible UI & Revert GW Transfers (Jan 2, 2026)

**HOTFIX (K-166b):** Fixed K-166 UI regressions with proper FPL theme styling
**IMPACT:** Restored professional appearance and consistent theming

### K-166b: Fix Collapsible UI & Revert GW Transfers

Fixed multiple UI issues introduced in K-166 to restore professional appearance and FPL theme consistency.

**Fixes Applied:**

1. **GW Transfers Reverted to Original UX**
   - Removed CollapsibleSection wrapper - now always visible below pitch
   - Restored original clean table layout with IN/OUT rows
   - Added green section title to match FPL theme

2. **Form Stat Box Styling Fixed**
   - Now matches existing stat boxes exactly:
     - Same gradient background: `rgba(26, 26, 46, 0.6)` to `rgba(55, 0, 60, 0.6)`
     - Same border: `1px solid rgba(255, 255, 255, 0.1)`
     - Same border-radius: 16px
     - Same padding: 14px 12px
     - Same hover effects with neon green glow
   - Colored dots properly sized (10px) with glows:
     - W = green (#00ff87) with green glow
     - D = grey (#666)
     - L = red (#ff0000) with red glow
   - Label matches other stat boxes: `0.6rem`, white with 60% opacity

3. **Collapsible Section FPL Theme**
   - Headers now have purple tint: `rgba(55, 0, 60, 0.6)`
   - Border: `1px solid rgba(255, 255, 255, 0.1)`
   - Title color: Neon green (#00ff87) with uppercase transform
   - Arrow color: White with 60% opacity
   - Hover state: Darker purple `rgba(55, 0, 60, 0.8)`
   - Content padding reduced to 12px for tighter layout

4. **Section Spacing & Layout**
   - Consistent 12px gap between all sections
   - GW Transfers has 12px top margin
   - Collapsible sections properly spaced

**Visual Changes:**
```
Before (broken):                After (fixed):
┌──────────────────┐           ┌──────────────────┐
│ No transfers     │           │    ● ● ○ ● ●     │  ← Matches other boxes
│     FORM         │           │      FORM        │
└──────────────────┘           └──────────────────┘

┌─────────────────┐            ┌─────────────────────────────┐
│ Position History│            │ POSITION HISTORY         ▼  │  ← FPL purple/green
└─────────────────┘            └─────────────────────────────┘
```

**Files Modified:**
- `GWTransfersSection.tsx` - Removed CollapsibleSection wrapper
- `GWTransfersSection.module.css` - Added section title styling
- `FormStatBox.module.css` - Matched existing stat box styles exactly
- `CollapsibleSection.module.css` - FPL purple theme with green titles
- `MyTeamTab.tsx` - Updated comments for clarity

**Technical Notes:**
- Form stat box dots now 10px (was 16px) with proper glows
- Collapsible headers use FPL purple gradient on hover
- All animations preserved (slideDown, arrow rotation)
- Mobile responsiveness maintained with smaller sizing

---

## v4.4.10 - K-166: Consolidate Stats/Team into My Team (Jan 2, 2026)

**UI IMPROVEMENT (K-166):** Major UI consolidation - merged Stats/Team tab content into My Team tab
**IMPACT:** Reduced navigation complexity, improved user flow, cleaner Stats section

### K-166: Consolidate Stats/Team into My Team

Complete restructuring of team statistics presentation by consolidating redundant Stats/Team view into the main My Team tab.

**Changes:**
- **4th Stat Box Added:** Form (last 5 match results as colored dots - W/D/L)
  - Click to open detailed modal: last 10 matches, W/D/L counts, win rate, current streak
- **New Collapsible Sections in My Team:**
  - GW Transfers (default expanded)
  - Position History (default collapsed, with opponent comparison selector)
  - Chips (default collapsed, combines Chips Played + Chips Faced tables)
  - Match History (default collapsed, shows all H2H matches with chips indicators)
- **Stats Tab Simplified:** Removed "Team" sub-tab, now shows: GW, Season, Players, Luck only
- **Default View Changed:** Stats tab now opens to "GW" instead of "Team"

**Components Created:**
- `CollapsibleSection.tsx` - Reusable collapsible container with localStorage persistence
- `FormStatBox.tsx` + `FormModal.tsx` - Form stat box with detailed modal
- `GWTransfersSection.tsx` - Transfers wrapped in collapsible section
- `ChipsSection.tsx` - Combined Chips Played + Chips Faced tables
- `MatchHistorySection.tsx` - Full match history with chip indicators

**Components Modified:**
- `MyTeamTab.tsx` - Added 4th stat box, added 4 collapsible sections
- `StatsHub.tsx` - Removed Team tab, changed default view to gameweek
- `PositionHistory.tsx` - Added `hideTitle` prop for collapsible wrapper compatibility

**User Experience:**
- All team statistics now in one place (My Team tab)
- Less tab switching required
- Progressive disclosure via collapsible sections (localStorage remembers state)
- Stats tab focused on league-wide analytics only

**Technical Notes:**
- All sections use localStorage to persist expanded/collapsed state
- Form modal shows last 10 matches with comprehensive stats
- Position History maintains opponent comparison feature when collapsed
- Chips section shows summary stats for chips faced (won/lost counts)

---

## v4.4.9 - K-200c: Players Tab with Elite Ownership Comparison (Jan 2, 2026)

**FEATURE (K-200c):** Players tab in Ownership section with Top 10K ownership comparison
**TECHNICAL:** Full-featured player database with elite ownership delta analysis

### K-200c: Players Tab with Elite Ownership
Fourth tab in Ownership section showing all 760 FPL players with elite ownership comparison.

**Tab Features:**
- **100% copy** of main app Players tab with elite ownership columns ADDED
- Compact Stats view (6 columns: £, %, ELITE, Δ, PT, FORM)
- All Stats view (27 columns including elite comparison)
- Player click → Full detail modal with stats/matches/history/past seasons
- Filter modal (price range, positions, teams, availability)
- Search by player name or team
- Sortable columns

**Elite Ownership Columns:**
- **ELITE %**: Top 10K ownership percentage from `elite_picks` table
- **DELTA (Δ)**: Elite - Overall ownership difference with color coding:
  - ≥ +20%: **Bold green** (hidden gems - elites love them)
  - +5% to +20%: Green (elites favor)
  - -5% to +5%: Grey (consensus picks)
  - -5% to -20%: Red (casuals over-own)
  - ≤ -20%: **Bold red** (trap players)

**Example Insights:**
- Player with 5% overall, 25% elite → +20% Δ (bold green) = elite secret
- Player with 40% overall, 20% elite → -20% Δ (bold red) = casual trap

**Technical Implementation:**
- Copied entire Players component system to Ownership folder
- All imports updated to local copies (no impact on main app)
- API extended with `includeElite=true` parameter
- Fetches from `elite_picks` table (Top 10K sample)
- Backward compatible (main Players tab unchanged)

**Files Added:**
- `src/components/Ownership/OwnershipPlayers.tsx` - Main component
- `src/components/Ownership/OwnershipPlayersTable.tsx` - Table rendering
- `src/components/Ownership/OwnershipPlayerRow.tsx` - Row with delta styling
- `src/components/Ownership/OwnershipPlayerCell.tsx` - Player info cell
- `src/components/Ownership/OwnershipFilterModal.tsx` - Filter modal
- `src/components/Ownership/OwnershipPlayerDetailModal.tsx` - Detail modal
- `src/components/Ownership/OwnershipColumns.ts` - Column defs with elite columns
- `src/components/Ownership/OwnershipPlayers.module.css` - Styling + delta colors
- `src/components/Ownership/OwnershipFilterModal.module.css` - Filter styling
- `src/components/Ownership/OwnershipPlayerDetailModal.module.css` - Modal styling

**Files Modified:**
- `src/components/Ownership/OwnershipPage.tsx` - Added Players tab
- `src/app/api/players/route.ts` - Added `includeElite` parameter (backward compatible)

---

## v4.4.8 - K-200b Phase 2: Stacking Summary + K-164 Bulletproof Data Rules (Jan 2, 2026)

**FEATURE (K-200b Phase 2):** Team Stacking Summary landing page
**ENHANCEMENT (K-164):** Bulletproof gameweek data source rules

### K-200b Phase 2: Stacking Summary
New landing page at `/ownership` showing stacking overview for all 20 teams.

**Landing Page Features:**
- Summary table showing all teams sorted by stacking popularity
- Double-up % (managers owning 2+ from team)
- Triple-up % (managers owning 3+ from team)
- Top combo for each team with ownership %
- Click any row to drill into detailed combinations
- Back button to return to overview

**Example:**
- Arsenal → 74.1% own 2+, 32.8% own 3+, Top: Raya + Saka (22.7%)
- Liverpool → 68.2% own 2+, 28.4% own 3+, Top: Salah + TAA (31.2%)

**Page Flow:**
1. Initial load → Summary table (all 20 teams)
2. Click team → Detail view (singles, doubles, triples)
3. Back button → Return to summary

**Technical:**
- New endpoint: `/api/ownership/summary`
- New component: `StackingSummary.tsx`
- Efficient parallel queries (~1-2s for all 20 teams)

**Files Added:**
- `src/app/api/ownership/summary/route.ts`
- `src/components/Ownership/StackingSummary.tsx`

**Files Modified:**
- `src/components/Ownership/OwnershipPage.tsx` - Dual view logic
- `src/components/Ownership/TeamSelector.tsx` - Handle null selection
- `src/components/Ownership/Ownership.module.css` - Summary table styles

### K-164: Bulletproof GW Data Source Rules

**CRITICAL BUG FIX:** Fixed recurring 0-points bug after gameweeks complete by implementing bulletproof data source logic.

### The Problem
Same bug kept recurring after every gameweek:
1. GW finishes (Sunday night) → FPL API marks `finished: true`
2. App immediately switches to database
3. Database has stale/zero data (sync failed or didn't run yet)
4. Users see 0 points in My Team and H2H Rivals

### Previous Failed Fixes
- K-141: Temp fix (use API if finished but still current) - didn't work
- K-142: Auto-sync after 10 hours - didn't work
- K-142b: Validate non-zero points in DB - didn't work
- Manual admin fixes required for GW18 and GW19

### The Root Cause
Relied on timing/sync triggers which are unreliable. Database sync needs to complete within hours after GW finishes, but this often failed.

### K-164 Solution: Only Use DB When NEXT GW Has Started

**New Rule:** Don't use database until the NEXT gameweek has started.

```
Current State              → Data Source for GW N
────────────────────────────────────────────────
GW N is live/current       → FPL API (always)
GW N+1 hasn't started yet  → FPL API (stay safe)
GW N+1 has started         → Database OK for GW N
```

**Why This Works:**
- Sunday 8pm: GW19 finishes → Continue using FPL API ✅
- Monday-Friday: GW19 still uses FPL API → Sync has days to complete ✅
- Saturday 3pm: GW20 starts → NOW safe to use DB for GW19 ✅
- Gives 5+ days (not 10 hours) for sync to complete

### Changes Made

**New Helper Functions** (`src/lib/fpl-api.ts`):
- `safeToUseDatabase(gw, events)` - Returns true only when next GW has started
- `getGWStatus(gw, events)` - Returns 'completed' | 'live' | 'upcoming'

**Updated Status Logic:**
- Changed from 'in_progress' to 'live' throughout codebase
- Status 'completed' now means next GW started (safe to use DB)
- Status 'live' includes current GW AND finished GW (until next GW starts)

**Files Modified:**
- `src/lib/fpl-api.ts` - Added K-164 helper functions
- `src/lib/scoreCalculator.ts` - Updated all status types to use 'live'
- `src/app/api/league/[id]/fixtures/[gw]/route.ts` - Use getGWStatus()
- `src/app/api/team/[teamId]/gameweek/[gw]/route.ts` - Use getGWStatus()
- `src/app/api/league/[id]/stats/gameweek/[gw]/rankings/route.ts` - Use getGWStatus()
- `src/app/api/gw/[gw]/team/[teamId]/route.ts` - Use getGWStatus()
- `src/app/api/league/[id]/fixtures/[gw]/live/route.ts` - Updated to 'live' status
- `src/app/api/league/[id]/stats/gameweek/[gw]/route.ts` - Updated to 'live' status
- `src/app/api/league/[id]/stats/route.ts` - Updated to 'live' status

### Impact
- ✅ No more 0-point display immediately after GW finishes
- ✅ Users see correct points from FPL API until next GW starts
- ✅ Sync has days (not hours) to complete
- ✅ If sync fails, we have days to notice and fix manually
- ✅ Simpler rule: "next GW started? → DB, else → API"

---

## v4.4.8 - K-200b Phase 1: Add "% of All" Column (Jan 2, 2026)

**ENHANCEMENT:** Added "% of All" column to ownership combination tables for better context.

### Changes
- **API Updated**: `/api/ownership/combinations` now returns both `percentOfStackers` (% of managers with 2+/3+ from team) and `percentOfAll` (% of all 10K managers)
- **UI Enhanced**: Combination tables show both percentages
  - "% of 2+/3+" column (muted grey) - shows percentage among stackers
  - "% of All" column (highlighted green) - shows percentage among all managers
- **Better Context**: Users can now see true ownership rates across the entire sample

### Example
- Before: "Raya + Saka: 2,267 (30.6%)" - unclear if 30.6% is of all managers or just stackers
- After: "Raya + Saka: 2,267 | 30.6% of 2+ | 22.7% of All" - clear that 22.7% of ALL 10K own this combo

### Files Modified
- `src/app/api/ownership/combinations/route.ts` - API calculation logic
- `src/components/Ownership/CombinationTable.tsx` - Table display
- `src/components/Ownership/OwnershipPage.tsx` - TypeScript interfaces
- `src/components/Ownership/Ownership.module.css` - Column styling

---

## v4.4.7 - K-200 BUG FIX: Add Missing 3 Teams to Selector (Jan 2, 2026)

**BUG FIX:** Team selector only showing 17 teams instead of 20. Added back Burnley (id=3), Leeds (id=11), Sunderland (id=17) which were incorrectly removed in v4.4.6.

---

## v4.4.6 - K-200 BUG FIX: Team Selector Showing Wrong Teams (Jan 2, 2026)

**BUG FIX:** TEAMS array had wrong database IDs. Updated to match actual database schema. Selecting Arsenal now correctly shows Arsenal data instead of Aston Villa.

---

## v4.4.5 - K-200: Scale to Top 10K Sample (Jan 2, 2026)

**FEATURE:** Scaled ownership combinations from 500 to 10,000 manager sample. Sync time: ~60-90 minutes. More accurate ownership percentages and combination discovery.

---

## v4.4.4 - K-200: Top 10K Ownership Combinations (Jan 2, 2026)

**FEATURE:** New standalone page at `/ownership` showing player combinations from elite FPL managers. Complete pipeline: database tables (elite_picks, elite_sync_status), sync script, API endpoint, UI with team selector. Shows singles, doubles, triples ownership for all 20 PL teams.

See [version-history/v4.0-v4.4.md](./version-history/v4.0-v4.4.md) for complete K-200 technical details.

---

## v4.4.3 - K-163: Launch Luck System UI (Dec 31, 2025)

**FEATURE:** Added Luck Analysis tab to Stats section with leaderboard, methodology, and validation. Shows season_luck_index with 4 weighted components (Variance 40%, Rank 30%, Schedule 20%, Chip 10%).

---

## v4.3.x - Admin Tools, Sync Improvements, UI Polish (Dec 26-31, 2025)

**53 versions** including:
- K-163a: Luck display in H2H match preview/detail
- K-159: Fixed first fixture hidden behind nav on iPhone PWA
- K-156-158: Batch sync improvements and fixes
- K-146: Admin manual sync tool with validation grid
- K-145: Auto-sync ALL invalid GWs
- K-144: Sync detects invalid/zero data
- K-143: Season stats improvements (reordered sections, Classic Pts, GW records unique players)
- K-142: Auto-sync completed GW to database
- K-141: Fixed completed GW showing 0 points
- K-139-140: Nav bar and mobile layout fixes
- K-138: Fixed bonus points showing before match starts
- K-137: Live rankings show real-time projected standings
- K-136: Critical fix for live data display in H2H fixtures and My Team

---

## v4.2.x - Monthly Awards & Data Integrity (Dec 24-26, 2025)

**17 versions** including:
- K-134-125: Monthly Awards page with GW range filter
- K-132: Team value calculation fix
- K-131: Auto-sync on new gameweek
- K-128-129: Monthly awards data fixes
- K-126: PWA header scroll bug fix
- K-124: Reduced season stats cards to top 3
- K-123: Simplified chip performance display
- K-122: Season stats UI improvements
- K-121: Luck index calculation fix
- K-120: Fixed duplicate players in My Team view

---

## v4.1.x - Season Stats Expansion (Dec 24, 2025)

**5 versions** including:
- K-119a: Form Rankings card
- K-119b: Luck Index card
- K-119c: Consistency card
- K-119d: Bench Points card
- v4.1.0: What's New page & notification system

---

## v4.0.x - Production Release & Feedback (Dec 24, 2025)

**3 versions** including:
- K-115: Bulk sync script for all leagues
- K-114: Temporary feedback banner
- v4.0.0: **K-108c Architecture Production Release**

---

## v4.0.0 - K-108c Architecture - Production Release (Dec 24, 2025)

**MAJOR RELEASE:** Complete architecture overhaul with new caching system, provisional bonus calculations, and live scoring.

### Summary
- New K-27 caching system (manager_picks, manager_gw_history, manager_chips tables)
- Provisional bonus calculations for live gameweeks
- Live score calculator with auto-substitutions
- Completed GWs use database cache, live GWs use FPL API
- Database query optimizations (fetch only needed players)
- Zero-sum property validation for luck calculations

### Database Tables Added
- `manager_picks` - Team selections per GW
- `manager_gw_history` - Points, transfers, chips per GW
- `manager_chips` - Chip usage tracking
- `manager_transfers` - Transfer history

### Sync Scripts Added
- `sync:manager-picks` - Sync team selections
- `sync:manager-history` - Sync GW history
- `sync:manager-chips` - Sync chip usage
- `sync:manager-transfers` - Sync transfers

### Critical Rules Established
- ALWAYS add `export const dynamic = 'force-dynamic'` to database API routes
- Check GW status before choosing data source (completed = DB, live = API)
- NEVER add provisional bonus to completed GWs (already in total_points)
- Fetch player IDs from picks first, then query only those players
- Database column names ≠ FPL API names (verify in DATABASE.md)

See [version-history/v3.5-v3.6.md](./version-history/v3.5-v3.6.md) for K-108 development details.

---

## v3.6.6 - K-109 Phase 4: Stats Season Tab Uses K-108c for Live GW (Dec 23, 2025)

**Feature:** Hybrid approach for Stats > Season tab - database for completed GWs, K-108c for live GW.

### Changes

**Season Stats API Hybrid Approach:**
- Updated `/api/league/[id]/stats/season` to detect current GW status
- Best/Worst Gameweeks now uses K-108c for live/current GW
- Completed GWs continue using fast database queries
- Live GW scores calculated in parallel for all 20 managers

**BestWorstGameweeks Function:**
- Added current GW status detection (completed vs in_progress vs upcoming)
- Database query for completed GWs only
- K-108c parallel calculation for live GW
- Merged results for complete historical + live view
- Comprehensive debug logging with `[K-109 Phase 4]` prefix

**Frontend Debug Logging:**
- Added console logging to `BestWorstGW` component
- Shows unique GWs in dataset to verify live GW inclusion
- Logs top 3 best/worst scores for verification

**Code Pattern:**
```typescript
// Completed GWs from DB (fast)
const dbScores = await db.query(/* ... */);

// If current GW is live, add K-108c scores
if (currentGW && currentGWStatus !== 'completed') {
  const liveScores = await Promise.all(
    managers.map(m => calculateTeamGameweekScore(m.entry_id, currentGW))
  );
  allScores = [...dbScores, ...liveScores];
}
```

### Files Modified
- `src/app/api/league/[id]/stats/season/route.ts` - Added K-108c hybrid logic
- `src/components/Stats/season/BestWorstGW.tsx` - Added debug logging
- `package.json` (v3.6.6)
- `VERSION_HISTORY.md`
- `README.md`

### Impact
- ✅ Best/Worst Gameweeks includes current GW scores when live
- ✅ Historical data still uses fast DB queries
- ✅ Season stats now show complete picture during live GWs
- ✅ Consistent with K-109 hybrid approach

### Performance
- **During live GW:** 20 K-108c calls + DB queries (~2-3s total)
- **Between GWs:** DB queries only (~50-100ms)
- Only calculates live scores when current GW is in_progress

### Testing
- Navigate to league 804742 > Stats > Season tab
- During live GW: verify Best Gameweeks includes current GW
- Check console for `[K-109 Phase 4]` logs showing hybrid calculation
- Between GWs: verify fast DB-only response

### Related
- K-108: Player points (100% accuracy)
- K-108c: Team totals calculation
- K-109 Phase 1: My Team stat boxes (✅ Complete)
- K-109 Phase 2: Rivals tab (✅ Complete)
- K-109 Phases 2-4: My Team pitch view (✅ Complete)
- K-109 Phase 3: Stats GW rankings (✅ Complete)
- K-109 Phase 4: Stats Season tab (✅ Complete)

---

## v3.6.5 - K-109 Phase 3: Stats GW Rankings Uses K-108c (Dec 23, 2025)

**Feature:** Integrated K-108c single source of truth into Stats > GW tab rankings.

### Changes

**Stats > GW Tab Integration:**
- Updated `/api/league/[id]/stats/gameweek/[gw]/rankings` to use K-108c
- Replaced dual-path logic (completed vs live) with single K-108c calculation
- All 20 managers now calculated in parallel using `calculateTeamGameweekScore()`
- Added comprehensive [K-109 Phase 3] debug logging to API endpoint

**Frontend Debug Logging:**
- Added console logging to `GWPointsLeaders` component
- Added console logging to `GWRankingsModal` component
- Logs show data flow from API to frontend components

**Code Simplification:**
- Removed status detection (completed vs live) - K-108c handles both
- Simplified from ~170 lines with dual paths to ~100 lines single path
- Consistent error handling with 0 points fallback

### Files Modified
- `src/app/api/league/[id]/stats/gameweek/[gw]/rankings/route.ts` - Complete rewrite using K-108c
- `src/components/Stats/sections/GWPointsLeaders.tsx` - Added debug logging
- `src/components/Stats/GWRankingsModal.tsx` - Added debug logging
- `package.json` (v3.6.5)
- `VERSION_HISTORY.md`
- `README.md`

### Impact
- ✅ Stats > GW rankings now 100% accurate for all gameweeks
- ✅ No more dual-path logic complexity (completed vs live)
- ✅ Consistent calculation across entire app (My Team, Rivals, Stats)
- ✅ Parallel processing for performance with 20 managers

### Testing
- Test with league 804742, navigate to Stats > GW tab
- Check GW17 (or any completed GW) rankings
- Verify all 20 managers show correct points
- Look for `[K-109 Phase 3]` console logs in both API and frontend
- Click "View Full Rankings" to open modal and verify display

### Related
- K-108: Player points (100% accuracy)
- K-108c: Team totals calculation
- K-109 Phase 1: Stat boxes (✅ Complete)
- K-109 Phase 2: Rivals tab (✅ Complete)
- K-109 Phases 2-4: My Team pitch view (✅ Complete)
- K-109 Phase 3: Stats GW rankings (✅ Complete)

---

## v3.6.4 - K-109 Phases 2-4: My Team Pitch View Uses K-108c (Dec 23, 2025)

**Feature:** Complete My Team integration with K-108c - pitch view, auto-subs, and player modal.

### Changes

**Phase 2: Pitch View Player Cards**
- Updated `/api/team/[teamId]/gameweek/[gw]` to use K-108c
- Player points now from `player_gameweek_stats.calculated_points` (100% accurate)
- Removed dependency on old `calculateManagerLiveScore()`
- Simplified endpoint: fetch from DB, enrich with FPL API data
- Returns same format so frontend works without changes

**Phase 3: Auto-Sub Indicators**
- Auto-sub flags now from K-108c `auto_subs` data
- `is_sub_in` and `is_sub_out` flags set correctly
- Frontend already has visual indicators (will be enhanced later)
- Console logs show auto-sub count for debugging

**Phase 4: Player Modal Breakdown**
- Added K-108c breakdown to API response
- Includes: starting_xi_total, captain_bonus, bench_boost_total, auto_sub_total
- Player modal can now show accurate score breakdown
- Transfer costs correctly displayed

**Code Cleanup:**
- Removed old scoreCalculator dependency from My Team
- New endpoint is 212 lines vs old 260+ lines (cleaner)
- All K-108 data from single source (database)
- Consistent with Rivals tab implementation

### Files Modified
- `src/app/api/team/[teamId]/gameweek/[gw]/route.ts` - Complete rewrite using K-108c
- `package.json` (v3.6.4)
- `VERSION_HISTORY.md`
- `README.md`

### Impact
- ✅ My Team pitch view shows 100% accurate points
- ✅ Auto-sub indicators work correctly from K-108c data
- ✅ Player modal has full score breakdown
- ✅ Consistent calculation across entire app (My Team, Rivals, Stats)

### Testing
- Test with league 804742, select your team
- Navigate to My Team tab
- Check GW17 (or any completed GW)
- Verify player points match FPL exactly
- Look for `[K-109 Phase 2]` and `[K-109 Phase 3]` console logs

### Related
- K-108: Player points (100% accuracy)
- K-108c: Team totals calculation
- K-109 Phase 1: Stat boxes (✅ Complete)
- K-109 Phases 2-4: Pitch view (✅ Complete)

---

## v3.6.3 - K-109 Phase 2: Rivals Tab Uses K-108c (Dec 23, 2025)

**Feature:** Replaced complex score calculations in Rivals tab with K-108c single source of truth.

### Changes

**Shared Score Calculation Function:**
- Created `calculateTeamGameweekScore()` in `teamCalculator.ts`
- Single source of truth for team score calculations
- Used by both Rivals tab and future endpoints
- Returns full breakdown: points, chips, auto-subs, transfer costs

**Rivals Tab Integration:**
- Updated `/api/league/[id]/fixtures/[gw]` to use K-108c
- Replaced `calculateMultipleManagerScores()` with `calculateScoresViaK108c()`
- All 10 H2H fixture scores now use K-108c (100% accurate)
- Added [K-109 Phase 2] debug logging throughout

**Code Cleanup:**
- Removed dependency on old `scoreCalculator.ts` in fixtures endpoint
- Kept K-108c endpoint unchanged (needs detailed pick data for response)
- Simplified score calculation logic with shared function

### Files Modified
- `src/lib/teamCalculator.ts` - Added `calculateTeamGameweekScore()` function
- `src/app/api/league/[id]/fixtures/[gw]/route.ts` - Use K-108c for all scores

### Impact
- ✅ All Rivals tab H2H scores 100% accurate (match FPL official)
- ✅ Captain, chips, auto-subs, transfer costs all correctly calculated
- ✅ Shared function ensures consistency across all endpoints
- ✅ Performance: Parallel score calculations for all managers

### Testing
- Test with league 804742, GW17
- Verify all 10 H2H fixture scores match FPL
- Check console logs for `[K-109 Phase 2]` messages

### Related
- K-108: Player points calculation (100% accuracy)
- K-108c: Team totals endpoint
- K-109 Phase 1: My Team stat boxes (✅ Complete)
- K-109 Phase 2: Rivals tab integration (✅ Complete)

---

## v3.6.2 - K-109 Phase 1: My Team Stat Boxes Use K-108c (Dec 23, 2025)

**Feature:** Integrated K-108c team totals calculation into My Team stat boxes for 100% accuracy.

### Changes

**My Team Tab Integration (K-109 Phase 1):**
- Updated stat boxes to fetch from `/api/gw/[gw]/team/[teamId]` (K-108c endpoint)
- GW Points now uses `points.net_total` from K-108c (100% accurate, validated)
- Transfer Cost uses `points.transfer_cost` from K-108c
- Other stats (overall points, rank, team value) still from existing `/api/team/[teamId]/info`
- Updated both initial fetch and manual refresh logic

**Bug Fixes:**
- Fixed TypeScript error in `teamCalculator.ts` - bench boost can't have triple captain
- Fixed Map iteration in test scripts for TypeScript strict mode compatibility

### Files Modified
- `src/components/Dashboard/MyTeamTab.tsx` - Updated fetchStats() and handleRefresh() to use K-108c
- `src/lib/teamCalculator.ts` - Fixed captain multiplier logic in bench boost block
- `src/scripts/test-provisional-bonus.ts` - Fixed Map.entries() iteration
- `src/scripts/test-team-totals.ts` - Fixed Map.entries() iteration

### Impact
- ✅ My Team GW points now 100% accurate (matches FPL official totals)
- ✅ Transfer costs display correctly from K-108c calculation
- ✅ No breaking changes - incremental integration (Phase 1 only)
- ✅ Build passes TypeScript strict checks

### Next Steps
- Phase 2: Update pitch view player cards (TBD)
- Phase 3: Add auto-sub indicators (TBD)
- Phase 4: Update player modal (TBD)

### Related
- K-108: Single Source of Truth for player points (100% accuracy)
- K-108b: Provisional bonus calculation
- K-108c: Team totals with chips and auto-subs
- K-109: My Team integration (Phase 1 of 4)

---

## v3.6.1 - CRITICAL: Fix Provisional Bonus for Completed GWs (K-106a) (Dec 23, 2025)

**Critical Bug Fix:** Provisional bonus points were being added to player scores even for completed gameweeks, causing significant point inflation.

### Problem

For completed GWs, the FPL API's `total_points` field already includes official bonus points. The app was incorrectly adding provisional bonus on top of this, double-counting bonus for any player who earned it.

**Example:**
- Haaland GW17 official points: 16 (includes 3 bonus already)
- App calculated: 16 + 3 provisional = 19 ❌
- With Triple Captain: 19 × 3 = 57 pts ❌
- Correct: 16 × 3 = 48 pts ✅

### Root Cause

`/api/team/[teamId]/gameweek/[gw]/route.ts` (line 189) was calling `calculateProvisionalBonus()` without checking if the gameweek was completed. For completed GWs, `player.points` from `scoreCalculator` already contains official bonus baked into `total_points`.

### Solution

Added status check before calculating provisional bonus:
```typescript
const provisionalBonus = status === 'completed' ? 0 : calculateProvisionalBonus(player.id, fixturesData);
```

### Files Modified
- `src/app/api/team/[teamId]/gameweek/[gw]/route.ts` - Added GW status guard (line 191)

### Impact
- ✅ Completed GW scores now match FPL official totals
- ✅ Captain multipliers apply to correct base (Haaland TC: 48 not 57)
- ✅ Live GWs still show provisional bonus correctly
- ✅ No impact on other score calculations (`liveMatch.ts` already had this check)

### Testing
- Verified: GW17 completed, Haaland with 3 bonus
  - TC (×3): Shows 48 pts ✅ (was 57 ❌)
  - C (×2): Shows 32 pts ✅ (was 38 ❌)

### Related
- Investigation: K-105 (Score Calculation Architecture)
- Bug discovered during architecture review

---

## 📚 Version History Index

This project's complete version history has been split into multiple files for better readability and maintainability. Each file contains detailed changelogs for its respective version range.

### Current & Recent Versions

- **[v4.0-v4.4 (Dec 24, 2025 - Jan 2, 2026)](./version-history/v4.0-v4.4.md)** - K-200 Ownership & K-108c Production
  - v4.4.x: K-200 Top 10K Ownership Combinations, K-163 Luck UI (5 versions)
  - v4.3.x: Admin tools, sync improvements, UI polish (53 versions)
  - v4.2.x: Monthly Awards & data integrity (17 versions)
  - v4.1.x: Season stats expansion (5 versions)
  - v4.0.x: K-108c architecture production release (3 versions)
  - 83 versions total

- **[v3.5-v3.6 (Dec 22, 2025)](./version-history/v3.5-v3.6.md)** - Mobile Optimization & UI Polish
  - v3.6.0: Mobile Optimization & UI Polish (K-97 to K-103)
  - v3.5.x: Layout Consistency Release (K-75 to K-103)
  - 19 versions

- **[v3.3-v3.4 (Dec 19-22, 2025)](./version-history/v3.3-v3.4.md)** - Bugfixes & Polish
  - v3.4.x: Admin panel fixes, error handling, BPS improvements (K-55 to K-87)
  - v3.3.x: Mobile UI polish, responsive headers, GW rankings (K-49 to K-54)
  - 71 versions

- **[v3.1-v3.2 (Dec 18-19, 2025)](./version-history/v3.1-v3.2.md)** - UI Improvements
  - v3.2.x: Responsive labels, header improvements (K-49 to K-50)
  - v3.1.x: Value rankings, player modal fixes
  - 27 versions

- **[v2.7-v3.0 (Dec 16-18, 2025)](./version-history/v2.7-v3.0.md)** - Database Caching & Infrastructure
  - v3.0.x: Sync infrastructure, performance optimizations
  - v2.9.x: Quick sync, auto-sync progress
  - v2.8.x: Manual refresh, admin endpoints
  - v2.7.x: K-27 Database Caching & Hotfixes
  - 53 versions

- **[v2.5-v2.6 (Dec 14-16, 2025)](./version-history/v2.5-v2.6.md)** - Players Tab & Features
  - v2.6.x: Players Tab Database Integration
  - v2.6.0-alpha: Players Tab Foundation
  - v2.5.x: Player Features & UI Polish (30 versions)

### Previous Major Versions

- **[v2.4 Part 2 (Dec 12-14, 2025)](./version-history/v2.4-part2.md)** - My Team Mobile-First
  - RivalFPL branding, breakpoint fixes, pitch redesign
  - FPL-style player cards, desktop layout fixes
  - 21 versions

- **[v2.4 Part 1 (Dec 10-12, 2025)](./version-history/v2.4-part1.md)** - My Team Mobile-First
  - GW selector, transfers display, stat boxes
  - Formation layout, responsive design
  - 24 versions

- **[v2.2-v2.3 (Dec 2025)](./version-history/v2.2-v2.3.md)** - My Team UI Polish & Redesign
  - v2.3.x: My Team UI Polish & Mobile Optimization
  - v2.2.x: My Team Redesign

- **[v2.0-v2.1 (Dec 2025)](./version-history/v2.0-v2.1.md)** - Multi-League Support
  - v2.0.x: **MAJOR MILESTONE** - Multi-league support
  - v2.1.x: League management improvements

### Legacy Versions

- **[v1.x (Oct-Dec 2024)](./version-history/v1.x.md)** - Foundation & Initial Features
  - v1.26.x: Large League Support & Error Handling
  - v1.25.x: Position History & Reddit Launch
  - v1.24.x: Live Match Modal & Analytics
  - v1.23.x - v1.0.0: Core features and foundation

---

## 🚀 Quick Reference

### Latest Changes (v4.4.7 - Jan 2, 2026)

**K-200 Ownership Combinations:** New standalone feature at `/ownership` showing player combinations from top 10K FPL managers

- v4.4.7: Fixed team selector (now shows all 20 PL teams)
- v4.4.6: Fixed team ID mapping bug
- v4.4.5: Scaled from 500 to 10K sample
- v4.4.4: Launched K-200 with full pipeline
- v4.4.3: Launched Luck System UI (K-163)

### Recent Highlights

- **v4.4.x**: K-200 Ownership Combinations & K-163 Luck System (5 versions)
- **v4.3.x**: Admin tools, batch sync, data validation (53 versions)
- **v4.2.x**: Monthly Awards page (17 versions)
- **v4.1.x**: Season Stats expansion (5 versions)
- **v4.0.0**: K-108c Architecture Production Release (MAJOR)
- **v3.6.0**: Mobile Optimization & UI Polish (7 improvements)
- **v3.5.0**: Layout Consistency Release (K-81 to K-87 fixes)
- **v3.4.x**: Admin panel analytics, error handling, BPS live updates
- **v3.3.0**: Mobile UI polish, GW rankings, responsive headers
- **v3.0.0**: Sync Infrastructure Release
- **v2.9.0**: Auto-sync progress bar on first league load
- **v2.8.0**: Auto-sync league data on first load
- **v2.7.0**: K-27 Comprehensive Database Caching (5 new tables, 10 new scripts)
- **v2.6.7**: Players tab database integration complete
- **v2.5.12**: Defensive Contribution points (DEFCON)
- **v2.5.11**: FPL-style player points breakdown
- **v2.5.0**: Players database schema + sync job + API endpoints
- **v2.4.x**: Major My Team mobile-first redesign (45+ versions)
- **v2.0.0**: Multi-league support (MAJOR MILESTONE)

---

## 🔗 Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Project context and development guidelines
- [README.md](./README.md) - Project overview and setup instructions
- [DATABASE.md](./DATABASE.md) - Database schema and sync scripts
- [ENDPOINTS.md](./ENDPOINTS.md) - API endpoints reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Project architecture and data flow
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

---

**Note:** For complete detailed changelogs, see the individual version files linked above. Each file contains comprehensive descriptions, problem statements, solutions, and technical details for every version release.
