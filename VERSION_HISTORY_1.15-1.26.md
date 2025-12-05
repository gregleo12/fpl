# FPL H2H Analytics - Version History (1.15.0 - 1.26.6)

Complete changelog from December 2024 to January 2025

---

## v1.26.x Series - Large League Support & Error Handling (Jan 2025)

### v1.26.6 - Null Entry Handling (Jan 4, 2025)
**CRITICAL FIX:** Handle corrupted FPL API data with null entry_ids
- Fixed: League 754307 (32 teams) was failing immediately
- Root cause: FPL API returns null entry_id for deleted/removed teams
- Added null checks before database inserts for standings and matches
- Skip corrupted entries with warning logs
- Gracefully handle leagues with deleted accounts

### v1.26.5 - Debug Logging (Jan 4, 2025)
**Investigation:** Added comprehensive error logging
- Log each API call attempt (league, standings, matches)
- Track success/failure with detailed error codes
- Identify exact failure point for debugging
- Helped diagnose v1.26.6 null entry issue

### v1.26.4 - Performance Optimization (Jan 4, 2025)
**Major optimization** to bypass Railway's 30-second timeout
- Strip down `/api/league/[id]` to fetch ONLY essential data
- Remove 832+ API calls for captain picks, chips, manager history
- Remove bootstrap data, live event data, detailed processing
- Simplify match storage (basic data only)
- Return minimal payload: league info + standings only
- Processing time: **60-90s → <5s** for large leagues
- Enables support for leagues up to 50 teams

### v1.26.3 - Timeout Fix Attempt (Jan 4, 2025)
**Attempted fix** for large league timeouts
- Increased axios timeout to 90 seconds
- Added loading message after 3 seconds: "⏳ Large leagues take longer..."
- Enhanced error handling for timeouts, network errors
- Note: Didn't fully solve issue - Railway has 30s platform timeout

### v1.26.2 - Classic League Error Messages (Jan 3, 2025)
**URGENT FIX** for Reddit launch - clear error messages
- Users were getting confusing "500 error" for Classic league IDs
- Added API-side detection: catch 404 from H2H endpoint
- Return specific error codes: `classic_league`, `no_standings`
- Frontend parses errors and shows friendly messages:
  - "⚠️ This is a Classic league. Only H2H leagues are supported."
  - "⚠️ This league has no H2H matches yet. Please try again after GW1."
- Impact: 84 users, 28 leagues at deployment time

### v1.26.1 - Y-Axis Visibility (Jan 2, 2025)
**UI Fix:** Show all ranks 1-20 clearly on position graph
- Before: Only ~10 evenly spaced ticks (1st, 4th, 6th...)
- After: All ranks 1-30 visible, then sparse above 30
- Created `generateYAxisTicks()` function for smart tick generation
- Critical for understanding position changes in top 20

### v1.26.0 - Position Comparison (Jan 2, 2025)
**Major feature:** Compare position history against opponents
- Added opponent selector dropdown (all league teams)
- Dual-line chart: green (you) vs red (opponent)
- Enhanced tooltip showing both positions per gameweek
- Moved graph placement after Season Stats section
- Perfect for tracking rivalries and head-to-head positioning

---

## v1.25.x Series - Position History & Reddit Launch (Dec 2024 - Jan 2025)

### v1.25.6 - Position History Bug Fix (Jan 2, 2025)
**URGENT FIX:** Position history showing "No data available"
- Root cause: String/number type mismatch when comparing entry_ids
- Database returns `entry_id` as STRING ('3794023')
- Code compared with NUMBER (3794023)
- JavaScript: `'3794023' !== 3794023` → never matched
- Fixed by ensuring type consistency throughout
- Changed interface: `entry_id: number` → `entry_id: string`

### v1.25.5 - Quick Access Collapsible (Jan 2, 2025)
**Reddit launch prep:** Professional landing page
- Hide hardcoded "Dedoume FPL 9th Edition" button
- Add collapsible "Quick Access" section (collapsed by default)
- Remember user's preference in localStorage
- Makes app look professional for public Reddit launch

### v1.25.4 - Revert FPL Login (Jan 1, 2025)
**Rollback:** Revert to League ID entry only
- After investigation (v1.26.0-v1.26.2), FPL login too complex
- Restore clean LeagueInput component from v1.25.3
- Remove FPL authentication attempt
- Focus on proven approach

