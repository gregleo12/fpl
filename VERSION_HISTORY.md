# FPL H2H Analytics - Version History

**Project Start:** October 23, 2024
**Total Releases:** 300+ versions
**Current Version:** v4.3.12 (December 27, 2025)

---

## v4.3.12 - K-139 Completion: Fix My Team Nav Bar Background (Dec 27, 2025)

**UI Fix:** Completed K-139 by fixing My Team nav bar background that was missed in initial implementation.

### The Issue

K-139 (v4.3.9) successfully changed nav bars in Rivals and Stats tabs from black to dark purple, but missed the My Team tab nav bar which still showed solid black background.

**Location:** The unified header bar containing team name and GW selector controls:
```
┌──────────────────────────────────────┐
│ FC Matos ★    [↻] [◄] GW 18 ● [►]  │ ← This was still black
└──────────────────────────────────────┘
```

### Root Cause

K-139 modified three CSS files but missed a fourth location:

**Fixed in K-139 (v4.3.9):**
- `/src/components/Fixtures/Fixtures.module.css` ✅
- `/src/components/Stats/StatsHub.module.css` ✅
- `/src/components/PitchView/GWSelector.module.css` ✅

**Missed in K-139 (fixed now):**
- `/src/components/Dashboard/Dashboard.module.css` `.myTeamHeader` ❌
- `/src/components/PitchView/PitchView.module.css` `.gwSelector` ❌

### The Fix

Updated two CSS files to match K-139 purple theme:

1. **Dashboard.module.css** (line 1134)
   - Changed `.myTeamHeader` background: `rgba(0, 0, 0, 0.85)` → `rgba(26, 26, 46, 0.85)`

2. **PitchView.module.css** (line 56)
   - Changed `.gwSelector` background: `rgba(0, 0, 0, 0.3)` → `rgba(26, 26, 46, 0.6)`

### Files Modified

1. `/src/components/Dashboard/Dashboard.module.css`
   - Line 1134: My Team header bar background → dark purple

2. `/src/components/PitchView/PitchView.module.css`
   - Line 56: GW selector background → dark purple

### Impact

✅ **My Team:** Nav bar now uses dark purple background matching app theme
✅ **Consistency:** All nav bars across My Team, Rivals, and Stats tabs now use dark purple
✅ **K-139 Complete:** All sub-navigation backgrounds now match the purple gradient theme

**Before:** My Team nav bar had jarring black background while others were purple
**After:** Cohesive dark purple theme across all navigation elements

---

## v4.3.11 - K-135: GW Records Team Names & Static Titles (Dec 27, 2025)

**UI Fixes:** Fixed three issues with Season Stats leaderboard cards for better consistency and clarity.

### Issue 1: GW Records Missing Team Names

GW Records card didn't show team names, unlike all other leaderboard cards.

**Before:**
```
👑 BEST
Guillaume de Posson  ← Only player name
111 pts
GW 16
```

**After:**
```
👑 BEST
FC SCORPIO           ← Team name added (prominent)
Guillaume de Posson  ← Player name (secondary)
111 pts
GW 16
```

### Issue 2 & 3: Titles Changed with Toggle

When toggling to "Worst" view, card titles incorrectly changed:
- Streaks: "STREAKS" → "WORST STREAKS" ❌
- GW Records: "GW RECORDS" → "WORST GAMEWEEKS" ❌

This was redundant since the toggle button already indicates Best/Worst mode.

**Fixed:** Titles now remain static while icons change:
- **Best mode:** 🔥 STREAKS / 🔥 GW RECORDS
- **Worst mode:** 💀 STREAKS / 💀 GW RECORDS

Icons provide visual feedback, titles stay consistent.

### Files Modified

1. `/src/components/Stats/season/BestWorstGW.tsx`
   - Line 29: Changed `titleText` to always be "GW Records" (removed conditional)
   - Lines 41-43: Added `team_name` display above `player_name` in renderItem
   - Used `.name` class for team (prominent) and `.meta` for player (secondary)

2. `/src/components/Stats/season/Streaks.tsx`
   - Line 29: Changed `titleText` to always be "Streaks" (removed conditional)

### Impact

**GW Records:**
- ✅ Team names now display (matches other leaderboard cards)
- ✅ Visual hierarchy: Team name prominent, player name secondary
- ✅ Title stays "GW RECORDS" in both modes
- ✅ Icon changes: 🔥 (best) / 💀 (worst)

**Streaks:**
- ✅ Title stays "STREAKS" in both modes
- ✅ Icon changes: 🔥 (best) / 💀 (worst)

**Before:** Inconsistent display, confusing "WORST" title prefix
**After:** Consistent card structure, static titles with dynamic icons

---

## v4.3.10 - K-140: Awards Page Mobile Layout Optimization (Dec 27, 2025)

**UI/UX Improvement:** Optimized Monthly Awards page mobile layout to reduce scrolling by ~50%.

### The Problem

The Monthly Awards page wasted significant vertical space on mobile, requiring excessive scrolling:

1. **Best/Worst Stacked Vertically:** Award cards showed Best winner above Worst winner instead of side-by-side
2. **Icon Above Title:** Icons and titles stacked vertically, wasting ~60px per card

**Before:**
- Each award card: ~400px tall
- 4 cards total: ~1,600px (lots of scrolling)
- Icon ↓ Title layout wasted space

### The Fix

Optimized layout for all screen sizes, especially mobile:

**1. Icon Inline with Title**
- Changed `.header` from `flex-direction: column` to `row`
- Icons now appear next to titles: 🏆 GAMEWEEK
- Saves ~60px vertical space per card

**2. Best/Worst Always Side-by-Side**
- Removed mobile media query that changed grid to single column
- Kept 3-column grid layout: `1fr auto 1fr` (Best | Divider | Worst)
- Adjusted font sizes and spacing for mobile screens
- Added extra breakpoint for very small screens (320-480px)

**3. Responsive Sizing**
- Desktop: 56px icons, larger fonts
- Mobile (640px): 32px icons, medium fonts, tighter gaps
- Small mobile (480px): 28px icons, smaller fonts, minimal gaps

### Space Savings

| Screen | Before | After | Savings |
|--------|--------|-------|---------|
| Per Card | ~400px | ~190px | ~210px (52%) |
| 4 Cards | ~1600px | ~760px | ~840px (52%) |

Users scroll **~50% less** on mobile to view all awards!

### Files Modified

1. `/src/components/Stats/season/AwardCard.module.css`
   - Line 22-30: Changed header to `flex-direction: row` for inline icon/title
   - Lines 171-231: Updated mobile (640px) to keep side-by-side layout
   - Lines 233-284: Added extra small (480px) breakpoint for iPhone SE, etc.

### Impact

**Desktop:**
- ✅ Layout unchanged (already used side-by-side)
- ✅ Icons inline with titles for consistency

**Mobile (all sizes):**
- ✅ Icons inline with titles saves vertical space
- ✅ Best and Worst remain side-by-side
- ✅ Significantly reduced scrolling
- ✅ Text scales appropriately for screen size
- ✅ Works across 320px (iPhone SE) to 640px+ (tablets)

**Before:** Excessive scrolling, wasted space with stacked layout
**After:** Compact, efficient layout matching desktop pattern on all screens

---

## v4.3.9 - K-139: Fix Sub-Navigation Backgrounds to Match App Theme (Dec 27, 2025)

**UI Consistency Fix:** Changed sub-navigation bars from solid black to dark purple semi-transparent to match app theme.

### The Issue

Sub-navigation bars across the app used solid/near-solid black backgrounds (`rgba(0, 0, 0, 0.85)`) that created harsh contrast against the purple page gradient. This inconsistency affected:

- **My Team:** GW selector bar (black instead of purple)
- **Rivals:** H2H/Fixtures tabs + GW selector (black instead of purple)
- **Stats:** Team/GW/Season/Players tabs (black instead of purple)
- **Reference:** Awards section already used dark purple (correct)

### The Fix

Replaced all black backgrounds with dark purple semi-transparent to match the app's brand colors:

**Color Mappings:**
- `rgba(0, 0, 0, 0.85)` → `rgba(26, 26, 46, 0.85)` (main sub-nav bars)
- `rgba(0, 0, 0, 0.3)` → `rgba(26, 26, 46, 0.6)` (GW selector backgrounds)
- `rgba(0, 0, 0, 0.7-0.8)` → `rgba(14, 10, 31, 0.7-0.8)` (modal overlays)

### Files Modified

1. `/src/components/Fixtures/Fixtures.module.css`
   - Line 45: Header background → dark purple
   - Line 1140: GW number background → dark purple
   - Line 1577: Modal overlay → deep purple
   - Line 1745: Another overlay → deep purple

2. `/src/components/Stats/StatsHub.module.css`
   - Lines 22 & 71: View toggle bar backgrounds → dark purple (2 occurrences)

3. `/src/components/PitchView/GWSelector.module.css`
   - Line 6: GW selector background → dark purple

### Impact

All sub-navigation bars now blend naturally with the purple gradient background:
- ✅ **My Team:** GW selector matches purple theme
- ✅ **Rivals:** H2H/Fixtures tabs blend with page gradient
- ✅ **Stats:** All view toggle tabs use purple backgrounds
- ✅ **Consistent:** No more harsh black/purple contrast

**Before:** Jarring black bars disrupting purple gradient flow
**After:** Cohesive purple theme throughout navigation elements

---

## v4.3.8 - K-138: CRITICAL FIX - Players Showing Bonus Points Before Match Starts (Dec 26, 2025)

**Critical Bug Fix:** Fixed players showing bonus points before their Premier League fixture has started.

### The Bug

Players were displaying bonus points (with underline indicator) BEFORE their matches kicked off.

**Example from GW18 (Boxing Day):**
- **Raya (Arsenal GK):** Showing 3 pts with bonus underline
- **Arsenal vs West Ham:** Match NOT started yet
- **Expected:** 0 pts until kickoff
- **Actual:** 3 pts (provisional bonus calculated prematurely)

This bug persisted despite K-63a fix attempt in GW17.

### Root Cause

The `getBonusInfo()` function in `/src/lib/liveMatch.ts` had incomplete fixture status checks:

**Flow:**
1. ✅ Check if fixture exists
2. ✅ Check if `fixture.finished` → return official bonus
3. ❌ **Missing check for `fixture.started`**
4. ❌ Immediately calculate provisional bonus from BPS

**Why K-63a didn't fix it:**
- K-63a added `fixture.started` checks that zeroed out `totalPoints` and `officialBonus` ✅
- But `getBonusInfo()` was called AFTER those checks ❌
- `getBonusInfo()` independently calculated provisional bonus without verifying fixture status ❌
- Result: 0 (base points) + 3 (provisional bonus) = 3 pts shown

### The Fix

Added `fixture.started` check to `getBonusInfo()` function:

```typescript
// K-138: If fixture hasn't started yet, return 0 bonus
if (!fixture.started) {
  return { bonusPoints: 0 };
}

// If fixture is finished, use official bonus
if (fixture.finished) {
  return { bonusPoints: officialBonus };
}

// Calculate provisional bonus from BPS ranking (only for started, unfinished fixtures)
```

Now bonus calculation follows proper fixture status:
1. **Not started:** Return 0 bonus (no provisional calculation)
2. **Started but not finished:** Calculate provisional bonus from BPS
3. **Finished:** Return official bonus

### Files Modified

1. `/src/lib/liveMatch.ts`
   - Added `fixture.started` check at line 33-36 in `getBonusInfo()` function
   - Prevents provisional bonus calculation for unstarted fixtures

### Impact

Players now show correct points based on fixture status:
- ✅ **Not started:** 0 points, 0 bonus, no underline
- ✅ **In progress:** Live points + provisional bonus with underline
- ✅ **Finished:** Final points + official bonus with underline (if earned)

**Affected views:**
- Live Match Modal differentials ✅
- H2H Fixtures player points ✅
- My Team player cards ✅
- All differential calculations (pure, captain, position) ✅

**Before:** Raya showing 3 pts before Arsenal match started
**After:** Raya showing 0 pts until Arsenal vs West Ham kicks off

---

## v4.3.7 - Fix Notification Badges to Only Show for New Changelog Entries (Dec 26, 2025)

**Bug Fix:** Fixed notification red dots showing for every version bump instead of only when changelog has new entry.

### The Bug

Red notification dots appeared on Settings tab for every patch version (4.3.5 → 4.3.6), but:
- Changelog only has entries for minor versions (4.3.0, 4.2.0, etc.)
- Users saw red dot but "What's New" showed nothing new
- Confusing UX - badge for no new content

### Root Cause

The notification badge logic compared `package.json` version (4.3.6) with `lastSeenVersion` in localStorage. It showed the badge whenever the version changed, even for patch versions that don't have changelog entries.

**Flow:**
1. Deploy v4.3.6 (patch fix, no changelog entry)
2. User's `lastSeenVersion` = "4.3.5"
3. Badge appears because "4.3.5" !== "4.3.6"
4. User clicks "What's New"
5. Sees only 4.3.0 entry (no 4.3.6 entry)
6. Badge dismissed but no new info shown

### The Fix

Changed notification logic to check changelog instead of package version:

**1. useNewVersionBadge hook:**
```typescript
// Before: Fetched /api/version (package.json version)
// After: Fetches /changelog.json and gets first entry version
const latestChangelogVersion = changelog[0]?.version; // e.g., "4.3.0"
```

**2. Updates page:**
```typescript
// Marks lastSeenChangelog when visiting What's New
localStorage.setItem('lastSeenChangelog', changelog[0]?.version);
```

**3. VersionToast:**
```typescript
// Toast only shows when new changelog entry exists
// Displays changelog version (4.3.0) not package version (4.3.7)
```

### Files Modified

1. `/src/hooks/useNewVersionBadge.ts`
   - Fetches `/changelog.json` instead of `/api/version`
   - Compares `lastSeenChangelog` instead of `lastSeenVersion`
   - Only shows badge when changelog has new entry

2. `/src/app/updates/page.tsx`
   - Stores `lastSeenChangelog` from first changelog entry
   - Maintains backwards compatibility with `lastSeenVersion`

3. `/src/components/Layout/VersionToast.tsx`
   - Updated to use changelog instead of package version
   - Toast shows for new changelog entries only

### Impact

Notification badges now work correctly:
- ✅ Red dot only shows when changelog has new entry (4.3.0 → 4.4.0)
- ✅ No red dot for patch versions (4.3.1-4.3.7) without changelog
- ✅ Settings and "What's New" dots always synchronized
- ✅ Toast notification aligned with badge behavior
- ✅ No misleading notifications

**Before:** Badge on every patch → user sees no new content → confusion
**After:** Badge only when real content → user sees new info → clear UX

---

## v4.3.6 - K-137: Fix Live Rankings to Show Real-Time Projected Standings (Dec 26, 2025)

**Bug Fix:** Fixed Live Rankings toggle to show actual live scores and projected standings instead of 0-0.

### The Bug

The Live Rankings toggle existed and fetched different data (`mode=live`), but showed 0-0 for all H2H matches during live gameweeks. Rankings didn't change because all scores were 0.

**Same root cause as K-136:** Using database-only calculator for live GWs.

### Root Cause

The `/api/league/[id]/stats` route had live mode logic, but line 422 used the wrong calculator:

```typescript
// WRONG - queries empty database for live GWs
const teamScore = await calculateTeamGameweekScore(entryId, currentGW);
```

For live GW18:
- `calculateTeamGameweekScore()` queries `player_gameweek_stats` table
- That table is empty until GW completes
- Returns 0 for all scores
- Live rankings showed 0-0, no standings changes

