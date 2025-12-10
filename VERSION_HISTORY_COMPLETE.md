# FPL H2H Analytics - Complete Version History

**Project Start:** October 23, 2024
**Total Releases:** 183+ versions
**Current Version:** v2.2.2 (December 10, 2025)

---

## 🎨 v2.2.x - My Team Redesign (Dec 2025)

### v2.2.2 - Fix Pitch Markings Alignment (Dec 10, 2025)
**UX FIX:** Pitch markings now properly positioned relative to player rows
- Fixed: Halfway line moved from 50% to 35% from top
- Fixed: Center circle repositioned to 35% (aligned with halfway line)
- Fixed: Center spot repositioned to 35% (aligned with halfway line)
- Result: Halfway line now clearly between defenders and midfielders
- Result: Center circle no longer cuts through defender row
- Impact: Pitch looks like actual football pitch with proper perspective
- Files: `src/components/PitchView/PitchView.module.css`

### v2.2.1 - Negative Scores & Bigger Player Cards (Dec 10, 2025)
**UX IMPROVEMENTS:** Enhanced fixtures and pitch view display
- Added: Negative fixture scores show in parentheses format (4) instead of -4
- Reason: Prevents confusing displays like "-4 - 4" → now shows as "(4) - 4"
- Fixed: Player cards made bigger to prevent name truncation
- Desktop: Cards 60px → 80px, kits 70px, name max-width 95px
- Mobile: Cards 50px → 65px, kits 60px, name max-width 80px
- Impact: Names like "B.Fernandes" and "Woltemade" now display fully
- Files: `src/components/Fixtures/FixturesTab.tsx`, `src/components/PitchView/PlayerCard.module.css`

---

## 🎉 v2.0.x - Multi-League Support (Dec 2025) - **MAJOR MILESTONE**

### v2.0.20 - Odd-Numbered League Support + Cleanup (Dec 9, 2025)
**FEATURE:** Support for H2H leagues with odd number of teams (AVERAGE opponent)
- Added: AVERAGE entries stored with entry_id = -1 in database
- Added: Matches vs AVERAGE now captured and stored in h2h_matches table
- Added: AVERAGE row appears in League Rankings (italic, 60% opacity styling)
- Fixed: No longer skips AVERAGE as "corrupted data" from FPL API
- Backend: Updated `/api/league/[id]/route.ts` to handle null entry_id (AVERAGE)
- Frontend: Updated LeagueTab to detect and style AVERAGE entries
- Test League: 754307 (Powerleague 2025, 31 teams)
- Also: Documented admin deployment exception for `/admin` and `/api/admin` routes
- Also: Activity toggle (Managers/Requests) with dynamic data filtering in admin panel
- Note: Package version was 2.0.19, now properly bumped to 2.0.20
- Files: `src/app/api/league/[id]/route.ts`, `src/components/Dashboard/LeagueTab.tsx`, `DEPLOYMENT.md`, `CLAUDE.md`

### v2.0.18 - Update Documentation to v2.0.18 (Dec 8, 2025)
**DOCUMENTATION:** Updated all version documentation to reflect current state
- Updated: VERSION_HISTORY_COMPLETE.md with versions 2.0.13-2.0.17
- Updated: README.md current version from v1.26.6 to v2.0.18
- Updated: README.md changelog reference to VERSION_HISTORY_COMPLETE.md
- Added: Complete documentation of admin panel debug and fix process
- Context: Versions 2.0.13-2.0.17 fixed admin panel showing zeros issue
- Files: `VERSION_HISTORY_COMPLETE.md`, `README.md`

### v2.0.17 - Clean Up Debug Endpoints (Dec 8, 2025)
**CLEANUP:** Removed temporary debug files after fixing admin panel
- Removed: `/api/debug/db-info` endpoint (temporary debugging)
- Removed: `/api/debug/table-info` endpoint (temporary debugging)
- Removed: `test-queries.js` script (temporary debugging)
- Status: Admin panel now working correctly with real analytics data
- Note: Debug endpoints were only needed to diagnose the build-time database connection issue
- Files: Deleted `src/app/api/debug/*`, `test-queries.js`

### v2.0.16 - Fix Admin Panel - Add force-dynamic (Dec 8, 2025)
**CRITICAL FIX:** Admin panel now displays real analytics data instead of zeros
- Problem: Admin panel showing all zeros despite database having 23,958 records
- Root Cause: Next.js tried to prerender admin routes during build, but `postgres.railway.internal` hostname only available at runtime
- Error: `getaddrinfo ENOTFOUND postgres.railway.internal`
- Fixed: Added `export const dynamic = 'force-dynamic'` to admin API routes
- Routes: `/api/admin/stats/route.ts`, `/api/admin/leagues/route.ts`
- Impact: Routes now execute only at request time when database connection available
- Result: Admin panel displays correct data (23,958 requests, 385 users, 107 leagues)
- Files: `api/admin/stats/route.ts`, `api/admin/leagues/route.ts`

### v2.0.15 - Add Error Details to Admin Stats Response (Dec 8, 2025)
**DEBUG:** Added detailed error information to identify failing queries
- Added: Return error message in JSON response
- Added: Return error stack trace in JSON response
- Purpose: Identify which specific query was failing in admin stats
- Result: Revealed "getaddrinfo ENOTFOUND postgres.railway.internal" error during build
- Files: `api/admin/stats/route.ts`

