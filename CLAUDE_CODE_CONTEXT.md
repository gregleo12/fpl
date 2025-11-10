# FPL H2H Analytics - Project Context

Last Updated: 2025-11-10

## Critical Information
- **Deployment**: Railway (auto-deploys from GitHub main)
- **Database**: PostgreSQL on Railway
  - Connection pool: max 10, idle timeout 30s
  - Graceful shutdown on SIGTERM/SIGINT
- **Domain**: dedoume.pronos.xyz
- **Test League**: #804742 (Dedoume FPL 9th edition, 20 teams)

## Tech Stack
- Next.js 14 + TypeScript
- PostgreSQL (via pg library with connection pooling)
- Railway for hosting
- iOS PWA support

## Architecture

### Key Files
- `/src/lib/fpl-calculations.ts` - Auto-subs + bonus calculations (CORE LOGIC)
- `/src/lib/liveMatch.ts` - Live match data processing
- `/src/app/api/league/[id]/route.ts` - Main league API
- `/src/app/api/league/[id]/fixtures/[gw]/route.ts` - Fixtures API with live scores
- `/src/app/api/league/[id]/stats/route.ts` - Stats/rankings API with live calculations
- `/src/app/api/league/[id]/stats/gameweek/[gw]/route.ts` - Gameweek stats API (captain picks, chips, hits, differentials)
- `/src/components/Fixtures/LiveMatchModal.tsx` - Live match UI
- `/src/components/Fixtures/FixturesTab.tsx` - Fixture cards
- `/src/components/Stats/StatsHub.tsx` - Main Stats Hub component with GW selector
- `/src/components/Stats/sections/` - Individual stat sections (CaptainPicks, ChipsPlayed, HitsTaken, GameweekWinners, Differentials)

### Data Flow

#### Fixtures & Live Matches
1. FPL API → League/Fixtures routes
2. Process with `fpl-calculations.ts` (auto-subs + bonus)
3. Store in PostgreSQL
4. Display in UI (fixture cards + modal)

#### Stats Hub (Two-Stage Loading)
1. **Stage 1**: `/api/league/[id]/stats` → Get current GW info (maxGW, activeGW)
2. **Stage 2**: `/api/league/[id]/stats/gameweek/[gw]` → Get detailed stats
   - Database: Captain picks, chip usage, match scores
   - FPL API: Live player data, picks, transfer costs
   - Aggregates: Across all league managers for comprehensive stats

## Known Issues & Solutions

### ✅ FIXED: iOS Scroll Bug (v1.14.30)
- **Problem**: Couldn't scroll up in modals on mobile
- **Root Cause**: Pull-to-refresh hook blocking touch events
- **Solution**: Added modal detection to skip preventDefault
- **Never Touch**: `/src/hooks/usePullToRefresh.ts` without testing

### ✅ FIXED: Database 502 Errors (v1.5.18)
- **Problem**: Connection timeouts after deployments
- **Root Cause**: No connection pool limits, no graceful shutdown
- **Solution**: Added pool config (max: 10) + SIGTERM handlers
- **Prevention**: Always use connection pooling

### ✅ FIXED: Auto-Substitution (v1.6.0-1.7.9)
- **Problem**: Needed automatic substitution for non-playing players
- **Solution**: Implemented in `fpl-calculations.ts` → `applyAutoSubstitutions()`
- **Rules**:
  - Only for non-Bench Boost teams
  - Process bench in order (1st → 2nd → 3rd)
  - Skip non-playing bench (0 minutes)
  - Maintain formation (3+ DEF, 2+ MID, 1+ FWD)
- **Status**: ✅ Working in fixtures API, live match modal, and rankings

### ✅ FIXED: Provisional Bonus Calculation (v1.9.8)
- **Problem**: Could not calculate provisional bonus accurately with only user's squad data
- **Root Cause**: Need BPS data for ALL 22 players in each match, not just user's 15 players
- **Solution**:
  - Fetch complete fixtures data from FPL API with all players' BPS
  - Compare each user's player against ALL 22 players in their specific fixture
  - Award bonus only if player is in top 3 BPS of complete match
