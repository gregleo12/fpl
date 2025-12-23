# RivalFPL - Database Reference

**Last Updated:** December 23, 2025
**Database:** PostgreSQL on Railway
**Score Calculation:** K-108/K-108c tables (100% accuracy)

---

## 🔌 Connection Info

| Type | Host | Port | Database |
|------|------|------|----------|
| Internal (Railway) | postgres.railway.internal | 5432 | railway |
| External (Dev/Scripts) | caboose.proxy.rlwy.net | 45586 | railway |

**Connection String Format:**
```
postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway
```

---

## 📊 Database Tables

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `leagues` | League info & sync status | id, name, sync_status, last_synced, last_sync_error |
| `managers` | Manager/team info | entry_id, player_name, team_name |
| `h2h_matches` | H2H match results | entry_1_id, entry_2_id, entry_1_points, entry_2_points, event |
| `league_standings` | Current rankings | league_id, entry_id, rank, total |
| `players` | All 760 PL players | id, web_name, team_id, position, now_cost |
| `teams` | All 20 PL teams | id, name, short_name, code |
| `player_gameweek_stats` | **K-108:** Player points per GW | player_id, gameweek, **calculated_points**, minutes, goals, bonus |

---

## 🧮 K-108/K-108c Score Calculation System

**Implemented:** v3.6.2 - v3.7.0
**Purpose:** Single source of truth for 100% accurate score calculations

### K-108: Player Points (Database)

**Table:** `player_gameweek_stats`
**Key Column:** `calculated_points` - Accurate player points per gameweek

```sql
-- Example: Get player points for GW17
SELECT player_id, calculated_points, minutes, goals_scored, bonus
FROM player_gameweek_stats
WHERE gameweek = 17 AND player_id = 427;

-- Result: Haaland, 16 points (includes bonus already baked in)
```

**How K-108 Works:**
1. `sync-player-gw-stats.ts` syncs player data from FPL API after each GW
2. Stores accurate points in `calculated_points` column
3. All endpoints query this column for player points (NOT FPL API)

### K-108c: Team Totals (Calculation Function)

**Function:** `calculateTeamGameweekScore(teamId, gameweek)`
**File:** `src/lib/teamCalculator.ts`
**Purpose:** Calculate complete team score for any gameweek

```typescript
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';

// Get team score for GW17
const teamScore = await calculateTeamGameweekScore(123456, 17);

console.log(teamScore.points.net_total);        // 67 (final score)
console.log(teamScore.points.starting_xi_total); // 52
console.log(teamScore.points.captain_bonus);     // 16 (Haaland ×3)
console.log(teamScore.points.transfer_cost);     // -4
console.log(teamScore.auto_subs);                // [{ player_in: "Saka", player_out: "TAA" }]
```

**How K-108c Works:**
1. Queries `manager_picks` for team selection (15 players)
2. Queries `player_gameweek_stats` for K-108 points
3. Queries `manager_chips` for active chip (BB, TC, etc.)
4. Queries `manager_gw_history` for transfer cost
5. Calculates:
   - Starting XI total (formation-valid)
   - Captain bonus (2× or 3×)
   - Auto-substitutions (bench → XI)
   - Bench boost total (if active)
   - Transfer cost deduction
6. Returns complete `TeamGameweekScore` object

**What K-108c Returns:**
```typescript
interface TeamGameweekScore {
  points: {
    net_total: number;           // Final score (what user sees)
    starting_xi_total: number;   // XI total before captain
    captain_bonus: number;       // Captain extra points
    bench_boost_total: number;   // Bench points (if BB active)
    auto_sub_total: number;      // Points from auto-subs
    transfer_cost: number;       // -4, -8, etc.
  };
  auto_subs: Array<{             // Substitution details
    player_in: string;
    player_out: string;
    points_gained: number;
  }>;
  active_chip: string | null;    // "bboost", "3xc", etc.
  captain_name: string;
  status: string;                // "completed", "in_progress"
}
```

