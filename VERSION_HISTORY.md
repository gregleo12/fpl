# FPL H2H Analytics - Version History

**Project Start:** October 23, 2024
**Total Releases:** 260+ versions
**Current Version:** v3.1.1 (December 18, 2025)

---

## v3.1.1 - HOTFIX: Player Modal Total Points Calculation (Dec 18, 2025)

**BUG FIX:** Player modal showing incorrect total points.

### Problem
- Player modal displayed wrong total points (e.g., Bruno Fernandes GW16 showed 4 pts instead of 13 pts)
- Modal showed correct stat breakdown but wrong total
- Caused by mismatch between two data sources:
  - Initial `player.event_points` from scoreCalculator (uses database cache)
  - Stats breakdown from fresh FPL API data

### Solution
- Modal now **calculates total from displayed stats breakdown**
- Uses `calculateStatPoints()` function to sum all individual stat points
- Falls back to `player.event_points` only if stats unavailable
- Ensures total always matches the breakdown shown

### Files Changed
- `/src/components/PitchView/PlayerModal.tsx`
  - Added `calculatedTotal` logic to sum stats
  - Replaced hardcoded `player.event_points` with `actualTotalPoints`
  - Fixed captain multiplier calculation

### Impact
- All player modals now show accurate totals
- Fixes discrepancies for any players with stale database data
- Total now always matches visible breakdown

---

## v3.1.0 - Production Release: Value Rankings (Dec 18, 2025)

**PRODUCTION DEPLOYMENT:** Deploying v3.0.14-v3.0.18 to production.

### Features Included
- **K-37:** Value Rankings leaderboard in Season Stats
  - Shows Team Value rankings for all league managers
  - Top 5 in card view, full 20 in modal
  - Clean display with team value only (no redundant gain calculation)
- **K-36 Fix:** Removed Effective Value (not available in FPL API)
  - Simplified My Team to show: Team Value | In Bank
  - Investigated FPL API and confirmed selling prices aren't exposed

### Version Journey (v3.0.14 → v3.1.0)
- v3.0.14: Initial Value Rankings implementation
- v3.0.15: Effective Value debugging attempt
- v3.0.16: Changed to use last finished GW
- v3.0.17: Removed Effective Value entirely
- v3.0.18: Simplified display (removed gain text)

---

## v3.0.18 - Simplify Value Rankings Display (Dec 18, 2025)

**UI IMPROVEMENT:** Remove redundant value gain from Value Rankings.

### Change
- Removed "+£X.Xm" gain display from Value Rankings leaderboard
- Now shows only the team value (£105.0m format)
- Value gain is easy to calculate mentally (£105.0m - £100.0m = £5.0m)
- Cleaner, simpler display

### Before
```
£105.0m
+£5.0M
```

### After
```
£105.0m
```

---

## v3.0.17 - Remove Effective Value (Not Available in FPL API) (Dec 18, 2025)

**BREAKING CHANGE:** Remove Effective Value feature - FPL API doesn't expose individual player selling prices.

### Why Removed
After investigating the FPL API, discovered that **selling prices are NOT available** via the public API:
- `/entry/{id}/event/{gw}/picks/` returns only: `element`, `position`, `multiplier`, `is_captain`, `element_type`
- **NO `selling_price` or `purchase_price` fields** exist in picks data
- Entry endpoint only provides `last_deadline_value` (total team value) and `last_deadline_bank`
- **Effective Value (sell prices + bank) is IMPOSSIBLE to calculate**

### Changes Made

**My Team:**
- Removed "Eff Value" box
- Now shows only: Team Value | In Bank
- Removed all Effective Value calculation logic

**Season Stats - Value Rankings:**
- Removed toggle between "Team" and "Eff"
- Now shows "Team Value" only
- Simplified leaderboard (no switching needed)

**API Changes:**
- `/api/team/[teamId]/info`: Removed `effectiveValue` field from response
- `/api/league/[id]/stats/season`: Changed `valueRankings` from object to array
  - Before: `{ teamValue: [], effectiveValue: [] }`
  - After: `ValueData[]` (just team value rankings)

