# Database Schema

**Last Updated:** December 16, 2025
**Version:** v2.7.5 (K-27 Database Caching)

---

## Overview

The RivalFPL database consists of **17 tables** organized into three categories:

1. **Core Tables** - FPL data (players, teams, managers)
2. **K-27 Caching Tables** - Performance-optimized cached data
3. **Analytics Tables** - Usage tracking and metrics

---

## Table Overview

| Table | Rows | Category | Description |
|-------|------|----------|-------------|
| **players** | ~700 | Core | Current season player data and stats |
| **teams** | 20 | Core | Premier League teams reference data |
| **player_gameweek_stats** | ~12k | Core | Per-GW player performance history |
| **managers** | ? | Core | FPL managers (users) tracked by the app |
| **leagues** | ? | Core | H2H leagues tracked by the app |
| **league_standings** | ? | Core | Current standings for tracked leagues |
| **h2h_matches** | ? | Core | Match results for tracked leagues |
| **manager_picks** | ? | K-27 | Squad selections per GW (K-27.1) |
| **manager_gw_history** | ? | K-27 | Manager GW points and stats (K-27.5) |
| **manager_chips** | ? | K-27 | Chip usage history (K-27.3) |
| **manager_transfers** | ? | K-27 | Transfer history (K-27.2) |
| **pl_fixtures** | ? | K-27 | PL fixtures and results (K-27.4) |
| **entry_captains** | ? | K-27 | Captain selections history |
| **manager_history** | ? | Core | Manager season history |
| **analytics_daily** | ? | Analytics | Daily usage metrics |
| **analytics_leagues** | ? | Analytics | Per-league analytics |
| **analytics_requests** | ? | Analytics | API request logs |

---

## Core Tables

### `teams`

Premier League teams reference data.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | Team ID (1-20) |
| name | varchar(50) | NO | Full team name |
| short_name | varchar(5) | NO | 3-letter code (ARS, CHE, etc.) |
| strength | integer | YES | Overall strength rating |
| strength_overall_home | integer | YES | Home strength |
| strength_overall_away | integer | YES | Away strength |
| strength_attack_home | integer | YES | Home attack rating |
| strength_attack_away | integer | YES | Away attack rating |
| strength_defence_home | integer | YES | Home defence rating |
| strength_defence_away | integer | YES | Away defence rating |

---

### `players`

Current season player data and cumulative stats.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | Player element ID (PK) |
| web_name | varchar(100) | NO | Display name |
| first_name | varchar(100) | YES | First name |
| second_name | varchar(100) | YES | Last name |
| team_id | integer | NO | FK to teams.id |
| team_name | varchar(50) | YES | Team full name |
| team_short | varchar(5) | YES | Team short name |
| element_type | integer | NO | Position (1=GK, 2=DEF, 3=MID, 4=FWD) |
| position | varchar(10) | YES | Position abbreviation |
| now_cost | integer | NO | Current price (in 0.1m units) |
| selected_by_percent | decimal(5,2) | YES | Ownership % |
| transfers_in | integer | NO | Season transfers in |
| transfers_out | integer | NO | Season transfers out |
| transfers_in_event | integer | NO | This GW transfers in |
| transfers_out_event | integer | NO | This GW transfers out |
| total_points | integer | NO | Season total points |
| points_per_game | decimal(4,2) | NO | Average points per game |
| form | decimal(4,2) | NO | Recent form rating |
| minutes | integer | NO | Season minutes played |
| starts | integer | NO | Season starts |
| goals_scored | integer | NO | Season goals |
| assists | integer | NO | Season assists |
| expected_goals | decimal(6,2) | NO | Season xG |
| expected_assists | decimal(6,2) | NO | Season xA |
| expected_goal_involvements | decimal(6,2) | NO | Season xGI |
| clean_sheets | integer | NO | Season clean sheets |
| goals_conceded | integer | NO | Season goals conceded |
| expected_goals_conceded | decimal(6,2) | NO | Season xGC |
| own_goals | integer | NO | Season own goals |
| saves | integer | NO | Season saves (GK) |
| penalties_saved | integer | NO | Season penalties saved (GK) |
| yellow_cards | integer | NO | Season yellow cards |
| red_cards | integer | NO | Season red cards |
| penalties_missed | integer | NO | Season penalties missed |
| bonus | integer | NO | Season bonus points |
| bps | integer | NO | Season BPS |
| influence | decimal(6,2) | NO | Season influence |
| creativity | decimal(6,2) | NO | Season creativity |
| threat | decimal(6,2) | NO | Season threat |
| ict_index | decimal(6,2) | NO | Season ICT index |
| status | varchar(5) | YES | Availability status |
| chance_of_playing_next_round | integer | YES | Availability % |
| news | text | YES | Injury/news |
| updated_at | timestamp | YES | Last sync time |