### v1.25.3 - Smart Line Breaks Fix (Dec 31, 2024)
**Bug fix:** Line breaks now working correctly
- Improved capital detection logic
- Better handling of long team names
- Enhanced word boundary detection

### v1.25.2 - Smart Line Breaks (Dec 31, 2024)
**Feature:** Smart line breaks for long team names
- Automatically break long team names at word boundaries
- Improved readability in team selection
- Better mobile display

### v1.25.1 - Team Selection Improvements (Dec 31, 2024)
**UX improvements:**
- Equal card heights for all teams
- Alphabetical sorting by player name
- Capitalize team names properly
- Cleaner visual consistency

### v1.25.0 - League Position Over Time (Dec 30, 2024)
**New Feature:** Position history chart in My Team Stats
- Track your league position across all gameweeks
- Line chart with rank on Y-axis, gameweek on X-axis
- Shows progression from GW1 to current gameweek
- Fetches data from `/api/league/[id]/stats/position-history`
- Database stores historical position data per gameweek

---

## v1.24.x Series - Live Match Modal & Analytics (Dec 2024)

### v1.24.6 - Team Selection Optimization (Dec 29, 2024)
**Space optimization:** Reduce wasted space on team selection
- Tighter card layouts
- Better use of vertical space
- Improved mobile experience

### v1.24.5 - Managers Tracking (Dec 28, 2024)
**Analytics enhancement:**
- Added Managers metrics section with time breakdowns
- Track unique managers (entry IDs)
- Rename labels for clarity
- Better analytics granularity

### v1.24.4 - Team Selection UX + Managers (Dec 28, 2024)
**UX improvements:**
- Enhanced team selection screen layout
- Added tracking for unique managers (distinct teams)
- Better visual hierarchy

### v1.24.3 - Live Modal Enhancements (Dec 27, 2024)
**Modal improvements:**
- Show detailed bench players with positions instead of total
- Fixed provisional bonus display
- Better bench visualization

### v1.24.2 - Live Modal UI Cleanup (Dec 27, 2024)
**UI improvements:**
- Remove clutter from Live Match Modal
- Reorder sections for better flow
- Cleaner information hierarchy

### v1.24.1 - Live Rankings Fix (Dec 26, 2024)
**Fix:** Live Rankings now include current GW projected results
- Fixed database query for LIVE mode
- Include unscored matches from current gameweek
- Show accurate projected standings

### v1.24.0 - Single Source of Truth (Dec 26, 2024)
**Architecture refactor:** Complete scoring consistency
- All score calculations use shared `scoreCalculator.ts` module
- No more duplicate scoring logic
- Consistent auto-sub rules across all components
- Foundation for reliable scoring

---

## v1.23.x Series - Auto-Sub Fixes (Dec 2024)

### v1.23.3 - Simpler Auto-Sub Logic (Dec 25, 2024)
**Simplified approach** for Common Players with different auto-subs
- Previous: Complex permutation-based matching
- New: Simpler player ID comparison ignoring auto-sub differences
- Faster and more maintainable

### v1.23.2 - Auto-Sub in Common Players (Dec 25, 2024)
**Fix:** Common Players / Differentials with auto-subs
- Handle cases where auto-subs create different effective squads
- Account for different bench positions coming on

### v1.23.1 - Live Modal Auto-Sub Timing (Dec 24, 2024)
**Fix:** Auto-sub timing and provisional bonus
- Live Modal now fetches fixtures data with BPS and status
- Accurate provisional bonus calculation
- Better auto-sub timing based on fixture status

### v1.23.0 - Auto-Sub Timing Fix (Dec 24, 2024)
**Critical fix:** Only sub players from started/finished fixtures
- Before: Auto-subs triggered for players in upcoming fixtures
- After: `didNotPlay()` checks `fixture.started` and `fixture.finished`
- Prevents premature auto-substitutions

---

## v1.22.x Series - Analytics System (Dec 2024)

### v1.22.9 - Time-Based Analytics (Dec 23, 2024)
**Enhancement:** Time breakdowns for requests and users
- Daily, weekly, monthly request counts
- User activity by time period
- Better analytics granularity

### v1.22.8 - Unique Users Fix (Dec 23, 2024)
**Fix:** League unique users count calculated in real-time
- Query database for accurate counts
- No more stale cached data

### v1.22.7 - Debug Logging (Dec 22, 2024)
**Investigation:** Add debug logging to diagnose zero counts
- Track stats endpoint execution
- Identify why counts showing zero