### What's Still Available
- ✅ **Team Value** - Total squad value (buy prices)
- ✅ **Bank** - Money in bank
- ✅ **Value Rankings** - Leaderboard by team value
- ✅ **Value Gain** - Profit from starting £100m

### Files Changed
- `/src/app/api/team/[teamId]/info/route.ts`
- `/src/components/Dashboard/MyTeamTab.tsx`
- `/src/app/api/league/[id]/stats/season/route.ts`
- `/src/components/Stats/season/ValueLeaderboard.tsx`
- `/src/components/Stats/SeasonView.tsx`

---

## v3.0.16 - HOTFIX: Use Last Finished GW for Effective Value (Dec 18, 2025)

**CRITICAL HOTFIX:** v3.0.15 used `current_event` which points to the NEXT upcoming gameweek, causing picks fetch to fail.

### Root Cause (Real Issue)
- Between gameweeks, `current_event` = 17 (next upcoming GW)
- GW17 hasn't started, so `/entry/{id}/event/17/picks/` returns no data
- Result: Effective Value calculation falls back to bank only (£0.1m)

### Fix
- Changed to use **last finished gameweek** instead of `current_event`
- Finds last GW where `finished = true` from bootstrap events
- Now fetches picks from GW16 (last completed) which has actual data

### Technical Changes

**K-36: `/api/team/[teamId]/info/route.ts`**
```typescript
// Before (WRONG):
const actualCurrentGW = entryData.current_event;  // Points to GW17 (upcoming)

// After (CORRECT):
const events = bootstrapData.events || [];
const lastFinishedGW = [...events].reverse().find(e => e.finished)?.id;  // GW16
```

**K-37: `/api/league/[id]/stats/season/route.ts`**
- Same fix applied to Value Rankings
- Changed from `e.is_current` to finding last `e.finished = true`

### Expected Results
- Effective Value: ~£102.4m (15 players + bank)
- Debug logs show `Last finished GW: 16` (not 17)
- `selling_price` values now present (50-70 range typical)

---

## v3.0.15 - HOTFIX: Fix Effective Value Calculation (Dec 18, 2025)

**HOTFIX RELEASE:** Fix critical bugs in Effective Value calculation (K-36 & K-37).

### Bugs Fixed

**Issue 1: selling_price Undefined**
- **Problem:** Effective Value showed £0.1m (bank only) instead of ~£102.4m
- **Root Cause:** When viewing historical gameweeks in My Team, code fetched picks for that old GW, which doesn't include current `selling_price` field
- **Fix:** Always fetch current squad picks (actualCurrentGW) for Effective Value, separate from selected GW picks (for rank/transfers)
- **Impact:** Effective Value now shows correct selling prices for all 15 players + bank

**Issue 2: Unit Conversion Error in K-37**
- **Problem:** Value Rankings calculated `(sellTotal / 10) + bank` which mixed units (pounds + tenths)
- **Root Cause:** Division by 10 applied only to sellTotal, not bank
- **Fix:** Changed to `(sellTotal + bank) / 10` to convert the total from tenths to millions
- **Impact:** Value Rankings now show correct effective values

### Technical Changes

**K-36: `/api/team/[teamId]/info/route.ts`**
- Split gameweek variables:
  - `actualCurrentGW`: Real current GW (from entry data)
  - `currentGW`: Selected GW for display (could be historical)
- Added second fetch for current squad:
  - `picksResponse`: Selected GW picks (for rank/transfers)
  - `currentSquadResponse`: Current GW picks (for selling prices)
- Updated Effective Value calculation to use `currentSquadData` with current bank
- Enhanced debug logging with JSON.stringify for full pick structure

**K-37: `/api/league/[id]/stats/season/route.ts`**
- Fixed unit conversion: `(sellTotal + bank) / 10` instead of `(sellTotal / 10) + bank`
- Both values now properly converted from tenths to millions

### Expected Results
- My Team Effective Value: ~£102.4m (not £0.1m)
- Value Rankings: Correct effective values for all managers
- Effective Value ≤ Team Value (always)
- Debug logs show `selling_price` values (not undefined)

---

## v3.0.14 - Add Value Rankings to Season Stats (Dec 18, 2025)