### Database Tables Used by K-108c

| Table | Purpose in K-108c |
|-------|-------------------|
| `manager_picks` | Team selection (15 players, captain, positions) |
| `player_gameweek_stats` | K-108 player points (calculated_points column) |
| `manager_chips` | Active chip detection (BB, TC, FH, WC) |
| `manager_gw_history` | Transfer cost (event_transfers_cost) |

### Endpoints Using K-108c (v3.7.0)

✅ **All 9 major endpoints migrated to K-108c:**

1. `/api/gw/[gw]/team/[teamId]` - My Team stat boxes
2. `/api/team/[teamId]/info` - My Team info tile
3. `/api/team/[teamId]/history` - My Team history modal
4. `/api/team/[teamId]/gameweek/[gw]` - My Team pitch view
5. `/api/league/[id]/fixtures/[gw]` - Rivals H2H fixtures
6. `/api/league/[id]/stats/gameweek/[gw]/rankings` - Stats GW rankings
7. `/api/league/[id]/stats/gameweek/[gw]` - Stats GW winners/losers
8. `/api/league/[id]/stats/season` - Stats Season best/worst GWs
9. `/api/league/[id]/stats` - League standings

**Benefits:**
- **100% Accuracy**: Scores match FPL official totals exactly
- **Consistency**: Same score across all features (no discrepancies)
- **Performance**: Parallel calculations (20 teams in ~2-3s)
- **Maintainability**: Single calculation function, easy to debug

---

#### `leagues` Table Details

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | League ID (primary key) |
| `name` | TEXT | League name |
| `sync_status` | VARCHAR(20) | Current sync status: 'pending', 'syncing', 'completed', 'failed' |
| `last_synced` | TIMESTAMP | Last successful sync timestamp |
| `last_sync_error` | TEXT | Error message from last failed sync (K-60) |
| `created_at` | TIMESTAMP | When league was first added |
| `updated_at` | TIMESTAMP | Last metadata update |

**Sync Status State Machine:**
- `pending` → First-time league load, no sync started yet
- `syncing` → Sync in progress
- `completed` → Sync finished successfully
- `failed` → Sync encountered an error

**Auto-Reset:** Syncs stuck in 'syncing' status for >10 minutes are automatically reset to 'failed' (K-60)

### K-27 Cached Tables (Historical Data)

These tables cache FPL API data for completed gameweeks to reduce API calls.

| Table | Purpose | Records (approx) | Sync Script |
|-------|---------|------------------|-------------|
| `manager_gw_history` | Points, hits, rank per GW | 320 (20×16 GWs) | `npm run sync:manager-history` |
| `manager_picks` | 15 players per manager per GW | 4,800 (20×15×16) | `npm run sync:manager-picks` |
| `manager_chips` | Chip usage (WC, BB, TC, FH) | ~55 | `npm run sync:manager-chips` |
| `manager_transfers` | All transfers made | ~711 | `npm run sync:manager-transfers` |
| `pl_fixtures` | All 380 PL fixtures | 380 | `npm run sync:pl-fixtures` |

### Analytics Tables

| Table | Purpose |
|-------|---------|
| `api_requests` | Request tracking |
| `daily_stats` | Aggregated daily statistics |
| `league_metadata` | League tracking and metrics |

---

## 🔄 Data Source Rules

**Critical:** Choose the correct data source based on gameweek status.

| GW Status | Data Source | Why |
|-----------|-------------|-----|
| Completed | Database (K-27 tables) | Faster, reduces API calls |
| Live / In Progress | FPL API | Need real-time data |
| Upcoming | FPL API | Data may change |

### Code Pattern (Legacy K-27 Only)

```typescript
if (status === 'completed') {
  // Fetch from database
  const [picks, history, chips] = await Promise.all([
    db.query('SELECT ... FROM manager_picks ...'),
    db.query('SELECT ... FROM manager_gw_history ...'),
    db.query('SELECT ... FROM manager_chips ...')
  ]);
} else {
  // Fetch from FPL API
  const response = await fetch(`https://fantasy.premierleague.com/api/...`);
}
```

### Code Pattern (K-108c - Recommended)

**Use K-108c for all team score calculations** - it handles data source selection internally:

```typescript
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';

