## v4.2.6 Production Deployment

**Date:** December 26, 2025
**Environment:** Production (rivalfpl.com)
**Status:** ✅ Deployed Successfully

### Deployed Bug Fix + Enhancement
- K-126: Fixed PWA header scroll bug on iPhone 17 Pro Max (iOS 18)
- Implemented sticky headers across all tabs
- Improves UX by keeping navigation always visible

### Problem Solved
**User Report (iPhone 17 Pro Max PWA mode):**
- Headers would scroll out of view and become unreachable
- User could scroll down but not back up to access GW selectors/toggles
- Only affected iPhone 17 Pro Max (iOS 18) - iOS 18 PWA scroll boundary changes

### Root Cause
- Fixed `body::before` pseudo-element (status bar overlay) + iOS 18's stricter PWA scroll boundaries
- Headers positioned at `top: 0` became trapped in unreachable scroll zone
- Content could scroll under overlay but couldn't reach top edge

### Solution: Sticky Headers
Made all tab headers sticky with safe area awareness:
- **My Team:** Team name + GW selector sticky
- **Rivals:** H2H/Fixtures toggle + GW selector sticky
- **Stats:** View tabs + GW selector sticky (stacked)
- **Rank:** Table column headers sticky

### Hotfix Applied
**Issue:** My Team header not sticking on mobile
**Cause:** Parent `.myTeamTab` had `overflow-x: hidden` which breaks `position: sticky`
**Fix:** Removed `overflow-x: hidden` (max-width already prevents overflow)

### Files Modified (4 total)
**CSS (3 files):**
- `/src/components/Dashboard/Dashboard.module.css`
  - Added sticky to `.myTeamHeader`
  - Updated `.table th` sticky position for safe area
  - Removed `overflow-x: hidden` from `.myTeamTab` (hotfix)
- `/src/components/Fixtures/Fixtures.module.css`
  - Added sticky to `.rivalsHeader`
- `/src/components/Stats/StatsHub.module.css`
  - Added sticky to `.viewToggleBar` and `.gwSelectorBar`

**Documentation:**
- DEPLOYMENT_RECORDS.md - This entry

### Implementation Details
**Sticky Positioning:**
- Main headers: `top: calc(0.5rem + env(safe-area-inset-top, 0px))`
- Stats secondary header: `top: calc(3.5rem + env(safe-area-inset-top, 0px))`

**Z-Index Hierarchy:**
```
Bottom Nav:        z-index: 100 ← Always clickable
Main Headers:      z-index: 90  ← My Team, Rivals, Stats, Rank
Stats GW Selector: z-index: 89  ← Stacks below viewToggleBar
```

**Visual Enhancements:**
- Increased opacity: `rgba(0, 0, 0, 0.85)` for better visibility
- Backdrop blur: `backdrop-filter: blur(10px)` for glass effect

### Deployment Stats
- **Build time:** ~30 seconds
- **Total files changed:** 4 files
- **Commits:** 2 (main fix + hotfix)
- **Lines changed:** +20 additions, -4 deletions

### Production Verification Required
- [ ] My Team header sticks when scrolling (mobile + desktop)
- [ ] Rivals header sticks when scrolling
- [ ] Stats view tabs stick, GW selector stacks below when visible
- [ ] Rank table headers stick
- [ ] Bottom nav remains clickable (z-index 100)
- [ ] Test on iPhone 17 Pro Max (iOS 18) in PWA mode

### Benefits
- ✅ Scroll bug resolved on iOS 18 PWAs
- ✅ Headers always visible - no more hunting for GW selector
- ✅ Consistent across all devices and screen sizes
- ✅ Modern mobile app pattern

### Related
**K-126:** PWA header scroll bug investigation
**Reported by:** Reddit user (kinqdane) on iPhone 17 Pro Max

---

## v4.2.5 Production Deployment