---

### `player_gameweek_stats`

Per-gameweek player performance history.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | serial | NO | Primary key |
| player_id | integer | NO | FK to players.id |
| gameweek | integer | NO | Gameweek number |
| fixture_id | integer | YES | FPL fixture ID |
| opponent_team_id | integer | YES | Opponent team ID |
| opponent_short | varchar(5) | YES | Opponent short name |
| was_home | boolean | YES | Home/away |
| team_goals | integer | YES | Team's goals scored |
| opponent_goals | integer | YES | Opponent's goals scored |
| total_points | integer | NO | FPL points for GW |
| minutes | integer | NO | Minutes played |
| starts | integer | NO | Started (0/1) |
| goals_scored | integer | NO | Goals |
| assists | integer | NO | Assists |
| expected_goals | decimal(5,2) | NO | xG |
| expected_assists | decimal(5,2) | NO | xA |
| expected_goal_involvements | decimal(5,2) | NO | xGI |
| clean_sheets | integer | NO | Clean sheet (0/1) |
| goals_conceded | integer | NO | Goals conceded |
| expected_goals_conceded | decimal(5,2) | NO | xGC |
| own_goals | integer | NO | Own goals |
| saves | integer | NO | Saves (GK) |
| penalties_saved | integer | NO | Penalties saved (GK) |
| yellow_cards | integer | NO | Yellow cards |
| red_cards | integer | NO | Red cards |
| penalties_missed | integer | NO | Penalties missed |
| bonus | integer | NO | Bonus points |
| bps | integer | NO | BPS |
| influence | decimal(5,2) | NO | Influence |
| creativity | decimal(5,2) | NO | Creativity |
| threat | decimal(5,2) | NO | Threat |
| ict_index | decimal(5,2) | NO | ICT index |
| value | integer | YES | Price that GW |
| transfers_in | integer | NO | Transfers in that GW |
| transfers_out | integer | NO | Transfers out that GW |
| selected | integer | NO | Ownership that GW |
| created_at | timestamp | NO | Record creation time |

**Indexes:**
- `idx_pgw_player` on `player_id`
- `idx_pgw_gameweek` on `gameweek`
- `idx_pgw_player_gw` on `(player_id, gameweek)`
- `UNIQUE(player_id, gameweek)`

---

### `managers`

FPL managers (users) tracked by the application.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | Internal ID |
| entry_id | integer | NO | FPL entry ID (unique) |
| player_name | varchar(100) | YES | Manager name |
| team_name | varchar(100) | YES | Team name |
| created_at | timestamp | YES | First tracked |
| updated_at | timestamp | YES | Last updated |

**Note:** This table does NOT have a `league_id` column.

---

### `leagues`

H2H leagues tracked by the application.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | FPL league ID (PK) |
| name | varchar(100) | YES | League name |
| created_at | timestamp | YES | First tracked |
| updated_at | timestamp | YES | Last updated |

---

### `league_standings`

Current standings for tracked leagues.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | serial | NO | Primary key |
| league_id | integer | NO | FK to leagues.id |
| entry_id | integer | NO | FK to managers.entry_id |
| rank | integer | YES | Current rank |
| total_points | integer | YES | Total H2H points |
| wins | integer | YES | Wins |
| draws | integer | YES | Draws |
| losses | integer | YES | Losses |
| updated_at | timestamp | YES | Last sync |

---

### `h2h_matches`

Match results for tracked H2H leagues.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | serial | NO | Primary key |
| league_id | integer | NO | FK to leagues.id |
| event | integer | NO | Gameweek |
| entry_1_id | integer | NO | Manager 1 entry ID |
| entry_2_id | integer | NO | Manager 2 entry ID |
| entry_1_points | integer | YES | Manager 1 GW points |
| entry_2_points | integer | YES | Manager 2 GW points |
| winner | integer | YES | Winner entry_id (NULL = draw) |
| created_at | timestamp | YES | Record creation |

**Indexes:**
- `idx_h2h_matches_league_event` on `(league_id, event)`

---

### `manager_history`

Manager season-long history.

**Schema:** To be documented (fetch from `/api/admin/schema` once deployed)

---

## K-27 Caching Tables

These tables cache frequently-accessed FPL API data for performance.

### `manager_picks` (K-27.1)

Squad selections (15 players) for each manager per gameweek.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | serial | NO | Primary key |
| league_id | integer | NO | League ID |
| entry_id | integer | NO | Manager entry ID |
| event | integer | NO | Gameweek number |
| player_id | integer | NO | FPL player element ID |
| position | integer | NO | Squad position (1-15: 1-11 starting, 12-15 bench) |
| multiplier | integer | NO | 0=benched, 1=normal, 2=captain, 3=TC |
| is_captain | boolean | NO | Is this pick the captain |
| is_vice_captain | boolean | NO | Is this pick the vice captain |
| created_at | timestamp | NO | Record creation time |

