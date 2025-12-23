# K-115: Bulk Sync All Leagues - Execution Guide

**Created:** December 24, 2025
**Purpose:** Ensure all 126 tracked leagues have K-108 `calculated_points` data populated
**Runtime:** ~1.5-2 hours (30 second delay between leagues)
**Safety:** Conservative rate limiting to avoid FPL API limits

---

## What This Script Does

Syncs all 126 leagues in the database to ensure K-108 data is populated:

1. Fetches all leagues from `leagues` table
2. Calls `syncLeagueData()` for each league (triggers K-112 → K-108 sync)
3. Processes sequentially with 30-second delays (rate limiting)
4. Logs detailed progress and errors
5. Reports summary at end

---

## Prerequisites

✅ **Database Access:** Production DATABASE_URL from Railway
✅ **Node.js:** tsx package (already in devDependencies)
✅ **Time:** ~1.5-2 hours runtime (can run in background)

---

## How to Run

### Option 1: Local Machine with Background Execution (Recommended)

```bash
# 1. Navigate to project directory
cd /Users/matos/Football\ App\ Projects/fpl

# 2. Export production database URL
export DATABASE_URL="postgresql://postgres:LmoGdsXHMosNUwfCdKmPlaIMletkDZXj@caboose.proxy.rlwy.net:45586/railway"

# 3. Run in background with output logged to file
nohup npm run sync:all-leagues > k115-sync.log 2>&1 &

# 4. Get the process ID (save this!)
echo $!

# 5. Monitor progress in real-time
tail -f k115-sync.log

# 6. Check if still running
ps aux | grep bulk-sync-all-leagues
```

**To stop if needed:**
```bash
# Find process ID
ps aux | grep bulk-sync-all-leagues

# Kill the process
kill <PID>
```

---

### Option 2: Run in Terminal (Watch Live)

```bash
# 1. Navigate to project directory
cd /Users/matos/Football\ App\ Projects/fpl

# 2. Export production database URL
export DATABASE_URL="postgresql://postgres:LmoGdsXHMosNUwfCdKmPlaIMletkDZXj@caboose.proxy.rlwy.net:45586/railway"

# 3. Run and save output to log file
npm run sync:all-leagues | tee k115-sync.log
```

**Note:** This will occupy your terminal for ~1.5-2 hours.

---

### Option 3: Railway Console (If Available)

If Railway has a console/shell feature:

```bash
cd /app
npm run sync:all-leagues
```

---

## Expected Output

```
╔═══════════════════════════════════════════════════════════════╗
║         K-115: Bulk Sync All Leagues for K-108 Data          ║
╚═══════════════════════════════════════════════════════════════╝

[1/3] Fetching all leagues from database...
✅ Found 126 leagues to sync

⏱️  Estimated runtime: ~63-126 minutes

[2/3] Starting league sync...

[1/126] (1%) Syncing: Dedoume FPL 9th edition (ID: 804742)...
[K-108 Check] Checking for missing calculated_points up to GW17...
[K-108 Check] All GWs 1-17 have calculated_points ✓
[Sync] Syncing league data for league 804742...
[Sync] Manager 1726514 completed
[1/126] ✅ Success: Dedoume FPL 9th edition
[1/126] ⏳ Waiting 30s before next league...

[2/126] (2%) Syncing: Gentleman's Lounge (ID: 76559)...
[K-108 Check] Checking for missing calculated_points up to GW17...
[K-108 Check] All GWs 1-17 have calculated_points ✓
[2/126] ✅ Success: Gentleman's Lounge
[2/126] ⏳ Waiting 30s before next league...

...

[126/126] (100%) Syncing: League 5 (ID: 5)...
[126/126] ✅ Success: League 5

╔═══════════════════════════════════════════════════════════════╗
║                      Sync Complete                            ║
╚═══════════════════════════════════════════════════════════════╝

✅ Success: 124/126
❌ Failed: 2/126
⏱️  Total time: 87 minutes

Failed leagues:
  - League 469246 (ID: 469246)
    Error: Timeout
  - League 673087 (ID: 673087)
    Error: HTTP 500
```

---

## Rate Limiting Strategy

**Conservative approach to avoid FPL API rate limits:**

- **Delay:** 30 seconds between each league
- **Total leagues:** 126
- **Sequential processing:** One at a time (not parallel)
- **Estimated runtime:** ~1.5-2 hours

**Why so conservative?**
- Each league sync makes 20-50 FPL API calls
- 126 leagues × 30 calls average = ~3,800 FPL API calls
- FPL API has rate limits (~100 requests/minute)
- Better slow and successful than fast and rate-limited

**Greg's approval:** "Fine with 5-6 hours if needed"