**FEATURE RELEASE:** Add Team Value and Effective Value leaderboards to Season Stats (K-37).

### New Features
- **Value Rankings Leaderboard:** Shows two new rankings in Season Stats
  - **Team Value:** Total squad value (buy price)
  - **Effective Value:** Spendable value (sell price + bank)
  - Toggle between Team and Effective views
  - Top 5 in card, full 20 managers in modal
  - Shows gain from starting £100.0m

### Technical Implementation
- Added `getValueRankings()` function to `/api/league/[id]/stats/season/route.ts`
- Fetches fresh data from FPL API (value changes daily, not cached)
- Reuses K-36 Effective Value calculation logic for consistency:
  - Team value: `entry_history.value / 10`
  - Bank: `entry_history.bank / 10`
  - Effective value: `(sum of selling_price / 10) + bank`
  - Fallback to purchase_price if selling_price unavailable
- Created `ValueLeaderboard.tsx` component with Team/Eff toggle
- Integrated into SeasonView.tsx Season Stats section

### Data Source
- Always fetches from FPL API (not database)
- Uses `/api/entry/{entry_id}/event/{current_gw}/picks/` endpoint
- Current gameweek determined from bootstrap-static

### UI/UX
- Matches existing leaderboard styling (dark purple gradient)
- 📈 emoji icon for value rankings
- Toggle buttons: "Team" | "Eff"
- Shows value in £X.Xm format
- Shows gain from starting value (+£X.Xm)
- Click to view full rankings in modal

---

## v3.0.13 - Debug Effective Value Calculation (Dec 18, 2025)

**DEBUG RELEASE:** Add debug logging to investigate K-36 Effective Value bug.

### Debug Additions
- **Issue:** Effective Value showing £0.1m instead of ~£102.4m on Greg's account
- **Root Cause:** Unknown - either `selling_price` field missing or calculation failing
- **Debug Logging Added:**
  - Team ID being processed
  - Number of picks in picks array
  - Sample of first pick structure
  - Bank value
  - Each pick's `selling_price` and `purchase_price` values
  - Total sell value calculated
  - Final effective value (sell + bank)

### Technical Changes
- Updated `/api/team/[teamId]/info/route.ts` with comprehensive console logging
- Logs each pick's selling price to identify if field exists and has correct values
- Will observe Railway logs when Greg loads My Team to diagnose issue

### Expected Outcome
- Log output will reveal if `selling_price` exists on picks
- Will show if calculation is correct but display is wrong
- Will identify if field is named differently in API response

---

## v3.0.12 - Players Tab Modal UI Improvements (Dec 18, 2025)

**PATCH RELEASE:** Improve readability and density in Players Tab modal.

### UI Improvements

**1. Results Badges - Better Contrast**
- Changed score badge text from white to dark grey/black
- Color: `#fff` → `rgba(0, 0, 0, 0.85)`
- Applies to win (green) and loss (red) badges
- Much better readability against colored backgrounds

**2. Stats Tab - More Compact**
- Reduced stat box padding: `0.75rem` → `0.5rem`
- Reduced stat value font size: `1.5rem` → `1.25rem`
- Reduced stat label font size: `0.75rem` → `0.7rem`
- Reduced stat group padding: `1rem` → `0.75rem`
- Reduced gap between groups: `1.25rem` → `0.875rem`
- Reduced gap between stat boxes: `0.5rem` → `0.375rem`
- **Result:** More stats fit on screen, especially on mobile
- Matches the compact density of My Team modal

### Impact
- Better readability in Matches tab (results section)
- More information density in Stats tab
- Improved mobile experience
- Consistent with My Team modal design

---

## v3.0.11 - HOTFIX: Fix Overview Tab Regression + Brand Styling (Dec 18, 2025)

**HOTFIX RELEASE:** Fix regression in My Team Player Modal Overview tab and align Players Tab modal styling with brand.

