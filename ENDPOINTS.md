# RivalFPL - API Endpoints Reference

**Last Updated:** December 16, 2025
**Base URL (Prod):** https://rivalfpl.com
**Base URL (Staging):** https://fpl-staging-production.up.railway.app

---

## 📋 Endpoint Overview

### League Endpoints

| Method | Endpoint | Description | Data Source |
|--------|----------|-------------|-------------|
| GET | `/api/league/[id]` | League data, standings, managers | DB + FPL API |
| GET | `/api/league/[id]/fixtures/[gw]` | H2H fixtures for gameweek | DB (completed) / FPL (live) |
| GET | `/api/league/[id]/fixtures/[gw]/live` | Live match scores | FPL API |
| GET | `/api/league/[id]/fixtures/[gw]/completed` | Completed match scores | DB |
| GET | `/api/league/[id]/matches/[matchId]` | Single match details | DB + FPL API |
| GET | `/api/league/[id]/stats` | League stats overview | DB + FPL API |
| GET | `/api/league/[id]/stats/gameweek/[gw]` | Detailed GW stats | DB (completed) / FPL (live) |
| GET | `/api/league/[id]/stats/season` | Season-long statistics | DB |
| GET | `/api/league/[id]/stats/position-history` | Position over time | DB |
| GET | `/api/league/[id]/insights/[entryId]` | Opponent insights | DB |

### Team Endpoints

| Method | Endpoint | Description | Data Source |
|--------|----------|-------------|-------------|
| GET | `/api/team/[teamId]/gameweek/[gw]` | Team picks for GW | DB (completed) / FPL (live) |
| GET | `/api/team/[teamId]/info` | Team information | FPL API |
| GET | `/api/team/[teamId]/transfers` | Transfer history | DB + FPL API |

### Player Endpoints

| Method | Endpoint | Description | Data Source |
|--------|----------|-------------|-------------|
| GET | `/api/players` | All 760 players | DB |
| GET | `/api/players/[id]` | Single player details | DB + FPL API |
| GET | `/api/players/[id]/gameweek/[gw]` | Player stats for GW | DB |
| GET | `/api/player/[id]` | Player details (alias) | DB + FPL API |

### Fixture Endpoints

| Method | Endpoint | Description | Data Source |
|--------|----------|-------------|-------------|
| GET | `/api/fixtures/[gw]` | All PL fixtures for GW | DB + FPL API |

### Utility Endpoints

| Method | Endpoint | Description | Data Source |
|--------|----------|-------------|-------------|
| GET | `/api/version` | App version info | Static |
| GET | `/api/health` | Health check (HTML) | Static |
| GET | `/api/health/json` | Health check (JSON) | Static |
| GET | `/api/fpl-proxy` | Proxy FPL API calls | FPL API |

### Admin Endpoints

| Method | Endpoint | Description | Data Source |
|--------|----------|-------------|-------------|
| GET | `/api/admin/stats` | Analytics overview | DB |
| GET | `/api/admin/leagues` | All tracked leagues | DB |
| POST | `/api/admin/track` | Track new league | DB + FPL API |
| POST | `/api/admin/aggregate` | Aggregate daily stats | DB |
| POST | `/api/admin/sync/players` | Sync all player data | DB + FPL API |

---

## 📊 Data Source Legend

| Source | Meaning | When Used |
|--------|---------|-----------|
| **DB** | PostgreSQL database | Cached/historical data |
| **FPL API** | Official FPL API | Live/current data |
| **DB (completed)** | Database for completed GWs | GW has finished |
| **FPL (live)** | FPL API for live GWs | GW in progress |
| **DB + FPL API** | Both sources combined | Mixed data needs |
| **Static** | Hardcoded/computed | No external data |

---

## 🔍 Endpoint Details

### GET /api/league/[id]

Returns league data including standings and managers.

**Parameters:**
- `id` (path) - League ID (e.g., 804742)

**Response:**
```json
{
  "league": {
    "id": 804742,
    "name": "Dedoume FPL",
    "standings": [...],
    "managers": [...]
  }
}
```

---

### GET /api/league/[id]/fixtures/[gw]

Returns H2H fixtures for a specific gameweek.

**Parameters:**
- `id` (path) - League ID
- `gw` (path) - Gameweek number (1-38)

**Response:**
```json
{
  "event": 16,
  "status": "completed",
  "matches": [
    {
      "id": 154,
      "entry_1": { "entry_id": 123, "name": "...", "score": 70 },
      "entry_2": { "entry_id": 456, "name": "...", "score": 81 }
    }
  ]
}
```

**Data Source Logic:**
- `status === 'completed'` → Uses `manager_gw_history` for scores
- `status === 'in_progress'` → Uses FPL API live data
- `status === 'upcoming'` → Returns 0-0 scores

---

### GET /api/league/[id]/stats/gameweek/[gw]

Returns detailed statistics for a gameweek.

**Response includes:**
- Captain picks
- Chips played
- Hits taken
- Points on bench
- Top performers
- Differentials

**Data Source Logic:**
- Completed GW → Database (K-27 tables)
- Live GW → FPL API

---

### GET /api/players