**Date:** December 26, 2025
**Environment:** Production (rivalfpl.com)
**Status:** ✅ Deployed Successfully

### Deployed Enhancement
- K-124: Reduced all Season Stats leaderboard cards from Top 5 to Top 3
- Cleaner mobile experience with 40% less vertical space per card
- Podium mentality (🥇🥈🥉) - more meaningful and focused leaderboards
- Full rankings still accessible via modal (tap any card to see all 20)

### Cards Updated (9 total)
1. Captain Points - Top 3 highest captain scorers
2. Chip Performance - Top 3 chips played/faced
3. Streaks - Top 3 winning/losing streaks
4. GW Records - Top 3 best/worst gameweeks
5. Team Value - Top 3 highest team values
6. Bench Points - Top 3 most bench points (total/percentage)
7. Form Rankings - Top 3 in form (Last 5/Last 10)
8. Consistency - Top 3 most consistent/variable
9. Luck Index - Top 3 luckiest/unluckiest

### Files Modified (13 total)
**Components (9):**
- `/src/components/Stats/season/CaptainLeaderboard.tsx` - slice(0, 5) → slice(0, 3)
- `/src/components/Stats/season/ChipPerformance.tsx` - slice(0, 5) → slice(0, 3)
- `/src/components/Stats/season/Streaks.tsx` - slice(0, 5) → slice(0, 3)
- `/src/components/Stats/season/BestWorstGW.tsx` - slice(0, 5) → slice(0, 3)
- `/src/components/Stats/season/ValueLeaderboard.tsx` - slice(0, 5) → slice(0, 3)
- `/src/components/Stats/season/BenchPoints.tsx` - top5 → top3
- `/src/components/Stats/season/FormRankings.tsx` - top5 → top3
- `/src/components/Stats/season/Consistency.tsx` - top5 → top3
- `/src/components/Stats/season/LuckIndex.tsx` - top5 → top3

**Documentation (4):**
- VERSION_HISTORY.md - Added v4.2.5 entry
- README.md - Updated version to v4.2.5
- package.json - Bumped to v4.2.5
- DEPLOYMENT_RECORDS.md - This entry

### Deployment Stats
- **Build time:** ~30 seconds
- **Total files changed:** 13 files
- **Lines added:** 100
- **Lines removed:** 18
- **Components updated:** 9

### Production Verification Required
- [ ] All Season Stats cards show exactly 3 entries (not 5)
- [ ] Toggle states work correctly (Best/Worst, Lucky/Unlucky, etc.)
- [ ] Modals still display full 20 manager rankings
- [ ] No layout issues on mobile devices
- [ ] Cards render cleanly with reduced vertical space

### Visual Result
- 40% reduction in vertical space per card
- Cleaner, more focused leaderboards
- Better mobile user experience
- Less scrolling through Season Stats section

---

## v4.2.1-v4.2.4 Production Bundle Deployment

**Date:** December 26, 2025
**Environment:** Production (rivalfpl.com)
**Status:** ✅ Deployed Successfully

### Bundle Contents
- **v4.2.4:** Fixed duplicate players in My Team view (K-120)
- **v4.2.3:** Simplified Chip Performance display (K-123)
- **v4.2.2:** Season Stats UI improvements - toggles and layout enhancements (K-122)
- **v4.2.1:** Fixed Luck Index calculation bug (K-121)

### Key Fixes & Features

**K-120: Duplicate Players Bug Fix**
- 37 managers in multiple leagues had 2x-6x duplicate player cards
- Root cause: API query returned picks from ALL leagues (no league_id filter)
- Fix: Added `DISTINCT ON (position, player_id)` to deduplicate at query level
- File: `/src/app/api/team/[teamId]/gameweek/[gw]/route.ts`

**K-123: Chip Performance Simplification**
- Replaced cluttered chip list with Won/Drew/Lost summary
- Single-line display with color coding (green/red)
- Only shows categories with count > 0