### Bug Fixes (Issue 1 - Regression)
- **CRITICAL:** Fixed My Team Player Modal Overview tab showing only "Defensive contribution: 0" and "Total Points"
  - **Root Cause:** FPL history uses `round` field, but modal looks for `gameweek` field
  - **Introduced in:** v3.0.9 when switching to FPL history format
  - **Fix:** Map `round` → `gameweek` in API response
  - **Impact:** Overview tab now shows full stats breakdown (goals, assists, clean sheets, minutes, bonus, BPS, etc.)

### UI Improvements (Issue 2 - Brand Consistency)
- **Players Tab Modal Styling:** Updated to match My Team modal brand
  - Changed from dark gray gradient to dark purple gradient
  - Background: `rgba(26, 26, 46, 0.98) → rgba(55, 0, 60, 0.95)`
  - Improved box-shadow for better depth
  - Consistent brand identity across both player modals

### Technical Changes
- Updated `/api/players/[id]` to map FPL `round` field to `gameweek`
- Updated `PlayerDetailModal.module.css` with brand purple gradient
- Both modals now use same color scheme

---

## v3.0.10 - Improve History Tab UX (Dec 18, 2025)

**PATCH RELEASE:** Improve History tab ordering and add current season in both player modals.

### UI Improvements
- **Reverse Season Order:** Most recent season now shown first (was oldest first)
- **Add Current Season:** 2024/25 season now displayed at top with "(Current)" label
  - Shows current season stats from `data.totals` or `player` data
  - Includes: points, goals, assists, minutes, current price
- **Applied to Both Modals:**
  - My Team PlayerModal: Card-based layout
  - Players Tab PlayerDetailModal: Table-based layout

### Technical Changes
- Reversed `pastSeasons` array using `[...data.pastSeasons].reverse()`
- Added current season as first item in history list
- Current season pulls from existing data (no new API calls)

---

## v3.0.9 - HOTFIX: Fix Players Tab Modal CORS Error (Dec 18, 2025)

**HOTFIX RELEASE:** Fix CORS error in Players Tab PlayerDetailModal.

### Bug Fixes
- **CRITICAL:** Fixed "TypeError: Failed to fetch" in Players Tab modal
  - **Root Cause:** PlayerDetailModal (K-26) was making client-side fetch to FPL API, causing CORS error
  - **Fix:** Updated to use `/api/players/[id]` endpoint server-side
  - **Impact:** Players Tab modal now loads correctly, all tabs work (Matches, Stats, History)

### Technical Changes
- Updated `/api/players/[id]/route.ts` to fetch full FPL history (with opponent/match details)
- Added `fixtures` to API response for upcoming matches
- Added FPL `history` array (not just DB history) to include opponent/score details
- Updated `PlayerDetailModal.tsx` to use `/api/players/[id]` instead of FPL API
- Modal now uses server-side API with no CORS issues

### API Response Changes
- `/api/players/[id]` now returns:
  - `history`: Full FPL history array (opponent, scores, match details)
  - `fixtures`: Upcoming fixtures with FDR
  - `pastSeasons`: Past season stats
  - Falls back to DB history if FPL API unavailable

---

## v3.0.8 - HOTFIX: Fix Player Modal CORS Error (Dec 18, 2025)

**HOTFIX RELEASE:** Fix CORS error preventing Player Modal from loading.

### Bug Fixes
- **CRITICAL:** Fixed "TypeError: Failed to fetch" in Player Modal
  - **Root Cause:** PlayerModal was making client-side fetch to FPL API for past seasons, causing CORS error
  - **Fix:** Moved past seasons fetch to server-side in `/api/players/[id]` route
  - **Impact:** Player Modal now loads correctly, all three tabs work

### Technical Changes
- Updated `/api/players/[id]/route.ts` to fetch `pastSeasons` from FPL API server-side
- Added `pastSeasons` to API response
- Removed client-side FPL API fetch from `PlayerModal.tsx`
- PlayerModal now uses `data.pastSeasons` from API response

### Never Do
- ❌ DON'T make client-side fetch calls to FPL API (causes CORS errors)
- ✅ DO fetch FPL API server-side in API routes

---

## v3.0.7 - Player Modal Tabs (Dec 18, 2025)

**PATCH RELEASE:** Add tabs to Player Modal for better organization and data access.

