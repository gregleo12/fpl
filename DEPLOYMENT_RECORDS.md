## v4.2.1 Staging Deployment

**Date:** December 26, 2025
**Environment:** Staging (fpl-staging-production.up.railway.app)
**Status:** ✅ Deployed to Staging

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

