# FPL H2H Analytics - Project Context

Last Updated: 2025-12-04

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
- `/src/components/SetupFlow/LeagueInput.tsx` - Simple league ID entry (proven approach)

### Data Flow

#### Fixtures & Live Matches
1. FPL API → League/Fixtures routes
2. Process with `fpl-calculations.ts` (auto-subs + bonus)
3. Store in PostgreSQL
4. Display in UI (fixture cards + modal)

**Note**: During live gameweeks, H2H fixture scores include provisional bonus calculated from complete fixture BPS data (all 22 players per match).

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
- **Problem**: Old logic (v1.9.7) only compared user's 15 players, not all 22 in match
- **Root Cause**: Didn't fetch complete fixtures data with ALL players' BPS per match
- **Solution**: Created `calculateProvisionalBonusFromFixtures()` that fetches fixtures data
- **How It Works**:
  - Fetches fixtures from FPL API during live gameweeks
  - Extracts ALL players' BPS for each match (not just user's squad)
  - Groups by fixtureId, sorts by BPS descending
  - Awards 3/2/1 bonus to top 3 BPS per match
- **Location**: `/src/lib/fpl-calculations.ts` and `/src/app/api/league/[id]/fixtures/[gw]/route.ts`
- **Testing**: Verify against official FPL fixture details modal during live gameweeks
- **Never Do**: Calculate bonus without complete fixture data (all 22 players)

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

## Version Numbering Rules

ALWAYS follow semantic versioning (X.Y.Z format):

### Major Version (X.0.0) - Breaking Changes
Examples:
- Complete redesign of a core feature
- Database schema changes
- API endpoint changes that break existing calls
- Removing features entirely

### Minor Version (0.X.0) - New Features
Examples:
- Adding new tabs/sections (Stats Hub, Team Fixtures)
- New API endpoints
- New components with significant functionality
- Multi-component features

### Patch Version (0.0.X) - Bug Fixes & Small Updates
Examples:
- Fixing bugs (provisional bonus calculation)
- UI tweaks (button positioning, colors)
- Text changes
- Small improvements to existing features
- Performance optimizations

### Version Bump Workflow

ALWAYS include version in commit messages:
```bash
# 1. Make your changes
# 2. Determine version type (major/minor/patch)
# 3. Bump version
npm version patch  # or minor, or major
# 4. Commit with version in message
git commit -m "Fix navigation bug (v1.11.1)"
# 5. Push
git push
```

### Recent Version History Examples:
- v1.11.0 - Added Season Stats (MINOR - new feature)
- v1.10.0 - Added Stats Hub (MINOR - new feature)
- v1.9.8 - Fixed provisional bonus (PATCH - bug fix)
- v1.9.7 - Re-implemented bonus (PATCH - bug fix)
- v1.8.0 - Added Team Fixtures tab (MINOR - new feature)

### Commit Message Format:
Always use: "[Description] (vX.Y.Z)"

Good examples:
✅ "Add Season Stats with leaderboards (v1.11.0)"
✅ "Fix missing completedGameweeks field (v1.11.1)"
✅ "Limit GW navigation to current GW (v1.11.2)"

Bad examples:
❌ "Fix bug" (no version)
❌ "Update files" (vague + no version)
❌ "v1.11.0" (no description)

### Before EVERY Push:
1. ✅ Determine if major/minor/patch
2. ✅ Run: npm version [type] --no-git-tag-version
3. ✅ Verify version in package.json
4. ✅ Include version in commit message
5. ✅ Update CLAUDE_CODE_CONTEXT.md version history
6. ✅ Push to GitHub

NEVER push without bumping version and documenting it!

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

## Abandoned Features (Lessons Learned)

### ❌ ABANDONED: FPL OAuth Login (v1.26.0-v1.26.2, Dec 4 2025)

**What We Tried:**
- Direct FPL authentication via server-side API calls
- POST credentials to `https://users.premierleague.com/accounts/login/`
- Extract session cookies for authenticated API access
- Auto-detect user's team in H2H leagues

**The Problem:**
```
[FPL Login] Response status: 302
[FPL Login] All Set-Cookie headers: []
```
- FPL returns 302 redirect to holding page
- **No cookies in response** (authentication completely blocked)
- Anti-bot protection detects server requests