### New Features
- **Player Modal Tabs (K-34):** Three-tab navigation in Player Modal
  - **Overview Tab:** Current GW stats breakdown (reorganized existing content)
  - **Matches Tab:** GW-by-GW performance table with scrollable view
  - **History Tab:** Past seasons summary with lazy loading
- **Lazy Loading:** Past seasons data only fetched when History tab is clicked
- **Current GW Highlighting:** Active gameweek highlighted in Matches table
- **Empty States:** User-friendly messages when no data available
- **Sticky Table Headers:** Matches table header stays visible when scrolling

### Technical Changes
- Added tab state management to `PlayerModal.tsx`
- Created three inline tab components (Overview, Matches, History)
- Added `pastSeasons` state and lazy fetch logic
- Reused existing `/api/players/[id]` endpoint (no new API needed)
- History tab fetches from FPL API `element-summary` endpoint
- Matches table uses existing `history` data from player API

### UI Changes
- Tab navigation bar with active state highlighting
- Scrollable table for Matches tab (max-height: 400px)
- Season cards for History tab with hover effects
- Mobile responsive design for all tabs
- Comprehensive styling in `PlayerModal.module.css`

---

## v3.0.6 - Add Effective Value Stat (Dec 18, 2025)

**PATCH RELEASE:** Add Effective Value (sell value) stat to My Team.

### New Features
- **Effective Value Stat:** New stat box showing your actual liquidation value
  - Displays between Team Value and In Bank
  - Shows the cash you'd have if you sold all players
  - Accounts for 50% profit rule: `Sell Price = Purchase Price + floor((Current Price - Purchase Price) / 2)`
  - Uses FPL API `selling_price` field (no database changes needed)

### Technical Changes
- Updated `/api/team/[teamId]/info` to calculate and return `effectiveValue`
- Added `effectiveValue` state and display in `MyTeamTab.tsx`
- Calculation: Sum of all player selling prices + bank
- Graceful fallback: If picks data unavailable, effective value = 0