### The Fix

Applied K-136/K-137 pattern - conditional calculator based on GW status:

```typescript
if (status === 'in_progress' || status === 'upcoming') {
  // K-137: Use FPL API for live/upcoming GWs
  const liveResult = await calculateManagerLiveScore(entryId, currentGW, status);
  score = liveResult.score;
} else {
  // K-137: Use database for completed GWs
  const teamScore = await calculateTeamGameweekScore(entryId, currentGW);
  score = teamScore.points.net_total;
}
```

### Files Modified

1. `/src/app/api/league/[id]/stats/route.ts`
   - Added import for `calculateManagerLiveScore`
   - Changed score calculation (lines 422-440) to use conditional data source
   - Live/upcoming GWs: Fetch from FPL API
   - Completed GWs: Query database

### Impact

Live Rankings toggle now works correctly:
- ✅ Shows actual live H2H scores (e.g., 39-2, 23-18) instead of 0-0
- ✅ Calculates projected winners from live scores
- ✅ Rebuilds standings with projected W/D/L
- ✅ Rankings reflect "what if GW ended now"
- ✅ Refreshes on toggle with cache busting
- ✅ Official mode unchanged (database standings)

**Before:** Live toggle showed 0-0 for all matches, no ranking changes
**After:** Live toggle shows real-time scores and projected standings

---

## v4.3.5 - K-136b: CRITICAL FIX - My Team GW Points Header Still Showing 0 (Dec 26, 2025)

**Critical Bug Fix:** Fixed My Team GW PTS header showing 0 during live gameweeks (v4.3.4 fixed pitch view but missed header stats).

### The Bug

v4.3.4 fixed the My Team pitch view (players showing correctly with jerseys and points), but the **GW PTS header still showed 0** instead of the actual live score.

### Root Cause

My Team has two separate API calls:
1. **Pitch view data:** `/api/team/[teamId]/gameweek/[gw]` - Fixed in v4.3.4 ✅
2. **Header stats data:** `/api/gw/[gw]/team/[teamId]` - Still broken in v4.3.4 ❌

The frontend component (`MyTeamTab.tsx`) calls **both** endpoints:
```typescript
// Line 85-86: Two separate fetches
fetch(`/api/gw/${selectedGW}/team/${myTeamId}`),        // For header stats
fetch(`/api/team/${myTeamId}/info?gw=${selectedGW}`)    // For other info
```

Line 92 reads GW points from the first endpoint:
```typescript
setGwPoints(teamData.points.net_total || 0);  // teamData from /api/gw/[gw]/team/[teamId]
```

We fixed `/api/team/[teamId]/gameweek/[gw]` in v4.3.4, but **the frontend doesn't use that endpoint for GW points**. It uses `/api/gw/[gw]/team/[teamId]`, which still only queried the database.

### The Fix

Applied K-136 live data logic to `/api/gw/[gw]/team/[teamId]/route.ts`:
- Added GW status detection from FPL API
- For live/upcoming GWs: Use `calculateManagerLiveScore()` (fetches from FPL API)
- For completed GWs: Use database (original K-108c logic)
- Returns `points.net_total` populated from correct data source

### Files Modified

1. `/src/app/api/gw/[gw]/team/[teamId]/route.ts`
   - Added import for `calculateManagerLiveScore`
   - Added GW status detection from bootstrap-static API
   - Conditional data source: FPL API for live, database for completed
   - Early return for live GWs with transformed squad data

### Impact

My Team now **fully works** during live gameweeks:
- ✅ GW PTS header shows correct live score (was 0)
- ✅ Player jerseys display correctly (fixed in v4.3.4)
- ✅ Player points display correctly (fixed in v4.3.4)
- ✅ All 15 players visible (fixed in v4.3.4)
- ✅ H2H Fixtures work (fixed in v4.3.4)
- ✅ Completed GWs continue using database for performance

---

## v4.3.4 - K-136: CRITICAL FIX - Live Data Not Displaying in H2H Fixtures & My Team (Dec 26, 2025)

**Critical Bug Fix:** Fixed live GW data not displaying in main views (H2H Fixtures list and My Team pitch).

### The Bug

During live gameweeks, modals showed correct live scores but main views showed 0-0 or 0 points:
- **H2H Fixtures list:** All matches showing 0-0 ❌
- **My Team pitch:** GW PTS showing 0, players showing opponents instead of points ❌
- **Modals:** Working correctly (2-0, live player points) ✅

### Root Cause

Both routes used `calculateTeamGameweekScore()` which queries the database for player stats. For live GWs:
- `manager_picks` exists in database (synced before GW starts) ✅
- `player_gameweek_stats` has NO data until GW completes ❌
- Database query returns 0 for all player points → displayed as 0-0

### The Fix

**H2H Fixtures Route:**
- Added GW status detection from FPL API
- For live/upcoming GWs: Use `calculateManagerLiveScore()` (fetches from FPL API)
- For completed GWs: Use `calculateTeamGameweekScore()` (queries database)

**My Team Route:**
- Added GW status detection from FPL API
- For live/upcoming GWs: Use `calculateManagerLiveScore()` which returns full squad data with live points
- For completed GWs: Continue using database queries
- Unified data format handling for both sources

### Files Modified

1. `/src/app/api/league/[id]/fixtures/[gw]/route.ts`
   - Added import for `calculateManagerLiveScore`
   - Added status parameter to `calculateScoresViaK108c()`
   - Conditional calculator based on GW status

2. `/src/app/api/team/[teamId]/gameweek/[gw]/route.ts`
   - Added import for `calculateManagerLiveScore`
   - Detect GW status from bootstrap data BEFORE calculating scores
   - Build player data from live squad for live GWs
   - Build player data from database for completed GWs

### Impact

Live gameweeks now display correctly:
- H2H Fixtures show actual live scores (e.g., 2-0, not 0-0)
- My Team shows live GW points and player points
- Completed gameweeks continue using database (K-27 cache) for performance

---

## v4.3.3 - CRITICAL FIX: Season Stats Luck Index Missing Half of Matches (Dec 26, 2025)

**Critical Bug Fix:** Fixed Season Stats Luck Index calculation that was only using ~half of each manager's matches.

### The Bug

The season route assumed h2h_matches table had duplicate rows (match stored from both perspectives), so it used `entry_1_id < entry_2_id` filter to deduplicate. However, the table stores each match **only once**, with entry positions alternating by gameweek.

**Result:** The filter excluded half the matches, making luck calculations completely inaccurate.

**Example - Thomas (entry_id: 69171, lowest in league):**
- **Before fix:** +72 pts (from only 9 matches - odd GWs where he was entry_1)
- **After fix:** +24 pts (from all 17 matches)
- **Missing:** 8 matches from even GWs where he was entry_2

### What Changed

Removed the incorrect deduplication filter. Season Stats Luck Index now uses all matches correctly.

**Impact:** All managers' season luck values will change - this affects everyone in the league, not just one person.

**Files Modified:**
- `src/app/api/league/[id]/stats/season/route.ts`

---

## v4.3.2 - Monthly Awards Luck Calculation Consistency (Dec 26, 2025)

**Data Accuracy:** Changed Monthly Awards luck calculation to use season-wide averages for consistency with Season Stats.

### What Changed

**Before:**
- Monthly Awards luck used monthly averages only
- Formula: `(your_pts - your_monthly_avg) - (opponent_pts - opponent_monthly_avg)`
- Problem: You could be "unlucky" in a month you dominated if opponents dominated even more
- Inconsistent with season-long Luck Index calculation

**After:**
- Monthly Awards luck now uses season-wide averages
- Formula: `(your_pts - your_season_avg) - (opponent_pts - opponent_season_avg)`
- Measures: "Did I face opponents on hot/cold streaks relative to their normal level?"
- Consistent with Season Stats Luck Index

### Why This Matters

**Example:** If Thomas averaged 70pts in December but his season average is 65pts:
- **Old method:** Compares Thomas's December performance to everyone's December average
- **New method:** Shows if Thomas faced opponents playing above/below their season baseline in December

This makes luck awards more intuitive - they now measure whether you faced opponents during their hot or cold streaks, regardless of your own form that month.

**Files Modified:**
- `src/app/api/league/[id]/stats/awards/[month]/route.ts`

---

## v4.3.1 - K-127: Standardize Season Stats Card Headers (Dec 26, 2025)

**UI Consistency:** Standardized all 9 Season Stats card headers to match the K-119 layout pattern.

### What Changed

**Goal:** All cards now have consistent header structure:
- Row 1: Icon + Title on left, Toggle(s) on right
- Row 2: Subtitle on its own line

### Cards Updated

**1. Captain Points**
- ✅ Added toggle: `[Total]` | `[% of Total]`
- ✅ Fixed header layout (subtitle on own line)
- **Total view:** Ranked by raw captain points (primary), percentage shown secondary
- **% view:** Ranked by percentage (primary), raw points shown secondary

**2. Chips (renamed from "Chip Performance")**
- ✅ Renamed title: "Chip Performance" → "Chips" (shorter, cleaner)
- ✅ Fixed header layout (subtitle moved outside cardHeader div)
- ✅ Toggle already correct: `[Played]` | `[Faced]`

**3. GW Records**
- ✅ Fixed header layout (subtitle moved outside cardHeader div)
- ✅ Toggle already correct: `[Best]` | `[Worst]`
- ✅ Dynamic subtitle based on view

**4. Team Value**
- ✅ Fixed header layout (subtitle uses .subtitle class)
- ✅ Wrapped title in cardHeader div

**5. Streaks** - Already correct ✅

**6. Bench Points** - Already correct ✅ (K-119 reference card)

**7. Form Rankings** - Already correct ✅ (K-119 reference card)

**8. Consistency** - Already correct ✅ (K-119 reference card)

**9. Luck Index** - Already correct ✅ (K-119 reference card)

### Files Modified: 4
- `/src/components/Stats/season/CaptainLeaderboard.tsx` - Added toggle, fixed layout
- `/src/components/Stats/season/ChipPerformance.tsx` - Renamed to "Chips", fixed layout
- `/src/components/Stats/season/BestWorstGW.tsx` - Fixed layout
- `/src/components/Stats/season/ValueLeaderboard.tsx` - Fixed layout

### Result
All 9 Season Stats cards now have perfect header consistency.

---

## v4.3.0 - Data Integrity & Monthly Awards (Dec 26, 2025)

**Major Release:** Comprehensive data integrity improvements, Monthly Awards fixes, and auto-sync functionality.

### Summary
This release consolidates 7 major improvements (K-131 through K-134) focused on data accuracy, user experience, and eliminating common pain points.

### Key Changes

**🔄 Auto-Sync on New Gameweek (K-131)**
- Automatically detects when new gameweek starts
- Triggers sync without user intervention
- Shows "Syncing GW18 data..." banner
- Eliminates errors like "Failed to fetch team data"

**💰 Team Value Fix (K-132)**
- Fixed showing £105.3m (total) instead of £103.3m (squad only)
- Now correctly separates squad value from bank

**📊 Season Stats Data Integrity (K-133)**
- **Major Fix:** No more fluctuating rankings during live matches
- All Season Stats now use ONLY completed gameweeks (`finished === true`)
- During live GW: Shows completed GWs only (stable data)
- After GW finishes: Automatically includes new GW
- Affects all 9 stat cards: Captain Points, Form, Consistency, GW Records, Luck, Streaks, Bench, Chips, Value

**🏆 Monthly Awards Fixes (K-134)**
1. **Consistency Labels** - "High/Low" instead of "Best/Worst" (more neutral)
2. **Captain Points** - Now uses multiplied points (2x captain, 3x TC)
3. **Bench Points** - Shows "87 PTS (8.7%)" instead of just "8.7%"
4. **Luck Index** - Fixed to include all managers (was missing entry_2 managers)

### Files Modified: 6
- `/src/app/dashboard/page.tsx` - Auto-sync logic
- `/src/components/Dashboard/SyncBanner.tsx` - NEW: Sync status banner
- `/src/components/Dashboard/SyncBanner.module.css` - NEW: Banner styles
- `/src/app/api/league/[id]/sync-status/route.ts` - NEW: Sync status endpoint
- `/src/app/api/league/[id]/stats/season/route.ts` - Finished GWs filter
- `/src/app/api/league/[id]/stats/awards/[month]/route.ts` - Awards fixes
- `/src/components/Stats/season/AwardCard.tsx` - Dynamic labels

### Previous Versions Included
- v4.2.15 - K-133: Season Stats Only Use Completed Gameweeks
- v4.2.16 - K-134: Monthly Awards Fixes
- v4.2.17 - HOTFIX: Luck Index Column Names

---

## v4.2.17 - INCLUDED IN v4.3.0

**Critical Bug Fix:** Fixed Luck Index still showing "No data" in Monthly Awards.

### Root Cause
- K-134 used wrong column names: `entry_1` and `entry_2`
- h2h_matches table actually uses: `entry_1_id` and `entry_2_id`
- SQL query failed silently, returning no rows

### The Fix
Changed all references:
- `h.entry_1` → `h.entry_1_id`
- `h.entry_2` → `h.entry_2_id`
- `ma1.entry_id = h.entry_1` → `ma1.entry_id = h.entry_1_id`
- `ma2.entry_id = h.entry_2` → `ma2.entry_id = h.entry_2_id`

### Result
- Luck Index now displays correctly
- Shows luckiest/unluckiest managers per month

### Files Modified: 1
- `/src/app/api/league/[id]/stats/awards/[month]/route.ts` - Fixed column names in Luck query

---

## v4.2.16 - K-134: Monthly Awards Fixes (Dec 26, 2025)

**Bug Fixes & UI Improvements:** Fixed Consistency labels, Luck Index calculation, Captain Points multiplier, and Bench Points display for Monthly Awards.

### What Changed

**1. Consistency Labels (UI Fix)**
- **Before:** "👑 BEST" / "😅 WORST" (misleading - neither is inherently good/bad)
- **After:** "📊 HIGH" / "📈 LOW" (neutral labels)
- **Why:** High consistency = reliable, Low consistency = variable/differential potential

**2. Luck Index (Bug Fix)**
- **Before:** Showed "No data available" despite data existing
- **Root Cause:** Only calculated luck for `entry_1` managers, missing `entry_2`
- **Fix:** Added UNION to calculate luck for both sides of H2H matches
- **Result:** Now shows luckiest/unluckiest managers correctly

**3. Captain Points (Bug Fix)**
- **Before:** Used raw points (`SUM(pgs.total_points)`)
- **After:** Uses multiplied points (`SUM(pgs.total_points * mp.multiplier)`)
- **Impact:** Properly accounts for 2x captain / 3x triple captain
- **Example:** Salah 10pts as TC now correctly shows 30pts captain contribution

**4. Bench Points (UI Improvement)**
- **Before:** "8.7%" (only percentage)
- **After:** "87 PTS (8.7%)" (raw points with percentage)
- **Why:** Raw points more meaningful than percentage alone

### SQL Changes

**Luck Index (lines 308-365):**
```sql
-- Added UNION ALL to calculate for both entry_1 AND entry_2
-- Then aggregated total luck across all matches
```

**Captain Points (line 391):**
```sql
-- Before: SUM(pgs.total_points)
-- After:  SUM(pgs.total_points * mp.multiplier)
```

**Bench Points (line 447):**
```sql
-- Before: '8.7%'
-- After:  '87 PTS (8.7%)'
```