- **Implementation**: `calculateProvisionalBonusFromFixtures()` in `fpl-calculations.ts`
- **Location**: `/src/app/api/league/[id]/fixtures/[gw]/route.ts`
- **Key Rule**: Always compare against complete match data (all 22 players), never just squad data

### ✅ FIXED: Live Rankings Not Updating (v1.7.8)
- **Problem**: Rankings in LIVE mode didn't reflect live fixture scores
- **Root Cause**: Stats API using `entry_history.points` which doesn't include auto-substitutions
- **Solution**: Added `calculateLiveScoreWithAutoSubs` helper to stats API
- **Location**: `/src/app/api/league/[id]/stats/route.ts`

## Deployment Process

### Standard Deploy
```bash
npm run build              # Test locally
git add .
git commit -m "Description"
git push                   # Triggers Railway auto-deploy
npm version patch          # Bump version
git push --tags
```

### Emergency Rollback
```bash
git log --online -10      # Find last good commit
git revert <commit-hash>   # Or git reset --hard
git push --force           # Deploy rollback
```

## Testing Checklist

### Before Every Deploy
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] Console logs cleaned up (or kept for debugging)

### Mobile Testing (iOS Simulator)
- [ ] Modal scrolling works (up AND down)
- [ ] Pull-to-refresh doesn't break modals
- [ ] Auto-sub indicators show correctly

### Live Match Testing
- [ ] Fixture card scores match modal scores
- [ ] Auto-subs calculate correctly
- [ ] Bonus only for top 3 BPS per match
- [ ] Differential totals = sum of differential players
- [ ] Bench Boost teams don't get auto-subs

## Common Mistakes (Learn from Past)

### ❌ Duplicate Calculation Logic
- **Wrong**: Calculating points differently in fixture cards vs modal
- **Right**: One source of truth in `fpl-calculations.ts`

### ❌ Forgetting Fixture Grouping
- **Wrong**: Giving bonus to top 3 BPS across all players
- **Right**: Top 3 BPS PER MATCH (group by fixtureId first)

### ❌ Applying Auto-Subs to Bench Boost
- **Wrong**: Running auto-subs when BB chip active
- **Right**: Check `isBenchBoost` before applying subs

### ❌ Not Testing on Mobile
- **Wrong**: Only testing in desktop browser
- **Right**: Always test in iOS simulator for touch/scroll issues

## When Starting New Session

1. **Read this file first**
2. **Check recent commits**: `git log --oneline -10`
3. **Check Railway logs** if user reports 502 errors
4. **Ask user**: "What were we working on last? Any known issues?"

## Version History

- v1.10.0 - Replaced Awards with comprehensive Stats Hub
  - 5 gameweek statistics sections (Captain Picks, Chips Played, Hits Taken, Winners, Differentials)
  - Real-time data aggregation from FPL API and database
  - Differentials tracking (<25% ownership, 7+ points)
  - GW selector with live badge for current gameweek
  - Two-stage loading: Stats API → Gameweek Stats API
- v1.9.8 - Fixed provisional bonus calculation with complete fixture data
- v1.9.7 - Re-implemented provisional bonus for live gameweeks
- v1.9.6 - Fixed modal header layout (centered, balanced)
- v1.9.5 - Improved Team Fixtures badge positioning
- v1.14.30 - Fixed iOS scroll (pull-to-refresh modal detection)
- v1.5.18 - Fixed database connection pooling
- v1.6.0 - Implemented auto-substitution
- v1.7.0 - Added provisional bonus (needs bug fixes)
- v1.7.3 - Changed bonus display format (underlined total)
- v1.7.4 - Fixed double-counting of official bonus
- v1.7.5 - Added debug logging for bonus calculation
- v1.7.6 - Removed incorrect provisional bonus for differentials
- v1.7.7 - Removed all provisional bonus calculations
- v1.7.8 - Fixed live rankings to calculate with auto-substitutions
- v1.7.9 - Removed debug logging, added context files

## Questions to Ask When Unsure

1. "Should I check Railway logs for errors?"
2. "Is this change affecting mobile scroll behavior?"
3. "Am I creating duplicate calculation logic?"
4. "Did I test this with Bench Boost active?"
5. "Are bonus calculations grouped by fixture?"
