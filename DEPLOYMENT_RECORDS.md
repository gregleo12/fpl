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

