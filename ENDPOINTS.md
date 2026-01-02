# RivalFPL - API Endpoints Reference

**Last Updated:** December 23, 2025
**Base URL (Prod):** https://rivalfpl.com
**Base URL (Staging):** https://fpl-staging-production.up.railway.app

**Score Calculation:** All team scores use **K-108c** single source of truth (v3.7.0)

---

## 📋 Endpoint Overview

### League Endpoints

| Method | Endpoint | Description | Data Source | Score Calc |
|--------|----------|-------------|-------------|------------|
| GET | `/api/league/[id]` | League data, standings, managers | DB + FPL API | - |
| GET | `/api/league/[id]/fixtures/[gw]` | H2H fixtures for gameweek | DB (completed) / K-108c (live) | **K-108c** |
| GET | `/api/league/[id]/fixtures/[gw]/live` | Live match modal scores | FPL API | scoreCalculator |
| GET | `/api/league/[id]/fixtures/[gw]/completed` | Completed match scores | DB | - |
| GET | `/api/league/[id]/matches/[matchId]` | Single match details | DB + FPL API | - |
| GET | `/api/league/[id]/stats` | League standings (live GW) | DB + K-108c (live) | **K-108c** |
| GET | `/api/league/[id]/stats/gameweek/[gw]` | Detailed GW stats, winners | DB (completed) / K-108c (live) | **K-108c** |
| GET | `/api/league/[id]/stats/gameweek/[gw]/rankings` | GW points rankings | K-108c | **K-108c** |
| GET | `/api/league/[id]/stats/season` | Season-long statistics | DB + K-108c (live GW) | **K-108c** |
| GET | `/api/league/[id]/stats/position-history` | Position over time | DB | - |
| GET | `/api/league/[id]/insights/[entryId]` | Opponent insights | DB | - |

### Team Endpoints

| Method | Endpoint | Description | Data Source | Score Calc |
|--------|----------|-------------|-------------|------------|
| GET | `/api/team/[teamId]/gameweek/[gw]` | Team picks for GW pitch view | K-108c | **K-108c** |
| GET | `/api/team/[teamId]/info` | Team information (stat boxes) | FPL API + K-108c | **K-108c** |
| GET | `/api/team/[teamId]/history` | Manager GW history | DB + K-108c (live) | **K-108c** |
| GET | `/api/team/[teamId]/transfers` | Transfer history | DB + FPL API | - |
| GET | `/api/team/[teamId]/gw-rank-stats` | GW rank statistics | FPL API | - |
| GET | `/api/team/[teamId]/transfer-stats` | Transfer statistics | FPL API | - |
| GET | `/api/gw/[gw]/team/[teamId]` | K-108c team totals | K-108c | **K-108c** |

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
| GET | `/api/admin/sync-status` | **K-165b:** View sync status for all leagues/GWs | DB |
| POST | `/api/admin/sync-status` | **K-165b:** Trigger sync actions (reset, retry) | DB |

### Cron Endpoints (K-165b)

| Method | Endpoint | Description | Schedule |
|--------|----------|-------------|----------|
| GET | `/api/cron/sync-completed-gws` | **K-165b:** Auto-sync all completed GWs | Every 2 hours |

**Note:** Cron endpoints are called by Railway cron scheduler, not by frontend.

---

## 📊 Data Source Legend

| Source | Meaning | When Used |
|--------|---------|-----------|
| **K-108c** | Team totals calculation | Team scores (single source of truth) |
| **DB** | PostgreSQL database | Cached/historical data |
| **FPL API** | Official FPL API | Live/current data |
| **DB (completed)** | Database for completed GWs | GW has finished |
| **K-108c (live)** | K-108c for live GWs | Real-time accurate scores |
| **DB + FPL API** | Both sources combined | Mixed data needs |
| **Static** | Hardcoded/computed | No external data |

---

## 🧮 K-108c Score Calculation System

**What is K-108c?**

K-108c is our single source of truth for all team score calculations. Implemented in v3.6.2 - v3.7.0, it provides 100% accurate scores that match FPL official totals.