**Root Causes:**
1. **Server-side auth blocked** - FPL requires real browser (WebView)
2. **Anti-bot protection** - Server requests get redirected to holding page
3. **No API-based auth** - Mobile apps use embedded browsers, not API calls
4. **GitHub evidence** - FPL-Email-Bot marked auth as "obsolete" with note: "FPL no longer requires authentication"

**Technical Details:**
- Tried `redirect: 'manual'` to inspect 302 response
- Added User-Agent, Referer, Origin headers
- Correct redirect_uri: `https://fantasy.premierleague.com/a/login`
- Status 302 is expected but **should include cookies** - it doesn't

**Why League ID Entry Works:**
- Public API endpoints don't require authentication
- `/api/leagues-h2h/{id}/standings/` is public
- `/api/entry/{id}/history/` is public
- Simple, reliable, proven approach

**The Solution:**
- **Reverted to v1.25.3** setup flow (League ID entry only)
- Deleted all FPL auth code (cleaner codebase)
- Documented lessons learned for future

**Alternatives Considered (Not Pursued):**
1. **Browser Extension** - Users install extension to extract cookies
2. **Manual Cookie Entry** - Users copy/paste session cookie from DevTools
3. **Puppeteer/Playwright** - Headless browser (resource intensive, might get blocked)
4. **Official Partnership** - Request API access from FPL (unlikely for small projects)

**Key Lesson:**
> When a simple public API approach works perfectly (League ID entry), don't overcomplicate with authentication that gets blocked. FPL's public endpoints provide everything we need.

**Files Removed:**
- `/src/app/api/auth/fpl-login/route.ts`
- `/src/app/api/auth/fpl-team-in-league/route.ts`
- `/src/app/api/auth/logout/route.ts`
- `/src/components/auth/FPLLoginModal.tsx`
- `/src/components/auth/FPLLoginModal.module.css`
- `/src/app/setup/select-league/page.tsx`
- `/src/app/setup/select-league/select-league.module.css`

**Result:** Clean, simple, maintainable codebase with proven League ID entry flow.

---

## When Starting New Session

1. **Read this file first**
2. **Check recent commits**: `git log --oneline -10`
3. **Check Railway logs** if user reports 502 errors
4. **Ask user**: "What were we working on last? Any known issues?"

## Stats Hub Complete Journey (v1.11.9 - v1.14.0)

### Overview
Stats Hub underwent 6 versions of iterative improvements from Nov 13-18, 2025 to fix data accuracy issues, improve UX, and add complete feature set. Now production-ready with season leaderboards and clickable modals.

---

### v1.11.9: Initial Chips Data Fix (Nov 13)

**Issue:** Chips data showing incorrect/missing information in gameweek stats

**Root Cause:** Database h2h_matches had incomplete chip data

**Changes:**
- File: `/src/app/api/league/[id]/stats/gameweek/route.ts`
- Replaced database query with direct FPL API fetch
- Fetched chip history from `/api/entry/{id}/history/` for each manager
- Fixed chip name mapping: bboost→BB, 3xc→TC, freehit→FH, wildcard→WC

**Lesson:** Database may have incomplete data. Always verify critical data with FPL API.

---

### v1.11.10-11: Boundary Fixes + Deployment (Nov 13)

**Issues:**
1. Stats Hub showing GW13 data when only 11 gameweeks completed
2. Inconsistent gameweek boundaries across components

**Changes:**
- Added proper boundary checks in GameweekView
- Fixed API to only return completed gameweeks
- Ensured GW selector doesn't exceed current gameweek

**Lesson:** Always validate gameweek boundaries before rendering stats.

---

### v1.11.12: Unknown Manager Names Fix (Nov 13)

**Issue:** Some managers showing as "Unknown" in Stats Hub

**Root Cause:** Not all managers in h2h_matches were in managers table (e.g., managers who joined mid-season or left early)

**Changes:**
- File: `/src/app/api/league/[id]/stats/gameweek/route.ts`
- Added UNION query to get ALL unique managers from h2h_matches
- Ensures complete manager list regardless of managers table