// K-108c works for ANY gameweek status (completed, live, upcoming)
const teamScore = await calculateTeamGameweekScore(teamId, gameweek);
const finalScore = teamScore.points.net_total;

// For multiple teams (e.g., league standings)
const scores = await Promise.all(
  teamIds.map(id => calculateTeamGameweekScore(id, gameweek))
);

// Extract scores
const scoresMap = new Map();
scores.forEach((result, index) => {
  scoresMap.set(teamIds[index], result.points.net_total);
});
```

**When to use K-108c vs K-27:**
- ✅ **Use K-108c**: When calculating team scores (GW points, rankings, H2H matches)
- ✅ **Use K-27 directly**: When fetching raw data (transfer history, chip usage, historical stats)

**K-108c Internal Logic:**
```typescript
// K-108c queries these K-27 tables internally:
// 1. manager_picks (team selection)
// 2. player_gameweek_stats (K-108 player points)
// 3. manager_chips (active chip)
// 4. manager_gw_history (transfer cost)

// Then calculates:
// - Starting XI total
// - Captain bonus
// - Auto-substitutions
// - Transfer cost deduction
// Returns: Complete TeamGameweekScore object
```

### ⚠️ Important: Fetch Complete Data

When fetching from database for completed GWs, **always fetch ALL required data**:

```typescript
// ❌ WRONG - Missing points and chips
const picks = await db.query('SELECT ... FROM manager_picks ...');
return { picks: picks.rows };

// ✅ CORRECT - Fetch everything
const [picksResult, historyResult, chipResult] = await Promise.all([
  db.query('SELECT ... FROM manager_picks ...'),
  db.query('SELECT points, event_transfers_cost FROM manager_gw_history ...'),
  db.query('SELECT chip_name FROM manager_chips ...')
]);
return {
  picks: picksResult.rows,
  active_chip: chipResult.rows[0]?.chip_name || null,
  entry_history: {
    points: historyResult.rows[0].points,
    event_transfers_cost: historyResult.rows[0].event_transfers_cost
  }
};
```

---

## 🔧 Sync Scripts

### Running Sync Scripts

All sync scripts require DATABASE_URL environment variable:

```bash
# Set the database URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@caboose.proxy.rlwy.net:45586/railway"