### v2.0.14 - Add Table Structure Debug Endpoint (Dec 8, 2025)
**DEBUG:** Created endpoint to verify database table structure
- Added: `/api/debug/table-info` endpoint
- Checks: Table existence via information_schema.columns
- Checks: Column names and data types
- Tests: Simple COUNT query and sample row retrieval
- Result: Confirmed analytics_requests table exists with 23,912 rows
- Result: Confirmed all expected columns present (id, league_id, endpoint, method, timestamp, user_hash, response_time_ms, status_code, selected_team_id)
- Files: `src/app/api/debug/table-info/route.ts`

### v2.0.13 - Add Debug Endpoint for Database Connection (Dec 8, 2025)
**DEBUG:** Created endpoint to check production DATABASE_URL
- Added: `/api/debug/db-info` endpoint
- Shows: Masked DATABASE_URL being used by production
- Shows: Analytics requests count and last record timestamp
- Purpose: Verify which database production is actually connecting to
- Result: Confirmed production uses `postgres.railway.internal:5432`
- Result: Confirmed database has 23,895 rows of analytics data
- Files: `src/app/api/debug/db-info/route.ts`

### v2.0.12 - Add Enhanced Analytics Debug Logging (Dec 5, 2025)
**DEBUG:** Added detailed logging to diagnose analytics tracking issue
- Added: Log track URL construction (protocol, host)
- Added: Log fetch response status
- Added: Log parsed response JSON
- Added: More detailed error logging with URL
- Purpose: Diagnose why analytics not being tracked since Friday
- Files: `src/middleware.ts`

### v2.0.11 - Fix Analytics Tracking (Dec 5, 2025)
**CRITICAL BUG FIX:** Analytics now saving to database - admin stats will populate
- Fixed: Analytics tracking was failing silently trying to write to non-existent analytics_leagues table
- Fixed: Removed all references to analytics_leagues from analytics.ts
- Changed: trackRequest() now only writes to analytics_requests table
- Changed: updateLeagueMetadata() is now a no-op (metadata computed on-demand)
- Changed: aggregateDailyStats() no longer updates analytics_leagues
- Impact: Analytics will now be tracked and saved to database
- Impact: Admin dashboard will show real stats after this deployment
- Files: `lib/analytics.ts`

### v2.0.10 - Fix Admin Dashboard Stats API (Dec 5, 2025)
**CRITICAL BUG FIX:** Fixed admin dashboard showing "Cannot read properties of undefined"
- Fixed: Admin stats API was querying non-existent `analytics_leagues` table
- Fixed: Error handler was missing `uniqueManagers` field in fallback response
- Changed: Rewrote queries to use only `analytics_requests` table
- Changed: Aggregate league stats directly from analytics_requests
- Added: Proper integer casting for all numeric fields
- Impact: Admin dashboard now loads without client-side errors
- Impact: Stats display correctly even when database is empty
- Files: `api/admin/stats/route.ts`

### v2.0.9 - Fix Admin Panel Sort Handler (Dec 5, 2025)
**BUG FIX:** Fixed client-side error in admin panel sort logic
- Fixed: handleSort trying to access leagues[0] when array is empty
- Fixed: Changed to check field name instead of runtime type checking
- Changed: Use predefined list of numeric fields instead of leagues[0]?.[field]
- Impact: Admin panel no longer crashes on initial load
- Files: `app/admin/leagues/page.tsx:51-63`

### v2.0.8 - Fix Admin Panel Type Casting (Dec 5, 2025)
**BUG FIX:** Fixed client-side error in admin panel caused by type mismatch
- Fixed: Admin panel showing "client-side exception has occurred" error
- Fixed: PostgreSQL COUNT() returns bigint (string), frontend expects number
- Added: Explicit ::integer casts for all numeric fields in query
- Fields cast: league_id, team_count, total_requests, unique_users, unique_managers
- Files: `api/admin/leagues/route.ts`