```sql
SELECT DISTINCT entry_id FROM (
  SELECT entry_1_id as entry_id FROM h2h_matches WHERE league_id = $1
  UNION
  SELECT entry_2_id as entry_id FROM h2h_matches WHERE league_id = $1
) as all_entries
```

**Lesson:** h2h_matches is the source of truth for active league participants.

---

### v1.11.13: Captain Points Per GW Fix (Nov 13)

**Issue:** Captain points showing ~34 pts instead of expected 150-250 range

**Root Cause:** Not accounting for captain multiplier in calculation

**Changes:**
- File: `/src/app/api/league/[id]/stats/gameweek/route.ts`
- Fetch picks and live data from FPL API in parallel
- Identify captain (multiplier >= 2)
- Calculate: base_points × multiplier (2 for captain, 3 for triple captain)

```typescript
const captain = picksData.picks.find(p => p.multiplier >= 2);
const livePlayer = liveData.elements.find(e => e.id === captain.element);
const captainPoints = livePlayer.stats.total_points × captain.multiplier;
```

**Lesson:** Use FPL API for accurate captain calculations with proper multiplier handling.

---

### v1.12.0: UX Improvements (Nov 13)

**Focus:** Polish and professional appearance

**Changes:**
- Renamed "Chips Usage" → "Chip Performance"
- Improved visual hierarchy
- Consistent section spacing
- Mobile-optimized layouts
- Better empty state messages

**Impact:** More professional and user-friendly interface

---

### v1.13.0: Complete Feature Set - Season Stats (Nov 13)

**Major Release:** Added comprehensive season-long statistics with 4 leaderboards

#### 1. Chip Performance - Two Leaderboards

**File:** `/src/app/api/league/[id]/stats/season/route.ts`

Created `calculateChipPerformance()` function returning:
- `chipsPlayed`: Managers who used chips (from FPL API)
- `chipsFaced`: Managers whose opponents used chips against them (from database)

**Implementation - Chips Played:**
```typescript
const chipsPromises = managers.map(async (manager) => {
  const response = await fetch(
    `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/history/`
  );
  const data = await response.json();
  const chips = (data.chips || []).filter(chip =>
    gameweeks.includes(chip.event)
  );

  return {
    entry_id: manager.entry_id,
    chip_count: chips.length,
    chips_detail: chips.map(c =>
      `${CHIP_NAMES[c.name]} (GW${c.event})`
    ).join(', ')
  };
});
```

**Implementation - Chips Faced:**
```typescript
const chipsFaced = await Promise.all(managers.map(async (manager) => {
  const matches = await db.query(`
    SELECT entry_1_id, entry_2_id, active_chip_1, active_chip_2, event
    FROM h2h_matches
    WHERE league_id = $1 AND event = ANY($2)
    AND (entry_1_id = $3 OR entry_2_id = $3)
  `, [leagueId, gameweeks, manager.entry_id]);

  let opponentChips = [];
  for (const match of matches.rows) {
    // If manager is entry_1, count entry_2's chip
    if (match.entry_1_id === manager.entry_id && match.active_chip_2) {
      opponentChips.push(`${CHIP_NAMES[match.active_chip_2]} (GW${match.event})`);
    }
    // If manager is entry_2, count entry_1's chip
    if (match.entry_2_id === manager.entry_id && match.active_chip_1) {
      opponentChips.push(`${CHIP_NAMES[match.active_chip_1]} (GW${match.event})`);
    }
  }

  return {
    entry_id: manager.entry_id,
    chips_faced_count: opponentChips.length,
    chips_faced_detail: opponentChips.join(', ')
  };
}));
```

#### 2. Streaks - Historical Maximum

**File:** `/src/app/api/league/[id]/stats/season/route.ts`

**Old Approach:** Current active streaks (reset when broken)
**New Approach:** All-time maximum streaks (persist even after broken)

**Key Changes:**
- Track max winning and losing streaks separately
- Record GW range where streak occurred (e.g., "GW3 → GW9")
- ORDER BY event ASC for chronological processing