### UI Changes
- Team Value boxes now show 3 stats instead of 2:
  1. Team Value (total player current prices)
  2. Eff Value (what you'd get if sold all)
  3. In Bank (cash available)

---

## v3.0.5 - Column Name Fix (Dec 18, 2025)

**HOTFIX RELEASE:** Fix database query to use correct column names.

### Bug Fixes
- **CRITICAL:** Fixed `player_gameweek_stats` query to use correct column names
  - Changed `event` → `gameweek`
  - Changed `element_id` → `player_id`
  - These are the actual column names in the database schema
- Query now works correctly with existing indexes:
  - `idx_pgw_player_gw` on `(player_id, gameweek)` ✓
  - `idx_pl_fixtures_event_finished` on `(event, finished)` ✓
  - `idx_manager_picks_entry_event` on `(entry_id, event)` ✓

### Investigation Results
- Used `check-and-add-indexes.ts` script to inspect actual schema
- Confirmed all necessary indexes already exist in database
- No new indexes needed - just code fix

### Impact
- DB optimization now works correctly for completed GWs
- Will use existing indexes for fast query performance (< 50ms)

---

## v3.0.4 - Performance Investigation & Fix (Dec 18, 2025)

**HOTFIX RELEASE:** Critical performance optimization for My Team DB queries.

### Performance Fixes
- **MAJOR:** Fetch only 15 player stats instead of all 760 players
  - Before: Fetched ALL 760 players from `player_gameweek_stats`
  - After: Fetch only the 15 players in manager's squad
  - Impact: ~98% reduction in rows fetched (760 → 15)
- **Optimized query flow:** Fetch picks first, then use player IDs to filter stats query
- **Added comprehensive timing logs** for debugging bottlenecks
  - `[Perf] DB: manager picks` - Manager picks fetch time
  - `[Perf] DB fetch player stats (15 players)` - Player stats fetch time
  - `[Perf] DB fetch fixtures` - Fixtures fetch time
  - `[Perf] API: bootstrap` - Bootstrap API time
  - `[Perf] Total completed GW fetch` - Total time
- **Created index migration script** (`add-performance-indexes.ts`)

### Technical Changes
- Updated `fetchPlayerStatsFromDB()` to accept `playerIds` parameter
- Modified `fetchScoreData()` to extract player IDs from picks first
- Changed query: `WHERE event = $1 AND element_id = ANY($2)`
- Added timing instrumentation throughout data fetching pipeline

### Next Steps (Post-Deploy)
- Add database indexes for optimal performance:
  - `idx_player_gw_stats_event_element` on `player_gameweek_stats(event, element_id)`
  - `idx_pl_fixtures_event_finished` on `pl_fixtures(event, finished)`
  - `idx_manager_picks_entry_event` on `manager_picks(entry_id, event)`
- Run index script: `DATABASE_URL=... npx tsx src/scripts/add-performance-indexes.ts`

### Expected Performance
- DB queries: 10-50ms (down from 200-500ms with 760 rows)
- Total completed GW load: ~150-200ms (bootstrap still dominates at ~300-400ms)

---

## v3.0.3 - My Team DB Optimization (Dec 18, 2025)

**PATCH RELEASE:** Optimize My Team to use database for completed gameweeks.

### Performance Improvements
- **Database-First for Completed GWs:** My Team now uses database instead of FPL API for completed gameweeks
  - Player stats fetched from `player_gameweek_stats` table
  - Fixtures fetched from `pl_fixtures` table
  - Reduces external API calls from 3-4 per view to 1 (bootstrap only)
  - Target load time: < 200ms (down from 500ms+)
- **Graceful Fallback:** Automatically falls back to API if database data is missing
- **Live GW Unchanged:** Current/in-progress gameweeks still use API for real-time data

### Technical Changes
- Added `fetchPlayerStatsFromDB()` function in `/src/lib/scoreCalculator.ts`
- Added `fetchFixturesFromDB()` function in `/src/lib/scoreCalculator.ts`
- Updated `fetchScoreData()` to check GW status and use DB for completed GWs
- Data transformation matches FPL API format (no frontend changes needed)
- Console logging for debugging DB vs API usage

### Impact
- Completed GWs load ~60-70% faster
- Reduced load on FPL API
- Better user experience for historical data viewing
- No visual changes for users

---

## v3.0.2 - Sync Pipeline Enhancement (Dec 18, 2025)

**PATCH RELEASE:** Add manager_picks and pl_fixtures to automatic sync pipeline.

### New Features
- **Manager Picks Syncing:** Full squad selections (15 players) now synced automatically per GW
  - Includes starting 11 + 4 bench players
  - Synced in both full sync and incremental sync
  - Enables My Team to use database for completed GWs instead of API calls
- **PL Fixtures Syncing:** Premier League fixtures now synced automatically
  - Only completed fixtures synced (finished = true)
  - League-independent (synced once per sync run)
  - Enables fixture-based features to use database

### Technical
- Added `syncPLFixtures()` function in `/src/lib/leagueSync.ts`
- Added manager_picks sync to `syncManagerData()` function
- Added manager_picks sync to `syncMissingGWs()` function
- Added manager_picks to force clear cleanup section
- Both tables use ON CONFLICT upsert pattern for idempotency

### Performance Impact
- Reduces API calls for My Team when viewing completed GWs
- Enables offline/cached access to historical squad data

---

## v3.0.1 - Empty State Fix (Dec 18, 2025)

**PATCH RELEASE:** UX improvement for GW Transfers display.

### Bug Fixes
- Added "No transfers made" empty state message for GW Transfers
- GW Transfers container now displays for all GWs (previously hidden when empty)
- Improved styling for empty state (centered, italic, subtle color)

### Investigation Results
- Verified transfers data is working correctly (39,960 transfers synced across all leagues)
- Confirmed 0 transfers is legitimate data (5-50% of managers make no transfers per GW)
- Root cause: Empty state appeared broken, needed UX improvement

---

## v3.0.0 - Sync Infrastructure Release (Dec 18, 2025)

**MAJOR RELEASE:** Complete data sync infrastructure for all leagues.

### New Features
- **Auto-sync on first load (K-32a):** New leagues automatically sync all historical data with progress bar
- **Incremental sync (K-32b):** Returning users get missing completed GWs synced automatically
- **Quick Sync button (K-32d):** Fast sync of missing GWs only (1-5 seconds)
- **Full Re-sync button (K-32c):** Complete re-sync of all historical data
- **Transfers in sync pipeline:** GW Transfers now synced automatically for all leagues

### Bug Fixes
- Fixed GW Transfers SQL column error (pin.team → pin.team_id)
- Fixed incremental sync SQL placeholder bug ($13)
- Fixed player modal tabs data fetching

### Technical
- New sync functions in `/src/lib/leagueSync.ts`
- Sync status tracking in `leagues` table
- Progress bar component for first-time sync
- Manager transfers included in all sync operations

---

## 📚 Version History Index

This project's complete version history has been split into multiple files for better readability and maintainability.

### Current & Recent Versions

- **[v2.5.x - v2.7.x (Dec 2025)](./version-history/v2.5-v2.6.md)** - Latest development
  - v2.7.x: K-27 Database Caching & Hotfixes
  - v2.6.x: Players Tab Database Integration
  - v2.6.0-alpha: Players Tab Foundation
  - v2.5.x: Player Features & UI Polish (30 versions)

- **[v2.4.x Part 2 (Dec 2025)](./version-history/v2.4-part2.md)** - My Team Mobile-First (v2.4.45 - v2.4.25)
  - RivalFPL branding, breakpoint fixes, pitch redesign
  - FPL-style player cards, desktop layout fixes
  - 21 versions

- **[v2.4.x Part 1 (Dec 2025)](./version-history/v2.4-part1.md)** - My Team Mobile-First (v2.4.24 - v2.4.0)
  - GW selector, transfers display, stat boxes
  - Formation layout, responsive design
  - 24+ versions

### Previous Major Versions

- **[v2.2.x - v2.3.x (Dec 2025)](./version-history/v2.2-v2.3.md)** - My Team UI Polish & Redesign
  - v2.3.x: My Team UI Polish & Mobile Optimization
  - v2.2.x: My Team Redesign

- **[v2.0.x - v2.1.x (Dec 2025)](./version-history/v2.0-v2.1.md)** - Multi-League Support
  - v2.0.x: **MAJOR MILESTONE** - Multi-league support
  - v2.1.x: League management improvements

### Legacy Versions

- **[v1.x (Oct 2024 - Dec 2024)](./version-history/v1.x.md)** - Foundation & Initial Features
  - v1.26.x: Large League Support & Error Handling
  - v1.25.x: Position History & Reddit Launch
  - v1.24.x: Live Match Modal & Analytics
  - v1.23.x - v1.0.0: Core features and foundation

---

## 📝 Quick Reference

### Latest Changes (v2.7.5 - Dec 16, 2025)
- ⚡ **K-28: Season Stats Database Migration** - Migrated Season Stats to use K-27 cached tables
  - Before: 300+ FPL API calls (~10-30 seconds)
  - After: Single database queries (~1-2 seconds)
  - Captain Points: Now uses `manager_picks` + `player_gameweek_stats` + `manager_gw_history`
  - Chips Played/Faced: Now uses `manager_chips` table
  - Best/Worst GWs: Now uses `manager_gw_history` table
  - Trends Data: Now uses `manager_chips` table
  - Streaks: Already used `h2h_matches` (no change)
  - Performance improvement: ~90% faster (15s → 1.5s)

### Recent Highlights
- **v2.7.0**: K-27 Comprehensive Database Caching (5 new tables, 10 new scripts)
- **v2.6.x**: Complete Players tab with database integration
- **v2.5.12**: Defensive Contribution points (DEFCON)
- **v2.5.11**: FPL-style player points breakdown
- **v2.5.0**: Players database schema + sync job + API endpoints
- **v2.4.x**: Major My Team mobile-first redesign (45+ versions)
- **v2.0.0**: Multi-league support (MAJOR MILESTONE)

---

## 🔗 Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Project context and development guidelines
- [README.md](./README.md) - Project overview and setup instructions

---

**Note:** For the complete unabridged version history, see the individual files linked above. Each file contains detailed changelogs for its respective version range.
