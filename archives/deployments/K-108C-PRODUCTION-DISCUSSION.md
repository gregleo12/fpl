# K-108c Production Deployment Discussion

**Date:** December 23, 2025
**Status:** Planning Phase - Not Yet Deployed to Production
**Version:** v3.7.0 ready on staging

---

## 📌 Key Takeaway

**v3.7.0 CANNOT be deployed to production without first syncing K-108 data for all leagues and managers.**

---

## 🔍 What We Discovered

### The Verification Question

Greg asked: "Was the actual code migrated, or just the docs?"

**Answer:** ✅ **BOTH migrated**

**Code Migration:** Commit `fee480c` (Dec 23, 21:41)
- Modified 4 endpoint route files
- Replaced all old calculators with K-108c
- 168 insertions, 45 deletions

**Documentation Update:** Commit `3455810` (Dec 23)
- Updated ENDPOINTS.md, ARCHITECTURE.md, DATABASE.md
- Added K-108c flow diagrams and examples

### Verification Results

| Endpoint | K-108c Migrated? | Function Used |
|----------|------------------|---------------|
| `/api/team/[teamId]/info` | ✅ YES | `calculateTeamGameweekScore` |
| `/api/team/[teamId]/history` | ✅ YES | `calculateTeamGameweekScore` |
| `/api/league/[id]/stats` | ✅ YES | `calculateTeamGameweekScore` |
| `/api/league/[id]/stats/gameweek/[gw]` | ✅ YES | `calculateTeamGameweekScore` |
| `/api/league/[id]/fixtures/[gw]` | ✅ YES | `calculateTeamGameweekScore` |

**No old calculator functions found anywhere.** ✅

---

## ⚠️ Critical Production Requirement

### The Problem

K-108c depends on `player_gameweek_stats.calculated_points` column being populated for ALL completed gameweeks.

**If deployed without sync:**
- All team scores show 0 points
- Auto-subs don't work
- Rankings are wrong
- Users see broken app

### The Solution

**Before deployment, run these syncs on PRODUCTION database:**

```bash
export DATABASE_URL="postgresql://postgres:[PROD_PASSWORD]@caboose.proxy.rlwy.net:45586/railway"

# 1. K-108 Migration (if needed)
npm run migrate:k108

# 2. K-108 Player Stats (CRITICAL)
npm run sync:player-gw-stats    # ~10-15 min for GW1-17

# 3. K-27 Manager Data
npm run sync:manager-history    # ~2-3 min
npm run sync:manager-picks      # ~3-5 min
npm run sync:manager-chips      # ~1 min
npm run sync:manager-transfers  # ~2-3 min
npm run sync:pl-fixtures        # ~30 sec
```

**Total Time:** 30-60 minutes

---

## 📊 Pre-Deployment Verification

**Before deploying v3.7.0 to production, verify 100% data coverage:**

```sql
-- Must show 100% coverage
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN calculated_points IS NOT NULL THEN 1 END) as with_k108,
  ROUND(100.0 * COUNT(CASE WHEN calculated_points IS NOT NULL THEN 1 END) / COUNT(*), 2) as pct
FROM player_gameweek_stats;
```

**Target:** `pct = 100.00`

```sql
-- Must show GW1-17
SELECT DISTINCT gameweek
FROM player_gameweek_stats
WHERE calculated_points IS NOT NULL
ORDER BY gameweek;
```

**Expected:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17

---

## 📋 Deployment Checklist

**When ready to deploy:**

### Phase 1: Pre-Deployment Sync (PRODUCTION DB)
- [ ] Check if K-108 columns exist
- [ ] Run K-108 migration if needed
- [ ] Sync K-108 player stats (GW1-17)
- [ ] Sync K-27 manager data (all leagues)
- [ ] Sync PL fixtures
- [ ] Verify 100% data coverage

### Phase 2: Verification
- [ ] Run all verification SQL queries
- [ ] Test on staging one final time
- [ ] Confirm all leagues have data
- [ ] Get Greg's approval

### Phase 3: Deployment
- [ ] Merge staging → main
- [ ] Push to production
- [ ] Monitor Railway deployment
- [ ] Watch logs for errors

### Phase 4: Post-Deployment Testing
- [ ] Test My Team stat boxes
- [ ] Test Rivals H2H fixtures
- [ ] Test Stats GW rankings
- [ ] Test League standings
- [ ] Monitor for 24 hours

---

## 🚀 Deployment Timeline Options

### Option 1: Before GW18 Starts
**Best time for deployment:**
- GW17 is complete, stable data
- GW18 hasn't started yet
- Can test with stable GW17, then verify live GW18 works

### Option 2: After GW18 Completes
**Safest but delays features:**
- More time to prepare
- Can test with GW18 data before deploy
- Delays users getting K-108c benefits

### Option 3: During GW18 (Not Recommended)
**High risk:**
- Live GW in progress
- If issues occur, hard to debug
- Could impact user experience mid-gameweek

**Recommendation:** Option 1 (Before GW18 starts)

---

## 📄 Reference Documents

### Created Today

1. **K-108C-PRODUCTION-DEPLOYMENT.md**
   - Complete step-by-step deployment guide
   - Pre-deployment checklist
   - Verification queries
   - Post-deployment testing matrix
   - Rollback plan
   - Success metrics

2. **K-108C-PRODUCTION-DISCUSSION.md** (This file)
   - High-level summary
   - Key decisions and timeline options
   - Quick reference for Greg

### Existing Guides

- **K-108-IMPLEMENTATION-GUIDE.md** - Original K-108 setup guide
- **DEPLOYMENT.md** - General deployment process
- **DATABASE.md** - K-108/K-108c tables and patterns
- **ARCHITECTURE.md** - K-108c flow diagrams
- **ENDPOINTS.md** - K-108c endpoint documentation

---

## 💡 Key Decisions Needed

### 1. Deployment Timing
- [ ] Deploy before GW18 starts (recommended)
- [ ] Deploy after GW18 completes (safer)
- [ ] Other timing preference?

### 2. Database Sync
- [ ] Run all syncs in one session (30-60 min)
- [ ] Split across multiple sessions
- [ ] Need help with DATABASE_URL setup?

### 3. Testing Strategy
- [ ] Full post-deployment test suite
- [ ] Minimal smoke tests
- [ ] Specific features to prioritize?

---

## 🎯 Next Steps (When Ready)

1. **Greg decides deployment timeline**
2. **Schedule sync window** (30-60 min production DB access)
3. **Run pre-deployment syncs** following K-108C-PRODUCTION-DEPLOYMENT.md
4. **Verify 100% coverage** with SQL queries
5. **Deploy to production** (merge staging → main)
6. **Monitor and test** post-deployment

---

## 📞 Questions for Greg

1. Have you already run any K-108 syncs on production database?
2. When would you like to deploy? (Before/after GW18?)
3. Do you need help running the sync scripts?
4. Any specific concerns about the deployment?

---

**Status:** Waiting for Greg's decision on deployment timing

**Current State:**
- ✅ v3.7.0 code complete on staging
- ✅ Documentation updated
- ✅ Deployment plan ready
- ⏳ Production database sync pending
- ⏳ Production deployment pending

---

**Next Meeting Topic:** Agree on deployment date and run pre-deployment sync together