**How it works:**

1. **Player Points** (K-108): Calculated and stored in `player_gameweek_stats.calculated_points`
   - Base points (goals, assists, clean sheets, etc.)
   - Bonus points (official or provisional)
   - All deductions (yellow cards, red cards, own goals, penalties missed)

2. **Team Totals** (K-108c): Calculated by `calculateTeamGameweekScore()` function
   - Starting XI total (11 players × points)
   - Captain bonus (base points × multiplier: 2x or 3x)
   - Bench boost total (if active: bench players' points)
   - Auto-substitutions (formation-valid bench → XI swaps)
   - Transfer cost deductions
   - **Net total** = gross total - transfer cost

3. **Single Calculation**: Each score calculated once, used everywhere
   - No more conflicting calculations between endpoints
   - Captain, chips, auto-subs all calculated in one place
   - Consistent across My Team, Rivals, Stats, Standings

**Endpoints using K-108c:**
- ✅ My Team stat boxes (`/api/gw/[gw]/team/[teamId]`)
- ✅ My Team info (`/api/team/[teamId]/info`)
- ✅ My Team history (`/api/team/[teamId]/history`)
- ✅ My Team pitch view (`/api/team/[teamId]/gameweek/[gw]`)
- ✅ Rivals fixtures (`/api/league/[id]/fixtures/[gw]`)
- ✅ Stats GW rankings (`/api/league/[id]/stats/gameweek/[gw]/rankings`)
- ✅ Stats GW winners (`/api/league/[id]/stats/gameweek/[gw]`)
- ✅ Stats Season best/worst (`/api/league/[id]/stats/season`)
- ✅ League standings (`/api/league/[id]/stats`)

**Benefits:**
- 100% accuracy - matches FPL official totals
- Complete consistency - all features show same scores
- Single source of truth - no calculation discrepancies
- Better performance - parallel calculations where needed

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

**Data Source Logic (K-108c):**
- `status === 'completed'` → Uses `manager_gw_history` for scores from DB
- `status === 'in_progress'` → Uses K-108c (`calculateTeamGameweekScore`) for live scores
- `status === 'upcoming'` → Returns 0-0 scores

**Score Calculation:**
- All fixture scores calculated using K-108c single source of truth
- Parallel calculation for all managers in fixtures (typically 10-20 teams)
- 100% accurate, matches FPL official totals

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

**Data Source Logic (K-108c):**
- Completed GW → Database (K-27 tables)
- Live GW → K-108c parallel calculation

---

### GET /api/league/[id]/stats/gameweek/[gw]/rankings

Returns gameweek points rankings for all managers in the league, sorted by points scored.

**Parameters:**
- `id` (path) - League ID
- `gw` (path) - Gameweek number (1-38)

**Response:**
```json
{
  "event": 17,
  "rankings": [
    {
      "rank": 1,
      "entry_id": 123,
      "player_name": "John Doe",
      "team_name": "My Team",
      "points": 111
    },
    {
      "rank": 2,
      "entry_id": 456,
      "player_name": "Jane Smith",
      "team_name": "Team Name",
      "points": 104
    }
  ],
  "total_managers": 20
}
```

**Features:**
- Rankings based purely on GW points (not H2H results)
- Handles ties correctly - managers with equal points get the same rank
- Ordered by points DESC

**Score Calculation (K-108c):**
- All manager scores calculated in parallel using `calculateTeamGameweekScore()`
- Works for both completed and live gameweeks
- 100% accurate, matches FPL official totals

**Used By:**
- GW Points Leaders card (top 3)
- GW Points Modal (user's rank and stats)
- GW Rankings Modal (full league rankings)

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

### GET /api/team/[teamId]/info

Returns team overview statistics for a specific gameweek (added v3.0.6: effectiveValue).

**Parameters:**
- `teamId` (path) - Entry ID
- `gw` (query, optional) - Gameweek number (defaults to current GW)

**Response:**
```json
{
  "overallPoints": 1245,
  "overallRank": 123456,
  "teamValue": 1025,
  "bank": 5,
  "effectiveValue": 1015,
  "totalPlayers": 9000000,
  "gwPoints": 65,
  "gwRank": 234567,
  "gwTransfers": {
    "count": 1,
    "cost": 0
  },
  "averagePoints": 52,
  "highestPoints": 102
}
```

**Fields:**
- `effectiveValue` - Actual liquidation value (sum of all player selling prices + bank)
- `teamValue` - Total current value of all players
- `bank` - Cash in bank
- Live GW points calculated using `calculateManagerLiveScore()`

**Data Source:**
- FPL API for team info, history, and picks
- Uses live score calculator for accurate GW points

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

### GET /api/team/[teamId]/gw-rank-stats

Returns gameweek rank statistics for a team.

**Parameters:**
- `teamId` (path) - Entry ID
- `leagueId` (query, optional) - League ID for context

**Response:**
```json
{
  "currentRank": 123456,
  "topPercent": 1.4,
  "bestRank": 50000,
  "worstRank": 500000,
  "averageRank": 250000,
  "topMillionCount": 12
}
```

**Data Source:**
- FPL API for manager history

**Used By:**
- GW Rank Modal (v3.4.0)

---

### GET /api/team/[teamId]/transfer-stats

Returns transfer statistics for a team.

**Parameters:**
- `teamId` (path) - Entry ID
- `leagueId` (query, optional) - League ID for context

**Response:**
```json
{
  "gwTransfers": 2,
  "gwHits": 4,
  "seasonTransfers": 25,
  "seasonHits": 12,
  "freeTransfersAvailable": 1,
  "chipsUsed": ["bboost", "3xc"]
}
```

**Data Source:**
- FPL API for manager info, history, and picks

**Used By:**
- Transfers Modal (v3.4.0)

---

### GET /api/team/[teamId]/history

Returns manager gameweek history.

**Parameters:**
- `teamId` (path) - Entry ID

**Response:**
```json
{
  "current": [
    {
      "event": 16,
      "points": 65,
      "overall_rank": 123456,
      "rank": 234567,
      "event_transfers": 1,
      "event_transfers_cost": 0
    }
  ]
}
```

**Data Source:**
- FPL API

**Used By:**
- GW Points Modal (v3.3.0)

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

## ❌ Error Responses (K-61)

**All API endpoints return standardized FPLError objects when errors occur.**

### FPLError Format

```typescript
{
  error: {
    type: string,        // Error type identifier
    message: string,     // User-friendly error message
    icon: string,        // Visual indicator (emoji)
    retryable: boolean   // Whether the error can be retried
  }
}
```

### Error Types

| Type | HTTP Code | Message | Retryable |
|------|-----------|---------|-----------|
| `fpl_updating` | 503 | "⏳ FPL is updating. Please try again in a few minutes." | Yes |
| `invalid_league` | 404 | "❌ League not found. Please check the ID." | No |
| `classic_league` | 400 | "⚠️ This is a Classic league. Only H2H leagues are supported." | No |
| `rate_limited` | 429 | "⏱️ Too many requests. Please wait a moment." | Yes |
| `network_error` | 500 | "🌐 Network error. Please check your connection." | Yes |
| `sync_stuck` | 200 | "🔄 Sync appears stuck. Try Force Reset in Settings." | No |
| `timeout` | 500 | "⏰ Request timed out. FPL may be slow - try again." | Yes |
| `unknown` | 500 | "❌ Unable to load league. Please try again." | Yes |

### Example Error Response

**Request:** `GET /api/league/123456`

**Response (503):**
```json
{
  "error": {
    "type": "fpl_updating",
    "message": "FPL is updating. Please try again in a few minutes.",
    "icon": "⏳",
    "retryable": true
  }
}
```

### Endpoints Using FPLError

- `GET /api/league/[id]` - Returns error objects for all failures
- `POST /api/league/[id]/sync` - Returns error objects for sync failures
- `GET /api/league/[id]/sync` - Returns `sync_stuck` error when applicable

### Client-Side Handling

```typescript
const response = await fetch('/api/league/123456');
const data = await response.json();

if (data.error) {
  // Display error with icon and message
  showError(data.error.icon, data.error.message);

  // Show retry button if retryable
  if (data.error.retryable) {
    showRetryButton();
  }
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

## 🔄 K-165b Sync Endpoints

### GET /api/cron/sync-completed-gws

**Purpose:** Scheduled cron endpoint that auto-syncs all completed gameweeks for all leagues.

**Schedule:** Every 2 hours (configured in Railway dashboard)

**Access:** Called by Railway cron scheduler (not frontend)

**What it does:**
1. Resets any stuck syncs (in_progress >10 minutes)
2. Scans all tracked leagues from database
3. Identifies completed GWs that passed 10-hour safety buffer
4. Skips GWs already synced or currently syncing
5. Triggers `syncLeagueGWWithRetry()` for each GW needing sync
6. Returns summary of sync results

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-01-02T12:00:00.000Z",
  "duration_ms": 15234,
  "stats": {
    "leagues_checked": 10,
    "gameweeks_checked": 19,
    "synced": 2,
    "skipped": 188,
    "failed": 0,
    "stuck_syncs_reset": 0
  },
  "results": [
    {
      "league_id": 804742,
      "gameweek": 19,
      "status": "synced"
    }
  ]
}
```

**Configuration:**
- Railway Cron Schedule: `0 */2 * * *` (every 2 hours)
- Max Duration: 300 seconds (5 minutes)
- Timeout handling: Automatic reset for stuck syncs

---

### GET /api/admin/sync-status

**Purpose:** Admin dashboard to monitor sync status for all leagues/gameweeks.

**Access:** Admin panel (no authentication currently)

**Query Parameters:**
- `action=reset_stuck` - Reset syncs stuck in "in_progress" for >10 minutes

**Response:**
```json
{
  "summary": {
    "total_records": 190,
    "by_status": {
      "pending": 0,
      "in_progress": 1,
      "completed": 187,
      "failed": 2
    },
    "stuck_syncs": 0
  },
  "stuck": [],
  "failed": [
    {
      "league_id": 804742,
      "gameweek": 18,
      "retry_count": 3,
      "error_message": "Failed to fetch FPL API",
      "updated_at": "2026-01-02T10:30:00.000Z"
    }
  ],
  "pending": [],
  "recent": [
    {
      "league_id": 804742,
      "gameweek": 19,
      "status": "completed",
      "started_at": "2026-01-02T12:00:00.000Z",
      "completed_at": "2026-01-02T12:00:15.000Z",
      "retry_count": 0
    }
  ],
  "league_stats": [
    {
      "league_id": 804742,
      "total_syncs": 19,
      "completed": 18,
      "failed": 1,
      "in_progress": 0,
      "pending": 0,
      "success_rate": 95,
      "last_sync": "2026-01-02T12:00:15.000Z"
    }
  ]
}
```

---

### POST /api/admin/sync-status

**Purpose:** Trigger admin actions on sync records.

**Request Body:**
```json
{
  "action": "reset_specific",
  "league_id": 804742,
  "gameweek": 18
}
```

**Actions:**
- `reset_stuck` - Reset all syncs stuck >10 minutes to "pending"
- `reset_specific` - Reset specific league/GW to "pending"
- `mark_completed` - Manually mark specific league/GW as "completed"

**Response:**
```json
{
  "success": true,
  "message": "Reset sync for league 804742 GW18 to pending"
}
```

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
│   ├── sync-status/route.ts (K-165b)
│   └── track/route.ts
├── cron/
│   └── sync-completed-gws/route.ts (K-165b)
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
│   │   ├── gameweek/[gw]/
│   │   │   ├── route.ts
│   │   │   └── rankings/route.ts
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

**Total Endpoints:** 34 (including 3 K-165b endpoints)