### v2.0.7 - Fix Admin Panel (Dec 5, 2025)
**BUG FIX:** Admin panel now works - fixed missing league_metadata table error
- Fixed: Admin panel `/admin/leagues` was broken - returning 500 error
- Fixed: Rewrote query to use existing tables instead of non-existent `league_metadata`
- Changed: Now uses CTEs to aggregate data from `analytics_requests` and `h2h_matches`
- Changed: League names now show as "League {id}" (metadata table didn't exist)
- Data: Total requests, unique users, unique managers from analytics_requests
- Data: Team count from h2h_matches
- Files: `api/admin/leagues/route.ts`

### v2.0.6 - Fix Gameweek Stats Showing ALL Leagues (Dec 5, 2025)
**CRITICAL BUG FIX:** Gameweek stats now correctly filtered by current league only
- Fixed: Gameweek stats (Captain Picks, Chips, Hits, Winners, Top Performers) were showing data from ALL leagues in database
- Fixed: `fetchManagers` function now filters by leagueId using EXISTS subquery
- Fixed: SQL query now joins h2h_matches to get only managers in selected league
- Impact: Captain Picks - now shows only captains from current league managers
- Impact: Chips Played - now shows only chips from current league managers
- Impact: Hits Taken - now shows only hits from current league managers
- Impact: Gameweek Winners - now shows only highest/lowest scores from current league
- Impact: Top Performers - now shows only players owned by current league managers
- Files: `api/league/[id]/stats/gameweek/[gw]/route.ts:313-326`

### v2.0.5 - Fix Season Stats Showing Multiple Leagues (Dec 5, 2025)
**CRITICAL BUG FIX:** Season stats now correctly filtered by current league only
- Fixed: Season stats were aggregating data across ALL leagues user is in
- Fixed: Player API now requires and filters by leagueId parameter
- Fixed: SQL query now includes `WHERE league_id = $2` filter
- Updated: Dashboard passes leagueId when fetching player data
- Impact: Highest Score, Lowest Score, Biggest Win, Biggest Loss now league-specific
- Impact: Match history, chips played, and all stats now scoped to current league
- Files: `api/player/[id]/route.ts`, `dashboard/page.tsx`

### v2.0.4 - Add Contact Footer to Settings (Dec 5, 2025)
**FEATURE:** Added contact information footer to Settings page
- Added: Contact footer section at bottom of Settings page
- Content: "Found a bug? Have feedback?" with Reddit and X links
- Link: Reddit u/gregleo (https://reddit.com/u/gregleo)
- Link: X @greglienart (https://x.com/greglienart)
- Styling: Subtle muted colors, small text, center aligned
- UX: Links open in new tab with proper security attributes
- Visual: Separated from content with border and extra spacing
- Files: `SettingsTab.tsx`, `SettingsTab.module.css`

### v2.0.3 - My Leagues UI Polish (Dec 5, 2025)
**UI IMPROVEMENT:** My Leagues section now visually matches Settings page theme
- Updated: My Leagues CSS completely rewritten to match Settings page styling
- Visual: Green theme matching action buttons (rgba(0, 255, 135, ...))
- Visual: Title now uppercase with letter-spacing like other section titles
- Visual: League items styled as cards with proper spacing and borders
- Visual: Current league has green border matching app accent color
- Visual: Hover effects with translateY(-2px) matching action buttons
- Visual: Add button styled consistently with primary actions
- Consistency: All colors changed from CSS variables to explicit rgba values
- File: `/src/components/Settings/MyLeagues.module.css` (244 lines rewritten)

### v2.0.2 - Remember Team Selection Per League (Dec 5, 2025)
**UX IMPROVEMENT:** App now remembers which team you are in each league
- Fixed: Saved leagues now store team info (myTeamId, myTeamName, myManagerName)
- Feature: First time switching to a league → team selection required
- Feature: Subsequent switches → instant switch, no team re-selection
- Smart: Auto-updates team info whenever you're in Settings
- Storage: savedLeagues now includes `{id, name, myTeamId, myTeamName, myManagerName}`
- UX: Much faster league switching for frequently used leagues

### v2.0.1 - Fix League Switching Flow (Dec 5, 2025)
**BUG FIX:** Fixed league switching to include team selection step
- Fixed: Clicking a saved league now redirects to team selection page
- Fixed: No more "Team not found in league" error
- Fixed: No more false error alert when switch succeeds
- Flow: Click league → Select your team → Dashboard loads
- Previous issue: Tried to auto-match team, failed if names didn't match
- Uses same team selection flow as "Change Team" button

### v2.0.0 - My Leagues: Save & Switch Between Multiple Leagues (Dec 5, 2025)
**MAJOR FEATURE:** Multi-league support - manage up to 5 leagues from Settings
- Added: "My Leagues" section in Settings page
- Feature: Save up to 5 leagues with names and IDs in localStorage
- Feature: Current league highlighted with green border and checkmark
- Feature: Click any league to switch (reloads dashboard with new league)
- Feature: Remove leagues with confirmation (cannot remove current league)
- Feature: Add new leagues by entering league ID (fetches name automatically)
- Storage: Uses new 'savedLeagues' localStorage key (array of {id, name})
- UX: Shows max limit message when 5 leagues saved
- Files: `/src/components/Settings/MyLeagues.tsx` + CSS module

---

## v1.26.x Series - Large League Support & Error Handling (Jan 2025)

### v1.26.14 - Remove Legacy League Route (Dec 5, 2025)
**CODE CLEANUP:** Removed old legacy `/league/[leagueId]` route and related code
- Deleted: `/src/app/league/[leagueId]/` directory (legacy league and player pages)
- Deleted: `/src/components/BottomNav.tsx` (old bottom navigation)
- Deleted: `/src/components/BottomNav.module.css` (old nav styling)
- Fixed: Removed broken navigation in LeagueTab component
- Result: `/league/804742` now returns 404 (as expected)
- Impact: Cleaner codebase, no dead code, /dashboard is the only league viewing route
- Note: Main app flow unchanged - users still access via /dashboard

### v1.26.13 - Add AFCON Special Rule for GW16 (Dec 5, 2025)
**NEW FEATURE:** Special AFCON rule - everyone gets 5 FT for GW16
- Added: Special rule override for GW16 due to AFCON break
- Reason: FPL is giving all managers 5 FT to adjust for African players unavailable
- Implementation: After normal FT calculation, if currentGW === 16, set ftBalance to 5
- Also cleaned up: Removed all debug logging from FT calculation
- Location: `/api/league/[id]/matches/[matchId]/route.ts:160-163`

### v1.26.12 - Fix FT Showing Wrong Gameweek (Dec 5, 2025) ✅ **ACTUAL FIX**
**CRITICAL FIX:** FT now shows correctly for current gameweek (not next gameweek)
- Issue: When viewing GW14 fixture, app showed FT for AFTER GW14 (2 FT) instead of FOR GW14 (1 FT)
- Root cause: Calculation added +1 FT after last completed GW, showing FT for next period
- Previous logic: Process through GW13 → add +1 FT → show 2 FT (for GW15)
- New logic: Process through GW13 → DON'T add +1 FT → show 1 FT (for GW14)
- Implementation: Only add +1 FT if there's another completed GW after current one
- Debug logging: Added comprehensive logging to trace calculations in production
- Location: `/api/league/[id]/matches/[matchId]/route.ts:122-170`

### v1.26.11 - Fix GW1 Special Case in FT Calculation (Dec 5, 2025) ❌ **INCOMPLETE**
**CRITICAL FIX:** Fixed GW1 double-counting issue in FT calculation
- Issue: GW1 was being processed as normal GW, adding +1 FT incorrectly
- Root cause: GW1 has no FT available (0), but after it ends you get 1 FT for GW2
- Previous logic: Process GW1 as (0-0+1=1), then GW2 as (1-1+1=1) - double-counted
- New logic: Skip GW1 processing, just set ftBalance=1 for GW2, then process GW2+
- Location: `/api/league/[id]/matches/[matchId]/route.ts:130-134`

### v1.26.10 - Fix FT Calculation Logic (Dec 5, 2025) ❌ **INCOMPLETE**
**CRITICAL FIX:** Corrected Free Transfers calculation with proper FPL rules
- Fixed: GW1 starts with 0 FT (not 1)
- Fixed: Cap is 5 FT (not 2)
- Fixed: Wildcard/Free Hit don't add +1 FT for next GW (was adding incorrectly)
- Fixed: Only normal GWs (including BB/TC) add +1 FT after consuming transfers
- Rules: Start 0 FT → Each normal GW: consume transfers, then +1 FT (max 5)
- Location: `/api/league/[id]/matches/[matchId]/route.ts:122-144`

### v1.26.9 - Reverse Form Display Order (Dec 5, 2025)
**UX IMPROVEMENT:** Form (W/L/D) now displays oldest→newest (left to right)
- Changed: Form badges now show chronologically (oldest GW on left, newest on right)
- Previous: Newest→oldest (confusing for users expecting timeline flow)
- Locations: League standings table + Match details modal
- Implementation: Reversed arrays in 2 API endpoints for consistent display
- Files: `/api/league/[id]/stats/route.ts:52` + `/api/league/[id]/matches/[matchId]/route.ts:94`

### v1.26.8 - Fix FT Calculation Bug (Dec 5, 2025)
**BUG FIX:** Free Transfers showing incorrect value in upcoming fixtures modal
- Fixed: FT calculation loop processing current gameweek, causing off-by-one error
- Root cause: Loop included current GW data from `historyData.current`
- Solution: Added early break when reaching current gameweek
- Impact: FTs now show correct value for current/upcoming gameweeks
- Location: `/api/league/[id]/matches/[matchId]/route.ts:125-127`

### v1.26.7 - Admin Leagues Page (Dec 5, 2025)
**NEW FEATURE:** Dedicated sortable leagues page in admin panel
- Added `/admin/leagues` page with full league list
- Sortable columns: click headers to sort by any field
- Smart sorting: desc for numbers, asc for text, toggleable direction
- Sort indicators: ⇅ (unsorted), ↑ (ascending), ↓ (descending)
- Visual enhancements: hover effects on sortable columns
- Navigation: "View All" button from admin dashboard
- API endpoint: `/api/admin/leagues` fetches all league metadata

### v1.26.6 - Null Entry Handling (Jan 4, 2025) ✅ **WORKING**
**CRITICAL FIX:** Handle corrupted FPL data with null entry_ids
- Fixed: League 754307 (32 teams) failing immediately
- Root cause: FPL API returns null entry_id for deleted/removed teams
- Added null checks before database inserts
- Skip corrupted entries with warning logs
- Gracefully handle leagues with deleted accounts

### v1.26.5 - Debug Logging (Jan 4, 2025)
Added comprehensive error logging to diagnose failures
- Log each API call attempt with success/failure details
- Helped identify v1.26.6 null entry issue

### v1.26.4 - Performance Optimization (Jan 4, 2025)
**MAJOR optimization** to bypass Railway's 30-second timeout
- Strip down `/api/league/[id]` to fetch ONLY essential data
- Remove 832+ API calls (captain picks, chips, manager history)
- Processing time: **60-90s → <5s** for large leagues
- Enables support for leagues up to 50 teams

### v1.26.3 - Timeout Fix Attempt (Jan 4, 2025)
- Increased axios timeout to 90 seconds
- Added loading message after 3 seconds

### v1.26.2 - Classic League Error Messages (Jan 3, 2025)
**URGENT fix** for Reddit launch
- Clear error messages for Classic league IDs
- API-side detection with friendly messages
- Impact: 84 users, 28 leagues

### v1.26.1 - Y-Axis Visibility (Jan 2, 2025)
- Show all ranks 1-30 on position graph
- Better visibility for top 20 teams

### v1.26.0 - Position Comparison (Jan 2, 2025)
**NEW FEATURE:** Compare position history vs opponents
- Dual-line chart: green (you) vs red (opponent)
- Opponent selector dropdown

---

## v1.25.x Series - Position History & Reddit Launch (Dec 2024 - Jan 2025)

### v1.25.6 - Position History Bug Fix (Jan 2, 2025)
- Fixed type mismatch: string vs number in entry_id comparison
- Position history now loads correctly

### v1.25.5 - Quick Access Collapsible (Jan 2, 2025)
- Hide "Dedoume FPL 9th Edition" button for professional look
- Collapsible Quick Access section

### v1.25.4 - Revert FPL Login (Jan 1, 2025)
- Reverted to League ID entry only
- Removed FPL authentication code (blocked by anti-bot)

### v1.25.3 - Smart Line Breaks Fix (Dec 31, 2024)
- Improved capital detection logic for line breaks

### v1.25.2 - Smart Line Breaks (Dec 31, 2024)
- Automatic line breaks for long team names

### v1.25.1 - Team Selection Improvements (Dec 31, 2024)
- Equal card heights, alphabetical sort, capitalize names

### v1.25.0 - League Position Over Time (Dec 30, 2024)
**NEW FEATURE:** Position history chart in My Team Stats
- Track league position across all gameweeks
- Line chart showing rank progression

---

## v1.24.x Series - Live Match Modal & Analytics (Dec 2024)

### v1.24.6 - Team Selection Optimization (Dec 29, 2024)
- Reduce wasted space on team selection screen

### v1.24.5 - Managers Tracking (Dec 28, 2024)
- Added Managers metrics with time breakdowns

### v1.24.4 - Team Selection UX (Dec 28, 2024)
- Enhanced team selection screen layout
- Added tracking for unique managers

### v1.24.3 - Live Modal Enhancements (Dec 27, 2024)
- Show detailed bench players with positions
- Fixed provisional bonus display

### v1.24.2 - Live Modal UI Cleanup (Dec 27, 2024)
- Remove clutter, reorder sections

### v1.24.1 - Live Rankings Fix (Dec 26, 2024)
- Include current GW projected results in rankings

### v1.24.0 - Single Source of Truth (Dec 26, 2024)
**Architecture refactor:** Consistent scoring across all components
- All calculations use shared `scoreCalculator.ts`

---

## v1.23.x Series - Auto-Sub Fixes (Dec 2024)

### v1.23.3 - Simpler Auto-Sub Logic (Dec 25, 2024)
- Simplified player ID comparison ignoring auto-sub differences

### v1.23.2 - Auto-Sub in Common Players (Dec 25, 2024)
- Handle different effective squads from auto-subs

### v1.23.1 - Live Modal Auto-Sub Timing (Dec 24, 2024)
- Accurate provisional bonus calculation
- Better auto-sub timing based on fixture status

### v1.23.0 - Auto-Sub Timing Fix (Dec 24, 2024)
**Critical fix:** Only sub players from started/finished fixtures
- Prevents premature auto-substitutions

---

## v1.22.x Series - Analytics System (Nov-Dec 2024)

### v1.22.9 - Time-Based Analytics (Nov 30, 2024)
- Time breakdowns for requests and users

### v1.22.8 - Unique Users Fix (Nov 30, 2024)
- Calculate unique users in real-time

### v1.22.7 - Debug Logging (Nov 30, 2024)
- Debug stats endpoint for zero counts

### v1.22.6 - Analytics URL Fix (Nov 30, 2024)
- Use forwarded headers instead of localhost

### v1.22.5 - Middleware Debug Logging (Nov 29, 2024)
- Comprehensive debug logging for tracking

### v1.22.4 - Analytics Debugging (Nov 29, 2024)
- Add analytics debugging logs

### v1.22.3 - Request Tracking Fix (Nov 29, 2024)
- Fix request tracking logic

### v1.22.2 - Desktop Nav Width (Nov 29, 2024)
- Constrain nav bar width on desktop

### v1.22.1 - Desktop Tab Spacing (Nov 29, 2024)
- Fix top spacing for tabs on desktop

### v1.22.0 - Re-enable Analytics (Nov 29, 2024)
- Analytics system working correctly

---

## v1.21.x Series - Analytics Fixes (Nov 2024)

### v1.21.3 - Disable Analytics (Nov 29, 2024)
**HOTFIX:** Temporarily disable analytics while debugging

### v1.21.2 - Fixtures Spacing (Nov 29, 2024)
- Increase Fixtures top spacing on desktop

### v1.21.1 - Fixtures Tab Fix (Nov 29, 2024)
- Fix Fixtures tab overlap on desktop

### v1.21.0 - Daily Aggregation (Nov 29, 2024)
**Phase 2:** Daily aggregation system for analytics
- Aggregate data daily for performance

---

## v1.20.0 - Analytics Charts (Nov 28, 2024)
**Phase 4:** Charts and polish for analytics dashboard
- Visual charts for request trends
- User activity graphs

---

## v1.19.0 - Analytics Dashboard (Nov 28, 2024)
**Complete admin dashboard:**
- Real-time analytics data display
- Health monitoring integration
- Request/user/league metrics

---

## v1.18.0 - Analytics Foundation (Nov 28, 2024)
**Phase 1:** Silent data collection system
- Database tables: `api_requests`, `daily_stats`
- Tracking middleware for all API requests

---

## v1.17.0 - Admin Dashboard (Nov 28, 2024)
**Centralization:** Single admin dashboard at `/admin`
- Combined health monitoring
- Unified admin interface

---

## v1.16.x Series - Mobile Navigation (Nov 2024)

13 iterations to perfect mobile PWA experience:
- v1.16.13: Remove gradient overlay on desktop
- v1.16.12: Purple gradient for iOS status bar
- v1.16.11: Extend gradient to safe area
- v1.16.10: Translucent status bar
- v1.16.9: Black status bar style
- v1.16.8: Extend gradient coverage
- v1.16.7: Match status bar to dark background
- v1.16.6: Add gradient overlay behind nav
- v1.16.5: Floating nav with transparent wrapper
- v1.16.4: Solid nav background + scroll to top
- v1.16.3: **CRITICAL FIX** - Actual nav positioning
- v1.16.2: Force PWA cache refresh
- v1.16.1: Restore bottom position
- v1.16.0: **MAJOR** - Responsive nav (bottom mobile, top desktop)

---

## v1.15.x Series - Stats Hub Polish (Nov 2024)

### v1.15.4 - Code Cleanup (Nov 28, 2024)
- Remove debug console.logs and dead code

### v1.15.3 - Gameweek Toggle Fix (Nov 28, 2024)
- Fix Best/Worst gameweeks showing identical data

### v1.15.2 - Chips Faced Fix (Nov 18, 2024)
- Use chip history API for accurate data

### v1.15.1 - Stats Hub Polish (Nov 18, 2024)
- Remove "Stats Hub" title
- Fix captain percentage calculation

### v1.15.0 - Stats Hub UI (Nov 18, 2024)
**Major improvements:** Mobile PWA optimization
- Vertical space optimization
- Modal fixes

---

## v1.14.x Series - Fixtures UI & Modals (Nov 2024)

### v1.14.0 - Clickable Leaderboards (Nov 13, 2024)
**Major feature:** Click any leaderboard → view all 20 managers
- Reusable modal component
- Smooth animations

### v1.14.22 - Modal Scroll Overlay (Nov 5, 2024)
- Fix modal scroll overlay conflict

### v1.14.21 - Modal Scroll Behavior (Nov 5, 2024)
- Fix modal scroll behavior

### v1.14.20 - Modal Content Layout (Nov 5, 2024)
- Fix modal content layout CSS

### v1.14.19 - Unified Bottom Sheet (Nov 5, 2024)
- Unify fixture modals with bottom sheet

### v1.14.18 - Smart Toggle Defaults (Nov 4, 2024)
- Smart LIVE/OFFICIAL toggle defaults

### v1.14.17 - Rankings Cache Fix (Nov 4, 2024)
- Fix stale OFFICIAL rankings cache

### v1.14.16 - Rankings Spacing (Nov 4, 2024)
- Optimize Rankings page spacing

### v1.14.15 - Update Notification (Nov 4, 2024)
- Fix stuck update notification

### v1.14.14 - Modal Safe Area (Nov 4, 2024)
- Fix modal safe area padding on iOS

### v1.14.13 - Unified Modal (Nov 4, 2024)
- Unified modal for live and completed fixtures

### v1.14.12 - Rounded Corners (Nov 4, 2024)
- Consistent rounded corners

### v1.14.11 - Navigator Padding (Nov 4, 2024)
- Remove redundant navigator padding

### v1.14.10 - Card Spacing (Nov 4, 2024)
- Fix redundant card spacing

### v1.14.9 - Vertical Spacing (Nov 4, 2024)
- Consistent 10px vertical spacing

### v1.14.8 - Card Heights (Nov 4, 2024)
- Natural card heights with comfortable spacing

### v1.14.7 - Balanced Padding (Nov 4, 2024)
- Equal top/bottom padding

### v1.14.6 - Compact Cards (Nov 4, 2024)
- Reduce bottom padding

### v1.14.5 - Line Spacing (Nov 4, 2024)
- Reduce line spacing for compact layout

### v1.14.4 - Info Line Spacing (Nov 4, 2024)
- Tighter spacing below info line

### v1.14.3 - Text Format (Nov 4, 2024)
- Text format for chips and hits

### v1.14.2 - Duplicate Badges (Nov 4, 2024)
- Remove duplicate hit badges

### v1.14.1 - Chip/Hit Display (Nov 3, 2024)
- Fix completed gameweeks chip/hit display

---

## v1.13.x Series - Season Stats (Nov 2024)

### v1.13.1 - Quick Fixes (Nov 13, 2024)
- Toggle styling consistency
- Chips faced display bug fix
- Captain points percentage

### v1.13.0 - Complete Feature Set (Nov 13, 2024)
**Major release:** Season-long statistics
- Chip Performance (Played & Faced leaderboards)
- Streaks (historical maximum with GW ranges)
- Captain Points (season total with percentages)
- Best/Worst Gameweeks

---

## v1.12.x Series - Fixture Cards (Nov 2024)

### v1.12.1 - Critical Bug Fixes (Nov 3, 2024)
- Fix 4 critical bugs in 3-line cards

### v1.12.0 - Compact 3-Line Cards (Nov 3, 2024)
**New design:** Compact 3-line fixture cards

---

## v1.11.x Series - Stats Hub Development (Nov 2024)

### v1.11.14 - Unknown Manager Names (Nov 12, 2024)
- Fix Unknown managers in Consistency leaderboard

### v1.11.13 - Captain Points Fix (Nov 12, 2024)
- Fetch captain data from FPL API directly

### v1.11.12 - Manager Names Fix (Nov 12, 2024)
- Get ALL managers from h2h_matches

### v1.11.11 - Parameter Binding Fix (Nov 12, 2024)
- Fix PostgreSQL parameter binding error

### v1.11.10 - Boundary Fixes (Nov 11, 2024)
- Filter placeholder GWs, improve null handling

### v1.11.9 - Initial Chips Fix (Nov 11, 2024)
- Fetch chips data from FPL API

### v1.11.8 - Dual Cache System (Nov 11, 2024)
- Captain + chips cache optimization

### v1.11.7 - Remove Cache Optimization (Nov 11, 2024)
- Fix chips data not populating

### v1.11.6 - Type Conversion Fix (Nov 11, 2024)
- Fix PostgreSQL AVG type conversion

### v1.11.5 - LIVE Badge Logic (Nov 11, 2024)
- Fix LIVE badge logic and Season Stats SQL

### v1.11.4 - Live Gameweek Detection (Nov 11, 2024)
- Fix live gameweek detection

### v1.11.3 - Versioning Guidelines (Nov 11, 2024)
- Add versioning guidelines to context

### v1.11.2 - Container Gaps (Nov 3, 2024)
- Standardize container gaps across tabs

### v1.11.0 - Season Stats (Nov 11, 2024)
**Major feature:** Season Stats with leaderboards
- Historical trends

---

## v1.10.0 - Stats Hub (Nov 10, 2024)
**MAJOR FEATURE:** Replace Awards with comprehensive Stats Hub
- 5 gameweek statistics sections:
  - Captain Picks
  - Chips Played
  - Hits Taken
  - Gameweek Winners
  - Differentials
- Real-time data aggregation
- GW selector with live badge

---

## v1.9.x Series - Provisional Bonus & Team Fixtures (Nov 2024)

### v1.9.8 - Provisional Bonus Fix (Nov 10, 2024)
**CRITICAL FIX:** Use complete fixtures data with ALL players
- Fetch fixtures from FPL API
- Extract ALL players' BPS per match
- Award bonus to top 3 BPS per fixture

### v1.9.7 - Provisional Bonus Implementation (Nov 10, 2024)
- Implement provisional bonus calculation for H2H fixtures

### v1.9.6 - Modal Header Fix (Nov 10, 2024)
- Fix Fixture Details Modal header - centered, balanced

### v1.9.5 - Badge Positioning (Nov 10, 2024)
- Move team badges to outer edges

### v1.9.4 - Modal Header Structure (Nov 10, 2024)
- Fix Fixture Details Modal header structure

### v1.9.3 - Defensive Contribution (Nov 10, 2024)
- Add per-player defensive contribution

### v1.9.2 - Layout Fix (Nov 10, 2024)
- Fix Team Fixtures layout - mirror away team

### v1.9.1 - Ultra-Compact Fixtures (Nov 10, 2024)
- Add ultra-compact Team Fixtures with team logos

---

## v1.8.0 - Team Fixtures Tab (Nov 10, 2024)
**NEW FEATURE:** Team Fixtures tab with independent state
- Complete fixture view per team
- Team-centric navigation

---

## v1.7.x Series - Live Match Modal (Oct-Nov 2024)

### v1.7.9 - Context Documentation (Nov 9, 2024)
- Remove debug logging, add context files

### v1.7.8 - Live Rankings Fix (Nov 9, 2024)
**CRITICAL FIX:** Calculate live rankings with auto-subs
- Added `calculateLiveScoreWithAutoSubs` helper

### v1.7.3 - Live Match Modal Fix (Oct 25, 2024)
- Better score calculation and objectivity

### v1.7.2 - CORS Fix (Oct 25, 2024)
- Fix CORS issue with live match data

### v1.7.1 - Loading Overlay (Oct 25, 2024)
- Add loading overlay and error handling

### v1.7.0 - Live Fixture Modal (Oct 25, 2024)
**NEW FEATURE:** Live Match tracking
- Real-time match scores
- Auto-substitution display
- Provisional bonus

---

## v1.6.x Series - Fixtures UI (Oct 2024)

### v1.6.3 - UI Improvements (Oct 25, 2024)
- Remove timeline, add GW dropdown selector

### v1.6.2 - Fixture State Detection (Oct 25, 2024)
- Smart GW selection based on fixture state

### v1.6.0 - League Awards (Oct 24, 2024)
**NEW FEATURE:** League Awards & Performance Stats
- Awards system

---

## v1.5.x Series - Opponent Insights & Navigation (Oct-Nov 2024)

### v1.5.13 - Team Selection Fix (Nov 9, 2024)
- Fix team selection without Remember Me checkbox

### v1.5.12 - OFFICIAL Mode Fix (Nov 9, 2024)
- Exclude current live gameweek from OFFICIAL mode

### v1.5.11 - Toggle Default (Nov 9, 2024)
- Show LIVE by default when GW is active

### v1.5.10 - Toggle Persistence (Nov 9, 2024)
- Fix LIVE/OFFICIAL toggle state persistence

### v1.5.9 - Toggle Gameweek (Nov 9, 2024)
- Show correct gameweek in toggle

### v1.5.8 - Consolidate Fixes (Nov 9, 2024)
- Team selection and ranking toggle fixes

### v1.5.6 - Strategic Intel Mobile (Oct 25, 2024)
- Fix Strategic Intel mobile alignment

### v1.5.5 - Free Transfers Fix (Oct 24, 2024)
- Accurate season tracking for Free Transfers

### v1.5.3 - Visual Symmetry (Nov 8, 2024)
- Mirror fixture info line for symmetry

### v1.5.2 - Position Differentials (Nov 8, 2024)
- Add position differentials to live match analysis

### v1.5.1 - Navigation Fix (Nov 8, 2024)
- Fix player profile navigation (5 tabs)

### v1.5.0 - Navigation Modernization (Nov 8, 2024)
**MAJOR UPDATE:** Navigation and captain data fixes
- Modern navigation structure

---

## v1.4.x Series - Match Details (Oct 2024)

### v1.4.4 - Mobile Grid Override (Oct 24, 2024)
- Fix opponent insights grid on mobile

### v1.4.3 - Width Alignment (Oct 24, 2024)
- Fix width alignment in grid

### v1.4.2 - Layout Improvement (Oct 24, 2024)
- Side-by-side comparison layout

### v1.4.1 - Stats Display Fix (Oct 24, 2024)
- Fix RANK and TOT displaying wrong player's stats

### v1.4.0 - Expandable Match Details (Oct 24, 2024)
**NEW FEATURE:** Expandable match details
- Brief #9 implementation

---

## v1.3.x Series - Responsive Grid (Oct 2024)

### v1.3.3 - Stat Box Fix (Oct 24, 2024)
- Fix stat box stretching on large screens

### v1.3.2 - Mobile Text Sizing (Oct 24, 2024)
- Mobile text sizing improvements

### v1.3.1 - Mobile Layout Fix (Oct 24, 2024)
- Fix chips & FT sections on mobile

### v1.3.0 - Responsive Grid (Oct 24, 2024)
**NEW FEATURE:** Implement responsive grid
- Clean opponent chips & FT display (Brief #8)

---

## v1.2.x Series - Chip Detection (Oct 2024)

### v1.2.5 - Center Content (Oct 24, 2024)
- Center opponent insights on mobile

### v1.2.4 - UI Improvement (Oct 24, 2024)
- Improve opponent insights UI

### v1.2.3 - Chip Renewal Logic (Oct 24, 2024)
- Max 1 of each chip, renew in GW19

### v1.2.2 - Wildcard Count (Oct 24, 2024)
- Show 2 wildcards available

### v1.2.1 - Chip Detection Fix (Oct 24, 2024)
- Use FPL API history endpoint

### v1.2.0 - Chip Detection (Oct 24, 2024)
**MAJOR FIX:** Fix chip detection system
- Move to v1.2

---

## v1.1.x Series - Initial Features (Oct 2024)

### v1.1.31 - Header Alignment (Oct 24, 2024)
- Fix header and navbar alignment

### v1.1.30 - Pill-Style Tabs (Oct 24, 2024)
**UI UPDATE:** Pill-style tabs (Brief #7)
- Improved navigation alignment

### v1.1.29 - Actual Chips (Oct 24, 2024)
- Fetch actual available chips from FPL API

### v1.1.28 - Chip Accuracy (Oct 24, 2024)
- Fix chip accuracy
- Add Free Transfers

### v1.1.27 - Default Gameweek (Oct 24, 2024)
- Default Fixtures to current/upcoming gameweek

### v1.1.26 - Future GW Navigation (Oct 24, 2024)
**NEW FEATURE:** Enable future GW navigation
- Enhance opponent insights

### v1.1.25 - Fixtures Navigator (Oct 24, 2024)
- Align Fixtures navigator with design

### v1.1.1 - Navigation Consistency (Oct 23, 2024)
- Navigation consistency improvements

### v1.1.0 - Fixtures Tab (Oct 23, 2024)
**INITIAL RELEASE:** Add Fixtures tab
- Strategic opponent insights

---

## Summary Statistics

**Total Versions:** 170+ releases
**Development Period:** October 23, 2024 - December 8, 2025 (~14 months)
**Average Release Frequency:** ~2.4 versions per day

**Major Milestones:**
- v1.1.0 (Oct 23): Initial Fixtures tab
- v1.7.0 (Oct 25): Live Match tracking
- v1.10.0 (Nov 10): Stats Hub
- v1.13.0 (Nov 13): Season statistics
- v1.16.0 (Nov 28): Responsive navigation
- v1.18.0 (Nov 28): Analytics foundation
- v1.25.0 (Dec 30): Position history graph
- v1.26.0 (Jan 2): Position comparison
- v1.26.6 (Jan 4): Large league support

**Series Breakdown:**
- v1.1.x: 31 releases (Fixtures & Opponent Insights)
- v1.2.x-v1.6.x: 25 releases (Chip detection, UI improvements)
- v1.7.x: 9 releases (Live Match Modal)
- v1.8.x-v1.9.x: 8 releases (Team Fixtures, Provisional Bonus)
- v1.10.x-v1.15.x: 35 releases (Stats Hub development)
- v1.16.x: 13 releases (Mobile navigation perfection)
- v1.17.x-v1.22.x: 18 releases (Analytics system)
- v1.23.x-v1.24.x: 10 releases (Auto-subs, Live rankings)
- v1.25.x: 6 releases (Position history)
- v1.26.x: 6 releases (Large leagues, error handling)

---

**Last Updated:** December 10, 2025
**Maintained By:** Claude Code (automated after every deployment)
