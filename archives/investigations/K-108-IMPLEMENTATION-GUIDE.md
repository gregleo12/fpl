# K-108 Implementation Guide

**Created:** December 23, 2025
**Status:** Phase 1 Complete - Ready for Testing
**Version:** 3.6.1

---

## What Was Built

K-108 creates a **single source of truth** for player gameweek data. All parts of the app will use `/api/gw/[gw]/players` instead of calculating points separately.

### Files Created

```
src/
├── db/migrations/
│   └── add_k108_columns.sql                       # ✅ Database schema updates
├── scripts/
│   ├── run-k108-migration.ts                      # ✅ Migration runner
│   └── sync-player-gw-stats.ts                    # ✅ Sync historical data
├── lib/
│   └── pointsCalculator.ts                        # ✅ Core calculation logic
└── app/api/gw/[gw]/players/
    └── route.ts                                    # ✅ Main API endpoint
```

### npm Scripts Added

```bash
npm run migrate:k108              # Run database migration
npm run sync:player-gw-stats      # Sync all completed GWs
npm run sync:player-gw-stats 17   # Sync only GW17
```

---

## Phase 1: Database Setup

### Step 1: Run Migration

```bash
# IMPORTANT: Set DATABASE_URL first
export DATABASE_URL="postgresql://postgres:[PASSWORD]@caboose.proxy.rlwy.net:45586/railway"

# Run migration
npm run migrate:k108
```

**Expected Output:**
```
[K-108 Migration] Running add_k108_columns.sql...
[K-108 Migration] ✅ Successfully added K-108 columns to player_gameweek_stats
[K-108 Migration] New columns added:
  ✓ calculated_points (integer)
  ✓ points_breakdown (jsonb)
  ✓ fixture_started (boolean)
  ✓ fixture_finished (boolean)
  ✓ updated_at (timestamp without time zone)
[K-108 Migration] New indexes created:
  ✓ idx_pgw_calculated_points
  ✓ idx_pgw_fixture_status
[K-108 Migration] Existing records: [NUMBER]
[K-108 Migration] These records will need calculated_points populated via sync script.
```

### Step 2: Verify Migration

```bash
# Connect to database and check columns
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'player_gameweek_stats' AND column_name IN ('calculated_points', 'points_breakdown', 'fixture_started', 'fixture_finished', 'updated_at');"
```

**Should Return:**
```
      column_name     |     data_type
----------------------+-------------------
 calculated_points    | integer
 points_breakdown     | jsonb
 fixture_started      | boolean
 fixture_finished     | boolean
 updated_at           | timestamp
```

---

## Phase 2: Sync Historical Data

### Step 1: Sync All Completed GWs

**⚠️ WARNING:** This will sync ~12,000+ records (760 players × 17 GWs). Takes ~10-15 minutes.

```bash
export DATABASE_URL="postgresql://postgres:[PASSWORD]@caboose.proxy.rlwy.net:45586/railway"

npm run sync:player-gw-stats
```

**Expected Output:**
```
[K-108 Sync] Starting player gameweek stats sync...
[K-108 Sync] Fetching bootstrap data...
[K-108 Sync] Syncing 17 gameweek(s) for 760 players...
[K-108 Sync] Gameweeks: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17

[K-108 Sync] === Gameweek 1 ===
[K-108 Sync] Fetching live data for GW1...
[K-108 Sync] GW1 complete: 458 records, 450 matches, 8 mismatches
  [MISMATCH] Rice (355): Calculated=11, FPL=11, Diff=0
  ...

[K-108 Sync] === COMPLETE ===
Total records synced: 12920
Points matches: 12800 (99.1%)
Points mismatches: 120 (0.9%)
Errors: 0
```

### Step 2: Investigate Mismatches (if any)

If there are mismatches, run the validation query:

```sql
SELECT
  pgw.player_id,
  p.web_name,
  pgw.gameweek,
  pgw.calculated_points,
  pgw.total_points as fpl_total,
  (pgw.calculated_points - pgw.total_points) as diff,
  pgw.points_breakdown
FROM player_gameweek_stats pgw
JOIN players p ON p.id = pgw.player_id
WHERE pgw.calculated_points != pgw.total_points
ORDER BY ABS(pgw.calculated_points - pgw.total_points) DESC
LIMIT 20;
```