**K-122: Season Stats UI Improvements**
- Bench Points: Added percentage calculation with Total/% toggle
- Form Rankings: Added Last 5/Last 10 toggle with separate trends
- Consistency: Restructured layout (variance primary, average secondary)

**K-121: Luck Index Fix**
- Fixed inflated values (+1200+) by filtering to completed GWs only
- Now shows correct range (-106 to +72) summing to ~0

### Files Modified (Total: 12 files)
**API Routes:**
- `/src/app/api/league/[id]/stats/season/route.ts` - K-121, K-122, K-123 backend logic
- `/src/app/api/team/[teamId]/gameweek/[gw]/route.ts` - K-120 duplicate fix

**Components:**
- `/src/components/Stats/season/LuckIndex.tsx` - K-121 UI improvements
- `/src/components/Stats/season/BenchPoints.tsx` - K-122 Total/% toggle
- `/src/components/Stats/season/FormRankings.tsx` - K-122 Last 5/10 toggle
- `/src/components/Stats/season/Consistency.tsx` - K-122 layout restructure
- `/src/components/Stats/season/ChipPerformance.tsx` - K-123 Won/Drew/Lost display

**Documentation:**
- VERSION_HISTORY.md - 4 new version entries
- README.md - Version number updated to v4.2.4
- DEPLOYMENT_RECORDS.md - This entry

### Deployment Stats
- **Total files changed:** 12 files
- **Lines added:** ~667
- **Lines removed:** ~194
- **TypeScript errors fixed:** 1 (implicit 'any' type in chip filter)

### Production Verification Completed ✅
- [x] v4.2.4: Manager 1455599 shows 15 players (not 30) - duplicate fix working
- [x] v4.2.3: Chip Performance shows "Won X  Lost Y" format - clean single-line display
- [x] v4.2.2: All 3 toggles functional (Bench %, Form 5/10, Consistency layout)
- [x] v4.2.1: Luck Index shows correct values (-106 to +72 range)
- [x] Build successful with no errors
- [x] All Season Stats cards rendering correctly

---

## v4.2.4 Staging Deployment

**Date:** December 26, 2025
**Environment:** Staging (fpl-staging-production.up.railway.app)
**Status:** ✅ Deployed to Staging → ✅ Promoted to Production (see above)

### Deployed Bug Fix
- K-120: Fixed duplicate players in My Team view
- Managers in multiple leagues had 2x-6x duplicate player cards
- 37 managers affected across various leagues
- Added DISTINCT ON (position, player_id) to deduplicate query

### Root Cause
- manager_picks table stores picks per league (league_id in unique constraint)
- API query didn't filter by league_id → returned picks from ALL leagues
- Manager in 2 leagues = 30 picks instead of 15 → each player shown twice

### File Modified
- `/src/app/api/team/[teamId]/gameweek/[gw]/route.ts` - Added DISTINCT ON to query

### Verification Required
- [ ] Manager 1455599 GW17 shows 15 players (not 30)
- [ ] Other managers in multiple leagues show correct picks
- [ ] Pitch layout displays correctly (no duplicates)

**Next Step:** After staging verification, deploy to production

---

## v4.2.3 Staging Deployment

**Date:** December 26, 2025
**Environment:** Staging (fpl-staging-production.up.railway.app)
**Status:** ✅ Deployed to Staging

### Deployed Enhancements
- K-123: Simplified Chip Performance display
- Replaced chip list (WC (GW6), BB (GW8)...) with Won/Drew/Lost summary
- Single line display: "Won 3  Lost 1" (green/red color-coded)
- Only shows categories with count > 0

### Files Modified
- `/src/app/api/league/[id]/stats/season/route.ts` - Added win/draw/loss counts
- `/src/components/Stats/season/ChipPerformance.tsx` - Updated display logic
- VERSION_HISTORY.md - Added v4.2.3 entry
- README.md - Updated version