**Algorithm:**
```typescript
// Get all match results ordered chronologically
const matchesData = await db.query(`
  SELECT entry_id, event,
    CASE
      WHEN entry_1_points > entry_2_points THEN 'W'
      WHEN entry_1_points < entry_2_points THEN 'L'
      ELSE 'D'
    END as result
  FROM h2h_matches
  WHERE league_id = $1 AND event = ANY($2)
  ORDER BY entry_id, event ASC
`);

// Track max streaks
let maxWinStreak = 0;
let currentWinStreak = 0;
let winStreakStart = 0;
let winStreakEnd = 0;

for (const result of results) {
  if (result.result === 'W') {
    if (currentWinStreak === 0) {
      tempWinStart = result.event; // Mark start of new streak
    }
    currentWinStreak++;

    if (currentWinStreak > maxWinStreak) {
      maxWinStreak = currentWinStreak;
      winStreakStart = tempWinStart;
      winStreakEnd = result.event;
    }
  } else {
    currentWinStreak = 0; // Reset current, but max persists
  }
}

return {
  max_win_streak: maxWinStreak,
  win_streak_range: `GW${winStreakStart} → GW${winStreakEnd}`
};
```

#### 3. Captain Points - Season Total

**File:** `/src/app/api/league/[id]/stats/season/route.ts`

**Changes:**
- Fetch picks + live data for ALL completed gameweeks
- Parallel Promise.all for performance
- Calculate total captain points per manager across season

**Implementation:**
```typescript
const captainDataPromises = managers.map(async (manager) => {
  let totalCaptainPoints = 0;
  let gameweeksUsed = 0;

  for (const gw of gameweeks) {
    const [picksResponse, liveResponse] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${gw}/picks/`),
      fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`)
    ]);

    if (!picksResponse.ok || !liveResponse.ok) continue;

    const [picksData, liveData] = await Promise.all([
      picksResponse.json(),
      liveResponse.json()
    ]);

    const captain = picksData.picks?.find(p => p.multiplier >= 2);
    if (captain) {
      const livePlayer = liveData.elements?.find(e => e.id === captain.element);
      const basePoints = livePlayer?.stats?.total_points || 0;
      const captainPoints = basePoints * captain.multiplier;

      totalCaptainPoints += captainPoints;
      gameweeksUsed++;
    }
  }

  return {
    entry_id: manager.entry_id,
    total_captain_points: totalCaptainPoints,
    average_per_gw: gameweeksUsed > 0
      ? parseFloat((totalCaptainPoints / gameweeksUsed).toFixed(1))
      : 0
  };
});
```

#### 4. Best/Worst Gameweeks

Top 5 individual gameweek performances per manager, with toggle for best/worst.

**Files Created/Updated:**
- `/src/components/Stats/season/CaptainLeaderboard.tsx`
- `/src/components/Stats/season/ChipPerformance.tsx`
- `/src/components/Stats/season/Streaks.tsx`
- `/src/components/Stats/season/BestWorstGW.tsx`
- `/src/components/Stats/SeasonView.tsx`

---

### v1.13.1: Quick Fixes (Nov 18)

Four rapid fixes for polish and consistency

#### Fix 1: Toggle Styling Consistency

**Issue:** Toggles looked different across sections (BestWorstGW vs Streaks vs ChipPerformance)

**Files Updated:**
- `/src/components/Stats/season/Streaks.tsx`
- `/src/components/Stats/season/ChipPerformance.tsx`

**Changes:**
- Moved toggles inside `cardHeader` alongside title (not standalone)
- Changed toggle labels: "Chips Played/Faced" → "Played/Faced"
- Changed Streaks title to dynamic: "🔥 Best Streaks" / "💀 Worst Streaks"
- All components now use identical toggle structure

**Pattern:**
```tsx
<div className={styles.cardHeader}>
  <h4 className={styles.cardTitle}>{title}</h4>
  <div className={styles.toggle}>
    <button className={`${styles.toggleButton} ${active ? styles.active : ''}`}>
      Label
    </button>
  </div>
</div>
```

#### Fix 2: Chips Faced Display Bug

**Issue:** "Chips Faced" toggle showed no data despite correct API calculation

**Root Cause:** Duplicate conditional maps instead of single map with conditional fields

