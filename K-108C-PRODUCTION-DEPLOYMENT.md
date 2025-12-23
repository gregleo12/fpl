# K-108c Production Deployment Plan

**Created:** December 23, 2025
**Target Version:** v3.7.0
**Status:** Ready for Pre-Deployment Sync
**Priority:** CRITICAL - Required for Production

---

## 🎯 Deployment Goal

Deploy v3.7.0 (K-108c complete migration) to production with **100% data coverage** for all existing leagues and managers.

**Critical Requirement:** All leagues must have K-108 player stats data synced BEFORE deployment.

---

## ⚠️ Why This Matters

### K-108c Dependencies

v3.7.0 endpoints require data in `player_gameweek_stats` table:

| Endpoint | Uses K-108c? | Requires K-108 Data? |
|----------|--------------|----------------------|
| `/api/gw/[gw]/team/[teamId]` | ✅ YES | ✅ YES |
| `/api/team/[teamId]/info` | ✅ YES | ✅ YES |
| `/api/team/[teamId]/history` | ✅ YES | ✅ YES |
| `/api/team/[teamId]/gameweek/[gw]` | ✅ YES | ✅ YES |
| `/api/league/[id]/fixtures/[gw]` | ✅ YES | ✅ YES |
| `/api/league/[id]/stats/gameweek/[gw]/rankings` | ✅ YES | ✅ YES |
| `/api/league/[id]/stats/gameweek/[gw]` | ✅ YES | ✅ YES |
| `/api/league/[id]/stats/season` | ✅ YES | ✅ YES |
| `/api/league/[id]/stats` | ✅ YES | ✅ YES |

**If K-108 data is missing:**
- Team scores will show 0 points
- Auto-subs won't work
- Rankings will be wrong
- Users will see broken app ❌

---

## 📊 Current State Check

### Step 1: Check Production Database

**Query 1: Check if K-108 columns exist**

```bash
# Connect to production database
export DATABASE_URL="postgresql://postgres:[PROD_PASSWORD]@caboose.proxy.rlwy.net:45586/railway"

# Check for K-108 columns
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'player_gameweek_stats' AND column_name IN ('calculated_points', 'points_breakdown');"
```

**Expected if already migrated:**
```
    column_name
-------------------
 calculated_points
 points_breakdown
```

**If empty:** Need to run K-108 migration first.

### Step 2: Check Player Stats Data Coverage

**Query 2: Check how many GWs have K-108 data**

```sql
SELECT
  COUNT(DISTINCT gameweek) as gameweeks_with_data,
  MIN(gameweek) as earliest_gw,
  MAX(gameweek) as latest_gw,
  COUNT(*) as total_records,
  COUNT(CASE WHEN calculated_points IS NOT NULL THEN 1 END) as records_with_k108
FROM player_gameweek_stats;
```

**Expected for full coverage (GW1-17):**
```
 gameweeks_with_data | earliest_gw | latest_gw | total_records | records_with_k108
---------------------+-------------+-----------+---------------+-------------------
                  17 |           1 |        17 |         12920 |             12920
```

**If records_with_k108 = 0:** Need to run K-108 sync.

**If records_with_k108 < total_records:** Partial sync, need to complete.

### Step 3: Check League Coverage

**Query 3: Check all leagues in production**

```sql
SELECT
  id,
  name,
  sync_status,
  last_synced,
  created_at
FROM leagues
ORDER BY created_at ASC;
```

**Critical:** Note all league IDs - we need K-27 data for ALL of them.

### Step 4: Check Manager Coverage

**Query 4: Count managers and check their data**

```sql
-- Total managers
SELECT COUNT(*) as total_managers FROM managers;

-- Managers with GW history
SELECT
  COUNT(DISTINCT entry_id) as managers_with_history,
  COUNT(DISTINCT event) as gameweeks_covered
FROM manager_gw_history;

-- Managers with picks
SELECT
  COUNT(DISTINCT entry_id) as managers_with_picks,
  COUNT(DISTINCT event) as gameweeks_covered
FROM manager_picks;
```

**Expected:** All managers should have picks and history for GW1-17.

---

## 🔧 Pre-Deployment: Database Sync

**Timeline:** Allow 30-60 minutes for all sync operations.

### Phase 1: K-108 Migration (if needed)