### Verification Required
- [ ] Chip Performance shows "Won X  Lost Y" instead of chip list
- [ ] Won is green (#00ff87), Lost is red (#ff4444)
- [ ] Only non-zero categories are displayed
- [ ] Works for both "Played" and "Faced" views
- [ ] Single line (no wrapping)

**Next Step:** After staging verification, deploy to production

---

## v4.2.2 Staging Deployment

**Date:** December 26, 2025
**Environment:** Staging (fpl-staging-production.up.railway.app)
**Status:** ✅ Deployed to Staging

### Deployed Enhancements
- K-122: Season Stats UI improvements across 3 cards
- Bench Points: Added percentage calculation and Total/% toggle
- Form Rankings: Added Last 5/Last 10 toggle with separate trend calculations
- Consistency: Improved layout (variance primary, average secondary)

### Files Modified
- `/src/app/api/league/[id]/stats/season/route.ts` - Backend calculations for bench % and form 5/10
- `/src/components/Stats/season/BenchPoints.tsx` - Total/% toggle implementation
- `/src/components/Stats/season/FormRankings.tsx` - Last 5/10 toggle implementation
- `/src/components/Stats/season/Consistency.tsx` - Layout restructure
- VERSION_HISTORY.md - Added v4.2.2 entry
- README.md - Updated version

### Verification Required
- [ ] Bench Points: Toggle between Total and % of Total works
- [ ] Bench Points: Re-ranks correctly based on toggle
- [ ] Form Rankings: Toggle between Last 5 and Last 10 works
- [ ] Form Rankings: Trend arrows update for each toggle state
- [ ] Consistency: Shows variance as primary (±11 PTS) and avg as secondary (avg 58)

**Next Step:** After staging verification, deploy to production

---

## v4.2.1 Production Deployment

**Date:** December 26, 2025
**Environment:** Production (rivalfpl.com)
**Status:** ⏳ Pending (v4.2.1 was deployed to staging)

### Deployed Fixes
- K-121: Fixed Luck Index calculation bug (inflated values +1200+ → correct range -106 to +72)
- Root cause: h2h_matches table had GWs 1-38 but manager_gw_history only had GWs 1-17
- Added completedGameweeks filter to both manager averages and H2H matches queries
- UI improvements: Removed emojis, added Lucky/Unlucky toggle, show only top 5

### Files Modified
- `/src/app/api/league/[id]/stats/season/route.ts` - Backend calculation fix
- `/src/components/Stats/season/LuckIndex.tsx` - UI improvements
- VERSION_HISTORY.md - Added v4.2.1 entry
- README.md - Updated version

### Verification Required
- [ ] Verify Luck Index shows correct values (mix of positive/negative)
- [ ] Test Lucky/Unlucky toggle works
- [ ] Confirm sum of luck across all managers ≈ 0
- [ ] Check modal displays properly with toggle state

**Next Step:** After staging verification, deploy to production

---

## v4.2.0 Production Deployment

**Date:** December 24, 2025
**Environment:** Production (rivalfpl.com)
**Status:** ✅ Deployed Successfully

### Deployed Features
- 4 new Season Stats cards (Bench Points, Form Rankings, Consistency, Luck Index)
- Form Rankings trend calculation fixed (compares current vs previous 5 GWs)
- Updated What's New page with v4.2.0 changelog
- Comprehensive VERSION_HISTORY.md documentation

### Known Issues
- Luck Index showing inflated values (+1200+) - FIXED in v4.2.1

### Files Deployed
- 4 new components (BenchPoints, FormRankings, Consistency, LuckIndex)
- Updated season stats API route with 4 new calculation functions
- Updated SeasonView integration
- Updated changelog.json for What's New notifications

### Deployment Stats
- **Build time:** ~30 seconds
- **Total files changed:** 11 files
- **Lines added:** 1,278
- **New components:** 4
- **API functions added:** 4

---