**Before (Broken):**
```tsx
{view === 'played' && data.chipsPlayed.map(manager => (...))}
{view === 'faced' && data.chipsFaced.map(manager => (...))}
// Two separate maps - second one never renders if data structure is slightly different
```

**After (Fixed):**
```tsx
{currentData.map(manager => (
  <div className={styles.chips}>
    {view === 'played' ? manager.chips_detail : manager.chips_faced_detail}
  </div>
))}
// Single map with conditional field access
```

**Lesson:** Use single map with conditional fields, not duplicate conditional maps

#### Fix 3: Remove Empty Chip Usage Section

**Issue:** "Historical Trends" section showing empty "Chip Usage" chart

**Changes:**
- Removed `ChipsTrend` component import from SeasonView
- Deleted entire "Historical Trends" section
- Cleaner UI without redundant empty content

#### Fix 4: Captain Points Percentage

**Issue:** Captain points showed only total (e.g., "212 pts") without context

**Goal:** Show percentage of total season points from captain (e.g., "212 PTS (24.9%)")

**Implementation:**
```typescript
// 1. Fetch total season points from league_standings
const standingsResult = await db.query(`
  SELECT entry_id, total
  FROM league_standings
  WHERE league_id = $1
`, [leagueId]);

const totalPointsMap = new Map(
  standingsResult.rows.map(row => [row.entry_id, row.total || 0])
);

// 2. Calculate percentage
const totalSeasonPoints = totalPointsMap.get(manager.entry_id) || 0;
const percentage = totalSeasonPoints > 0
  ? parseFloat((totalCaptainPoints / totalSeasonPoints * 100).toFixed(1))
  : 0;

// 3. Display with styling
<div className={styles.statValue}>
  {item.total_points}
  <span className={styles.percentage}> ({item.percentage}%)</span>
</div>
```

**CSS:**
```css
.percentage {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}
```

---

### v1.14.0: Clickable Modals with Full Rankings (Nov 18)

**Major Feature:** Click any leaderboard → View all 20 managers in modal

#### Shared Modal Component

**Files Created:**
- `/src/components/Stats/season/FullRankingModal.tsx`
- `/src/components/Stats/season/FullRankingModal.module.css`

**Features:**
- Reusable modal for all leaderboards (DRY principle)
- Smooth animations: fade in overlay + slide up modal
- Three close methods: Escape key, outside click, X button
- Body scroll prevention when modal is open
- Mobile responsive with proper sizing

**Implementation:**
```tsx
export function FullRankingModal({
  isOpen,
  onClose,
  title,
  icon,
  data,
  renderItem
}: FullRankingModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent body scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{icon} {title}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className={styles.content}>
          {data.map((item, index) => renderItem(item, index))}
        </div>
      </div>
    </div>
  );
}
```

#### Render Function Pattern

**Critical Pattern:** Define render function once, use in both card (top 5) and modal (all 20)

**Example:**
```tsx
export function CaptainLeaderboard({ data }: Props) {
  const [showModal, setShowModal] = useState(false);

  // Define render function ONCE
  const renderItem = (item, index) => (
    <div className={styles.listItem}>
      <div className={styles.rank}>{index + 1}</div>
      <div className={styles.info}>
        <div className={styles.name}>{item.player_name}</div>
        <div className={styles.meta}>{item.team_name}</div>
      </div>
      <div className={styles.stats}>
        <div className={styles.statValue}>
          {item.total_points}
          <span className={styles.percentage}> ({item.percentage}%)</span>
        </div>
        <div className={styles.statLabel}>pts</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Card preview: top 5 */}
      <div className={`${styles.card} ${styles.clickable}`}
           onClick={() => setShowModal(true)}>
        <h4>⭐ Captain Points</h4>
        <div className={styles.list}>
          {data.slice(0, 5).map((item, index) => renderItem(item, index))}
        </div>
        <div className={styles.clickHint}>Click to view full rankings</div>
      </div>

      {/* Modal: all 20 managers */}
      <FullRankingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Captain Points - Full Rankings"
        icon="⭐"
        data={data}
        renderItem={renderItem} // Same function!
      />
    </>
  );
}
```

**Benefits:**
- No duplicate JSX
- Consistent rendering
- Type-safe
- Easy to maintain

#### Toggle Protection