---

## Monitoring Progress

**While running in background:**

```bash
# View entire log
cat k115-sync.log

# View last 20 lines
tail -n 20 k115-sync.log

# Follow in real-time
tail -f k115-sync.log

# Search for failures
grep "❌ Failed" k115-sync.log

# Count successes
grep "✅ Success" k115-sync.log | wc -l

# Check if process still running
ps aux | grep bulk-sync-all-leagues
```

---

## Verification After Sync

Run K-113 queries to confirm K-108 data is populated:

```bash
psql "postgresql://postgres:LmoGdsXHMosNUwfCdKmPlaIMletkDZXj@caboose.proxy.rlwy.net:45586/railway" -c "
SELECT
  gameweek,
  COUNT(*) as total_rows,
  COUNT(calculated_points) as rows_with_calculated_points,
  ROUND(COUNT(calculated_points)::numeric / COUNT(*)::numeric * 100, 1) as percent_populated
FROM player_gameweek_stats
WHERE gameweek IN (15, 16, 17)
GROUP BY gameweek
ORDER BY gameweek DESC;
"
```

**Expected result:**
```
 gameweek | total_rows | rows_with_calculated_points | percent_populated
----------+------------+-----------------------------+-------------------
       17 |        760 |                         760 |             100.0
       16 |        760 |                         760 |             100.0
       15 |        759 |                         759 |             100.0
```

---

## Error Handling

### Common Errors and Solutions

**Error: "League sync already in progress"**
- **Cause:** League has `sync_status = 'syncing'` (stuck)
- **Solution:** Script will skip and log, continue to next league
- **Fix manually:** Run reset endpoint: `/api/league/[id]/reset-sync`

**Error: "Timeout"**
- **Cause:** Large league taking too long
- **Solution:** Script will skip and log, continue to next league
- **Fix manually:** Increase timeout or sync manually later

**Error: "FPL API rate limited (429)"**
- **Cause:** Too many requests to FPL API
- **Solution:** Increase `DELAY_BETWEEN_LEAGUES_MS` in script
- **Fix:** Re-run script for failed leagues only

**Error: "HTTP 500" or "Failed to fetch"**
- **Cause:** FPL API down or internal error
- **Solution:** Script will skip and log, continue to next league
- **Fix:** Re-run script later or sync failed leagues manually

---

## Re-running for Failed Leagues

If some leagues fail, you can:

**Option 1: Re-run entire script**
- Safe (sync is idempotent)
- Successful leagues will fast-path (K-108 data already exists)
- Only failed leagues will do full sync

**Option 2: Manual sync via Settings**
- Visit app Settings tab for each failed league
- Click "Sync" button
- Triggers same K-112 logic

**Option 3: Modify script to sync only specific leagues**
```typescript
// In bulk-sync-all-leagues.ts, replace leagues query:
const leaguesResult = await db.query(`
  SELECT id, name FROM leagues
  WHERE id IN (469246, 673087)  -- Failed league IDs
  ORDER BY id
`);
```

---

## Post-Sync Checklist

- [ ] Check final summary in log (success/failed counts)
- [ ] Run K-113 verification query (expect 100% populated)
- [ ] Test a few leagues in the app manually
- [ ] If failures: Investigate error messages in log
- [ ] If failures: Re-run for failed leagues or sync manually
- [ ] Delete `k115-sync.log` when done (or archive it)

---

## Safety Notes

✅ **Idempotent:** Safe to re-run multiple times
✅ **Non-destructive:** Only adds K-108 data, doesn't delete anything
✅ **Rate-limited:** 30 second delays prevent API overload
✅ **Database transactions:** Each league sync is independent
✅ **Error handling:** Script continues on errors, logs all failures

---

## Estimated Costs

**FPL API calls:** ~3,800 calls (free, no cost)
**Database queries:** ~15,000 queries (Railway included in plan)
**Railway compute:** ~2 hours server time (negligible)

**Total cost:** $0 (all within free tiers)

---

## Files

- **Script:** `src/scripts/bulk-sync-all-leagues.ts`
- **Log:** `k115-sync.log` (created when running)
- **Guide:** This file (`K-115-BULK-SYNC-GUIDE.md`)

---

## Questions?

- **How long will this take?** ~1.5-2 hours (30s × 126 leagues + sync time)
- **Can I stop it?** Yes, use `kill <PID>` - safe to interrupt
- **Can I re-run it?** Yes, sync is idempotent and safe
- **What if it fails?** Check log for error messages, re-run for failed leagues
- **Do I need to do this again?** No, one-time migration for v4.0.0 deployment

---

**Created:** December 24, 2025
**Last Updated:** December 24, 2025
**Status:** Ready to run
