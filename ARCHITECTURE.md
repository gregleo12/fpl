# RivalFPL - Architecture Reference

**Last Updated:** December 16, 2025
**Framework:** Next.js 14 (App Router)
**Language:** TypeScript

---

## 📁 Project Structure

```
fpl/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   ├── dashboard/          # Main dashboard page
│   │   ├── league/[leagueId]/  # League views
│   │   ├── settings/           # Settings page
│   │   ├── setup/              # Initial setup flow
│   │   ├── admin/              # Admin dashboard
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   │
│   ├── components/             # React components
│   │   ├── Dashboard/          # Dashboard components
│   │   ├── Fixtures/           # Fixtures & match cards
│   │   ├── Layout/             # Header, navigation
│   │   ├── League/             # League standings
│   │   ├── MyTeam/             # My Team view
│   │   ├── Players/            # Players tab
│   │   ├── Stats/              # Stats Hub
│   │   ├── Settings/           # Settings components
│   │   └── SetupFlow/          # Setup wizard
│   │
│   ├── lib/                    # Shared utilities
│   │   ├── db.ts               # Database connection
│   │   ├── fpl-api.ts          # FPL API client
│   │   ├── fpl-calculations.ts # Auto-subs, bonus calc
│   │   ├── scoreCalculator.ts  # Live score calculations
│   │   ├── analytics.ts        # Analytics tracking
│   │   └── nameUtils.ts        # Name formatting
│   │
│   ├── hooks/                  # Custom React hooks
│   │   └── usePullToRefresh.ts # Mobile pull-to-refresh
│   │
│   ├── db/                     # Database files
│   │   └── migrations/         # SQL migration files
│   │
│   └── scripts/                # Utility scripts
│       ├── sync-*.ts           # Data sync scripts
│       ├── run-*-migration.ts  # Migration runners
│       └── verify-*.ts         # Data verification
│
├── public/                     # Static assets
│   └── jerseys/                # Team jersey images
│
├── CLAUDE.md                   # Claude Code context (this file links to)
├── DATABASE.md                 # Database reference
├── ENDPOINTS.md                # API endpoints
├── ARCHITECTURE.md             # This file
├── DEPLOYMENT.md               # Deployment guide
├── VERSION_HISTORY.md          # Changelog index
└── package.json
```

---

## 🔄 Data Flow

### Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   FPL API       │────▶│   Database       │────▶│   Frontend      │
│   (External)    │     │   (PostgreSQL)   │     │   (Next.js)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        │                        │                        │
    Sync Scripts            API Routes              Components
    (background)           (server-side)           (client-side)
```

### Data Flow for Completed Gameweeks

```
1. Sync Scripts run after GW completes
   └── Fetch from FPL API
   └── Store in K-27 tables (manager_picks, manager_gw_history, etc.)

2. User opens app
   └── Frontend calls API route
   └── API route checks GW status
   └── status === 'completed' → Query database
   └── Return cached data (fast!)
```

### Data Flow for Live Gameweeks

```
1. User opens app during live GW
   └── Frontend calls API route
   └── API route checks GW status
   └── status === 'in_progress' → Call FPL API
   └── Return live data (real-time!)
```

---

## 🧩 Component Hierarchy

### Main Layout

```
App (layout.tsx)
├── Header
│   └── Navigation (tabs)
│
└── Page Content (based on route)
    ├── MyTeam/           # Default home
    ├── Rankings/         # League standings
    ├── Fixtures/         # H2H matches
    ├── Stats/            # Stats Hub
    └── Settings/         # User settings
```

### Fixtures Tab

```
FixturesTab
├── TabToggle (H2H Matches / Team Fixtures)
├── GameweekSelector
└── MatchList
    └── FixtureCard (×10 for 20-team league)
        └── onClick → LiveMatchModal
            ├── Score Header
            ├── Captains Section
            ├── Differential Players
            └── Full Team Comparison