**Check if needed:**
```bash
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'player_gameweek_stats' AND column_name = 'calculated_points';"
```

**If empty, run migration:**
```bash
export DATABASE_URL="postgresql://postgres:[PROD_PASSWORD]@caboose.proxy.rlwy.net:45586/railway"
npm run migrate:k108
```

**Verify:**
```bash
psql $DATABASE_URL -c "\d player_gameweek_stats" | grep -E "calculated_points|points_breakdown"
```

### Phase 2: K-108 Player Stats Sync

**⚠️ CRITICAL:** This must complete successfully before deployment.

```bash
# Sync ALL completed gameweeks (GW1-17)
export DATABASE_URL="postgresql://postgres:[PROD_PASSWORD]@caboose.proxy.rlwy.net:45586/railway"
npm run sync:player-gw-stats
```

**Expected Duration:** ~10-15 minutes (760 players × 17 GWs = 12,920 records)

**Monitor Output:**
```
[K-108 Sync] Starting player gameweek stats sync...
[K-108 Sync] Fetching bootstrap data...
[K-108 Sync] Syncing 17 gameweek(s) for 760 players...

[K-108 Sync] === Gameweek 1 ===
[K-108 Sync] Fetching live data for GW1...
[K-108 Sync] GW1 complete: 458 records, 450 matches, 8 mismatches

...

[K-108 Sync] === COMPLETE ===
Total records synced: 12920
Points matches: 12800 (99.1%)
Points mismatches: 120 (0.9%)
Errors: 0
```

**Verify Completion:**
```sql
SELECT
  COUNT(*) as total_records,
  COUNT(CASE WHEN calculated_points IS NOT NULL THEN 1 END) as with_k108,
  COUNT(CASE WHEN calculated_points IS NULL THEN 1 END) as missing_k108,
  ROUND(100.0 * COUNT(CASE WHEN calculated_points IS NOT NULL THEN 1 END) / COUNT(*), 2) as coverage_pct
FROM player_gameweek_stats;
```

**Target:** coverage_pct = 100%

### Phase 3: K-27 Manager Data Sync

**Sync all manager data for all leagues:**

```bash
export DATABASE_URL="postgresql://postgres:[PROD_PASSWORD]@caboose.proxy.rlwy.net:45586/railway"

# Sync in order (dependencies matter)
npm run sync:manager-history    # ~2-3 min
npm run sync:manager-picks      # ~3-5 min
npm run sync:manager-chips      # ~1 min
npm run sync:manager-transfers  # ~2-3 min
```

**Verify Each Step:**

```sql
-- After manager-history
SELECT COUNT(DISTINCT entry_id) as managers, COUNT(DISTINCT event) as gws
FROM manager_gw_history;

-- After manager-picks
SELECT COUNT(DISTINCT entry_id) as managers, COUNT(DISTINCT event) as gws
FROM manager_picks;

-- After manager-chips
SELECT COUNT(*) as total_chips FROM manager_chips;

-- After manager-transfers
SELECT COUNT(*) as total_transfers FROM manager_transfers;
```

### Phase 4: PL Fixtures Sync

```bash
npm run sync:pl-fixtures  # ~30 seconds
```

**Verify:**
```sql
SELECT COUNT(*) as total_fixtures, COUNT(CASE WHEN finished THEN 1 END) as finished_fixtures
FROM pl_fixtures;
```

**Expected:** 380 total fixtures (38 GWs × 10 matches), ~170 finished (17 GWs)

---

## ✅ Pre-Deployment Verification Checklist

Run ALL these checks before deploying to production:

### 1. K-108 Column Structure

```sql
-- Should return 5 rows
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'player_gameweek_stats'
AND column_name IN ('calculated_points', 'points_breakdown', 'fixture_started', 'fixture_finished', 'updated_at');
```

**Expected:** 5 rows (all K-108 columns exist)

### 2. K-108 Data Coverage

```sql
-- Should show 100% coverage
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN calculated_points IS NOT NULL THEN 1 END) as with_k108,
  ROUND(100.0 * COUNT(CASE WHEN calculated_points IS NOT NULL THEN 1 END) / COUNT(*), 2) as pct
FROM player_gameweek_stats;
```

**Target:** pct = 100.00

### 3. Points Accuracy

