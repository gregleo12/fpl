# RivalFPL - Database Reference

**Last Updated:** December 16, 2025
**Database:** PostgreSQL on Railway

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
| `managers` | Manager/team info | entry_id, player_name, team_name |
| `h2h_matches` | H2H match results | entry_1_id, entry_2_id, entry_1_points, entry_2_points, event |
| `league_standings` | Current rankings | league_id, entry_id, rank, total |
| `players` | All 760 PL players | id, web_name, team_id, position, now_cost |
| `teams` | All 20 PL teams | id, name, short_name, code |
| `player_gameweek_stats` | Player stats per GW | player_id, gameweek, total_points, minutes, goals |

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

### Code Pattern

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
| `npm run sync:manager-history` | Syncs GW history for all managers | After each GW completes |
| `npm run sync:manager-picks` | Syncs team picks for all managers | After each GW completes |
| `npm run sync:manager-chips` | Syncs chip usage | When chips are played |
| `npm run sync:manager-transfers` | Syncs all transfers | After each GW completes |
| `npm run sync:pl-fixtures` | Syncs PL fixture results | After matches complete |

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

### "Column does not exist" Error
The table exists but is missing columns. Run the appropriate migration or add column manually.

### Scores Showing 0 for Completed GWs
Check that you're fetching from `manager_gw_history` in addition to `manager_picks`. See v2.7.1 bug fix.

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