Returns all 760 Premier League players.

**Query Parameters:**
- `limit` (optional) - Number of players to return

**Response:**
```json
{
  "players": [
    {
      "id": 1,
      "web_name": "Haaland",
      "team_id": 11,
      "position": "FWD",
      "now_cost": 150,
      "total_points": 135,
      "defcon": 2.5
    }
  ],
  "count": 760
}
```

---

### GET /api/players/[id]/gameweek/[gw]

Returns player statistics for a specific gameweek.

**Parameters:**
- `id` (path) - Player ID
- `gw` (path) - Gameweek number

**Response:**
```json
{
  "player": {
    "id": 1,
    "web_name": "Haaland",
    "total_points": 12,
    "minutes": 90,
    "goals_scored": 2,
    "assists": 1
  }
}
```

---

### GET /api/team/[teamId]/gameweek/[gw]

Returns team picks and formation for a gameweek.

**Parameters:**
- `teamId` (path) - Entry ID
- `gw` (path) - Gameweek number

**Response:**
```json
{
  "picks": [...],
  "squad": {
    "starting11": [...],
    "bench": [...]
  },
  "chip": "bboost",
  "transfers": {
    "cost": 4,
    "count": 2
  }
}
```

**Data Source Logic:**
- Completed GW → Database (`manager_picks`, `manager_gw_history`, `manager_chips`)
- Live/Upcoming GW → FPL API

---

### GET /api/team/[teamId]/transfers

Returns all transfers for a team.

**Parameters:**
- `teamId` (path) - Entry ID
- `gw` (query, optional) - Filter by gameweek

**Response:**
```json
{
  "transfers": [
    {
      "event": 5,
      "playerIn": { "id": 1, "web_name": "Haaland", "cost": 150 },
      "playerOut": { "id": 2, "web_name": "Jesus", "cost": 80 }
    }
  ]
}
```

---

### GET /api/fixtures/[gw]

Returns all Premier League fixtures for a gameweek.

**Parameters:**
- `gw` (path) - Gameweek number

**Response:**
```json
{
  "fixtures": [
    {
      "id": 1,
      "team_h": 1,
      "team_a": 2,
      "team_h_score": 2,
      "team_a_score": 1,
      "finished": true
    }
  ]
}
```

---

### GET /api/version

Returns current app version.

**Response:**
```json
{
  "version": "2.7.1",
  "timestamp": 1734567890123,
  "environment": "production"
}
```

---

### POST /api/admin/track

Tracks a new league for analysis.

**Request Body:**
```json
{
  "leagueId": 804742
}
```

**Response:**
```json
{
  "success": true,
  "league": {
    "id": 804742,
    "name": "Dedoume FPL",
    "managers": 20
  }
}
```

---

### POST /api/admin/sync/players

Syncs all player data from FPL API to database.

**Response:**
```json
{
  "success": true,
  "playersUpdated": 760,
  "timestamp": 1734567890123
}
```

---

## 🚨 Common Issues

### Endpoint Returns 0 Values
Check if `export const dynamic = 'force-dynamic'` is present in the route file.

### CORS Errors
Use `/api/fpl-proxy` to proxy FPL API calls from the frontend.

### Slow Response
- Check if endpoint is fetching from FPL API when it should use database
- Add database caching for frequently accessed data

### Scores Showing 0 for Completed GWs
Verify the endpoint fetches from all required K-27 tables:
- `manager_picks` - Team selections
- `manager_gw_history` - Points and transfer costs
- `manager_chips` - Active chip

See `src/lib/scoreCalculator.ts:75-119` for the correct pattern.

---

## 📝 Adding New Endpoints

When adding a new endpoint:

1. Create route file in appropriate `src/app/api/` directory
2. Add `export const dynamic = 'force-dynamic'` if using database
3. Document in this ENDPOINTS.md file
4. Add to CLAUDE.md if it's a critical endpoint
5. Update tests if applicable

---

## 📂 File Structure

```
src/app/api/
├── admin/
│   ├── aggregate/route.ts
│   ├── leagues/route.ts
│   ├── stats/route.ts
│   ├── sync/players/route.ts
│   └── track/route.ts
├── fixtures/[gw]/route.ts
├── league/[id]/
│   ├── route.ts
│   ├── fixtures/[gw]/
│   │   ├── route.ts
│   │   ├── live/route.ts
│   │   └── completed/route.ts
│   ├── matches/[matchId]/route.ts
│   ├── stats/
│   │   ├── route.ts
│   │   ├── gameweek/[gw]/route.ts
│   │   ├── season/route.ts
│   │   └── position-history/route.ts
│   └── insights/[entryId]/route.ts
├── team/[teamId]/
│   ├── gameweek/[gw]/route.ts
│   ├── info/route.ts
│   └── transfers/route.ts
├── player/[id]/route.ts
├── players/
│   ├── route.ts
│   ├── [id]/
│   │   ├── route.ts
│   │   └── gameweek/[gw]/route.ts
├── version/route.ts
├── health/
│   ├── route.ts
│   └── json/route.ts
└── fpl-proxy/route.ts
```

---

**Total Endpoints:** 27