**Common Reasons for Mismatches:**
1. **Defensive Contribution:** Our calculator includes DC bonus (DEF ≥10 DC, MID ≥12 DC = +2pts). FPL might not count this or use different thresholds.
2. **Rounding:** Expected stats (xG, xA) might cause slight differences.
3. **Bug in Calculator:** If diff is large (>3 pts), investigate points_breakdown JSON.

### Step 3: Sync Individual GW (for testing)

```bash
# Sync only GW17
npm run sync:player-gw-stats 17
```

---

## Phase 3: Test API Endpoint

### Test 1: Fetch All Players for GW17

```bash
curl "http://localhost:3000/api/gw/17/players" | jq '.'
```

**Expected Response:**
```json
{
  "gameweek": 17,
  "status": "completed",
  "data_source": "database",
  "count": 458,
  "players": [
    {
      "id": 355,
      "web_name": "Rice",
      "first_name": "Declan",
      "second_name": "Rice",
      "team_id": 1,
      "team_short_name": "ARS",
      "position": 3,
      "photo": "355.jpg",
      "team_code": 3,
      "fixture": {
        "id": 123,
        "opponent_team_id": 8,
        "opponent_short_name": "CRY",
        "is_home": false,
        "started": true,
        "finished": true
      },
      "stats": {
        "minutes": 90,
        "goals_scored": 0,
        "assists": 1,
        "clean_sheets": 1,
        "goals_conceded": 0,
        "own_goals": 0,
        "penalties_saved": 0,
        "penalties_missed": 0,
        "yellow_cards": 0,
        "red_cards": 0,
        "saves": 0,
        "bonus": 3,
        "bps": 32,
        "defensive_contribution": 20,
        "influence": "32.4",
        "creativity": "12.1",
        "threat": "8.0",
        "ict_index": "5.3",
        "expected_goals": "0.08",
        "expected_assists": "0.45",
        "expected_goal_involvements": "0.53"
      },
      "points": {
        "total": 11,
        "fpl_total": 11,
        "match": true,
        "breakdown": {
          "minutes": 2,
          "goals_scored": 0,
          "assists": 3,
          "clean_sheets": 1,
          "goals_conceded": 0,
          "own_goals": 0,
          "penalties_saved": 0,
          "penalties_missed": 0,
          "yellow_cards": 0,
          "red_cards": 0,
          "saves": 0,
          "bonus": 3,
          "defensive_contribution": 2
        }
      }
    },
    // ... 457 more players
  ]
}
```

### Test 2: Filter by Player IDs

```bash
# Get Rice (355) and Haaland (430)
curl "http://localhost:3000/api/gw/17/players?player_ids=355,430" | jq '.players[] | {web_name, points}'
```

**Expected:**
```json
{
  "web_name": "Rice",
  "points": {
    "total": 11,
    "fpl_total": 11,
    "match": true,
    "breakdown": { ... }
  }
}
{
  "web_name": "Haaland",
  "points": {
    "total": 16,
    "fpl_total": 16,
    "match": true,
    "breakdown": { ... }
  }
}
```

### Test 3: Filter by Team

```bash
# Get all Arsenal players
curl "http://localhost:3000/api/gw/17/players?team_id=1" | jq '.count, .players[].web_name'
```

### Test 4: Filter by Position

```bash
# Get all midfielders
curl "http://localhost:3000/api/gw/17/players?position=3" | jq '.count'
```

### Test 5: Live GW (Fetches from API)

```bash
# For current/upcoming GW, should fetch from FPL API
curl "http://localhost:3000/api/gw/18/players?player_ids=355" | jq '.data_source'
```

**Expected:** `"api"` (not `"database"`)

---

## Phase 4: Validation Queries

### Query 1: Check Total Records

```sql
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT gameweek) as gameweeks_covered
FROM player_gameweek_stats
WHERE calculated_points IS NOT NULL;
```

**Expected:**
- total_records: ~12,920 (760 players × 17 GWs, but not all played every GW)
- unique_players: 760
- gameweeks_covered: 17

### Query 2: Points Accuracy

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN calculated_points = total_points THEN 1 ELSE 0 END) as matches,
  SUM(CASE WHEN calculated_points != total_points THEN 1 ELSE 0 END) as mismatches,
  ROUND(100.0 * SUM(CASE WHEN calculated_points = total_points THEN 1 ELSE 0 END) / COUNT(*), 2) as match_percentage