### v1.22.6 - Analytics URL Fix (Dec 22, 2024)
**Critical fix:** Use forwarded headers instead of localhost
- Root cause: Server uses localhost instead of real URL
- Track actual user-facing URL from headers
- Accurate analytics tracking

### v1.22.5 - Middleware Debug Logging (Dec 22, 2024)
**Investigation:** Comprehensive debug logging for tracking
- Log all middleware operations
- Diagnose tracking failures

### v1.22.4 - Analytics Debugging (Dec 21, 2024)
**Debug enhancement:** Add analytics debugging logs
- Track request flow
- Identify tracking failures

### v1.22.3 - Request Tracking Fix (Dec 21, 2024)
**Analytics fix:** Fix request tracking logic
- Correct endpoint detection
- Accurate request counting

### v1.22.2 - Desktop Nav Width (Dec 21, 2024)
**UI fix:** Constrain nav bar width on desktop
- Better desktop layout
- Centered navigation

### v1.22.1 - Desktop Tab Spacing (Dec 21, 2024)
**UI fix:** Fix top spacing for all tabs on desktop
- Consistent spacing
- Better visual alignment

### v1.22.0 - Re-enable Analytics (Dec 20, 2024)
**Analytics restored:** After fixing issues
- Re-enable middleware tracking
- System working correctly

---

## v1.21.x Series - Analytics Fixes (Dec 2024)

### v1.21.3 - Disable Analytics (Dec 20, 2024)
**HOTFIX:** Temporarily disable analytics tracking
- Emergency fix for tracking issues
- Disable while debugging

### v1.21.2 - Fixtures Spacing (Dec 19, 2024)
**UI fix:** Increase Fixtures top spacing on desktop
- Better visual breathing room

### v1.21.1 - Fixtures Tab Fix (Dec 19, 2024)
**UI fix:** Fix Fixtures tab overlap on desktop
- Prevent content overlap
- Clean layout

### v1.21.0 - Daily Aggregation (Dec 19, 2024)
**Phase 2:** Daily aggregation system for analytics
- Aggregate data daily for performance
- Faster analytics queries
- Scalable architecture

---

## v1.20.0 - Analytics Charts (Dec 18, 2024)
**Phase 4:** Charts and polish for analytics dashboard
- Visual charts for request trends
- User activity graphs
- Professional analytics UI

---

## v1.19.0 - Analytics Dashboard (Dec 17, 2024)
**Complete admin dashboard:**
- Real-time analytics data display
- Health monitoring integration
- Request/user/league metrics
- Time-based breakdowns

---

## v1.18.0 - Analytics Foundation (Dec 16, 2024)
**Phase 1:** Silent data collection system
- Database tables: `api_requests`, `daily_stats`
- Tracking middleware for all API requests
- Foundation for analytics system

---

## v1.17.0 - Admin Dashboard (Dec 15, 2024)
**Centralization:** Single admin dashboard at `/admin`
- Combined health monitoring
- Unified admin interface
- Better organization

---

## v1.16.x Series - Mobile Navigation (Dec 2024)

### v1.16.13 - Desktop Gradient (Dec 14, 2024)
**UI fix:** Remove nav gradient overlay on desktop only
- Hide gradient on desktop (min-width: 769px)
- Keep for mobile

### v1.16.12 - Purple Status Bar (Dec 14, 2024)
**iOS fix:** Add purple gradient for iOS status bar area
- Visual gradient in status bar zone
- Better iOS integration

### v1.16.11 - Status Bar Background (Dec 13, 2024)
**iOS fix:** Extend gradient to safe area
- Add explicit theme-color meta tag
- Cover status bar properly

### v1.16.10 - Translucent Status Bar (Dec 13, 2024)
**iOS fix:** Enable translucent status bar for gradient visibility
- Change to black-translucent style
- Allow gradient to show through

### v1.16.9 - Black Status Bar (Dec 13, 2024)
**iOS fix:** Fix white status bar by changing to black style
- Change from black-translucent to black
- Match dark theme

### v1.16.8 - Gradient Coverage (Dec 12, 2024)
**UI fix:** Extend gradient to cover status bar area
- Move gradient from container to body level
- Full coverage