# Or inline:
DATABASE_URL="..." npm run sync:manager-history
```

### Available Scripts

| Command | What It Does | When to Run |
|---------|--------------|-------------|
| `npm run sync:player-gw-stats` | **K-108:** Syncs player points to `player_gameweek_stats` | After each GW completes |
| `npm run sync:manager-history` | Syncs GW history for all managers | After each GW completes |
| `npm run sync:manager-picks` | Syncs team picks for all managers | After each GW completes |
| `npm run sync:manager-chips` | Syncs chip usage | When chips are played |
| `npm run sync:manager-transfers` | Syncs all transfers | After each GW completes |
| `npm run sync:pl-fixtures` | Syncs PL fixture results | After matches complete |

**⚠️ Important:** Always run `sync:player-gw-stats` first after a GW completes - K-108c depends on accurate player points!

### Migration Scripts

| Command | What It Does |
|---------|--------------|
| `npm run migrate:manager-history` | Creates manager_gw_history table |
| `npm run migrate:manager-picks` | Creates manager_picks table |
| `npm run migrate:manager-chips` | Creates manager_chips table |
| `npm run migrate:manager-transfers` | Creates manager_transfers table |
| `npm run migrate:pl-fixtures` | Creates pl_fixtures table |

---

## 📋 Table Schemas

### manager_gw_history

```sql
CREATE TABLE manager_gw_history (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  event INTEGER NOT NULL,
  points INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  rank INTEGER,
  event_transfers INTEGER DEFAULT 0,
  event_transfers_cost INTEGER DEFAULT 0,
  value INTEGER,
  bank INTEGER,
  points_on_bench INTEGER DEFAULT 0,
  UNIQUE(entry_id, event)
);
```

### manager_picks

```sql
CREATE TABLE manager_picks (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  event INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  multiplier INTEGER DEFAULT 1,
  is_captain BOOLEAN DEFAULT FALSE,
  is_vice_captain BOOLEAN DEFAULT FALSE,
  UNIQUE(league_id, entry_id, event, player_id)
);
```

### manager_chips

```sql
CREATE TABLE manager_chips (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  chip_name VARCHAR(20) NOT NULL,
  event INTEGER NOT NULL,
  UNIQUE(entry_id, chip_name, event)
);
```

### manager_transfers

```sql
CREATE TABLE manager_transfers (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  event INTEGER NOT NULL,
  player_in INTEGER NOT NULL,
  player_out INTEGER NOT NULL,
  player_in_cost INTEGER NOT NULL,
  player_out_cost INTEGER NOT NULL,
  transfer_time TIMESTAMP,
  UNIQUE(entry_id, event, player_in, player_out)
);
```

### pl_fixtures

```sql
CREATE TABLE pl_fixtures (
  id INTEGER PRIMARY KEY,
  event INTEGER,
  team_h INTEGER NOT NULL,
  team_a INTEGER NOT NULL,
  team_h_score INTEGER,
  team_a_score INTEGER,
  team_h_difficulty INTEGER,
  team_a_difficulty INTEGER,
  kickoff_time TIMESTAMP,
  started BOOLEAN DEFAULT FALSE,
  finished BOOLEAN DEFAULT FALSE,
  minutes INTEGER DEFAULT 0
);
```

---

## 🚨 Common Issues

### Database Column Names Don't Match FPL API (v3.0.5 Bug)
**Problem:** Query fails silently or returns no results.

**Root Cause:** Database uses different column names than FPL API fields.

**Common Mismatches:**
| Database Column | FPL API Field | Table |
|----------------|---------------|-------|
| `gameweek` | `event` | `player_gameweek_stats` |
| `player_id` | `element_id` | `player_gameweek_stats` |

**Fix:** Always use database column names in SQL queries, not FPL API field names.

```sql
-- ❌ WRONG - Using FPL API field names
SELECT * FROM player_gameweek_stats WHERE event = 17 AND element_id = 123

-- ✅ CORRECT - Using database column names
SELECT * FROM player_gameweek_stats WHERE gameweek = 17 AND player_id = 123
```

### "Column does not exist" Error
The table exists but is missing columns. Run the appropriate migration or add column manually.

### Scores Showing 0 for Completed GWs
**Legacy Issue (pre-v3.7.0):** Check that you're fetching from `manager_gw_history` in addition to `manager_picks`. See v2.7.1 bug fix.

**v3.7.0+:** Use K-108c (`calculateTeamGameweekScore()`) instead - it handles all data fetching automatically.

### K-108c Showing Incorrect Scores
**Check these in order:**
1. Verify `player_gameweek_stats` has data for the gameweek (run `npm run sync:player-gw-stats`)
2. Verify `manager_picks` has team selections (run `npm run sync:manager-picks`)
3. Check Railway logs for `[K-108c]` error messages
4. Verify gameweek is synced in database (check `manager_gw_history`)

### Sync Script Fails with Connection Error
Verify DATABASE_URL is set correctly and the external hostname (caboose) is used, not internal.

---

## 📝 Adding New Cached Data

When adding a new cached table:

1. Create migration file in `src/db/migrations/`
2. Create sync script in `src/scripts/`
3. Add npm scripts to package.json
4. Update this DATABASE.md file
5. Update CLAUDE.md if it affects critical rules

---

**Questions?** Check the sync scripts in `src/scripts/` for implementation examples.