```sql
-- Should show >95% match rate
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN calculated_points = total_points THEN 1 ELSE 0 END) as matches,
  ROUND(100.0 * SUM(CASE WHEN calculated_points = total_points THEN 1 ELSE 0 END) / COUNT(*), 2) as match_pct
FROM player_gameweek_stats
WHERE calculated_points IS NOT NULL;
```

**Target:** match_pct >= 95.00

### 4. Gameweek Coverage

```sql
-- Should show GW1-17
SELECT DISTINCT gameweek
FROM player_gameweek_stats
WHERE calculated_points IS NOT NULL
ORDER BY gameweek;
```

**Expected:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17

### 5. Manager Data Completeness

```sql
-- Check all K-27 tables
SELECT
  'manager_gw_history' as table_name,
  COUNT(DISTINCT entry_id) as managers,
  COUNT(DISTINCT event) as gws,
  COUNT(*) as records
FROM manager_gw_history
UNION ALL
SELECT
  'manager_picks',
  COUNT(DISTINCT entry_id),
  COUNT(DISTINCT event),
  COUNT(*)
FROM manager_picks
UNION ALL
SELECT
  'manager_chips',
  COUNT(DISTINCT entry_id),
  NULL,
  COUNT(*)
FROM manager_chips
UNION ALL
SELECT
  'manager_transfers',
  COUNT(DISTINCT entry_id),
  COUNT(DISTINCT event),
  COUNT(*)
FROM manager_transfers;
```

**Expected:** All managers present, GWs 1-17 covered

### 6. Test K-108c Calculation

**Create test query:**

```sql
-- Test for a known manager (Greg's team: 7868635)
SELECT
  p.player_id,
  p.gameweek,
  pl.web_name,
  p.calculated_points,
  mp.is_captain,
  mp.multiplier
FROM player_gameweek_stats p
JOIN players pl ON pl.id = p.player_id
JOIN manager_picks mp ON mp.player_id = p.player_id AND mp.event = p.gameweek
WHERE mp.entry_id = 7868635
  AND p.gameweek = 17
  AND mp.position <= 11
ORDER BY mp.position;
```

**Manual Validation:**
- Check calculated_points for each player
- Verify captain multiplier
- Calculate expected total
- Compare with FPL official score

---

## 🚀 Deployment Steps

**After ALL pre-deployment checks pass:**

### Step 1: Final Staging Test

```bash
# Test on staging first
open https://fpl-staging-production.up.railway.app

# Check these features:
# 1. My Team - stat boxes show correct GW points
# 2. Rivals - H2H fixtures show correct scores
# 3. Stats > GW - rankings show correct scores
# 4. Stats > Season - best/worst GWs include live GW
# 5. League standings - live GW scores accurate
```

### Step 2: Create Production PR

```bash
# From staging branch
git checkout main
git pull origin main
git merge staging

# Verify merge
git log --oneline -10

# Push to main
git push origin main
```

### Step 3: Monitor Railway Deployment

1. Go to Railway dashboard
2. Watch deployment logs for `main` branch
3. Look for:
   - ✅ Build successful
   - ✅ Deploy successful
   - ⚠️ Any errors in logs

### Step 4: Verify Production Deployment

```bash
# Check production is live
curl https://rivalfpl.com/api/health

# Test key endpoints
curl "https://rivalfpl.com/api/gw/17/team/7868635" | jq '.points'
curl "https://rivalfpl.com/api/league/804742/stats" | jq '.standings[0]'
```

---

## 🧪 Post-Deployment Testing

### Test Matrix

| Feature | Test Action | Expected Result |
|---------|-------------|-----------------|
| My Team Stat Boxes | Open My Team for GW17 | GW PTS shows correct score |
| My Team Pitch | View team on pitch | All player points correct |
| My Team Modals | Click GW PTS tile | Modal shows correct total |
| Rivals Fixtures | Open Rivals tab GW17 | All 10 H2H scores correct |
| Rivals Modal | Click any fixture | Team scores match stat boxes |
| Stats GW Rankings | Stats > GW > View Rankings | All 20 managers ranked correctly |
| Stats GW Winners | Stats > GW section | Winners/losers show correct pts |
| Stats Season Best | Stats > Season tab | Best GWs include live GW if active |
| League Standings | Overview tab | Live GW scores accurate |