**Critical Detail:** Prevent toggles from triggering modal open

**Problem:** Clicking toggle would open modal AND switch view

**Solution:** `stopPropagation` on toggle container

```tsx
<div className={`${styles.card} ${styles.clickable}`}
     onClick={() => setShowModal(true)}>

  <div className={styles.cardHeader}>
    <h4>{title}</h4>
    {/* stopPropagation prevents modal opening */}
    <div className={styles.toggle} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setView('best')}>Best</button>
      <button onClick={() => setView('worst')}>Worst</button>
    </div>
  </div>

</div>
```

**Without stopPropagation:** Click toggle → Modal opens
**With stopPropagation:** Click toggle → View switches only

#### Components Updated

All 4 leaderboard components updated with modal functionality:

1. ✅ **CaptainLeaderboard.tsx** - Click to view all captain rankings
2. ✅ **ChipPerformance.tsx** - Click to view full "Played" or "Faced" (respects toggle)
3. ✅ **Streaks.tsx** - Click to view full "Best" or "Worst" streaks (respects toggle)
4. ✅ **BestWorstGW.tsx** - Click to view full "Best" or "Worst" gameweeks (respects toggle)

#### Clickable Card Styling

**File:** `/src/components/Stats/season/Leaderboard.module.css`

```css
.clickable {
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.clickable:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 255, 135, 0.4);
  box-shadow: 0 8px 20px rgba(0, 255, 135, 0.1);
}

.clickHint {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(0, 255, 135, 0.5);
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.clickable:hover .clickHint {
  color: rgba(0, 255, 135, 0.8);
}
```

---

## Key Architectural Decisions

### 1. FPL API Over Database

**Decision:** Fetch critical data from FPL API, not database

**Reasoning:**
- Database may have incomplete data (chips, captain choices)
- FPL API is source of truth
- Performance acceptable with parallel fetches

**Applied To:**
- Captain points calculation (picks + live data)
- Chips data (history endpoint)
- Bonus points (provisional from fixtures)

### 2. Render Function Pattern

**Decision:** Define render function once, use in card + modal

**Benefits:**
- DRY principle (no duplicate JSX)
- Consistent rendering between preview and full view
- Type-safe with TypeScript
- Easy to maintain and update

**Example:**
```tsx
const renderItem = (item, index) => <div>...</div>;

// Card shows top 5
{data.slice(0, 5).map(renderItem)}

// Modal shows all 20
<FullRankingModal data={data} renderItem={renderItem} />
```

### 3. Toggle State Management

**Decision:** Modal respects current toggle state

**Implementation:**
```tsx
const currentData = view === 'best' ? bestData : worstData;

<FullRankingModal
  title={`${view === 'best' ? 'Winning' : 'Losing'} Streaks`}
  icon={view === 'best' ? '🔥' : '💀'}
  data={currentData} // Dynamic based on toggle
/>
```

**Result:** Clicking card opens modal showing current view. User can switch toggle before or after opening modal.

---

## Common Bugs & Solutions

### Bug: Bonus Points to Wrong Players

**Symptom:** All players getting bonus points globally

**Root Cause:** Not grouping by fixtureId before awarding bonus

**Solution:**
```typescript
// Group players by fixture FIRST
const playersByFixture = players.reduce((acc, p) => {
  acc[p.fixtureId] = acc[p.fixtureId] || [];
  acc[p.fixtureId].push(p);
  return acc;
}, {});

// Then calculate bonus per fixture
Object.values(playersByFixture).forEach(fixturePlayers => {
  const top3BPS = fixturePlayers
    .sort((a, b) => b.bps - a.bps)
    .slice(0, 3);
  // Award 3/2/1 bonus
});
```

### Bug: Chips Faced Not Showing

**Symptom:** Toggle to "Chips Faced" shows empty despite API having data

**Root Cause:** Duplicate conditional rendering (two separate maps)

**Solution:** Single map with conditional field access

### Bug: Modal Shows Wrong Data After Toggle

**Symptom:** Switch to "Worst" but modal still shows "Best"

**Root Cause:** Passing static data to modal instead of dynamic `currentData`