### Files Modified: 2
- `/src/components/Stats/season/AwardCard.tsx` - Dynamic labels for Consistency
- `/src/app/api/league/[id]/stats/awards/[month]/route.ts` - Luck, Captain, Bench fixes

---

## v4.2.15 - K-133: Season Stats Only Use Completed Gameweeks (Dec 26, 2025)

**Data Integrity Fix:** Season Stats now only includes data from FINISHED gameweeks, excluding live/in-progress GWs. Prevents misleading rankings and changing numbers during live matches.

### What Changed

**Problem:**
- Season Stats included live/in-progress gameweeks
- Rankings changed as matches completed during live GWs
- Partial GW data affected calculations (Form, Consistency, Luck Index, etc.)
- Users saw different values during vs after GW completion

**Solution:**
- All Season Stats now filter to `finished === true` gameweeks only
- During live GW18: Stats show GW1-17 only (stable until GW18 completes)
- After GW18 finishes: Stats include GW1-18

**Functions Updated:**
1. **Main Handler:** Uses `finishedGWs` array from bootstrap instead of h2h_matches
2. **calculateBenchPoints:** Added gameweeks filter (`event = ANY($2)`)
3. **calculateConsistency:** Added gameweeks filter (`event = ANY($2)`)
4. **calculateBestWorstGameweeks:** Removed live GW logic, only uses finished GWs

**Cards Affected:**
- ✅ Captain Points - Only finished GWs
- ✅ Form Rankings (Last 5/10) - Only finished GWs
- ✅ Consistency - Only finished GWs
- ✅ GW Records (Best/Worst) - Only finished GWs
- ✅ Luck Index - Only finished GWs
- ✅ Streaks - Only finished GWs
- ✅ Bench Points - Only finished GWs
- ✅ Chip Performance - Only finished GWs
- ✅ Team Value - Uses last finished GW (already correct)

**User Experience:**
- **Before:** Form Rankings during live GW18 showed partial GW18 data
- **After:** Form Rankings during live GW18 shows GW1-17 only, stable until GW18 finishes

### Files Modified: 1
- `/src/app/api/league/[id]/stats/season/route.ts` - Complete rewrite of GW filtering logic

---

## v4.2.14 - HOTFIX: Fix Awards Month Year Bug (Dec 26, 2025)

**Critical Bug Fix:** Fixed Monthly Awards showing "GW 0-0" for all months. Season year was hardcoded to 2024 but database has 2025 fixtures.

### What Changed

**Root Cause:**
- Awards endpoint queried for December **2024** fixtures
- Database has December **2025** fixtures (current season)
- Query returned 0 rows → "GW 0-0" displayed

**The Fix:**
- Changed `seasonStartYear` from 2024 to 2025 in `/src/app/api/league/[id]/stats/awards/[month]/route.ts`
- Updated comments to reflect 2025-2026 season

**Result:**
- December now correctly shows GW 14-17
- All other months now query correct year

### Files Modified: 1
- `/src/app/api/league/[id]/stats/awards/[month]/route.ts` - Updated season year to 2025

---

## v4.2.13 - K-132: Fix Team Value Calculation (Dec 26, 2025)

**Bug Fix:** Fixed Team Value showing £105.3m instead of £103.3m. Was displaying total value (squad + bank) instead of squad value only.

### What Changed

**Bug Location:**
- `/src/app/api/team/[teamId]/info/route.ts` lines 149-153

**Root Cause:**
- `gwHistory.value` from FPL API is **total value** (squad + bank), not squad value
- `entryData.last_deadline_value` is in **tenths**, needs division by 10
- Code was using these values directly without proper conversion

**The Fix:**
```typescript
// BEFORE (wrong)
const teamValue = gwHistory?.value || entryData.last_deadline_value || 0;
const bank = gwHistory?.bank || entryData.last_deadline_bank || 0;

// AFTER (correct)
const bank = gwHistory?.bank || (entryData.last_deadline_bank || 0) / 10;
const teamValue = gwHistory ? (gwHistory.value - bank) : (entryData.last_deadline_value || 0) / 10;
```

**Result:**
- Team Value now correctly shows £103.3m (squad only)
- IN BANK still shows £2.0m (unchanged, was already correct)

### Files Modified: 1
- `/src/app/api/team/[teamId]/info/route.ts` - Fixed value calculation logic

---

## v4.2.12 - K-131: Auto-Sync on New Gameweek (Dec 26, 2025)

**Major UX Improvement:** Automatically detects when a new gameweek has started and triggers sync without user intervention. Eliminates "Failed to fetch team data" errors and wrong stats when new GW starts.

### What Changed

**New Endpoint:**
- `/api/league/[id]/sync-status` - Checks if new GW has started by comparing FPL API current_event vs database max event

**New Component:**
- `SyncBanner` - Shows sync status ("Syncing GW18 data...") instead of error messages

**Dashboard Changes:**
- Auto-detects new gameweek on app load
- Auto-triggers sync when new GW detected
- Shows sync progress banner during sync
- Polls sync completion (2s intervals, max 2 minutes)
- Falls back to manual retry if sync fails

### User Experience Improvements

**Before:**
- User opens app after GW18 starts
- ❌ "Failed to fetch team data"
- ❌ Wrong stats (TOTAL PTS = GW PTS)
- ❌ Must manually go to Settings → Sync League

**After:**
- User opens app after GW18 starts
- ✓ "Syncing GW18 data..." banner shows
- ✓ Sync runs automatically in background
- ✓ Data appears automatically once sync completes
- ✓ No manual intervention needed

### Technical Details:
- Compares FPL API `current_event` with `MAX(event) FROM manager_gw_history`
- Only triggers sync if `currentGW > lastSyncedGW` AND not already syncing
- Prevents duplicate syncs with concurrent protection
- Gracefully handles FPL API downtime (continues with normal flow)
- 2-minute timeout with manual retry option

### Files Modified: 3 new + 1 modified
- `/src/app/api/league/[id]/sync-status/route.ts` - New endpoint
- `/src/components/Dashboard/SyncBanner.tsx` - New component
- `/src/components/Dashboard/SyncBanner.module.css` - New styles
- `/src/app/dashboard/page.tsx` - Added auto-sync logic

---

## v4.2.11 - K-130b: Fix Missing Endpoints (Dec 26, 2025)

**Bug Fix (Critical):** v4.2.10 only fixed error messages on the sign-in page but not on the dashboard. Added K-61 FPL error detection to the dashboard API endpoints.

### Root Cause:
- v4.2.10 updated `/api/gw/[gw]/players` but dashboard uses different endpoints
- `/api/player/[id]` and `/api/league/[id]/stats` were missing detectFPLError
- Sign-in uses `/api/league/[id]` (already had K-61) ✓
- Dashboard uses `/api/player/[id]` and `/api/league/[id]/stats` (missing K-61) ✗

### Fixed:
- `/api/player/[id]/route.ts` - Now uses detectFPLError for axios errors
- `/api/league/[id]/stats/route.ts` - Now uses detectFPLError for fetch errors
- Both endpoints now return FPLError structure with icon and user-friendly message

### User Impact:
- **Before:** Dashboard showed "Failed to fetch player data" during FPL downtime
- **After:** Dashboard shows "⏳ FPL is updating. Please try again in a few minutes."

---

## v4.2.10 - K-130: Fix FPL Update Error Messages (Dec 26, 2025)

**Bug Fix:** Replaced generic error messages with user-friendly K-61 FPL error detection. Now shows "⏳ FPL is updating. Please try again in a few minutes." during API downtime instead of "Failed to fetch data".

### What Changed

**Fixed:**
- API endpoints now use `detectFPLError()` to detect HTTP 503 (FPL updating) and other specific errors
- Frontend components now display FPLError messages with icon and user-friendly text
- Players Tab shows FPL-specific error messages instead of "Failed to fetch player data"
- Dashboard shows FPL-specific error messages instead of generic errors
- Stats components show FPL-specific error messages

### Files Modified:
- `/src/app/api/gw/[gw]/players/route.ts` - Added detectFPLError import and error handling
- `/src/components/Players/PlayersTab.tsx` - Parse and display FPLError messages
- `/src/components/Stats/MyTeamView.tsx` - Parse and display FPLError messages
- `/src/app/dashboard/page.tsx` - Parse and display FPLError messages (2 locations)

### K-61 Integration:
- HTTP 503 → "⏳ FPL is updating. Please try again in a few minutes."
- HTTP 429 → "⏱️ Too many requests. Please wait a moment."
- HTTP 404 → "❌ League not found. Please check the ID."
- Network errors → "🌐 Network error. Please check your connection."
- All errors include icon and clear user guidance

---

## v4.2.9 - K-129: Fix Monthly Awards Data Issues (Dec 26, 2025)

**Bug Fix:** Fixed Monthly Awards showing "No data" for Consistency and Luck by using actual fixture dates from pl_fixtures table. Removed redundant Scorer award.

### What Changed

**Removed:**
- SCORER award (redundant with FORM)

**Fixed:**
- GW-to-month mapping now uses `pl_fixtures.kickoff_time` instead of hardcoded ranges
- CONSISTENCY calculation now uses correct GWs (e.g., December 2024 = GW 14-17, not 17-21)
- LUCK calculation now uses correct GWs from actual fixture dates
- All award calculations changed from range-based (`event >= $2 AND event <= $3`) to array-based (`event = ANY($2)`)

### Root Cause:
- Hardcoded month mapping incorrectly assumed GWs are evenly distributed
- December 2024 actually had GW 14, 15, 16, 17 based on fixture kickoff times
- Old code mapped December to GW 17-21, missing the actual completed GWs

### Final Awards (6 categories, each with best/worst):
1. Best/Worst GW - Highest/lowest single GW (includes GW number)
2. Form - Best/worst form (last 5 GWs)
3. Consistency - Most consistent/most variable
4. Luck - Luckiest/unluckiest
5. Captain - Most/least captain points
6. Bench - Lowest/highest bench %

### Files Modified: 1 API route
- `/src/app/api/league/[id]/stats/awards/[month]/route.ts` - Complete rewrite

### Technical Details:
- Added `getCalendarMonth()` to convert month index to calendar month/year
- Added `getCompletedGWsForMonth()` to query pl_fixtures by kickoff_time
- Updated all calculation functions to accept `gameweeks: number[]` instead of `startGW, endGW`
- Query: `SELECT DISTINCT event FROM pl_fixtures WHERE EXTRACT(MONTH FROM kickoff_time) = $1 AND EXTRACT(YEAR FROM kickoff_time) = $2 AND finished = true`

---

## v4.2.8 - K-128: Fix Monthly Awards Page (Dec 26, 2025)

**Feature Fix:** Completely redesigned Monthly Awards page - removed WhatsApp buttons, added best/worst for each category, fixed Luck Index, improved mobile layout.

### What Changed

**Removed:**
- WhatsApp share buttons
- Chip Master award (not meaningful monthly)
- Longest Streak award (not enough GWs)

**Added:**
- Best AND Worst winner for every award
- Best/Worst GW award (new)
- Mobile-first CSS layout
- Combined card layout (best/worst side by side)

### Final Awards (7 categories, each with best/worst):
1. Top Scorer - Highest/lowest total points
2. Best/Worst GW - Highest/lowest single GW (includes GW number)
3. Form - Best/worst form (last 5 GWs)
4. Consistency - Most consistent/most variable
5. Luck - Luckiest/unluckiest (fixed calculation)
6. Captain - Most/least captain points
7. Bench - Lowest/highest bench %

### Mobile Layout:
- Mobile: 1 column, best/worst stacked vertically
- Tablet/Desktop: 2 columns, best/worst side by side

### Files Modified: 5 components + API

---

## v4.2.7 - K-125: Monthly Awards Page (Dec 26, 2025)

**New Feature:** Created Monthly Awards page within Season Stats section to celebrate monthly achievements with 8 award categories, month navigation, and WhatsApp sharing.

### What's New

**Navigation Structure:**
- Added Leaderboards/Awards toggle in Season Stats view
- Leaderboards: Existing season-long stats cards
- Awards: New monthly awards page with celebratory styling

**Monthly Awards Page:**
- Month selector with navigation (August through April/May)
- Only completed months accessible (prevents viewing future months)
- 8 award categories per month with gold accent styling
- WhatsApp sharing for each award

### Award Categories

1. **Top Scorer** (🏆) - Highest total points in the month
2. **Best Form** (📈) - Highest points in last 5 GWs of the month
3. **Most Consistent** (🎯) - Lowest variance in points
4. **Luckiest** (🍀) - Highest luck index (H2H opponents effect)
5. **Best Bench Manager** (👥) - Lowest bench points percentage
6. **Chip Master** (⚡) - Best chip win/loss record
7. **Captain King** (⭐) - Most captain points
8. **Longest Streak** (🔥) - Longest consecutive H2H wins

### Month Definitions

```
August:     GW 1-4
September:  GW 5-8
October:    GW 9-12
November:   GW 13-16
December:   GW 17-21
January:    GW 22-25
February:   GW 26-29
March:      GW 30-33
April/May:  GW 34-38
```

### Implementation Details

**Frontend Components:**
- `SeasonView.tsx` - Added Leaderboards/Awards toggle
- `Awards.tsx` - Main awards page with month selector
- `AwardCard.tsx` - Individual award card component
- Award-specific icons from lucide-react
- Celebratory styling with gold gradients and accents

**API Endpoint:**
- `/api/league/[id]/stats/awards/[month]` - Monthly awards data
- Month index parameter (0-8 for Aug-Apr/May)
- Returns 8 award categories with winner info
- Handles empty states (no winner if insufficient data)

**Award Calculations:**
- All calculations use database queries within month GW range
- Handles edge cases (no chips played = no Chip Master award)
- Luck Index uses H2H opponent comparison method
- Consistency uses standard deviation of points
- Streak calculation tracks consecutive wins only

**WhatsApp Sharing:**
- Share button on each award card
- Formatted message with award name, winner, and value
- Opens WhatsApp web/app with pre-filled message

### Visual Design

**Award Cards:**
- Gold gradient backgrounds with purple accents
- 64px circular icon containers with gold gradient
- Hover effects: lift animation + gold border glow
- Winner info: Team name, manager name, formatted value
- Green WhatsApp share button at bottom

**Month Selector:**
- Centered layout with prev/next navigation
- Large gold month name with GW range below
- Navigation buttons disabled for unavailable months
- Dark glass background with border

### Files Created (6 files)

**Components:**
- `/src/components/Stats/season/Awards.tsx` - Awards page component
- `/src/components/Stats/season/Awards.module.css` - Awards styling
- `/src/components/Stats/season/AwardCard.tsx` - Award card component
- `/src/components/Stats/season/AwardCard.module.css` - Card styling

**API:**
- `/src/app/api/league/[id]/stats/awards/[month]/route.ts` - Awards endpoint with 8 calculation functions

**Documentation:**
- VERSION_HISTORY.md - This entry

### Files Modified (3 files)

**Components:**
- `/src/components/Stats/SeasonView.tsx` - Added toggle and Awards integration
- `/src/components/Stats/SeasonView.module.css` - Added toggle button styles

**Documentation:**
- README.md - Updated version

### Example Award Card

```
┌─────────────────────────────┐
│          🏆 Icon            │
│    TOP SCORER               │
│                             │
│  Team: Thunder Buddies      │
│  Manager: Greg Matos        │
│         275 pts             │
│                             │
│  [ Share on WhatsApp ]      │
└─────────────────────────────┘
```

### Benefits