### Critical Test: Live GW (GW18)

**When GW18 starts:**

1. Open any manager's My Team
2. Verify points update in real-time as matches progress
3. Check auto-subs work correctly (0pt players swapped)
4. Verify captain multiplier (2× or 3×) applied correctly
5. Check H2H fixtures show live scores
6. Verify Stats GW rankings update live

---

## 🚨 Rollback Plan

**If production breaks after deployment:**

### Quick Rollback

```bash
# Revert to previous version
git checkout main
git revert HEAD
git push origin main
```

**Railway will auto-deploy the reverted version.**

### Identify Issue

Check Railway logs for errors:

```
[K-108c] Error calculating team score for 7868635
[K-108c] Missing player stats for GW17
```

**Common Issues:**

1. **Missing K-108 data:** Run sync scripts
2. **Database timeout:** Check connection pooling
3. **Calculation error:** Check K-108c logs for specific manager

### Fix and Redeploy

1. Fix issue on staging
2. Test thoroughly
3. Re-run pre-deployment checks
4. Deploy to production again

---

## 📈 Success Metrics

**After 24 hours in production:**

### Database Query

```sql
-- Check API usage patterns
SELECT
  COUNT(*) as total_requests,
  COUNT(CASE WHEN error IS NULL THEN 1 END) as successful,
  COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as errors,
  ROUND(100.0 * COUNT(CASE WHEN error IS NULL THEN 1 END) / COUNT(*), 2) as success_rate
FROM api_requests
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Target:** success_rate >= 99%

### User Metrics

```sql
-- Check active users
SELECT
  COUNT(DISTINCT league_id) as active_leagues,
  COUNT(DISTINCT entry_id) as active_managers
FROM league_standings
WHERE updated_at > NOW() - INTERVAL '24 hours';
```

### Error Monitoring

Check Railway logs for:
- `[K-108c] Error:` messages
- `[K-109]` calculation errors
- Database connection errors
- Timeout errors

**Target:** < 10 errors per 1000 requests

---

## 📝 Post-Deployment Tasks

### 1. Update DEPLOYMENT.md

Add K-108c sync requirements:

```markdown
## After Each Gameweek Completes

1. Run K-108 player stats sync:
   ```bash
   npm run sync:player-gw-stats [gw]
   ```

2. Run K-27 manager data syncs:
   ```bash
   npm run sync:manager-history
   npm run sync:manager-picks
   npm run sync:manager-chips
   npm run sync:manager-transfers
   ```

3. Verify data coverage:
   ```sql
   SELECT COUNT(*) FROM player_gameweek_stats WHERE gameweek = [gw];
   ```
```

### 2. Monitor Performance

**First Week Checklist:**
- [ ] Check Railway logs daily
- [ ] Monitor database query performance
- [ ] Track user reports/feedback
- [ ] Verify scores match FPL official
- [ ] Check auto-subs working correctly

### 3. Documentation Updates

- [ ] Update CLAUDE.md with K-108c deployment date
- [ ] Update VERSION_HISTORY.md with production deploy note
- [ ] Archive this deployment plan with actual results

---

## ❓ FAQ

### Q: What if some leagues don't have K-108 data?

**A:** K-108c will fail for those leagues. Run sync scripts for ALL leagues before deployment.

### Q: Can we deploy v3.7.0 without syncing all GWs?

**A:** NO. Users will see 0 points for GWs without K-108 data.

### Q: What if sync fails halfway through?

**A:** Sync script is idempotent - safe to run multiple times. Just run again.

### Q: How long does full sync take?

**A:** ~30-60 minutes for all scripts (player stats + manager data + fixtures).

### Q: Can users still use the app during sync?

**A:** YES. Sync runs independently. But deploy AFTER sync completes.

---

## 🎯 Ready to Deploy?

**Checklist:**

- [ ] All pre-deployment checks passed (100% coverage)
- [ ] K-108 player stats synced for GW1-17
- [ ] K-27 manager data synced for all leagues
- [ ] Staging tested and verified
- [ ] Greg approved deployment
- [ ] Rollback plan understood

**When ALL boxes checked:** Deploy to production! 🚀

---

**Last Updated:** December 23, 2025
**Next Review:** After GW18 completes