**Solution:**
```tsx
// ❌ WRONG
<FullRankingModal data={bestData} />

// ✅ CORRECT
const currentData = view === 'best' ? bestData : worstData;
<FullRankingModal data={currentData} />
```

### Bug: Toggle Opens Modal

**Symptom:** Clicking toggle button opens modal instead of just switching view

**Root Cause:** Missing `stopPropagation` on toggle container

**Solution:**
```tsx
<div className={styles.toggle} onClick={(e) => e.stopPropagation()}>
  {/* Buttons here */}
</div>
```

---

## Performance Considerations

### Parallel API Fetching

**Pattern:**
```typescript
const [data1, data2] = await Promise.all([
  fetch(url1),
  fetch(url2)
]);
```

**Applied To:**
- Captain points: picks + live data per gameweek
- Multiple gameweeks in parallel
- Multiple managers' chip histories

### Optimization: slice(0, 5)

**Always show top 5 in card view:**
```tsx
{data.slice(0, 5).map(renderItem)}
```

**Modal shows complete data:**
```tsx
<FullRankingModal data={data} /> // Full array (all 20)
```

**Why:** Keeps main page performant while modal shows complete rankings on demand

---

## File Reference - Stats Hub

### Key Files Modified

**API Routes:**
- `/src/app/api/league/[id]/stats/gameweek/route.ts` (v1.11.9-11.13)
- `/src/app/api/league/[id]/stats/season/route.ts` (v1.13.0, v1.13.1)

**Components:**
- `/src/components/Stats/season/CaptainLeaderboard.tsx` (v1.13.1, v1.14.0)
- `/src/components/Stats/season/ChipPerformance.tsx` (v1.13.0, v1.13.1, v1.14.0)
- `/src/components/Stats/season/Streaks.tsx` (v1.13.0, v1.13.1, v1.14.0)
- `/src/components/Stats/season/BestWorstGW.tsx` (v1.14.0)
- `/src/components/Stats/season/FullRankingModal.tsx` (v1.14.0 - NEW)
- `/src/components/Stats/SeasonView.tsx` (v1.13.0, v1.13.1, v1.14.0)

**Styles:**
- `/src/components/Stats/season/Leaderboard.module.css` (v1.13.1, v1.14.0)
- `/src/components/Stats/season/FullRankingModal.module.css` (v1.14.0 - NEW)

---

## Current State

### Stats Hub Status: ✅ PRODUCTION-READY

**Features:**
- ✅ Gameweek View (live & completed GWs 1-11)
- ✅ Season View with full leaderboards
- ✅ Captain Points (total + percentage of season points)
- ✅ Chip Performance (Played + Faced leaderboards)
- ✅ Streaks (Best + Worst, historical maximum with GW ranges)
- ✅ Best/Worst Gameweeks (top individual performances)
- ✅ Clickable modals (view all 20 managers)
- ✅ Mobile responsive
- ✅ Professional polish

**Data Accuracy:** All fixed ✅
**UX:** Polished and consistent ✅
**Performance:** Optimized with parallel fetching ✅

---

## Version History

**Recent Features:**
- v1.25.4 (Dec 4) - **Revert FPL login feature** (blocked by anti-bot protection)
  - Restore clean League ID entry interface (simple, proven, works)
  - Remove all FPL authentication code (see Abandoned Features section)
  - Cleaner codebase with single entry flow
- ~~v1.26.0-v1.26.2 (Dec 4)~~ - *REVERTED* - FPL login attempt (see Abandoned Features)
- v1.25.0-v1.25.3 (Dec 4) - Team selection improvements + Position history graph

**Stats Hub Journey:**
- v1.14.0 (Nov 18) - Clickable modals with full rankings
- v1.13.1 (Nov 18) - Quick fixes (toggle styling, chips faced bug, captain %)
- v1.13.0 (Nov 13) - Complete feature set (chip performance, streaks, captain points)
- v1.12.0 (Nov 13) - UX improvements
- v1.11.13 (Nov 13) - Captain points per GW fix
- v1.11.12 (Nov 13) - Unknown manager names fix
- v1.11.10-11 (Nov 13) - Boundary fixes + deployment
- v1.11.9 (Nov 13) - Initial chips data fix

**Earlier Versions:**
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