### v1.16.7 - Status Bar Color (Dec 12, 2024)
**UI fix:** Match status bar to dark app background
- Change theme from purple to dark (#1a1a2e)
- Better color consistency

### v1.16.6 - Nav Gradient Overlay (Dec 12, 2024)
**UI enhancement:** Add gradient overlay behind nav
- Semi-transparent gradient fades content
- Better visual depth

### v1.16.5 - Floating Nav (Dec 11, 2024)
**UI enhancement:** Floating nav bar with transparent wrapper
- Transparent wrapper for pill effect
- Modern floating design

### v1.16.4 - Solid Nav Background (Dec 11, 2024)
**UI fix:** Solid nav background and scroll to top
- Make nav solid with gradient background
- Scroll to top on tab change
- Update service worker cache

### v1.16.3 - Nav Positioning Fix (Dec 10, 2024)
**CRITICAL FIX:** Actual nav positioning fix
- v1.16.1 & v1.16.2 edited wrong component
- Fix actual TabNavigation component
- Dashboard tabs now bottom on mobile
- Force service worker cache refresh

### v1.16.2 - Cache Refresh (Dec 10, 2024)
**CRITICAL:** Force PWA cache refresh
- v1.16.1 CSS correct but cached old version served
- Update CACHE_NAME to force refresh
- Users see new styles

### v1.16.1 - Mobile Nav Fix (Dec 10, 2024)
**CRITICAL FIX:** Restore bottom navigation position
- v1.16.0 had position: fixed but NO vertical position
- Add bottom: 0 for mobile
- Fixed behavior restored

### v1.16.0 - Responsive Nav (Dec 10, 2024)
**Major UX improvement:** Match modern app conventions
- Bottom navigation on mobile (iOS/Android standard)
- Top navigation on desktop
- Responsive CSS media queries

---

## v1.15.x Series - Stats Hub Polish (Dec 2024)

### v1.15.4 - Code Cleanup (Dec 9, 2024)
**Cleanup:**
- Remove debug console.logs
- Remove dead code
- Clean up from v1.15.0 debugging

### v1.15.3 - Gameweek Toggle Fix (Dec 9, 2024)
**Bug fix:** Best/Worst gameweeks toggle showing identical data
- Fix toggle state management
- Distinct best vs worst display

### v1.15.2 - Chips Faced Fix (Dec 8, 2024)
**Bug fix:** Chips Faced leaderboard showing no data
- Change sync strategy to use chip history API
- Accurate chip tracking

### v1.15.1 - Stats Hub Polish (Dec 8, 2024)
**Polish fixes:**
- Remove "Stats Hub" title
- Fix spacing issues
- Correct captain percentage calculation
- Visual improvements

### v1.15.0 - Stats Hub UI (Dec 7, 2024)
**Major improvements:** Mobile PWA optimization
- Vertical space optimization
- Modal fixes
- Chips faced debugging
- Better mobile experience

---

## Summary Statistics

**Total Versions:** 62 releases (v1.15.0 - v1.26.6)

**Release Period:** December 7, 2024 - January 4, 2025 (~4 weeks)

**Major Feature Areas:**
- **Large League Support:** v1.26.4, v1.26.6 (critical for scale)
- **Position History:** v1.25.0, v1.25.6, v1.26.0, v1.26.1 (new feature)
- **Analytics System:** v1.18.0 - v1.22.9 (complete system)
- **Live Match Modal:** v1.23.0 - v1.24.3 (auto-sub fixes)
- **Mobile Navigation:** v1.16.0 - v1.16.13 (responsive design)
- **Error Handling:** v1.26.2, v1.26.5, v1.26.6 (robust errors)

**Critical Fixes:**
- v1.26.6: Null entry_id handling (corrupted data)
- v1.26.2: Classic league error messages
- v1.25.6: Position history type mismatch
- v1.24.0: Single source of truth for scoring
- v1.23.0: Auto-sub timing fix
- v1.16.3: Mobile nav positioning

**Performance Optimizations:**
- v1.26.4: 60-90s → <5s for large leagues (832+ API calls reduced)
- v1.21.0: Daily aggregation for analytics
- v1.24.6: Team selection space optimization

**User Experience Improvements:**
- v1.26.0: Position comparison (green vs red lines)
- v1.25.5: Collapsible Quick Access for Reddit launch
- v1.16.0: Responsive navigation (bottom on mobile, top on desktop)
- v1.15.0: Stats Hub mobile optimization

**Architecture Enhancements:**
- v1.24.0: Shared score calculator module
- v1.18.0: Analytics middleware and database tables
- v1.17.0: Centralized admin dashboard