```

### Stats Hub

```
StatsHub
├── GameweekView / SeasonView toggle
├── GameweekSelector
└── Sections
    ├── CaptainPicks
    ├── ChipsPlayed
    ├── HitsTaken
    ├── PointsOnBench
    ├── GameweekWinners
    └── Differentials
```

### My Team

```
MyTeamTab
├── GameweekSelector
├── StatBoxes (rank, points, transfers)
├── PitchView
│   ├── Formation rows (GK, DEF, MID, FWD)
│   │   └── PlayerCard (×11)
│   └── BenchRow
│       └── PlayerCard (×4)
└── GWTransfers
```

---

## 📂 Key Files

### Core Logic

| File | Purpose |
|------|---------|
| `src/lib/db.ts` | Database connection with pooling |
| `src/lib/fpl-api.ts` | FPL API client functions |
| `src/lib/fpl-calculations.ts` | Auto-subs, bonus point calculations |
| `src/lib/scoreCalculator.ts` | Live and historical score calculations |

### Important API Routes

| File | Purpose |
|------|---------|
| `src/app/api/league/[id]/route.ts` | Main league data |
| `src/app/api/league/[id]/fixtures/[gw]/route.ts` | H2H fixtures |
| `src/app/api/league/[id]/stats/gameweek/[gw]/route.ts` | GW statistics |
| `src/app/api/players/route.ts` | All players |

### Key Components

| File | Purpose |
|------|---------|
| `src/components/Fixtures/FixtureCard.tsx` | H2H match card |
| `src/components/Fixtures/LiveMatchModal.tsx` | Match detail modal |
| `src/components/MyTeam/MyTeamTab.tsx` | My Team main view |
| `src/components/Players/PlayersTab.tsx` | Players list |
| `src/components/Stats/StatsHub.tsx` | Stats Hub container |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Next.js 14 (App Router) |
| Styling | CSS Modules |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Railway) |
| Hosting | Railway |
| Language | TypeScript |

---

## 🎨 Design System

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| FPL Purple | `#37003c` | Primary background |
| Neon Green | `#00ff87` | Accents, positive |
| Pink | `#ff2882` | Highlights |
| Red | `#ff0000` | Negative, errors |
| White | `#ffffff` | Text |

### Position Colors

| Position | Color |
|----------|-------|
| GKP | Yellow |
| DEF | Green |
| MID | Blue |
| FWD | Red |

---

## 📱 Mobile Considerations

- **Mobile-first design** - All components responsive
- **PWA support** - Installable on iOS/Android
- **Touch-friendly** - Large tap targets, swipe gestures
- **Pull-to-refresh** - Custom hook for mobile refresh

### Known Mobile Issues

- iOS scroll in modals - Fixed with `usePullToRefresh` hook
- Chrome mobile specific issues - Test on actual devices

---

## 🔒 Critical Patterns

### API Route Pattern

Every API route that queries the database MUST include:

```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

### Database Query Pattern

Always use connection pooling:

```typescript
import { getDatabase } from '@/lib/db';

export async function GET() {
  const db = await getDatabase();
  const result = await db.query('SELECT ...');
  // Connection automatically returned to pool
}
```

### Data Source Selection Pattern

```typescript
if (status === 'completed') {
  // Use database (K-27 cache)
  return fetchFromDatabase(db, params);
} else {
  // Use FPL API
  return fetchFromFPLAPI(params);
}
```

---

## 📝 Adding New Features

### New Component

1. Create in appropriate `src/components/` directory
2. Use CSS Modules for styling
3. Follow existing component patterns
4. Add to relevant page/parent component

### New API Route

1. Create in `src/app/api/` with proper folder structure
2. Add `export const dynamic = 'force-dynamic'`
3. Document in ENDPOINTS.md
4. Handle errors with try/catch

### New Database Table

1. Create migration in `src/db/migrations/`
2. Create sync script in `src/scripts/`
3. Add npm scripts to package.json
4. Document in DATABASE.md

---

**Questions?** Check existing implementations for patterns and examples.