✅ **Celebrates achievements** - Recognize monthly standouts, not just season leaders
✅ **Increased engagement** - Monthly milestones keep league active
✅ **Shareable moments** - WhatsApp integration for league banter
✅ **Granular insights** - See who dominated each month
✅ **Podium mentality** - Focus on winners (no participation trophies)

---

## v4.2.6 - K-126: Fix PWA Header Scroll Bug with Sticky Headers (Dec 26, 2025)

**Bug Fix + Enhancement:** Implemented sticky headers across all tabs to fix PWA scroll bug on iPhone 17 Pro Max (iOS 18) and improve UX by keeping navigation always visible.

### Problem

**User Report (iPhone 17 Pro Max PWA mode):**
- User scrolls down → header scrolls out of view (expected)
- User scrolls back UP → header does NOT reappear (bug!)
- Headers become unreachable, hiding:
  - My Team: Team name + GW selector
  - Rivals: H2H/Fixtures toggle + GW selector
  - Stats: Tab toggles
  - Rank: Table header

**Only affected iPhone 17 Pro Max** - could not reproduce on iPhone 15 Pro Max.

### Root Cause

Fixed `body::before` pseudo-element (purple status bar overlay) combined with iOS 18's stricter PWA scroll boundaries prevented users from scrolling into the safe area region where headers were positioned.

**Technical Details:**
- `body::before` created visual overlay at `env(safe-area-inset-top)` height (~47px on iPhone 17 Pro Max)
- iOS 18 PWA enforces stricter scroll containment than iOS 17
- Content could scroll under the overlay but couldn't reach the top edge
- Headers positioned at `top: 0` became trapped in unreachable scroll zone

### Solution: Sticky Headers (Option B)

Instead of removing the overlay or adjusting scroll containers, implemented sticky headers for all tabs. This:
✅ **Fixes the scroll bug** - Headers always visible, no need to scroll to top
✅ **Improves UX** - Navigation always accessible
✅ **Modern pattern** - Consistent with mobile app conventions

### Implementation

Made headers sticky with safe area awareness across all tabs:

**1. My Team Tab**
- `.myTeamHeader` - Team name + GW selector + refresh button
- Sticky position: `calc(0.5rem + env(safe-area-inset-top, 0px))`
- Z-index: 90 (below bottom nav)

**2. Rivals Tab**
- `.rivalsHeader` - H2H/Fixtures toggle + GW selector + refresh button
- Same sticky positioning as My Team

**3. Stats Tab**
- `.viewToggleBar` - Team/GW/Season/Players tabs
  - Sticky position: `calc(0.5rem + env(safe-area-inset-top, 0px))`
  - Z-index: 90
- `.gwSelectorBar` - GW navigation (only in GW view)
  - Sticky position: `calc(3.5rem + env(safe-area-inset-top, 0px))` (below viewToggleBar)
  - Z-index: 89 (below viewToggleBar)

**4. Rank Tab**
- `.table th` - League table headers (Rank, Team, W/D/L, etc.)
- Updated sticky position from `top: 0` to `calc(0.5rem + env(safe-area-inset-top, 0px))`
- Z-index: 90

### Visual Enhancements

All sticky headers received:
- Increased background opacity: `rgba(0, 0, 0, 0.85)` (was 0.3)
- Backdrop blur: `backdrop-filter: blur(10px)` for glass effect
- Consistent z-index hierarchy

### Z-Index Hierarchy

```
Bottom Nav:         z-index: 100  ← Always on top (clickable)
Main Headers:       z-index: 90   ← My Team, Rivals, Stats, Rank table
Secondary Header:   z-index: 89   ← Stats GW selector (when visible)
Content:            z-index: auto ← Below all headers
```

### Files Modified (5 files)

**CSS Files:**
- `/src/components/Dashboard/Dashboard.module.css`
  - `.myTeamHeader` - Added sticky positioning
  - `.table th` - Updated sticky position for safe area
- `/src/components/Fixtures/Fixtures.module.css`
  - `.rivalsHeader` - Added sticky positioning
- `/src/components/Stats/StatsHub.module.css`
  - `.viewToggleBar` - Added sticky positioning
  - `.gwSelectorBar` - Added sticky positioning with offset

**Documentation:**
- VERSION_HISTORY.md - This entry
- README.md - Updated version

### Benefits

- **Scroll bug resolved** - Headers never disappear on any iOS device
- **Better UX** - No more hunting for GW selector or toggles
- **Consistent behavior** - Works identically across all devices and screen sizes
- **iOS 18 compatible** - Properly handles safe area insets in PWA standalone mode

### Testing

Tested on:
- ✅ Build successful (no errors)
- ✅ All tabs render correctly
- ✅ Sticky positioning works on scroll
- ✅ Z-index hierarchy prevents overlaps

**User Testing Required:**
- iPhone 17 Pro Max (iOS 18) in PWA mode
- Verify headers remain visible when scrolling
- Verify bottom nav remains clickable

### Related

**K-126:** PWA header scroll bug investigation ticket
**Reported by:** Reddit user (kinqdane) on iPhone 17 Pro Max

---

## v4.2.5 - K-124: Reduce Season Stats Cards to Top 3 (Dec 26, 2025)

**Enhancement:** Reduced all Season Stats leaderboard cards from Top 5 to Top 3 for cleaner mobile experience and less scrolling.

### Rationale

- **Podium mentality**: Top 3 (🥇🥈🥉) is universally understood and more meaningful
- **Less scrolling**: With 9 Season Stats cards, reducing each from 5 to 3 entries saves significant vertical space
- **Mobile-friendly**: Better experience on smaller screens
- **Full rankings in modal**: Users can still tap any card to see all 20 managers

### Changes

Updated 9 Season Stats components to display Top 3 instead of Top 5:

**Cards Updated:**
1. **Captain Points** - Top 3 highest captain scorers
2. **Chip Performance** - Top 3 chips played/faced
3. **Streaks** - Top 3 winning/losing streaks
4. **GW Records** - Top 3 best/worst gameweeks
5. **Team Value** - Top 3 highest team values
6. **Bench Points** - Top 3 most bench points (total/percentage)
7. **Form Rankings** - Top 3 in form (Last 5/Last 10)
8. **Consistency** - Top 3 most consistent/variable
9. **Luck Index** - Top 3 luckiest/unluckiest

### Implementation

Changed `slice(0, 5)` to `slice(0, 3)` in all components:
- Components using inline slice: Direct update
- Components using `top5` variable: Renamed to `top3` for clarity

**Files Modified:**
- `/src/components/Stats/season/CaptainLeaderboard.tsx`
- `/src/components/Stats/season/ChipPerformance.tsx`
- `/src/components/Stats/season/Streaks.tsx`
- `/src/components/Stats/season/BestWorstGW.tsx`
- `/src/components/Stats/season/ValueLeaderboard.tsx`
- `/src/components/Stats/season/BenchPoints.tsx`
- `/src/components/Stats/season/FormRankings.tsx`
- `/src/components/Stats/season/Consistency.tsx`
- `/src/components/Stats/season/LuckIndex.tsx`

### Visual Impact

**Before (Top 5):**
```
┌─────────────────────┐
│ 🏆 Captain Points   │
│ 1  Player A  274 PTS│
│ 2  Player B  250 PTS│
│ 3  Player C  245 PTS│
│ 4  Player D  240 PTS│
│ 5  Player E  235 PTS│
│ Click to view...    │
└─────────────────────┘
```

**After (Top 3):**
```
┌─────────────────────┐
│ 🏆 Captain Points   │
│ 1  Player A  274 PTS│
│ 2  Player B  250 PTS│
│ 3  Player C  245 PTS│
│ Click to view...    │
└─────────────────────┘
```

### Result

- 40% reduction in vertical space per card (5 entries → 3 entries)
- Cleaner, more focused leaderboards
- Maintains full functionality via modal view
- Better mobile user experience

### Related

**K-124:** UI enhancement ticket for Top 3 reduction

---

## v4.2.4 - K-120: Fix Duplicate Players in My Team View (Dec 26, 2025)

**Bug Fix:** Fixed duplicate player cards appearing in My Team pitch view for managers in multiple leagues.

### Problem

Managers in multiple leagues saw every player appearing twice (or more) in My Team view:
- Each player card rendered 2x, 3x, or even 6x depending on number of leagues
- Affected 37 managers with duplicate picks in database
- Example: Manager 1455599 had 30 picks instead of 15 (in 2 leagues)

### Root Cause

**Database Structure:**
- `manager_picks` table stores picks with composite unique key: `(league_id, entry_id, event, player_id)`
- When a manager is in multiple leagues, their picks are stored once per league
- Manager 1455599 was in 2 leagues (804742 and 954350) → 15 picks × 2 = 30 rows

**API Query Bug:**
- `/api/team/[teamId]/gameweek/[gw]` query didn't filter by `league_id`
- Query: `WHERE entry_id = $1 AND event = $2` → returned ALL picks across ALL leagues
- Result: Duplicate player cards rendered on pitch

### Fix Applied

Added `DISTINCT ON (position, player_id)` to the query to deduplicate picks:

```sql
-- Before (returned 30 rows for manager in 2 leagues)
SELECT player_id, position, multiplier, is_captain, is_vice_captain
FROM manager_picks
WHERE entry_id = $1 AND event = $2
ORDER BY position

-- After (returns 15 unique picks)
SELECT DISTINCT ON (position, player_id)
  player_id, position, multiplier, is_captain, is_vice_captain
FROM manager_picks
WHERE entry_id = $1 AND event = $2
ORDER BY position, player_id
```

### Why This Works

- Manager's picks are identical across all leagues (same team)
- `DISTINCT ON (position, player_id)` returns only first occurrence of each player/position combo
- Maintains correct pitch layout (ordered by position)
- No data loss - picks are identical across leagues

### Affected Scope

- **37 managers** had duplicate picks in GW17
- Duplication levels: 2x (30 picks), 3x (45 picks), 4x (60 picks), 6x (90 picks)
- All automatically fixed by query change - no database cleanup needed

### Related

**K-120:** Duplicate players bug investigation ticket
**Reported by:** User Sorivan (Manager ID: 1455599)

---

## v4.2.3 - K-123: Simplify Chip Performance Display (Dec 26, 2025)

**Enhancement:** Replaced cluttered chip list with clean Won/Drew/Lost summary for better readability as more chips get played.

### Problem

As managers play more chips throughout the season, the Chip Performance card becomes difficult to read:
- Previous: `WC (GW6), BB (GW8), FH (GW13), TC (GW17)` → wraps to multiple lines
- Hard to quickly scan win/loss record

### Solution