FROM player_gameweek_stats
WHERE calculated_points IS NOT NULL;
```

**Target:** >95% match rate

### Query 3: Largest Discrepancies

```sql
SELECT
  p.web_name,
  pgw.gameweek,
  pgw.calculated_points,
  pgw.total_points,
  (pgw.calculated_points - pgw.total_points) as difference,
  pgw.points_breakdown->>'defensive_contribution' as dc_points,
  pgw.defensive_contribution as dc_stat
FROM player_gameweek_stats pgw
JOIN players p ON p.id = pgw.player_id
WHERE pgw.calculated_points != pgw.total_points
ORDER BY ABS(pgw.calculated_points - pgw.total_points) DESC
LIMIT 10;
```

---

## Phase 5: Next Steps

After validation is complete:

### 1. Fix K-107 (Differential Players Bug)

**Change DifferentialPlayers.tsx:**

```tsx
// BEFORE (lines 67, 114):
<div className={styles.avgPoints}>
  {player.avgPoints.toFixed(1)}
</div>

// AFTER:
<div className={styles.currentGwPoints}>
  {player.currentGwPoints}
</div>
```

This fixes Rice showing 8 pts instead of 11 pts.

### 2. Migrate Components to Use New Endpoint

**Components to update:**
1. **My Team Pitch** → Use `/api/gw/[gw]/players?player_ids=...` instead of current logic
2. **My Team Modal** → Use same endpoint for stats
3. **H2H Modal** → Use same endpoint for all player data
4. **Stats sections** → Use same endpoint

**Pattern:**
```typescript
// OLD:
const response = await fetch(`/api/team/${teamId}/gameweek/${gw}`);
const data = await response.json();
const playerPoints = data.playerData[playerId].event_points;

// NEW:
const response = await fetch(`/api/gw/${gw}/players?player_ids=${playerIds.join(',')}`);
const data = await response.json();
const player = data.players.find(p => p.id === playerId);
const playerPoints = player.points.total;
```

### 3. Update CLAUDE.md

Add K-108 to the documentation:

```markdown
## K-108: Single Source of Truth

All player points now come from `/api/gw/[gw]/players`.

**Usage:**
- Completed GWs: Reads from database (player_gameweek_stats)
- Live GWs: Fetches from FPL API + calculates live

**Points Fields:**
- `points.total` = Our calculation (source of truth)
- `points.fpl_total` = FPL's value (validation only)
- `points.match` = Boolean if they match
- `points.breakdown` = How points were calculated
```

### 4. Add Sync to Deployment Process

Update deployment docs to run sync after each GW completes:

```bash
# After GW completes
npm run sync:player-gw-stats [gw]
```

---

## Troubleshooting

### Migration Failed

```bash
# Check if columns already exist
psql $DATABASE_URL -c "\d player_gameweek_stats"

# If columns exist but migration failed, try manual:
psql $DATABASE_URL < src/db/migrations/add_k108_columns.sql
```

### Sync Fails with "Connection Refused"

```bash
# Verify DATABASE_URL is set correctly
echo $DATABASE_URL

# Try ping database
psql $DATABASE_URL -c "SELECT 1"
```

### Points Don't Match FPL

This is EXPECTED for Defensive Contribution. Our calculator includes:
- DEF with DC ≥10 → +2 pts
- MID with DC ≥12 → +2 pts

If FPL doesn't count this, we'll see +2pt differences for defenders/midfielders with high DC.

**Options:**
1. Keep DC bonus (accept +2pt diffs for some players)
2. Remove DC bonus from calculator (lines 106-112 in pointsCalculator.ts)
3. Investigate if FPL uses different DC thresholds

### API Returns Empty Array

Check GW status:

```bash
curl "http://localhost:3000/api/gw/17/players" | jq '.status, .data_source'
```

If `"data_source": "database"` but no players, run sync:

```bash
npm run sync:player-gw-stats 17
```

---

## Success Criteria

- [ ] Migration completes successfully
- [ ] Sync populates database with 12,000+ records
- [ ] >95% of calculated_points match total_points
- [ ] API endpoint returns data for completed GWs (from database)
- [ ] API endpoint returns data for live GWs (from API)
- [ ] Filters work correctly (player_ids, team_id, position)
- [ ] Validation queries show expected results

---

## Contact

**Questions?** Check logs in Railway or run validation queries to investigate discrepancies.