**Indexes:**
- `idx_manager_picks_entry_event` on `(entry_id, event)`
- `idx_manager_picks_league_event` on `(league_id, event)`
- `idx_manager_picks_league` on `league_id`
- `UNIQUE(league_id, entry_id, event, player_id)`

---

### `manager_gw_history` (K-27.5)

Manager GW-by-GW performance history.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | serial | NO | Primary key |
| league_id | integer | NO | League ID |
| entry_id | integer | NO | Manager entry ID |
| event | integer | NO | Gameweek |
| points | integer | NO | GW points (before hits) |
| total_points | integer | NO | Cumulative season total |
| rank | integer | YES | Overall rank |
| rank_sort | integer | YES | Rank for sorting |
| overall_rank | integer | YES | Same as rank |
| event_transfers | integer | NO | Transfers made this GW |
| event_transfers_cost | integer | NO | Hit points (4, 8, 12, etc.) |
| value | integer | YES | Team value (in 0.1m units) |
| bank | integer | YES | Money in bank (in 0.1m units) |
| points_on_bench | integer | NO | Points left on bench |
| created_at | timestamp | NO | Record creation time |

**Indexes:**
- `idx_manager_gw_history_entry` on `entry_id`
- `idx_manager_gw_history_league_event` on `(league_id, event)`
- `idx_manager_gw_history_league` on `league_id`
- `UNIQUE(entry_id, event)`

---

### `manager_chips` (K-27.3)

Manager chip usage history (WC, BB, TC, FH).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | serial | NO | Primary key |
| league_id | integer | NO | League ID |
| entry_id | integer | NO | Manager entry ID |
| chip_name | varchar(20) | NO | 'wildcard', 'bboost', '3xc', 'freehit' |
| event | integer | NO | Gameweek used |
| created_at | timestamp | NO | Record creation time |

**Indexes:**
- `idx_manager_chips_league` on `league_id`
- `idx_manager_chips_entry` on `entry_id`
- `idx_manager_chips_event` on `(league_id, event)`
- `UNIQUE(entry_id, chip_name, event)`

---

### `manager_transfers` (K-27.2)

Manager transfer history.

**Schema:** To be documented (fetch from `/api/admin/schema` once deployed)

---

### `pl_fixtures` (K-27.4)

Premier League fixtures and results.

**Schema:** To be documented (fetch from `/api/admin/schema` once deployed)

---

### `entry_captains`

Captain selections history.

**Schema:** To be documented (fetch from `/api/admin/schema` once deployed)

---

## Analytics Tables

### `analytics_daily`

Daily usage metrics.

**Schema:** To be documented (fetch from `/api/admin/schema` once deployed)

---

### `analytics_leagues`

Per-league analytics.

**Schema:** To be documented (fetch from `/api/admin/schema` once deployed)

---

### `analytics_requests`

API request logs.

**Schema:** To be documented (fetch from `/api/admin/schema` once deployed)

---

## Key Relationships

```
managers ----< manager_picks >---- players
         ----< manager_gw_history
         ----< manager_chips
         ----< manager_transfers
         ----< h2h_matches (entry_1_id, entry_2_id)
         ----< entry_captains
         ----< league_standings

leagues ----< league_standings
        ----< h2h_matches
        ----< manager_picks (via league_id)
        ----< manager_gw_history (via league_id)
        ----< manager_chips (via league_id)

players ----< player_gameweek_stats
        ----< manager_picks (via player_id)

teams ----< players (via team_id)
      ----< pl_fixtures (via team_h_id, team_a_id)
```

---

## Important Notes

1. **managers table has NO league_id column** - Managers can belong to multiple leagues via `league_standings`

2. **K-27 tables use league_id for partitioning** - All K-27 caching tables include `league_id` to support multi-league queries

3. **player_gameweek_stats is incomplete** - Currently only has ~10 players synced (IDs: 260, 7, etc.) instead of all 700+ Premier League players

4. **Season Stats Current State (v2.7.5)**:
   - Captain Points: Using FPL API fallback (database incomplete)
   - Chips Played/Faced: Using FPL API fallback (database incomplete)
   - Best/Worst GWs: Using database (`manager_gw_history`) ✅
   - Streaks: Using database (`h2h_matches`) ✅
   - Trends: Using database (`manager_chips`) ✅

---

## TODO: Complete Schema

Once the `/api/admin/schema` endpoint is deployed and accessible:

1. Visit `https://staging.rivalfpl.com/api/admin/schema`
2. Copy the JSON response
3. Fill in the "To be documented" sections above
4. Add row counts for all tables
5. Document indexes for all tables
6. Verify all column types and constraints

---

**End of Database Schema Documentation**