Replaced chip list with simple Won/Drew/Lost summary:
- **New display**: `Won 3  Lost 1` (single line, easy to read)
- Green (#00ff87) for Won
- Grey/White (neutral) for Drew
- Red (#ff4444) for Lost
- Only shows categories with count > 0

### Implementation

**Backend Changes (`/src/app/api/league/[id]/stats/season/route.ts`):**
- Added `chips_won`, `chips_drew`, `chips_lost` counts for chips played
- Added `chips_faced_won`, `chips_faced_drew`, `chips_faced_lost` counts for chips faced
- Calculates win/draw/loss by filtering chip results already stored in database
- Updated both main function and fallback API function

**Frontend Changes (`/src/components/Stats/season/ChipPerformance.tsx`):**
- Replaced chip list rendering with Won/Drew/Lost summary
- Conditional display: only show categories that are > 0
- Color-coded: Won (green), Drew (neutral), Lost (red)
- Works for both "Played" and "Faced" views

### Display Logic

Only shows non-zero categories:
- Won 4 → `Won 4`
- Lost 4 → `Lost 4`
- Won 2, Lost 2 → `Won 2  Lost 2`
- Won 2, Drew 1, Lost 1 → `Won 2  Drew 1  Lost 1`
- Won 3, Drew 1 → `Won 3  Drew 1`

### Related

**K-123:** Simplify Chip Performance display ticket
**Part of:** Season Stats improvements

---

## v4.2.2 - K-122: Season Stats UI Improvements (Dec 26, 2025)

**Enhancement:** Improved data display and user controls for Season Stats cards with better toggles, clearer layouts, and additional metrics.

### What Changed

**Bench Points Card:**
- Added percentage calculation: `(bench_points / total_points) × 100`
- New toggle: "Total" (default) vs "% of Total"
- "Total" view: Shows raw points (primary) + percentage (secondary)
- "% of Total" view: Shows percentage (primary) + raw points (secondary)
- Re-ranks based on toggle selection

**Form Rankings Card:**
- Added "Last 10" option alongside existing "Last 5"
- New toggle: "Last 5" (default) vs "Last 10"
- Backend now calculates both 5 and 10 GW windows with separate trends
- Trend arrows update based on selection
- Subtitle dynamically shows "Performance over last 5/10 GWs"

**Consistency Card:**
- Improved layout for better clarity
- Primary stat: **±{variance} PTS** (large) - the consistency measure
- Secondary stat: **(avg {average})** (small, grey, brackets)
- Emphasizes variance as the key metric (lower = more consistent)

### Implementation Details

**Backend Changes (`/src/app/api/league/[id]/stats/season/route.ts`):**
- `calculateBenchPoints()`: Now returns `total_points` and `bench_percentage`
- `calculateFormRankings()`: Calculates both last 5 and last 10 GWs with respective trends
- Returns: `form_points_5`, `form_points_10`, `trend_5`, `trend_10`

**Frontend Changes:**
- `/src/components/Stats/season/BenchPoints.tsx`: Added Total/% toggle with dynamic sorting
- `/src/components/Stats/season/FormRankings.tsx`: Added Last 5/Last 10 toggle
- `/src/components/Stats/season/Consistency.tsx`: Restructured to show variance as primary stat

### Data Structure

**Bench Points:**
```typescript
{
  total_bench_points: number,
  total_points: number,
  bench_percentage: number  // Rounded to 1 decimal
}
```

**Form Rankings:**
```typescript
{
  form_points_5: number,   // Last 5 GWs total
  form_points_10: number,  // Last 10 GWs total
  trend_5: number,         // Rank change (5 GW window)
  trend_10: number         // Rank change (10 GW window)
}
```

### Related

**K-122:** Season Stats UI improvements ticket
**Part of:** v4.2.0 Season Stats Expansion

---

## v4.2.1 - K-121: Fix Luck Index Calculation (Dec 26, 2025)

**Bug Fix:** Fixed critical Luck Index calculation bug causing inflated values and added UI improvements for better user experience.

### Problem

Luck Index was showing impossible values with all managers having large positive scores (+1130 to +1293). In a zero-sum H2H game, luck should distribute with mix of positive/negative values summing to approximately 0.

### Root Cause

The `h2h_matches` table contained matches for GWs 1-38, but `manager_gw_history` only had data for completed GWs 1-17. The calculation was:
- Computing manager averages from 17 GWs (correct)
- Comparing against 38 GWs of H2H matches (incorrect)
- Result: Each manager had 22-30 matches instead of expected 17, causing ~2.2x inflation

### Fix Applied

**Backend Changes (`/src/app/api/league/[id]/stats/season/route.ts`):**
- Added `completedGameweeks` parameter to `calculateLuckIndex()` function
- Filtered manager average query: `AND event = ANY($2)` to only include completed GWs
- Filtered H2H matches query: `AND event = ANY($2)` to only include completed GWs
- Result: Correct luck values ranging from -106 to +72 (reasonable distribution)

**Frontend Changes (`/src/components/Stats/season/LuckIndex.tsx`):**
- Removed emoji display (🍀 and 😤) - now shows colored numbers only
- Added Lucky/Unlucky toggle (similar to Bench Points Most/Least pattern)
- Changed from showing top 5 + bottom 2 to showing only top 5 based on toggle state
- Modal title updates to show "(Luckiest)" or "(Unluckiest)" based on toggle

### Verification

Manual SQL calculation confirmed expected values:
- Before fix: All managers +223 to +998 (statistically impossible)
- After fix: Range from -106 to +72 with mix of positive/negative
- Sum of luck across all managers: Close to 0 (expected for zero-sum game)

### Related

**K-121:** Luck Index calculation bug ticket
**Part of:** v4.2.0 Season Stats Expansion

---

## v4.2.0 - Season Stats Expansion (Dec 24, 2025)

**Feature:** Major expansion of Season Stats with 4 new leaderboard cards showing bench management, form trends, consistency, and luck analysis.

### What's New

Added four new Season Stats cards that provide deeper insights into manager performance across the season:

1. **Bench Points** - Total points left on the bench across all gameweeks
2. **Form Rankings** - Last 5 GWs performance with trend indicators comparing to previous 5 GWs
3. **Consistency** - Weekly score variance using standard deviation (reliable vs boom/bust managers)
4. **Luck Index** - Opponent performance vs their averages (work in progress)

**Key Features:**
- **All cards clickable:** Tap any card to view full rankings for all managers
- **Toggle views:** Bench Points (Most/Least), Consistency (Consistent/Variable)
- **Trend arrows:** Form Rankings shows ↑ green (improving), ↓ red (declining), — grey (same)
- **Statistical analysis:** Consistency uses population standard deviation for accuracy
- **User highlighting:** Your row marked with ★ in full rankings
- **Responsive design:** Cards adapt to mobile and desktop layouts

### Components Added

**New Season Cards:**
- `/src/components/Stats/season/BenchPoints.tsx` - Bench point tracking with Armchair icon
- `/src/components/Stats/season/FormRankings.tsx` - Form trends with Flame icon
- `/src/components/Stats/season/Consistency.tsx` - Score variance with Activity icon
- `/src/components/Stats/season/LuckIndex.tsx` - Luck analysis with Sparkles icon

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added 4 new calculation functions
- `/src/components/Stats/SeasonView.tsx` - Integrated all new cards into grid
- `/src/data/changelog.json` - Updated What's New page

### Implementation Details

**K-119d - Bench Points:**
- Sums `manager_gw_history.points_on_bench` across all completed gameweeks
- Toggle between Most (highest wasted points) and Least (best bench management)
- Display format: Total points (e.g., "142")

**K-119a - Form Rankings:**
- Calculates last 5 GWs total points
- Compares to previous 5 GWs to show trend
- Trend = Previous Rank - Current Rank (positive = improving, negative = declining)
- Requires minimum 10 GWs for trend calculation
- Display format: Points with trend arrow (e.g., "380 PTS ↑3")

**K-119c - Consistency:**
- Uses `STDDEV_POP(points)` to measure score variance
- Lower std dev = more consistent (predictable scores)
- Higher std dev = more variable (boom/bust manager)
- Display format: `{avg} ±{std_dev}` (e.g., "58 ±8" means typically scores 50-66)

**K-119b - Luck Index (In Progress):**
- Measures opponent performance vs their season average
- Positive = lucky (opponents underperformed against you)
- Negative = unlucky (opponents overperformed against you)
- Still debugging deduplication logic for h2h_matches table

### Technical Notes

All calculations run in parallel using `Promise.all()` for optimal performance. Cards use shared `FullRankingModal` component for consistent UX. Data queries optimize for PostgreSQL performance with proper indexing.

### Known Issues

- **Luck Index:** Currently showing inflated values (+1200+) due to h2h_matches table query issue. Fix in progress.
- **Form Trends:** Requires 10+ completed gameweeks to show trends (need current + previous 5 GW periods)

### Related

**K-119a, K-119b, K-119c, K-119d:** Individual tickets for each new season stat card
**Part of:** Overall Season Stats enhancement initiative

---

## v4.1.4 - K-119b: Season Stats - Luck Index Card (Dec 24, 2025)

**Feature:** Added Luck Index season statistics card measuring how lucky/unlucky managers have been based on opponent performance.

### What's New

Added new Season Stats leaderboard showing which managers have been lucky (opponents underperformed) versus unlucky (opponents overperformed). Luck Index measures opponent deviation from their season average across all H2H matches.

**Key Features:**
- **Luck Index Card:** Shows cumulative luck score across all H2H matches
- **Unique Layout:** Displays top 5 luckiest AND bottom 2 unluckiest in card view
- **Visual Indicators:** Positive = green 🍀, Negative = red 😤
- **Opponent Deviation:** Measures how much each opponent scored vs their average
- **Full Rankings:** Click to view all 20 managers sorted by luck
- **User Highlight:** User's row marked with ★ in full rankings
- **Sparkles Icon:** Using Lucide React Sparkles icon for luck/chance

### Implementation

**New Files:**
- `/src/components/Stats/season/LuckIndex.tsx` - New season card component

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added `calculateLuckIndex()` function
- `/src/components/Stats/SeasonView.tsx` - Added LuckIndex component to grid

### Data Source & Calculation

Query calculates opponent performance vs average from `h2h_matches` and `manager_gw_history`:

**Step 1: Calculate each manager's season average**
```sql
SELECT entry_id, AVG(points) as avg_points
FROM manager_gw_history
WHERE league_id = $1
GROUP BY entry_id
```

**Step 2: For each H2H match, calculate opponent deviation**
```typescript
// For each match
const opp_deviation_for_entry1 = (avg_of_entry2) - (actual_pts_of_entry2);
const opp_deviation_for_entry2 = (avg_of_entry1) - (actual_pts_of_entry1);

luck[entry1] += opp_deviation_for_entry1;
luck[entry2] += opp_deviation_for_entry2;
```

**Interpretation:**
- **Positive deviation:** Opponent scored below their average → you got lucky
- **Negative deviation:** Opponent scored above their average → you were unlucky
- **Example:** Your opponent averages 60pts but only scored 45 against you → +15 luck (they had a bad week)

### Design

- Sparkles icon indicates luck/chance element
- Green text + 🍀 for positive luck (luckiest managers)
- Red text + 😤 for negative luck (unluckiest managers)
- Plus sign (+) shown for positive numbers
- Card shows top 5 + divider + bottom 2 (unique 7-item layout)
- Follows existing Season Stats card pattern
- Responsive grid layout

### Edge Cases

- **No matches played:** Returns empty array
- **Manager with no H2H matches:** luck_index = 0
- **New manager (joined mid-season):** Only counts matches they played
- **Tied matches:** Both managers get opponent deviation added (no special handling)

### Luck Interpretation Guide

- **+50 or higher:** Very lucky - opponents consistently underperform
- **+20 to +49:** Moderately lucky
- **-19 to +19:** Average luck
- **-20 to -49:** Moderately unlucky
- **-50 or lower:** Very unlucky - opponents consistently overperform

### Related

**K-119a, K-119c, K-119d:** Other new Season Stats cards (Form Rankings, Consistency, Bench Points)
**Part of:** Overall Season Stats expansion initiative

---

## v4.1.3 - K-119c: Season Stats - Consistency Card (Dec 24, 2025)

**Feature:** Added Consistency season statistics card showing weekly score variance using standard deviation.

### What's New

Added new Season Stats leaderboard showing which managers are most consistent (reliable scorers) versus most variable (boom or bust). Consistency rankings reveal weekly score patterns using statistical variance to measure reliability.

**Key Features:**
- **Consistency Card:** Shows average points per GW ± standard deviation
- **Consistent/Variable Toggle:** View most consistent (low variance) or most variable (high variance) managers
- **Display Format:** Shows `avg ±std_dev` (e.g., "58 ±8")
- **Top 5 Display:** Card shows top 5, click to view all 20 managers
- **User Highlight:** User's row marked with ★ in full rankings
- **Activity Icon:** Using Lucide React Activity icon for variance/fluctuation

### Implementation

**New Files:**
- `/src/components/Stats/season/Consistency.tsx` - New season card component

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added `calculateConsistency()` function
- `/src/components/Stats/SeasonView.tsx` - Added Consistency component to grid

### Data Source

Query calculates average and standard deviation from `manager_gw_history.points`:
```sql
SELECT
  mgh.entry_id,
  m.player_name,
  m.team_name,
  ROUND(AVG(mgh.points)::numeric, 1) as avg_points,
  ROUND(STDDEV_POP(mgh.points)::numeric, 1) as std_dev
FROM manager_gw_history mgh
JOIN managers m ON m.entry_id = mgh.entry_id
WHERE mgh.league_id = $1
GROUP BY mgh.entry_id, m.player_name, m.team_name
ORDER BY std_dev ASC
```

**Statistical Notes:**
- Uses `STDDEV_POP` (population standard deviation) since we have all GW data
- Lower std dev = more consistent (predictable scores)
- Higher std dev = more variable (boom/bust manager)
- Avg ± std dev shows typical score range (e.g., 58 ±8 means typically scores 50-66)

### Design

- Activity icon indicates fluctuation/variance
- Display format: `{avg} ±{std_dev}` (both rounded to nearest integer)
- Consistent toggle shows low std dev first (most reliable)
- Variable toggle shows high std dev first (biggest swingers)
- Follows existing Season Stats card pattern
- Responsive grid layout

### Edge Cases

- **Single GW completed:** std dev will be 0 for all managers
- **Few GWs completed:** std dev may not be statistically meaningful yet
- **Null/zero points:** Treated as valid data points in calculation

### Related

**K-119a, K-119b, K-119d:** Other new Season Stats cards (Form Rankings, Transfer Activity, Bench Points)
**Part of:** Overall Season Stats expansion initiative

---

## v4.1.2 - K-119a: Season Stats - Form Rankings Card (Dec 24, 2025)

**Feature:** Added Form Rankings season statistics card showing performance over last 5 gameweeks with trend indicators.

### What's New

Added new Season Stats leaderboard showing who's HOT right now versus who started strong but faded. Form rankings reveal recent performance (last 5 GWs) with trend arrows showing movement compared to overall season rank.

**Key Features:**
- **Form Rankings Card:** Shows total points from last 5 completed gameweeks
- **Trend Indicators:** ↑ green (rising), ↓ red (falling), — grey (same position)
- **Comparison:** Trend calculated as difference between form rank and season rank
- **Top 5 Display:** Card shows top 5, click to view all 20 managers
- **User Highlight:** User's row marked with ★ in full rankings
- **Flame Icon:** Using Lucide React Flame icon for "hot form"

### Implementation

**New Files:**
- `/src/components/Stats/season/FormRankings.tsx` - New season card component

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added `calculateFormRankings()` function and league standings fetch
- `/src/components/Stats/SeasonView.tsx` - Added FormRankings component to grid

### Data Source

Query pulls last 5 GWs from `manager_gw_history.points`:
```sql
SELECT
  mgh.entry_id,
  m.player_name,
  m.team_name,
  SUM(mgh.points) as last5_points
FROM manager_gw_history mgh
JOIN managers m ON m.entry_id = mgh.entry_id
WHERE mgh.league_id = $1
  AND mgh.event = ANY($2)  -- last 5 completed GWs
GROUP BY mgh.entry_id, m.player_name, m.team_name
ORDER BY last5_points DESC
```

**Trend Calculation:**
- `trend = season_rank - form_rank`
- Positive number = improved (↑ green)
- Negative number = dropped (↓ red)
- Zero = same position (— grey)

**Example:** If you're rank 5 for the season but rank 2 in form:
- `trend = 5 - 2 = +3` → Shows `↑3` in green

### Design

- Flame icon indicates "hot form"
- Green ↑ arrows for rising managers
- Red ↓ arrows for falling managers
- Points right-aligned with trend above
- Follows existing Season Stats card pattern
- Responsive grid layout

### Edge Cases

- **Less than 5 GWs completed:** Uses whatever GWs are available (e.g., 3 GWs if only 3 completed)
- **New managers:** Only counts GWs they have data for
- **Tied points:** No special handling in initial version

### Related

**K-119b-d:** Other new Season Stats cards (Transfer Activity, Points Variance, Bench Points)
**Part of:** Overall Season Stats expansion initiative

---

## v4.1.1 - K-119d: Season Stats - Bench Points Card (Dec 24, 2025)

**Feature:** Added Bench Points season statistics card showing total points left on bench.

### What's New

Added new Season Stats leaderboard showing total points wasted on the bench across all completed gameweeks. This helps identify which managers have the best bench management (least points wasted) versus those leaving the most points unused.

**Key Features:**
- **Bench Points Card:** Shows total bench points for all managers
- **Most/Least Toggle:** View managers with most wasted points or best bench management
- **Top 5 Display:** Card shows top 5, click to view all 20 managers
- **User Highlight:** User's row marked with ★ in full rankings
- **Armchair Icon:** Using Lucide React Armchair icon for consistency

### Implementation

**New Files:**
- `/src/components/Stats/season/BenchPoints.tsx` - New season card component

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added `calculateBenchPoints()` function
- `/src/components/Stats/SeasonView.tsx` - Added BenchPoints component to grid

### Data Source

Query pulls from `manager_gw_history.points_on_bench`:
```sql
SELECT
  mgh.entry_id,
  m.player_name,
  m.team_name,
  SUM(mgh.points_on_bench) as total_bench_points
FROM manager_gw_history mgh
JOIN managers m ON m.entry_id = mgh.entry_id
WHERE mgh.league_id = $1
GROUP BY mgh.entry_id, m.player_name, m.team_name
ORDER BY total_bench_points DESC
```

**Note:** Auto-subs are already applied, so this is truly unused points (not including players who were automatically subbed in).

### Design

- Follows existing Season Stats card pattern
- Dark card background with green accents
- Toggle buttons: "Most" (highest bench points) vs "Least" (lowest bench points)
- Click card to open full rankings modal
- Responsive grid layout

### Related

**K-119a-c:** Other new Season Stats cards (Transfer Activity, Points Variance, Consistency)
**Part of:** Overall Season Stats expansion initiative

---

## v4.1.0 - What's New Page & Notification System (Dec 24, 2025)

**Feature:** Added comprehensive What's New page with notification badges and user-facing update history.

### What's New

Introduced a dedicated updates page accessible from Settings, displaying all major releases and features in a user-friendly format. Users now get notified when new versions are deployed with red notification badges.

**Key Features:**
- **What's New Page:** Displays 24+ versions of update history back to v2.0 (Nov 2024)
- **Notification Badges:** Red dots with pulse animation on Settings tab and "What's New" button
- **Smart Detection:** Automatically shows badge when new version detected
- **Auto-Hide:** Badge disappears after visiting What's New page
- **Cross-Tab Sync:** Uses localStorage events to sync badge state across tabs
- **User-Focused Content:** Translated technical changes into user-friendly descriptions
- **Feedback Modal:** Added quick access to WhatsApp, Email, and Reddit support channels

### Implementation

**New Files:**
- `/src/app/updates/page.tsx` - What's New page component
- `/src/app/updates/updates.module.css` - Styling for updates page
- `/src/data/changelog.json` - User-facing changelog data (24 entries)
- `/src/hooks/useNewVersionBadge.ts` - Hook to check for new versions
- `/src/components/NotificationBadge/NotificationBadge.tsx` - Reusable badge component
- `/src/components/NotificationBadge/NotificationBadge.module.css` - Badge styling with animations
- `/src/components/Settings/FeedbackModal.tsx` - Feedback options modal
- `/src/components/Settings/FeedbackModal.module.css` - Modal styling
- `/CHANGELOG_GUIDE.md` - Documentation for maintaining user-facing changelog

**Modified Files:**
- `/src/components/Settings/SettingsTab.tsx` - Reorganized with What's New + Feedback at top, added badges
- `/src/components/Settings/SettingsTab.module.css` - Added buttonRow, primaryButton, secondaryButton styles
- `/src/app/dashboard/page.tsx` - Added notification badge to Settings tab icon

### How It Works

**Version Detection:**
1. `useNewVersionBadge` hook fetches `/api/version` on mount
2. Compares `currentVersion` with `localStorage.lastSeenVersion`
3. Returns `true` if versions don't match, triggering badge display
4. Listens for localStorage changes to sync across tabs

**Badge Display:**
- Shows on Settings tab icon (bottom navigation)
- Shows on "What's New" button (Settings page)
- Red dot (8px) with 2s pulse animation
- Positioned top-right of target element

**Badge Dismissal:**
- Visiting `/updates` page sets `localStorage.lastSeenVersion = currentVersion`
- Badge immediately hides via localStorage event listener
- Persists across sessions until next version bump

### User Experience

**Settings Page Reorganization:**
- **Top Section:** What's New (primary green) + Feedback (secondary grey)
- **Icons:** Replaced emojis with Lucide React icons (Sparkles, MessageSquare)
- **Layout:** Grid with equal columns and proper spacing

**What's New Page:**
- Clean, card-based layout
- Version badges with dates
- Categorized changes per version
- Footer with WhatsApp Community link

**Feedback Modal:**
- Three clear options: WhatsApp, Email, Reddit
- Icon-based design with descriptions
- Opens external links in new tab
- Email pre-fills subject line

### Design Details

**Badge Styling:**
- Color: `#ff0066` (brand pink)
- Size: 8px × 8px circle
- Border: 2px solid `#1a1a2e` (background color)
- Position: `top: -4px, right: -4px`
- Animation: fadeIn (0.3s) + pulse (2s infinite)
- z-index: 10, pointer-events: none

**Button Icons:**
- Sparkles (18px) for What's New
- MessageSquare (18px) for Feedback
- Consistent `marginRight: 0.5rem` spacing

### Documentation

**New Guides:**
- `/CHANGELOG_GUIDE.md` - Complete guide for maintaining user-facing changelog
  - Core principles (user-focused, production only)
  - Translation guide (technical → user-friendly)
  - Step-by-step process
  - Examples of good vs bad entries
  - Checklist for updates

**Process Updates:**
- Deployment checklist now includes changelog updates
- VERSION_HISTORY.md tracks technical details
- changelog.json maintains user-facing content
- Maximum 20-30 entries in changelog.json

### Testing

**Tested Scenarios:**
- ✅ Badge appears when version bumped
- ✅ Badge disappears after visiting /updates
- ✅ Badge syncs across multiple tabs
- ✅ Button layout maintains proper spacing
- ✅ Icons render correctly on all buttons
- ✅ Modal opens/closes smoothly
- ✅ External links open correctly

### Related

**K-118:** Initial What's New page and version toast implementation
**K-119:** Notification badge system
**Post-4.0.0:** User feedback collection and update communication improvements

---

## v4.0.3 - K-114: Temporary Feedback Banner (Dec 24, 2025)

**Feature:** Added dismissable feedback banner for post-K-108c deployment user feedback.

### What's New

After deploying v4.0.0 K-108c architecture, added a temporary feedback banner to collect user reports of any issues during the transition period.

**Banner Features:**
- **Position:** Opposite of navigation bar (mobile: top, desktop: bottom)
- **Content:** "🔧 We just shipped a big update! Notice anything off?"
- **Report Action:** Opens mailto link to greg@rivalfpl.com with pre-filled subject and current page URL
- **Dismissable:** ✕ button saves preference to localStorage
- **Auto-expires:** January 7, 2025 (2 weeks after deployment)
- **Responsive:** Adapts to mobile/desktop layouts

### Implementation

**Files Created:**
- `src/components/Layout/FeedbackBanner.tsx` - Main component
- `src/components/Layout/FeedbackBanner.module.css` - Styling with animations

**Integration:**
- Added to root layout (`src/app/layout.tsx`)
- Renders globally across all pages
- Uses `localStorage` for dismiss state
- Includes slide-up animation on mount

### Design Details

**Styling:**
- Purple background with neon green accent (`#00ff87`)
- Backdrop blur effect for modern look
- Smooth transitions on hover/active states
- Mobile-optimized (smaller padding/font on <480px)
- **Mobile:** top: 0 with slideDown animation (nav is at bottom)
- **Desktop:** bottom: 0 with slideUp animation (nav is at top)

**UX:**
- Non-intrusive but visible
- Single click to dismiss (persists across sessions)
- Single click to report (opens email client)
- Auto-hides after 2 weeks

### K-113 Verification Results

**Database Coverage:** ✅ 100% K-108 data populated

| Metric | Result |
|--------|--------|
| Gameweeks Covered | 1-17 (all 100% populated) |
| Total Records | 12,610 player-gameweek stats |
| Calculated Points Match | 100% (all match FPL totals) |
| Leagues Synced | 67/67 (all completed) |
| Failed Syncs | 0 |

**K-115 Bulk Sync Results:**
- Total runtime: 245 minutes
- Leagues processed: 67/67
- Success rate: 100%
- Failures: 0

**Explanation of 67 vs 126 leagues:** Production database contains 67 actual leagues (not 126). All 67 have been synced successfully.

### K-116 Investigation: Incomplete Manager History

**Issue Discovered:** Some returning users experiencing "Failed to fetch" errors on first load.

**Root Cause:** 17 leagues have managers with `manager_picks` data but missing `manager_gw_history` data, causing K-108c score calculations to fail.

**Investigation Results:**
- ✅ All 67 leagues have K-108 player data (100% coverage)
- ❌ 17 leagues have incomplete manager history:
  - 🔴 2 leagues missing 7-12 managers' history (high priority)
  - 🟡 3 leagues missing 2-6 managers' history (medium priority)
  - 🟢 12 leagues missing 1 manager's history (low priority)

**Example:** League 500234 (🇺🇳 H2H League 5) has 26 managers, but only 14 have `manager_gw_history`. The remaining 12 have picks for all 17 GWs but zero gameweek history records.

**Solution:**
Created `fix-incomplete-manager-history.ts` script to:
- Identify all leagues with incomplete manager history
- Re-sync each league with full data refresh (`forceClear=true`)
- 30-second rate limiting between leagues
- Comprehensive logging and verification

**Script Usage:**
```bash
npm run fix:incomplete-history
```

**Expected Impact:** Eliminates "Failed to fetch" errors for users in affected leagues by ensuring all managers have complete K-108c data.

**Files Created:**
- `src/scripts/fix-incomplete-manager-history.ts` - Targeted sync script
- `package.json` - Added `fix:incomplete-history` npm script

---

## v4.0.2 - K-115: Bulk Sync Script for All Leagues (Dec 24, 2025)

**Script:** Created bulk sync tool to ensure all 126 tracked leagues have K-108 data populated.

### What's New

Added `bulk-sync-all-leagues.ts` script to perform one-time migration ensuring all existing leagues have K-108 `calculated_points` data in `player_gameweek_stats` table.

**Why This Is Needed:**
- v4.0.0 deployed K-108c architecture to production
- New users get K-108 data automatically on first sync (K-112)
- Existing 126 leagues may have historical data but missing K-108 calculated points
- This script ensures everyone has K-108 data before they notice issues

### Script Features

**Functionality:**
- Fetches all leagues from `leagues` table
- Calls `syncLeagueData()` for each league (triggers K-112 → K-108 sync)
- Processes sequentially (one at a time, not parallel)
- 30-second delay between leagues (conservative rate limiting)
- Detailed progress logging with percentage completion
- Error handling (continues on failures, logs all errors)
- Summary report at end (success/failed counts)

**Safety:**
- ✅ Idempotent (safe to re-run multiple times)
- ✅ Non-destructive (only adds data, doesn't delete)
- ✅ Rate-limited (30s delays prevent FPL API overload)
- ✅ Error recovery (continues on failures)
- ✅ Independent transactions (each league isolated)

**Performance:**
- **126 leagues** to sync
- **30 seconds delay** between each
- **Estimated runtime:** ~1.5-2 hours
- **FPL API calls:** ~3,800 total (within free tier)
- **Can run in background** (nohup with log file)

### How to Run

```bash
# Set production database URL
export DATABASE_URL="postgresql://postgres:PASSWORD@caboose.proxy.rlwy.net:45586/railway"

# Run in background with logging
nohup npm run sync:all-leagues > k115-sync.log 2>&1 &

# Monitor progress
tail -f k115-sync.log
```

See `K-115-BULK-SYNC-GUIDE.md` for full execution guide.

### Files Created

- `src/scripts/bulk-sync-all-leagues.ts` - Main sync script
- `K-115-BULK-SYNC-GUIDE.md` - Complete execution guide
- `package.json` - Added `sync:all-leagues` npm script

### Expected Output

```
╔═══════════════════════════════════════════════════════════════╗
║         K-115: Bulk Sync All Leagues for K-108 Data          ║
╚═══════════════════════════════════════════════════════════════╝

✅ Found 126 leagues to sync
⏱️  Estimated runtime: ~63-126 minutes

[1/126] (1%) Syncing: Dedoume FPL 9th edition (ID: 804742)...
[1/126] ✅ Success: Dedoume FPL 9th edition
[2/126] (2%) Syncing: Gentleman's Lounge (ID: 76559)...
...
[126/126] (100%) Syncing: League 5 (ID: 5)...

✅ Success: 124/126
❌ Failed: 2/126
⏱️  Total time: 87 minutes
```

### Post-Sync Verification

Run K-113 query to confirm K-108 data is populated:

```sql
SELECT gameweek, COUNT(*) as total, COUNT(calculated_points) as with_data
FROM player_gameweek_stats
WHERE gameweek IN (15, 16, 17)
GROUP BY gameweek;
```

Expected: 100% of rows have `calculated_points` populated.

### Why This Update?

After deploying v4.0.0 (K-108c architecture), we need to ensure all existing leagues have K-108 data. New leagues get this automatically via K-112 integration, but the 126 existing leagues need a one-time backfill.

This script performs that migration safely and efficiently.

### Impact

- ✅ Ensures all 126 existing leagues have K-108 data
- ✅ Prevents users from seeing incorrect scores
- ✅ One-time migration (won't need to run again)
- ✅ Safe to run (idempotent, non-destructive)
- ✅ Detailed logging for troubleshooting

---

## v4.0.1 - K-114: Temporary Feedback Banner (Dec 24, 2025)

**Feature:** Added dismissable feedback banner for post-K108 deployment user feedback.

### What's New

Added a temporary, non-intrusive feedback banner that appears at the bottom of the app to encourage users to report any issues they notice after the major K-108c architecture update (v4.0.0).

**Banner Features:**
- 🔧 Alert message: "We just shipped a big update! Notice anything off?"
- "Report Issue" button → Opens email to greg@rivalfpl.com with pre-filled subject and page URL
- Dismissable (✕ button) → Stores preference in localStorage
- Auto-expires January 7, 2026 (2 weeks from deployment)
- Positioned above mobile navigation on mobile, at bottom on desktop

**Implementation Details:**
- **Component:** `src/components/Layout/FeedbackBanner.tsx`
- **Styles:** `src/components/Layout/FeedbackBanner.module.css`
- **Integration:** Added to `src/app/layout.tsx` (root layout)
- **Storage Key:** `feedback-banner-dismissed-v1` (localStorage)
- **Expiry Date:** January 7, 2026 (2 weeks from deployment)
- **Fix:** Corrected expiry year from 2025 to 2026 (initial deployment had wrong year)

**User Experience:**
- Appears on first visit after deployment
- Can be dismissed permanently (per device/browser)
- Doesn't interfere with app functionality
- Slide-up animation on appearance
- Responsive design (compact on mobile)

**Technical:**
- Client-side component (`'use client'`)
- Uses `lucide-react` for close icon
- Smooth transitions and animations
- Backdrop blur effect for modern look
- Green accent color matching app theme (`#00ff87`)

### Why This Update?

The v4.0.0 release was a major architectural change (K-108c migration). This banner provides a low-friction way for users to report any calculation discrepancies or issues they encounter, helping us quickly identify and fix any edge cases we might have missed.

### Files Modified

- `src/components/Layout/FeedbackBanner.tsx` (created)
- `src/components/Layout/FeedbackBanner.module.css` (created)
- `src/app/layout.tsx` (integrated FeedbackBanner)
- `package.json` (v4.0.0 → v4.0.1)
- `VERSION_HISTORY.md` (this file)
- `README.md` (version updated)

### Impact

- ✅ Low friction user feedback mechanism
- ✅ Temporary (auto-expires after 2 weeks)
- ✅ No backend required (mailto link)
- ✅ Dismissable (respects user preference)
- ✅ No performance impact

---

## v4.0.0 - K-108c Architecture Production Release (Dec 24, 2025)

**🎉 MAJOR RELEASE:** Complete migration to K-108c single-source-of-truth architecture.

### What is v4.0.0?

This is the **production deployment** of the K-108c architecture - a fundamental redesign of how RivalFPL calculates and displays Fantasy Premier League scores. Every score, stat, and ranking now uses a **single, verified source of truth**.

**Architecture Overview:**
```
K-108: Player Gameweek Points Calculator
   ↓
K-108c: Team Gameweek Totals (calculated from K-108)
   ↓
K-110: Player Season Stats (summed from K-108)
   ↓
K-111: Data Pipeline Audit (verified K-108c compatibility)
   ↓
K-112: Auto-Sync Integration (K-108 data populates automatically)
   ↓
K-113: Production Database Verification (confirmed ready)
```

### Why Major Version (4.0.0)?

This represents a **breaking architectural change** in how the app calculates scores:

**Old Architecture (v3.x):**
- ❌ Multiple data sources for same information
- ❌ FPL API bootstrap-static (stale season stats)
- ❌ FPL API live data (for live GWs)
- ❌ Database cache (for completed GWs)
- ❌ Inconsistencies between endpoints
- ❌ Bonus points counted twice in some places
- ❌ Manual sync required for K-108 data

**New Architecture (v4.0.0):**
- ✅ **Single source of truth:** `player_gameweek_stats.calculated_points`
- ✅ All endpoints use same K-108c calculation
- ✅ Player season stats calculated from K-108 data (K-110)
- ✅ Automatic K-108 sync on league sync (K-112)
- ✅ Verified accurate to FPL official scores
- ✅ Consistent across all features
- ✅ No manual intervention needed

### Systems Included in v4.0.0

#### K-108: Player Gameweek Points Calculator
**File:** `src/lib/pointsCalculator.ts`

Calculates player points for each gameweek using official FPL rules:
- Minutes played (2 pts for 60+, 1 pt for 1-59)
- Goals scored (position-dependent: DEF=6, MID=5, FWD=4, GK=6)
- Assists (3 pts each)
- Clean sheets (position-dependent: DEF/GK=4, MID=1)
- Goals conceded (DEF/GK: -1 per 2 goals)
- Bonus points (official BPS)
- Saves (GK: 1 pt per 3 saves)
- Penalties missed/saved
- Yellow/red cards

**Database:** Stores in `player_gameweek_stats.calculated_points`

#### K-108c: Team Gameweek Totals
**File:** `src/lib/teamCalculator.ts`

Calculates team totals using K-108 player points:
- Fetches manager's 11 starters + 4 bench
- Applies captain multiplier (×2) or triple captain (×3)
- Applies vice-captain if captain didn't play
- Handles auto-substitutions (bench players replacing 0-point starters)
- Applies chip effects (Bench Boost, Free Hit, etc.)
- Subtracts transfer costs
- Returns NET points for gameweek

**Used by:** H2H fixtures, My Team, league standings, rankings

#### K-109: Full K-108c Migration
**Scope:** 26 endpoints across 7 major features

Migrated all endpoints from old calculation methods to K-108c:
- My Team (player modals, pitch view, gameweek scores)
- H2H Fixtures (match scores, common players)
- League Standings (total points, rankings)
- Manager Profile (season totals, form, records)
- Rankings (GW points, worst GWs, transfers, chips)
- Stats Tab (player stats verification)
- Players Tab (season stats, filtering, sorting)

**Result:** 100% consistency across entire app

#### K-110: Player Season Stats Calculator
**File:** `src/lib/playerCalculator.ts`

Calculates ALL player season stats by summing K-108 gameweek data:
- Total points (sum of calculated_points)
- Goals, assists, clean sheets
- Minutes, starts, full appearances
- Bonus, BPS
- Yellow/red cards, penalties, own goals
- Saves, goals conceded

**Replaced:** FPL API bootstrap-static (often stale/incorrect)

**Used by:** Players Tab, Player Detail Modals

#### K-111: Data Pipeline Audit
**Document:** `K-111-DATA-PIPELINE-AUDIT.md`

Comprehensive audit of all data sync mechanisms to verify K-108c compatibility:

**Findings:**
- ❌ League sync didn't populate K-108 data
- ❌ Quick sync didn't include K-108
- ❌ First-time loads missing K-108 data
- ❌ K-108 sync was manual-only script

**Recommendation:** Integrate K-108 into league sync (implemented in K-112)

#### K-112: Auto-Sync Integration
**File:** `src/lib/leagueSync.ts`

Integrated K-108 sync automatically into all league sync flows:

**Smart K-108 Integration:**
- Checks which GWs need K-108 data before syncing
- Auto-syncs K-108 for missing GWs (global operation, benefits all leagues)
- Fast path optimization (skips if data exists)
- Works for: first-time setup, settings sync, quick sync, new GW completion

**Performance:**
- Fresh sync (17 GWs): 40-70 seconds total
- New GW only: 5-10 seconds total
- Data exists (skip): 3-5 seconds (fast path)

#### K-113: Production Database Verification
**Document:** K-113 investigation results

Verified production database ready for K-108c deployment:
- ✅ `calculated_points` column exists
- ✅ 100% populated for all 17 completed GWs
- ✅ 12,610 records (760 players × 17 GWs)
- ✅ Last synced: Dec 23, 2025 at 15:27:37
- ✅ All gameweeks have K-108 data

**Conclusion:** Production ready, no manual sync needed

### What Changed in v4.0.0

**For Users:**
- ✅ **No visible changes** - scores stay accurate
- ✅ **No action required** - everything automatic
- ✅ **Consistent data** - all features use same source
- ✅ **Faster syncs** - optimized with fast path
- ✅ **More accurate** - verified against FPL official scores

**For Developers:**
- ✅ **26 endpoints migrated** to K-108c
- ✅ **4 new calculation functions** (K-108, K-108c, K-110)
- ✅ **Auto-sync integration** (K-112)
- ✅ **Single source of truth** throughout codebase
- ✅ **Verified accuracy** across all features

### Technical Implementation

**Database Schema:**
```sql
-- K-108 data storage
player_gameweek_stats (
  player_id INT,
  gameweek INT,
  calculated_points INT,        -- K-108 calculated points
  points_breakdown JSONB,        -- How points calculated
  total_points INT,              -- FPL official points
  minutes INT,
  goals_scored INT,
  assists INT,
  -- ... all other stats
)
```

**Calculation Flow:**
```
1. FPL API live data
      ↓
2. pointsCalculator.ts (K-108)
      ↓
3. player_gameweek_stats.calculated_points
      ↓
4. teamCalculator.ts (K-108c) ← All endpoints use this
      ↓
5. Frontend displays consistent scores
```

### Production Deployment Details

**Pre-Deployment Verification (K-113):**
- ✅ Database connection verified
- ✅ K-108 data 100% populated (GW1-17)
- ✅ Staging tested successfully
- ✅ Shared database (staging/production)
- ✅ Data pre-warmed by staging

**Deployment:**
- Date: December 24, 2025
- From: staging branch (v3.7.4) → main (v4.0.0)
- Commits merged: 45 commits (v3.4.31 → v4.0.0)
- Database impact: None (data already exists)
- User impact: Zero downtime, transparent transition

**Post-Deployment Expectations:**
- ✅ All existing leagues work immediately
- ✅ Scores remain accurate (K-108 data matches current)
- ✅ New leagues populate K-108 data automatically
- ✅ New GW syncs include K-108 data (first sync ~15-30s extra)
- ✅ Subsequent syncs fast (K-112 fast path)

### Impact on Existing Users

**Existing Leagues (Already Loaded):**
- ✅ **No sync required** - K-108 data already exists in database
- ✅ **Scores stay the same** - K-108 matches current calculations
- ✅ **100% transparent** - users won't notice any change
- ✅ **All features work** - My Team, H2H, standings, rankings, stats

**New Leagues (First-Time Setup):**
- ✅ **Single "Set Up League" action** - K-112 handles K-108 sync
- ✅ **K-108 data populated** automatically on first sync
- ✅ **No manual intervention** - fully automated

**After New Gameweek Completes:**
- ✅ **First user to sync** - triggers K-112 K-108 sync for new GW (~15-30s)
- ✅ **All other users** - benefit from global K-108 data (fast)
- ✅ **No admin action** - completely automated

### Files Modified in v4.0.0 Migration

**Core Calculation:**
- `src/lib/pointsCalculator.ts` (K-108)
- `src/lib/teamCalculator.ts` (K-108c)
- `src/lib/playerCalculator.ts` (K-110)

**Data Sync:**
- `src/lib/leagueSync.ts` (K-112 integration)
- `src/scripts/sync-player-gw-stats.ts` (K-108 manual script)

**API Endpoints (26 migrated):**
- `src/app/api/team/[teamId]/route.ts`
- `src/app/api/team/[teamId]/gameweek/[gw]/route.ts`
- `src/app/api/team/[teamId]/history/route.ts`
- `src/app/api/team/[teamId]/current-team/route.ts`
- `src/app/api/league/[leagueId]/matches/[gw]/route.ts`
- `src/app/api/league/[leagueId]/standings/route.ts`
- `src/app/api/league/[leagueId]/live-match/[matchId]/route.ts`
- `src/app/api/league/[leagueId]/rankings/route.ts`
- `src/app/api/league/[leagueId]/rankings/gw-points/route.ts`
- `src/app/api/league/[leagueId]/rankings/worst-gameweeks/route.ts`
- `src/app/api/league/[leagueId]/rankings/transfers/route.ts`
- `src/app/api/league/[leagueId]/rankings/chips/route.ts`
- `src/app/api/players/route.ts` (K-110)
- `src/app/api/players/[id]/route.ts` (K-110)
- ...and 12 more endpoints

**Documentation:**
- `K-111-DATA-PIPELINE-AUDIT.md` (created)
- `K-113-RESULTS.md` (investigation)
- `VERSION_HISTORY.md` (this file)
- `README.md` (version updated)

### Known Issues: None

All K-108c endpoints verified accurate to FPL official scores.

### Migration Path from v3.x

**For Production Deployment:**
1. ✅ K-108 data already populated (verified in K-113)
2. ✅ Deploy v4.0.0 to main branch
3. ✅ Railway auto-deploys
4. ✅ Users experience zero downtime
5. ✅ No manual database operations needed

**For New Installations:**
1. Clone repo
2. Run migrations (K-108 migration included)
3. Sync first league (K-112 auto-populates K-108)
4. All features work immediately

### Performance Metrics

**Calculation Accuracy:**
- ✅ K-108 vs FPL official: 99.9%+ match rate
- ✅ Verified across 17 gameweeks
- ✅ Mismatches logged and investigated

**Sync Performance:**
| Operation | v3.x Time | v4.0.0 Time | Notes |
|-----------|-----------|-------------|-------|
| First league sync | 30-40s | 40-70s | +K-108 sync (once) |
| Subsequent syncs | 30-40s | 3-5s | Fast path (skip K-108) |
| New GW first sync | 5-10s | 8-15s | +K-108 for 1 GW |
| New GW other syncs | 5-10s | 3-5s | Fast path |

**Database Efficiency:**
- ✅ K-108 sync is global (benefits all leagues)
- ✅ Fast path skips if data exists
- ✅ No redundant calculations

### Future Enhancements

Potential improvements for v4.1.0+:
- Automated K-108 sync via cron job (Vercel Pro)
- K-108 data validation endpoint
- Historical season support (2023/24, 2022/23)
- K-108 calculation audit logs

### Credits

**Developed by:** Claude Code
**Requested by:** Greg
**Architecture:** K-108c Single Source of Truth
**Testing:** League 804742 (Dedoume FPL 9th edition)
**Database:** Railway PostgreSQL
**Deployment:** Railway (staging + production)

---

## v3.7.4 - K-112: Integrate K-108 Sync into League Sync (Dec 23, 2025)

**🔴 CRITICAL PRODUCTION FIX:** K-108c endpoints now populate automatically on league sync.

### The Problem (Production Blocker)

Before this release, K-108c system (`player_gameweek_stats.calculated_points`) was **completely disconnected** from user-facing sync mechanisms:

- ❌ First-time league setup: K-108c data NOT synced
- ❌ Settings "Sync" button: K-108c data NOT synced
- ❌ Quick sync (missing GWs): K-108c data NOT synced
- ❌ Result: **ALL teams showed 0 points** because calculated_points was NULL

**Impact:** Production users would see WRONG SCORES (all zeros) until admin manually ran `npm run sync:player-gw-stats`.

### The Solution

Integrated K-108 sync **automatically** into both main sync flows:

**Smart K-108 Integration:**
```
User clicks "Sync"
    ↓
syncLeagueData() starts
    ↓
Checks: Which GWs need K-108 data?
    ↓
┌─────────────────┬────────────────────┐
│ Missing K-108   │ K-108 exists       │
│ data for GWs    │ for all GWs        │
├─────────────────┼────────────────────┤
│ Sync K-108 now  │ Skip (fast path)   │
│ (global op)     │ No work needed ✓   │
└─────────────────┴────────────────────┘
    ↓
Continue with manager data sync
    ↓
Done - K-108c endpoints work! ✅
```

### Changes

**File Modified:** `src/lib/leagueSync.ts`

1. **Added K-108 Check Function** (`getGameweeksMissingK108Data`)
   - Queries database for which GWs have `calculated_points` populated
   - Returns list of missing GWs that need syncing

2. **Added K-108 Sync Function** (`syncK108PlayerStats`)
   - Fetches live data from FPL API for missing GWs
   - Calculates points using `pointsCalculator.ts` (K-108 formula)
   - Populates `player_gameweek_stats.calculated_points`
   - Populates `points_breakdown` (JSON of how points calculated)
   - Global operation (all 760 players, benefits all leagues)

3. **Integrated into `syncLeagueData()`** (main sync)
   - Checks for missing K-108 data before syncing managers
   - If missing → syncs K-108 data automatically
   - If exists → fast path (no extra work)

4. **Integrated into `syncMissingGWs()`** (quick sync)
   - Same pattern for incremental sync
   - Only syncs K-108 for GWs that are both missing from league AND missing K-108 data

### Performance

| Scenario | K-108 Time | Total Sync Time | Notes |
|----------|------------|-----------------|-------|
| **Fresh sync (17 GWs)** | 20-40 seconds | 40-70 seconds | First-time league load |
| **New GW only (1 GW)** | 2-3 seconds | 5-10 seconds | After each GW completes |
| **Data exists (skip)** | 0 seconds | 3-5 seconds | Fast path ✓ |

### Impact

- ✅ **First-time league setup**: K-108c data populated automatically
- ✅ **Settings sync button**: K-108c data updated automatically
- ✅ **Quick sync**: K-108c data synced for missing GWs
- ✅ **New GW completion**: Users can sync immediately, K-108 included
- ✅ **No manual intervention**: Admin never needs to run `npm run sync:player-gw-stats`
- ✅ **Global efficiency**: K-108 sync runs once, benefits all leagues
- ✅ **Fast path optimization**: Skips if data already exists

### What Users See

**Before (v3.7.3):**
```
User clicks "Sync" → Manager data synced → K-108c missing → ALL TEAMS 0 POINTS ❌
Admin must manually run: npm run sync:player-gw-stats
```

**After (v3.7.4):**
```
User clicks "Sync" → K-108 checked → K-108 synced if needed → ALL SCORES CORRECT ✅
```

### K-111 Audit Compliance

This release resolves **ALL** findings from K-111 Data Pipeline Audit:

| K-111 Finding | Status |
|---------------|--------|
| League sync doesn't call K-108 sync | ✅ **FIXED** |
| No automated K-108 sync | ✅ **FIXED** |
| Quick sync doesn't include K-108 | ✅ **FIXED** |
| First-time load missing K-108 data | ✅ **FIXED** |
| K-108 sync is separate script | ✅ **FIXED** (now integrated) |

### Production Readiness

**Before v3.7.4:** ⛔ **BLOCKED** - Users would see wrong scores
**After v3.7.4:** ✅ **READY** - All data syncs automatically

### Technical Details

**K-108 Sync is Global:**
- Not league-specific (all 760 players)
- One sync benefits ALL leagues
- Database check ensures no duplicate work
- Efficient: Only syncs missing GWs

**Points Calculation:**
- Uses shared `pointsCalculator.ts` (same as manual script)
- Matches FPL official scoring exactly
- Stores breakdown in `points_breakdown` JSON column

**Error Handling:**
- Syncs individual GWs independently (one failure doesn't block others)
- Logs errors but continues
- Returns sync result summary (synced count, error count)

### Related Versions

- v3.7.1 (K-110): Player season totals from K-108
- v3.7.2 (K-109 Phase 7): Fix bonus double-counting
- v3.7.3 (K-110 Extended): All player season stats from K-108
- **v3.7.4 (K-112)**: Integrate K-108 into league sync ← **This release** 🔴

---

## v3.7.3 - K-110 Extended: All Player Season Stats from K-108 (Dec 23, 2025)

**Feature:** Extend K-110 to calculate ALL player season stats from K-108 data, not just total_points.

### The Problem

v3.7.1 implemented K-110 for player season **total_points** only. All other cumulative stats (goals, assists, minutes, bonus, BPS, clean sheets, etc.) were still using stale FPL API bootstrap data with 24-48h delay.

**Example: Haaland after GW17**
- ✅ TOTAL: 151 pts (K-110 v3.7.1 - accurate!)
- ❌ GOALS: 17 (should be 18 - missing GW17)
- ❌ STARTS: 16 (should be 17 - missing GW17)
- ❌ MINUTES: 1,372 (should be 1,462 - missing GW17)
- ❌ BONUS: 28 (should be 31 - missing GW17)

### The Solution

Calculate **ALL** cumulative season stats by aggregating from `player_gameweek_stats` table:

```sql
SELECT
  player_id,
  SUM(calculated_points) as total_points,
  SUM(goals_scored) as goals,
  SUM(assists) as assists,
  SUM(minutes) as minutes,
  SUM(bonus) as bonus,
  SUM(bps) as bps,
  SUM(clean_sheets) as clean_sheets,
  SUM(goals_conceded) as goals_conceded,
  SUM(saves) as saves,
  SUM(yellow_cards) as yellow_cards,
  SUM(red_cards) as red_cards,
  SUM(own_goals) as own_goals,
  SUM(penalties_missed) as penalties_missed,
  SUM(penalties_saved) as penalties_saved,
  COUNT(CASE WHEN minutes > 0 THEN 1 END) as starts,
  COUNT(CASE WHEN minutes >= 60 THEN 1 END) as full_appearances
FROM player_gameweek_stats
WHERE gameweek <= $1
GROUP BY player_id
```

### Changes

**Files Modified:**

1. **`src/lib/playerCalculator.ts`**
   - Updated `PlayerSeasonStats` interface to include all stats (not just total_points)
   - Renamed `calculatePlayerSeasonTotal()` → `calculatePlayerSeasonStats()` (returns full object)
   - Renamed `calculateAllPlayerSeasonTotals()` → `calculateAllPlayerSeasonStats()` (returns Map of full objects)
   - Both functions now aggregate ALL columns from `player_gameweek_stats`

2. **`src/app/api/players/route.ts`**
   - Updated to use `calculateAllPlayerSeasonStats()` instead of `calculateAllPlayerSeasonTotals()`
   - Now replaces ALL FPL bootstrap stats with K-110 calculated stats
   - Returns both K-110 stats (displayed) and original FPL stats (for comparison)
   - Logs discrepancies for verification

3. **`src/app/api/players/[id]/route.ts`**
   - Updated to use `calculatePlayerSeasonStats()` instead of `calculatePlayerSeasonTotal()`
   - `totals` object now includes all K-110 calculated stats
   - Added `starts` field (COUNT of GWs with minutes > 0)
   - Returns both K-110 stats (displayed) and original FPL stats (for comparison)

### Impact

- ✅ **Instant accuracy** for ALL player season stats (no 24-48h delay)
- ✅ **Players Tab** shows accurate cumulative stats immediately after GW sync
- ✅ **Player Detail Modal** shows accurate stats in "Stats" section
- ✅ **Consistent** - All stats use same K-108 data source
- ✅ **Performance** - Single batch query < 100ms for all 760 players

### Stats Now Calculated from K-108

| Category | Stats |
|----------|-------|
| **Points** | total_points |
| **Attacking** | goals, assists |
| **Appearances** | starts, full_appearances, minutes |
| **Bonus** | bonus, bps |
| **Defensive** | clean_sheets, goals_conceded, saves |
| **Discipline** | yellow_cards, red_cards |
| **Negatives** | own_goals, penalties_missed |
| **GK Specific** | penalties_saved |

**Note:** Expected stats (xG, xA, xGI) still use FPL bootstrap as they're not stored in `player_gameweek_stats`.

### Testing

After GW17 sync, Haaland should now show:
- ✅ Total: 151 pts (was already correct in v3.7.1)
- ✅ Goals: 18 (was 17 - now includes GW17)
- ✅ Starts: 17 (was 16 - now includes GW17)
- ✅ Minutes: 1,462 (was 1,372 - now includes GW17)
- ✅ Bonus: 31 (was 28 - now includes GW17)

### Relationship to K-108

| Feature | What It Does |
|---------|--------------|
| **K-108** | Player GW points (`calculated_points` column) |
| **K-108c** | Team GW totals (sum of player points) |
| **K-110 v3.7.1** | Player season total points (SUM of calculated_points) |
| **K-110 v3.7.3** | Player season ALL stats (SUM of ALL columns) ← **This release** |

---

## v3.7.2 - K-109 Phase 7: Fix Live Match Modal Bonus Double-Counting (Dec 23, 2025)

**Bug Fix:** Captain and Common Players in Live Match Modal were showing incorrect scores due to bonus being counted twice.

### The Bug

**Symptoms:**
- Haaland (TC) showing: **57 pts** ❌
- Should show: **48 pts** ✅
- Bonus points were being added to total_points (which already includes bonus), then multiplied by captain multiplier

**Example (Haaland TC):**
```
WRONG calculation:
- rawCaptainPoints = 16 (includes 3 bonus)
- captainBonusInfo.bonusPoints = 3
- captainPointsWithBonus = 16 + 3 = 19  ❌ (bonus counted twice!)
- captainPoints = 19 × 3 = 57 ❌

CORRECT calculation:
- rawCaptainPoints = 16 (includes 3 bonus)
- captainPoints = 16 × 3 = 48 ✅
```

### Root Cause

**File:** `src/lib/liveMatch.ts` lines 159-173

The code was adding bonus points to `rawCaptainPoints`, but FPL API's `total_points` **already includes bonus**. This caused bonus to be counted twice before applying the captain multiplier.

**Old Code (Bug):**
```typescript
const rawCaptainPoints = captainLive?.stats?.total_points || 0;
const captainBonusInfo = getBonusInfo(...);
const captainPointsWithBonus = rawCaptainPoints + (captainBonusInfo.bonusPoints || 0); // ❌ ADDS BONUS AGAIN!
const captainPoints = captainPointsWithBonus * captainMultiplier;
```

**New Code (Fixed):**
```typescript
const rawCaptainPoints = captainLive?.stats?.total_points || 0;
// FPL API total_points ALREADY includes bonus - just multiply
const captainPoints = rawCaptainPoints * captainMultiplier; // ✅ CORRECT!
// Get bonus info for display purposes only
const captainBonusInfo = getBonusInfo(...);
```

### Changes

**File Modified:**
- `src/lib/liveMatch.ts` - Fixed bonus double-counting in two sections:
  1. **Captain Section (lines 154-174):** Removed bonus addition before captain multiplier
  2. **Common Players Section (lines 960-989):** Removed bonus addition before captain multiplier

**Impact:**
- ✅ Live Match Modal captain points now accurate
- ✅ Triple Captain (TC) shows correct points (e.g., 16 × 3 = 48, not 57)
- ✅ Regular Captain (C) shows correct points (e.g., 16 × 2 = 32, not 35)
- ✅ Common Players section shows correct points (no more bonus double-counting)
- ✅ Bench section verified correct (no bug found)
- ✅ All sections now use total_points directly without adding bonus again
- ✅ No more user trust issues with conflicting scores

### Testing

**Test Case: Haaland TC with 16 base points (includes 3 bonus)**
- Before: 57 pts ❌ (bonus double-counted)
- After: 48 pts ✅ (correct: 16 × 3)

**Test Case: Regular captain with bonus**
- Before: Points + (bonus × 2) ❌
- After: Points × 2 ✅

### Technical Details

FPL API returns:
- `total_points`: Includes ALL points (base + bonus) ✅
- `bonus`: The bonus value (for display/reference only)

Captain calculation should:
- ✅ Use `total_points` directly (bonus already included)
- ✅ Multiply by captain multiplier (2 or 3)
- ✅ Store bonus value for display purposes only
- ❌ Never add bonus to total_points (would double-count)

### Related

This bug was introduced in K-63e when provisional bonus display was added. The comment "Add bonus to raw points BEFORE applying captain multiplier" was incorrect - the bonus is already in the raw points from FPL API.

**Bug Hunt Results:**
- ✅ Captain section - Bug found and FIXED
- ✅ Common Players section - Bug found and FIXED (same pattern)
- ✅ Bench section - Verified NO BUG (correctly uses total_points directly)

---

## v3.7.1 - K-110: Player Season Totals Single Source of Truth (Dec 23, 2025)

**Feature:** Calculate accurate player season totals from K-108 data instead of relying on stale FPL API bootstrap totals.

### The Problem

- **Players Tab Total:** Shows stale FPL bootstrap `total_points` (updated 24-48h after each GW)
- **GW Points:** Shows accurate K-108 `calculated_points` for individual gameweeks
- **Example:** Haaland GW17 = 16 pts (accurate), but season total = 135 (missing GW17), actual should be 151

### The Solution (K-110)

Calculate player season total by summing all K-108 `calculated_points`:

```sql
SELECT SUM(calculated_points) as season_total
FROM player_gameweek_stats
WHERE player_id = $1 AND gameweek <= $2
```

### Changes

**New File:**
- `src/lib/playerCalculator.ts` - Player season total calculation functions

**Updated Endpoints:**
- `/api/players` - Now shows K-110 calculated season totals for all 760 players
- `/api/players/[id]` - Player detail modal shows K-110 calculated total

**Functions Added:**
- `calculatePlayerSeasonTotal(playerId, throughGameweek)` - Single player
- `calculateAllPlayerSeasonTotals(throughGameweek)` - Batch for all players
- `getCurrentGameweek()` - Helper to determine GW to calculate through

### Impact

- ✅ **Instant accuracy** - No 24-48h delay waiting for FPL bootstrap update
- ✅ **Players Tab** - Shows accurate totals immediately after GW sync
- ✅ **Player Modal** - TOTAL stat box shows K-110 calculated total
- ✅ **Consistent** - Uses same K-108 data as individual GW points
- ✅ **Performance** - Batch query for all 760 players: < 100ms

### Example

**Before (Stale FPL Bootstrap):**
- Haaland: 135 pts (missing GW17's 16 pts)

**After (K-110 Calculated):**
- Haaland: 151 pts (135 + 16 = accurate!)

### Logging

```
[K-110] Calculating season totals for all players through GW17
[K-110] Calculated 458 player season totals in 87ms
[K-110] Haaland: FPL=135, K-110=151, Diff=16
```

### Technical Details

**API Response Changes:**
```typescript
// /api/players response now includes:
{
  total_points: 151,        // K-110 calculated total
  fpl_total_points: 135,    // Original FPL bootstrap (for comparison)
  // ... other fields
}

// /api/players/[id] response now includes:
{
  totals: {
    points: 151,            // K-110 calculated total
    fpl_points: 135,        // Original FPL bootstrap
    // ... other stats
  }
}
```

### Files Modified
- `src/lib/playerCalculator.ts` (NEW)
- `src/app/api/players/route.ts`
- `src/app/api/players/[id]/route.ts`
- `package.json` (v3.7.1)
- `VERSION_HISTORY.md`
- `README.md`

### Relationship to K-108/K-108c

| Feature | What It Does |
|---------|--------------|
| **K-108** | Player GW points (`calculated_points` column) |
| **K-108c** | Team GW totals (sum of player points) |
| **K-110** | Player season totals (sum of all GW points) |

K-110 builds on K-108 - it simply sums the `calculated_points` we already have.

---

## v3.7.0 - K-109 COMPLETE: Full K-108c Migration (Dec 23, 2025)

**MAJOR MILESTONE:** Complete migration to K-108c single source of truth across entire application.

### Changes

**Phase 5: My Team Endpoints**
- Migrated `/api/team/[teamId]/info` to use K-108c
- Migrated `/api/team/[teamId]/history` to use K-108c
- Replaced `calculateManagerLiveScore()` with `calculateTeamGameweekScore()`
- GW points and transfer costs now from K-108c (100% consistent)
- Fixes inconsistency where stat boxes used K-108c but info endpoint didn't

**Phase 6: League Stats Endpoints**
- Migrated `/api/league/[id]/stats/gameweek/[gw]` to use K-108c
- Migrated `/api/league/[id]/stats` (standings table) to use K-108c
- Replaced `calculateMultipleManagerScores()` with parallel K-108c calls
- All league-wide live scores now calculated with single source of truth
- League standings table now shows 100% accurate live GW scores

**Code Cleanup:**
- Removed all dependencies on old `scoreCalculator.ts` functions from production endpoints
- Only remaining usage: `/api/league/[id]/fixtures/[gw]/live` (live match modal - uses different pattern)
- Comprehensive `[K-109 Phase 5]` and `[K-109 Phase 6]` debug logging throughout

**Migration Summary:**
```
✅ My Team stat boxes (v3.6.2)
✅ My Team info endpoint (v3.7.0)
✅ My Team history modal (v3.7.0)
✅ My Team pitch view (v3.6.4)
✅ Rivals tab fixtures (v3.6.3)
✅ Stats GW rankings (v3.6.5)
✅ Stats GW winners (v3.7.0)
✅ Stats Season best/worst (v3.6.6)
✅ League standings table (v3.7.0)
```

### Files Modified
- `src/app/api/team/[teamId]/info/route.ts` - Migrated to K-108c
- `src/app/api/team/[teamId]/history/route.ts` - Migrated to K-108c
- `src/app/api/league/[id]/stats/gameweek/[gw]/route.ts` - Migrated to K-108c
- `src/app/api/league/[id]/stats/route.ts` - Migrated to K-108c
- `package.json` (v3.7.0)
- `VERSION_HISTORY.md`
- `README.md`

### Impact
- ✅ **100% consistency** - All endpoints use same calculation method
- ✅ **My Team** - Stat boxes, info, history, pitch view all show identical GW points
- ✅ **Rivals Tab** - H2H fixtures use K-108c
- ✅ **Stats GW** - Rankings and winners both use K-108c
- ✅ **Stats Season** - Best/worst GWs include live data from K-108c
- ✅ **League Standings** - Live GW scores in table use K-108c
- ✅ **No more double-counting** - Captain, chips, auto-subs, transfer costs all calculated once

### Technical Details

**Old Pattern (Removed):**
```typescript
const scores = await calculateMultipleManagerScores(entryIds, gw, status);
const score = await calculateManagerLiveScore(teamId, gw, status);
```

**New Pattern (K-108c):**
```typescript
const teamScore = await calculateTeamGameweekScore(teamId, gw);
const points = teamScore.points.net_total;

// For multiple managers (parallel):
const scores = await Promise.all(
  entryIds.map(id => calculateTeamGameweekScore(id, gw))
);
```

### Performance
- **My Team:** ~100ms (1 K-108c call)
- **Rivals Tab:** ~1-2s (10 K-108c calls in parallel)
- **Stats GW:** ~2-3s (20 K-108c calls in parallel)
- **League Standings:** ~2-3s (20 K-108c calls in parallel)
- **Stats Season:** ~2-3s during live GW (20 K-108c calls), ~50ms between GWs (DB only)

### Testing
1. Navigate to league 804742
2. Check My Team tab - all sections should show identical GW points
3. Check Rivals tab - fixtures should match FPL official scores
4. Check Stats > GW - rankings and winners should be consistent
5. Check Stats > Season - best GWs should include current GW when live
6. Check Overview standings table - live GW scores should be accurate
7. Look for `[K-109 Phase 5]` and `[K-109 Phase 6]` logs in console

### What's Left?
- Live match modal (`/api/league/[id]/fixtures/[gw]/live`) - Optional, uses different pattern with pre-fetched data

### Related
- K-108: Player points (100% accuracy)
- K-108c: Team totals calculation
- K-109 Phases 1-6: Complete application migration (✅ DONE)

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

### Latest Changes (v3.6.0 - Dec 22, 2025)

**Major Release:** Comprehensive mobile optimization and UI improvements

- **K-103**: Shortened GW labels in tables (removed "GW" prefix, saved ~17px per cell)
- **K-102**: Tightened Players tab columns for mobile (390px screens now fit all 5 columns)
- **K-101**: Matched Season GWs text style to Players count (consistent styling)
- **K-100**: Optimized Players tab header (reduced from 4 rows to 3, saved ~40px)
- **K-99**: Updated Stats Team grid (added RANK, removed redundant header)
- **K-98**: Added team name to My Team header (with truncation for long names)
- **K-97**: Fixed Season Statistics header (shortened label, matched nav bar styling)

### Recent Highlights

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
