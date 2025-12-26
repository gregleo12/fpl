# FPL H2H Analytics - Version History

**Project Start:** October 23, 2024
**Total Releases:** 298+ versions
**Current Version:** v4.2.2 (December 26, 2025)

---

## v4.2.2 - K-122: Season Stats UI Improvements (Dec 26, 2025)

**Enhancement:** Improved data display and user controls for Season Stats cards with better toggles, clearer layouts, and additional metrics.

### What Changed

**Bench Points Card:**
- Added percentage calculation: `(bench_points / total_points) × 100`
- New toggle: "Total" (default) vs "% of Total"
- "Total" view: Shows raw points (primary) + percentage (secondary)
- "% of Total" view: Shows percentage (primary) + raw points (secondary)
- Re-ranks based on toggle selection

**Form Rankings Card:**
- Added "Last 10" option alongside existing "Last 5"
- New toggle: "Last 5" (default) vs "Last 10"
- Backend now calculates both 5 and 10 GW windows with separate trends
- Trend arrows update based on selection
- Subtitle dynamically shows "Performance over last 5/10 GWs"

**Consistency Card:**
- Improved layout for better clarity
- Primary stat: **±{variance} PTS** (large) - the consistency measure
- Secondary stat: **(avg {average})** (small, grey, brackets)
- Emphasizes variance as the key metric (lower = more consistent)

### Implementation Details

**Backend Changes (`/src/app/api/league/[id]/stats/season/route.ts`):**
- `calculateBenchPoints()`: Now returns `total_points` and `bench_percentage`
- `calculateFormRankings()`: Calculates both last 5 and last 10 GWs with respective trends
- Returns: `form_points_5`, `form_points_10`, `trend_5`, `trend_10`

**Frontend Changes:**
- `/src/components/Stats/season/BenchPoints.tsx`: Added Total/% toggle with dynamic sorting
- `/src/components/Stats/season/FormRankings.tsx`: Added Last 5/Last 10 toggle
- `/src/components/Stats/season/Consistency.tsx`: Restructured to show variance as primary stat

### Data Structure

**Bench Points:**
```typescript
{
  total_bench_points: number,
  total_points: number,
  bench_percentage: number  // Rounded to 1 decimal
}
```

**Form Rankings:**
```typescript
{
  form_points_5: number,   // Last 5 GWs total
  form_points_10: number,  // Last 10 GWs total
  trend_5: number,         // Rank change (5 GW window)
  trend_10: number         // Rank change (10 GW window)
}
```

### Related

**K-122:** Season Stats UI improvements ticket
**Part of:** v4.2.0 Season Stats Expansion

---

## v4.2.1 - K-121: Fix Luck Index Calculation (Dec 26, 2025)

**Bug Fix:** Fixed critical Luck Index calculation bug causing inflated values and added UI improvements for better user experience.

### Problem

Luck Index was showing impossible values with all managers having large positive scores (+1130 to +1293). In a zero-sum H2H game, luck should distribute with mix of positive/negative values summing to approximately 0.

### Root Cause

The `h2h_matches` table contained matches for GWs 1-38, but `manager_gw_history` only had data for completed GWs 1-17. The calculation was:
- Computing manager averages from 17 GWs (correct)
- Comparing against 38 GWs of H2H matches (incorrect)
- Result: Each manager had 22-30 matches instead of expected 17, causing ~2.2x inflation

### Fix Applied

**Backend Changes (`/src/app/api/league/[id]/stats/season/route.ts`):**
- Added `completedGameweeks` parameter to `calculateLuckIndex()` function
- Filtered manager average query: `AND event = ANY($2)` to only include completed GWs
- Filtered H2H matches query: `AND event = ANY($2)` to only include completed GWs
- Result: Correct luck values ranging from -106 to +72 (reasonable distribution)

**Frontend Changes (`/src/components/Stats/season/LuckIndex.tsx`):**
- Removed emoji display (🍀 and 😤) - now shows colored numbers only
- Added Lucky/Unlucky toggle (similar to Bench Points Most/Least pattern)
- Changed from showing top 5 + bottom 2 to showing only top 5 based on toggle state
- Modal title updates to show "(Luckiest)" or "(Unluckiest)" based on toggle

### Verification

Manual SQL calculation confirmed expected values:
- Before fix: All managers +223 to +998 (statistically impossible)
- After fix: Range from -106 to +72 with mix of positive/negative
- Sum of luck across all managers: Close to 0 (expected for zero-sum game)

### Related

**K-121:** Luck Index calculation bug ticket
**Part of:** v4.2.0 Season Stats Expansion

---

## v4.2.0 - Season Stats Expansion (Dec 24, 2025)

**Feature:** Major expansion of Season Stats with 4 new leaderboard cards showing bench management, form trends, consistency, and luck analysis.

### What's New

Added four new Season Stats cards that provide deeper insights into manager performance across the season:

1. **Bench Points** - Total points left on the bench across all gameweeks
2. **Form Rankings** - Last 5 GWs performance with trend indicators comparing to previous 5 GWs
3. **Consistency** - Weekly score variance using standard deviation (reliable vs boom/bust managers)
4. **Luck Index** - Opponent performance vs their averages (work in progress)

**Key Features:**
- **All cards clickable:** Tap any card to view full rankings for all managers
- **Toggle views:** Bench Points (Most/Least), Consistency (Consistent/Variable)
- **Trend arrows:** Form Rankings shows ↑ green (improving), ↓ red (declining), — grey (same)
- **Statistical analysis:** Consistency uses population standard deviation for accuracy
- **User highlighting:** Your row marked with ★ in full rankings
- **Responsive design:** Cards adapt to mobile and desktop layouts

### Components Added

**New Season Cards:**
- `/src/components/Stats/season/BenchPoints.tsx` - Bench point tracking with Armchair icon
- `/src/components/Stats/season/FormRankings.tsx` - Form trends with Flame icon
- `/src/components/Stats/season/Consistency.tsx` - Score variance with Activity icon
- `/src/components/Stats/season/LuckIndex.tsx` - Luck analysis with Sparkles icon

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added 4 new calculation functions
- `/src/components/Stats/SeasonView.tsx` - Integrated all new cards into grid
- `/src/data/changelog.json` - Updated What's New page

### Implementation Details

**K-119d - Bench Points:**
- Sums `manager_gw_history.points_on_bench` across all completed gameweeks
- Toggle between Most (highest wasted points) and Least (best bench management)
- Display format: Total points (e.g., "142")

**K-119a - Form Rankings:**
- Calculates last 5 GWs total points
- Compares to previous 5 GWs to show trend
- Trend = Previous Rank - Current Rank (positive = improving, negative = declining)
- Requires minimum 10 GWs for trend calculation
- Display format: Points with trend arrow (e.g., "380 PTS ↑3")

**K-119c - Consistency:**
- Uses `STDDEV_POP(points)` to measure score variance
- Lower std dev = more consistent (predictable scores)
- Higher std dev = more variable (boom/bust manager)
- Display format: `{avg} ±{std_dev}` (e.g., "58 ±8" means typically scores 50-66)

**K-119b - Luck Index (In Progress):**
- Measures opponent performance vs their season average
- Positive = lucky (opponents underperformed against you)
- Negative = unlucky (opponents overperformed against you)
- Still debugging deduplication logic for h2h_matches table

### Technical Notes

All calculations run in parallel using `Promise.all()` for optimal performance. Cards use shared `FullRankingModal` component for consistent UX. Data queries optimize for PostgreSQL performance with proper indexing.

### Known Issues

- **Luck Index:** Currently showing inflated values (+1200+) due to h2h_matches table query issue. Fix in progress.
- **Form Trends:** Requires 10+ completed gameweeks to show trends (need current + previous 5 GW periods)

### Related

**K-119a, K-119b, K-119c, K-119d:** Individual tickets for each new season stat card
**Part of:** Overall Season Stats enhancement initiative

---

## v4.1.4 - K-119b: Season Stats - Luck Index Card (Dec 24, 2025)

**Feature:** Added Luck Index season statistics card measuring how lucky/unlucky managers have been based on opponent performance.

### What's New

Added new Season Stats leaderboard showing which managers have been lucky (opponents underperformed) versus unlucky (opponents overperformed). Luck Index measures opponent deviation from their season average across all H2H matches.

**Key Features:**
- **Luck Index Card:** Shows cumulative luck score across all H2H matches
- **Unique Layout:** Displays top 5 luckiest AND bottom 2 unluckiest in card view
- **Visual Indicators:** Positive = green 🍀, Negative = red 😤
- **Opponent Deviation:** Measures how much each opponent scored vs their average
- **Full Rankings:** Click to view all 20 managers sorted by luck
- **User Highlight:** User's row marked with ★ in full rankings
- **Sparkles Icon:** Using Lucide React Sparkles icon for luck/chance

### Implementation

**New Files:**
- `/src/components/Stats/season/LuckIndex.tsx` - New season card component

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added `calculateLuckIndex()` function
- `/src/components/Stats/SeasonView.tsx` - Added LuckIndex component to grid

### Data Source & Calculation

Query calculates opponent performance vs average from `h2h_matches` and `manager_gw_history`:

**Step 1: Calculate each manager's season average**
```sql
SELECT entry_id, AVG(points) as avg_points
FROM manager_gw_history
WHERE league_id = $1
GROUP BY entry_id
```

**Step 2: For each H2H match, calculate opponent deviation**
```typescript
// For each match
const opp_deviation_for_entry1 = (avg_of_entry2) - (actual_pts_of_entry2);
const opp_deviation_for_entry2 = (avg_of_entry1) - (actual_pts_of_entry1);

luck[entry1] += opp_deviation_for_entry1;
luck[entry2] += opp_deviation_for_entry2;
```

**Interpretation:**
- **Positive deviation:** Opponent scored below their average → you got lucky
- **Negative deviation:** Opponent scored above their average → you were unlucky
- **Example:** Your opponent averages 60pts but only scored 45 against you → +15 luck (they had a bad week)

### Design

- Sparkles icon indicates luck/chance element
- Green text + 🍀 for positive luck (luckiest managers)
- Red text + 😤 for negative luck (unluckiest managers)
- Plus sign (+) shown for positive numbers
- Card shows top 5 + divider + bottom 2 (unique 7-item layout)
- Follows existing Season Stats card pattern
- Responsive grid layout

### Edge Cases

- **No matches played:** Returns empty array
- **Manager with no H2H matches:** luck_index = 0
- **New manager (joined mid-season):** Only counts matches they played
- **Tied matches:** Both managers get opponent deviation added (no special handling)

### Luck Interpretation Guide

- **+50 or higher:** Very lucky - opponents consistently underperform
- **+20 to +49:** Moderately lucky
- **-19 to +19:** Average luck
- **-20 to -49:** Moderately unlucky
- **-50 or lower:** Very unlucky - opponents consistently overperform

### Related

**K-119a, K-119c, K-119d:** Other new Season Stats cards (Form Rankings, Consistency, Bench Points)
**Part of:** Overall Season Stats expansion initiative

---

## v4.1.3 - K-119c: Season Stats - Consistency Card (Dec 24, 2025)

**Feature:** Added Consistency season statistics card showing weekly score variance using standard deviation.

### What's New

Added new Season Stats leaderboard showing which managers are most consistent (reliable scorers) versus most variable (boom or bust). Consistency rankings reveal weekly score patterns using statistical variance to measure reliability.

**Key Features:**
- **Consistency Card:** Shows average points per GW ± standard deviation
- **Consistent/Variable Toggle:** View most consistent (low variance) or most variable (high variance) managers
- **Display Format:** Shows `avg ±std_dev` (e.g., "58 ±8")
- **Top 5 Display:** Card shows top 5, click to view all 20 managers
- **User Highlight:** User's row marked with ★ in full rankings
- **Activity Icon:** Using Lucide React Activity icon for variance/fluctuation

### Implementation

**New Files:**
- `/src/components/Stats/season/Consistency.tsx` - New season card component

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added `calculateConsistency()` function
- `/src/components/Stats/SeasonView.tsx` - Added Consistency component to grid

### Data Source

Query calculates average and standard deviation from `manager_gw_history.points`:
```sql
SELECT
  mgh.entry_id,
  m.player_name,
  m.team_name,
  ROUND(AVG(mgh.points)::numeric, 1) as avg_points,
  ROUND(STDDEV_POP(mgh.points)::numeric, 1) as std_dev
FROM manager_gw_history mgh
JOIN managers m ON m.entry_id = mgh.entry_id
WHERE mgh.league_id = $1
GROUP BY mgh.entry_id, m.player_name, m.team_name
ORDER BY std_dev ASC
```

**Statistical Notes:**
- Uses `STDDEV_POP` (population standard deviation) since we have all GW data
- Lower std dev = more consistent (predictable scores)
- Higher std dev = more variable (boom/bust manager)
- Avg ± std dev shows typical score range (e.g., 58 ±8 means typically scores 50-66)

### Design

- Activity icon indicates fluctuation/variance
- Display format: `{avg} ±{std_dev}` (both rounded to nearest integer)
- Consistent toggle shows low std dev first (most reliable)
- Variable toggle shows high std dev first (biggest swingers)
- Follows existing Season Stats card pattern
- Responsive grid layout

### Edge Cases

- **Single GW completed:** std dev will be 0 for all managers
- **Few GWs completed:** std dev may not be statistically meaningful yet
- **Null/zero points:** Treated as valid data points in calculation

### Related

**K-119a, K-119b, K-119d:** Other new Season Stats cards (Form Rankings, Transfer Activity, Bench Points)
**Part of:** Overall Season Stats expansion initiative

---

## v4.1.2 - K-119a: Season Stats - Form Rankings Card (Dec 24, 2025)

**Feature:** Added Form Rankings season statistics card showing performance over last 5 gameweeks with trend indicators.

### What's New

Added new Season Stats leaderboard showing who's HOT right now versus who started strong but faded. Form rankings reveal recent performance (last 5 GWs) with trend arrows showing movement compared to overall season rank.

**Key Features:**
- **Form Rankings Card:** Shows total points from last 5 completed gameweeks
- **Trend Indicators:** ↑ green (rising), ↓ red (falling), — grey (same position)
- **Comparison:** Trend calculated as difference between form rank and season rank
- **Top 5 Display:** Card shows top 5, click to view all 20 managers
- **User Highlight:** User's row marked with ★ in full rankings
- **Flame Icon:** Using Lucide React Flame icon for "hot form"

### Implementation

**New Files:**
- `/src/components/Stats/season/FormRankings.tsx` - New season card component

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added `calculateFormRankings()` function and league standings fetch
- `/src/components/Stats/SeasonView.tsx` - Added FormRankings component to grid

### Data Source

Query pulls last 5 GWs from `manager_gw_history.points`:
```sql
SELECT
  mgh.entry_id,
  m.player_name,
  m.team_name,
  SUM(mgh.points) as last5_points
FROM manager_gw_history mgh
JOIN managers m ON m.entry_id = mgh.entry_id
WHERE mgh.league_id = $1
  AND mgh.event = ANY($2)  -- last 5 completed GWs
GROUP BY mgh.entry_id, m.player_name, m.team_name
ORDER BY last5_points DESC
```

**Trend Calculation:**
- `trend = season_rank - form_rank`
- Positive number = improved (↑ green)
- Negative number = dropped (↓ red)
- Zero = same position (— grey)

**Example:** If you're rank 5 for the season but rank 2 in form:
- `trend = 5 - 2 = +3` → Shows `↑3` in green

### Design

- Flame icon indicates "hot form"
- Green ↑ arrows for rising managers
- Red ↓ arrows for falling managers
- Points right-aligned with trend above
- Follows existing Season Stats card pattern
- Responsive grid layout

### Edge Cases

- **Less than 5 GWs completed:** Uses whatever GWs are available (e.g., 3 GWs if only 3 completed)
- **New managers:** Only counts GWs they have data for
- **Tied points:** No special handling in initial version

### Related

**K-119b-d:** Other new Season Stats cards (Transfer Activity, Points Variance, Bench Points)
**Part of:** Overall Season Stats expansion initiative

---

## v4.1.1 - K-119d: Season Stats - Bench Points Card (Dec 24, 2025)

**Feature:** Added Bench Points season statistics card showing total points left on bench.

### What's New

Added new Season Stats leaderboard showing total points wasted on the bench across all completed gameweeks. This helps identify which managers have the best bench management (least points wasted) versus those leaving the most points unused.

**Key Features:**
- **Bench Points Card:** Shows total bench points for all managers
- **Most/Least Toggle:** View managers with most wasted points or best bench management
- **Top 5 Display:** Card shows top 5, click to view all 20 managers
- **User Highlight:** User's row marked with ★ in full rankings
- **Armchair Icon:** Using Lucide React Armchair icon for consistency

### Implementation

**New Files:**
- `/src/components/Stats/season/BenchPoints.tsx` - New season card component

**Modified Files:**
- `/src/app/api/league/[id]/stats/season/route.ts` - Added `calculateBenchPoints()` function
- `/src/components/Stats/SeasonView.tsx` - Added BenchPoints component to grid

### Data Source

Query pulls from `manager_gw_history.points_on_bench`:
```sql
SELECT
  mgh.entry_id,
  m.player_name,
  m.team_name,
  SUM(mgh.points_on_bench) as total_bench_points
FROM manager_gw_history mgh
JOIN managers m ON m.entry_id = mgh.entry_id
WHERE mgh.league_id = $1
GROUP BY mgh.entry_id, m.player_name, m.team_name
ORDER BY total_bench_points DESC
```

**Note:** Auto-subs are already applied, so this is truly unused points (not including players who were automatically subbed in).

### Design

- Follows existing Season Stats card pattern
- Dark card background with green accents
- Toggle buttons: "Most" (highest bench points) vs "Least" (lowest bench points)
- Click card to open full rankings modal
- Responsive grid layout

### Related

**K-119a-c:** Other new Season Stats cards (Transfer Activity, Points Variance, Consistency)
**Part of:** Overall Season Stats expansion initiative

---

## v4.1.0 - What's New Page & Notification System (Dec 24, 2025)

**Feature:** Added comprehensive What's New page with notification badges and user-facing update history.

### What's New

Introduced a dedicated updates page accessible from Settings, displaying all major releases and features in a user-friendly format. Users now get notified when new versions are deployed with red notification badges.

**Key Features:**
- **What's New Page:** Displays 24+ versions of update history back to v2.0 (Nov 2024)
- **Notification Badges:** Red dots with pulse animation on Settings tab and "What's New" button
- **Smart Detection:** Automatically shows badge when new version detected
- **Auto-Hide:** Badge disappears after visiting What's New page
- **Cross-Tab Sync:** Uses localStorage events to sync badge state across tabs
- **User-Focused Content:** Translated technical changes into user-friendly descriptions
- **Feedback Modal:** Added quick access to WhatsApp, Email, and Reddit support channels

### Implementation

**New Files:**
- `/src/app/updates/page.tsx` - What's New page component
- `/src/app/updates/updates.module.css` - Styling for updates page
- `/src/data/changelog.json` - User-facing changelog data (24 entries)
- `/src/hooks/useNewVersionBadge.ts` - Hook to check for new versions
- `/src/components/NotificationBadge/NotificationBadge.tsx` - Reusable badge component
- `/src/components/NotificationBadge/NotificationBadge.module.css` - Badge styling with animations
- `/src/components/Settings/FeedbackModal.tsx` - Feedback options modal
- `/src/components/Settings/FeedbackModal.module.css` - Modal styling
- `/CHANGELOG_GUIDE.md` - Documentation for maintaining user-facing changelog

**Modified Files:**
- `/src/components/Settings/SettingsTab.tsx` - Reorganized with What's New + Feedback at top, added badges
- `/src/components/Settings/SettingsTab.module.css` - Added buttonRow, primaryButton, secondaryButton styles
- `/src/app/dashboard/page.tsx` - Added notification badge to Settings tab icon

### How It Works

**Version Detection:**
1. `useNewVersionBadge` hook fetches `/api/version` on mount
2. Compares `currentVersion` with `localStorage.lastSeenVersion`
3. Returns `true` if versions don't match, triggering badge display
4. Listens for localStorage changes to sync across tabs

**Badge Display:**
- Shows on Settings tab icon (bottom navigation)
- Shows on "What's New" button (Settings page)
- Red dot (8px) with 2s pulse animation
- Positioned top-right of target element

**Badge Dismissal:**
- Visiting `/updates` page sets `localStorage.lastSeenVersion = currentVersion`
- Badge immediately hides via localStorage event listener
- Persists across sessions until next version bump

### User Experience

**Settings Page Reorganization:**
- **Top Section:** What's New (primary green) + Feedback (secondary grey)
- **Icons:** Replaced emojis with Lucide React icons (Sparkles, MessageSquare)
- **Layout:** Grid with equal columns and proper spacing

**What's New Page:**
- Clean, card-based layout
- Version badges with dates
- Categorized changes per version
- Footer with WhatsApp Community link

**Feedback Modal:**
- Three clear options: WhatsApp, Email, Reddit
- Icon-based design with descriptions
- Opens external links in new tab
- Email pre-fills subject line

### Design Details

**Badge Styling:**
- Color: `#ff0066` (brand pink)
- Size: 8px × 8px circle
- Border: 2px solid `#1a1a2e` (background color)
- Position: `top: -4px, right: -4px`
- Animation: fadeIn (0.3s) + pulse (2s infinite)
- z-index: 10, pointer-events: none

**Button Icons:**
- Sparkles (18px) for What's New
- MessageSquare (18px) for Feedback
- Consistent `marginRight: 0.5rem` spacing

### Documentation

**New Guides:**
- `/CHANGELOG_GUIDE.md` - Complete guide for maintaining user-facing changelog
  - Core principles (user-focused, production only)
  - Translation guide (technical → user-friendly)
  - Step-by-step process
  - Examples of good vs bad entries
  - Checklist for updates

**Process Updates:**
- Deployment checklist now includes changelog updates
- VERSION_HISTORY.md tracks technical details
- changelog.json maintains user-facing content
- Maximum 20-30 entries in changelog.json

### Testing

**Tested Scenarios:**
- ✅ Badge appears when version bumped
- ✅ Badge disappears after visiting /updates
- ✅ Badge syncs across multiple tabs
- ✅ Button layout maintains proper spacing
- ✅ Icons render correctly on all buttons
- ✅ Modal opens/closes smoothly
- ✅ External links open correctly

### Related

**K-118:** Initial What's New page and version toast implementation
**K-119:** Notification badge system
**Post-4.0.0:** User feedback collection and update communication improvements

---

## v4.0.3 - K-114: Temporary Feedback Banner (Dec 24, 2025)

**Feature:** Added dismissable feedback banner for post-K-108c deployment user feedback.

### What's New

After deploying v4.0.0 K-108c architecture, added a temporary feedback banner to collect user reports of any issues during the transition period.

**Banner Features:**
- **Position:** Opposite of navigation bar (mobile: top, desktop: bottom)
- **Content:** "🔧 We just shipped a big update! Notice anything off?"
- **Report Action:** Opens mailto link to greg@rivalfpl.com with pre-filled subject and current page URL
- **Dismissable:** ✕ button saves preference to localStorage
- **Auto-expires:** January 7, 2025 (2 weeks after deployment)
- **Responsive:** Adapts to mobile/desktop layouts

### Implementation

**Files Created:**
- `src/components/Layout/FeedbackBanner.tsx` - Main component
- `src/components/Layout/FeedbackBanner.module.css` - Styling with animations

**Integration:**
- Added to root layout (`src/app/layout.tsx`)
- Renders globally across all pages
- Uses `localStorage` for dismiss state
- Includes slide-up animation on mount

### Design Details

**Styling:**
- Purple background with neon green accent (`#00ff87`)
- Backdrop blur effect for modern look
- Smooth transitions on hover/active states
- Mobile-optimized (smaller padding/font on <480px)
- **Mobile:** top: 0 with slideDown animation (nav is at bottom)
- **Desktop:** bottom: 0 with slideUp animation (nav is at top)

**UX:**
- Non-intrusive but visible
- Single click to dismiss (persists across sessions)
- Single click to report (opens email client)
- Auto-hides after 2 weeks

### K-113 Verification Results

**Database Coverage:** ✅ 100% K-108 data populated

| Metric | Result |
|--------|--------|
| Gameweeks Covered | 1-17 (all 100% populated) |
| Total Records | 12,610 player-gameweek stats |
| Calculated Points Match | 100% (all match FPL totals) |
| Leagues Synced | 67/67 (all completed) |
| Failed Syncs | 0 |

**K-115 Bulk Sync Results:**
- Total runtime: 245 minutes
- Leagues processed: 67/67
- Success rate: 100%
- Failures: 0

**Explanation of 67 vs 126 leagues:** Production database contains 67 actual leagues (not 126). All 67 have been synced successfully.

### K-116 Investigation: Incomplete Manager History

**Issue Discovered:** Some returning users experiencing "Failed to fetch" errors on first load.

**Root Cause:** 17 leagues have managers with `manager_picks` data but missing `manager_gw_history` data, causing K-108c score calculations to fail.

**Investigation Results:**
- ✅ All 67 leagues have K-108 player data (100% coverage)
- ❌ 17 leagues have incomplete manager history:
  - 🔴 2 leagues missing 7-12 managers' history (high priority)
  - 🟡 3 leagues missing 2-6 managers' history (medium priority)
  - 🟢 12 leagues missing 1 manager's history (low priority)

**Example:** League 500234 (🇺🇳 H2H League 5) has 26 managers, but only 14 have `manager_gw_history`. The remaining 12 have picks for all 17 GWs but zero gameweek history records.

**Solution:**
Created `fix-incomplete-manager-history.ts` script to:
- Identify all leagues with incomplete manager history
- Re-sync each league with full data refresh (`forceClear=true`)
- 30-second rate limiting between leagues
- Comprehensive logging and verification

**Script Usage:**
```bash
npm run fix:incomplete-history
```

**Expected Impact:** Eliminates "Failed to fetch" errors for users in affected leagues by ensuring all managers have complete K-108c data.

**Files Created:**
- `src/scripts/fix-incomplete-manager-history.ts` - Targeted sync script
- `package.json` - Added `fix:incomplete-history` npm script

---

## v4.0.2 - K-115: Bulk Sync Script for All Leagues (Dec 24, 2025)

**Script:** Created bulk sync tool to ensure all 126 tracked leagues have K-108 data populated.

### What's New

Added `bulk-sync-all-leagues.ts` script to perform one-time migration ensuring all existing leagues have K-108 `calculated_points` data in `player_gameweek_stats` table.

**Why This Is Needed:**
- v4.0.0 deployed K-108c architecture to production
- New users get K-108 data automatically on first sync (K-112)
- Existing 126 leagues may have historical data but missing K-108 calculated points
- This script ensures everyone has K-108 data before they notice issues

### Script Features

**Functionality:**
- Fetches all leagues from `leagues` table
- Calls `syncLeagueData()` for each league (triggers K-112 → K-108 sync)
- Processes sequentially (one at a time, not parallel)
- 30-second delay between leagues (conservative rate limiting)
- Detailed progress logging with percentage completion
- Error handling (continues on failures, logs all errors)
- Summary report at end (success/failed counts)

**Safety:**
- ✅ Idempotent (safe to re-run multiple times)
- ✅ Non-destructive (only adds data, doesn't delete)
- ✅ Rate-limited (30s delays prevent FPL API overload)
- ✅ Error recovery (continues on failures)
- ✅ Independent transactions (each league isolated)

**Performance:**
- **126 leagues** to sync
- **30 seconds delay** between each
- **Estimated runtime:** ~1.5-2 hours
- **FPL API calls:** ~3,800 total (within free tier)
- **Can run in background** (nohup with log file)

### How to Run

```bash
# Set production database URL
export DATABASE_URL="postgresql://postgres:PASSWORD@caboose.proxy.rlwy.net:45586/railway"

# Run in background with logging
nohup npm run sync:all-leagues > k115-sync.log 2>&1 &

# Monitor progress
tail -f k115-sync.log
```

See `K-115-BULK-SYNC-GUIDE.md` for full execution guide.

### Files Created

- `src/scripts/bulk-sync-all-leagues.ts` - Main sync script
- `K-115-BULK-SYNC-GUIDE.md` - Complete execution guide
- `package.json` - Added `sync:all-leagues` npm script

### Expected Output

```
╔═══════════════════════════════════════════════════════════════╗
║         K-115: Bulk Sync All Leagues for K-108 Data          ║
╚═══════════════════════════════════════════════════════════════╝

✅ Found 126 leagues to sync
⏱️  Estimated runtime: ~63-126 minutes

[1/126] (1%) Syncing: Dedoume FPL 9th edition (ID: 804742)...
[1/126] ✅ Success: Dedoume FPL 9th edition
[2/126] (2%) Syncing: Gentleman's Lounge (ID: 76559)...
...
[126/126] (100%) Syncing: League 5 (ID: 5)...

✅ Success: 124/126
❌ Failed: 2/126
⏱️  Total time: 87 minutes
```

### Post-Sync Verification

Run K-113 query to confirm K-108 data is populated:

```sql
SELECT gameweek, COUNT(*) as total, COUNT(calculated_points) as with_data
FROM player_gameweek_stats
WHERE gameweek IN (15, 16, 17)
GROUP BY gameweek;
```

Expected: 100% of rows have `calculated_points` populated.

### Why This Update?

After deploying v4.0.0 (K-108c architecture), we need to ensure all existing leagues have K-108 data. New leagues get this automatically via K-112 integration, but the 126 existing leagues need a one-time backfill.

This script performs that migration safely and efficiently.

### Impact

- ✅ Ensures all 126 existing leagues have K-108 data
- ✅ Prevents users from seeing incorrect scores
- ✅ One-time migration (won't need to run again)
- ✅ Safe to run (idempotent, non-destructive)
- ✅ Detailed logging for troubleshooting

---

## v4.0.1 - K-114: Temporary Feedback Banner (Dec 24, 2025)

**Feature:** Added dismissable feedback banner for post-K108 deployment user feedback.

### What's New

Added a temporary, non-intrusive feedback banner that appears at the bottom of the app to encourage users to report any issues they notice after the major K-108c architecture update (v4.0.0).

**Banner Features:**
- 🔧 Alert message: "We just shipped a big update! Notice anything off?"
- "Report Issue" button → Opens email to greg@rivalfpl.com with pre-filled subject and page URL
- Dismissable (✕ button) → Stores preference in localStorage
- Auto-expires January 7, 2026 (2 weeks from deployment)
- Positioned above mobile navigation on mobile, at bottom on desktop

**Implementation Details:**
- **Component:** `src/components/Layout/FeedbackBanner.tsx`
- **Styles:** `src/components/Layout/FeedbackBanner.module.css`
- **Integration:** Added to `src/app/layout.tsx` (root layout)
- **Storage Key:** `feedback-banner-dismissed-v1` (localStorage)
- **Expiry Date:** January 7, 2026 (2 weeks from deployment)
- **Fix:** Corrected expiry year from 2025 to 2026 (initial deployment had wrong year)

**User Experience:**
- Appears on first visit after deployment
- Can be dismissed permanently (per device/browser)
- Doesn't interfere with app functionality
- Slide-up animation on appearance
- Responsive design (compact on mobile)

**Technical:**
- Client-side component (`'use client'`)
- Uses `lucide-react` for close icon
- Smooth transitions and animations
- Backdrop blur effect for modern look
- Green accent color matching app theme (`#00ff87`)

### Why This Update?

The v4.0.0 release was a major architectural change (K-108c migration). This banner provides a low-friction way for users to report any calculation discrepancies or issues they encounter, helping us quickly identify and fix any edge cases we might have missed.

### Files Modified

- `src/components/Layout/FeedbackBanner.tsx` (created)
- `src/components/Layout/FeedbackBanner.module.css` (created)
- `src/app/layout.tsx` (integrated FeedbackBanner)
- `package.json` (v4.0.0 → v4.0.1)
- `VERSION_HISTORY.md` (this file)
- `README.md` (version updated)

### Impact

- ✅ Low friction user feedback mechanism
- ✅ Temporary (auto-expires after 2 weeks)
- ✅ No backend required (mailto link)
- ✅ Dismissable (respects user preference)
- ✅ No performance impact

---

## v4.0.0 - K-108c Architecture Production Release (Dec 24, 2025)

**🎉 MAJOR RELEASE:** Complete migration to K-108c single-source-of-truth architecture.

### What is v4.0.0?

This is the **production deployment** of the K-108c architecture - a fundamental redesign of how RivalFPL calculates and displays Fantasy Premier League scores. Every score, stat, and ranking now uses a **single, verified source of truth**.

**Architecture Overview:**
```
K-108: Player Gameweek Points Calculator
   ↓
K-108c: Team Gameweek Totals (calculated from K-108)
   ↓
K-110: Player Season Stats (summed from K-108)
   ↓
K-111: Data Pipeline Audit (verified K-108c compatibility)
   ↓
K-112: Auto-Sync Integration (K-108 data populates automatically)
   ↓
K-113: Production Database Verification (confirmed ready)
```

### Why Major Version (4.0.0)?

This represents a **breaking architectural change** in how the app calculates scores:

**Old Architecture (v3.x):**
- ❌ Multiple data sources for same information
- ❌ FPL API bootstrap-static (stale season stats)
- ❌ FPL API live data (for live GWs)
- ❌ Database cache (for completed GWs)
- ❌ Inconsistencies between endpoints
- ❌ Bonus points counted twice in some places
- ❌ Manual sync required for K-108 data

**New Architecture (v4.0.0):**
- ✅ **Single source of truth:** `player_gameweek_stats.calculated_points`
- ✅ All endpoints use same K-108c calculation
- ✅ Player season stats calculated from K-108 data (K-110)
- ✅ Automatic K-108 sync on league sync (K-112)
- ✅ Verified accurate to FPL official scores
- ✅ Consistent across all features
- ✅ No manual intervention needed

### Systems Included in v4.0.0

#### K-108: Player Gameweek Points Calculator
**File:** `src/lib/pointsCalculator.ts`

Calculates player points for each gameweek using official FPL rules:
- Minutes played (2 pts for 60+, 1 pt for 1-59)
- Goals scored (position-dependent: DEF=6, MID=5, FWD=4, GK=6)
- Assists (3 pts each)
- Clean sheets (position-dependent: DEF/GK=4, MID=1)
- Goals conceded (DEF/GK: -1 per 2 goals)
- Bonus points (official BPS)
- Saves (GK: 1 pt per 3 saves)
- Penalties missed/saved
- Yellow/red cards

**Database:** Stores in `player_gameweek_stats.calculated_points`

#### K-108c: Team Gameweek Totals
**File:** `src/lib/teamCalculator.ts`

Calculates team totals using K-108 player points:
- Fetches manager's 11 starters + 4 bench
- Applies captain multiplier (×2) or triple captain (×3)
- Applies vice-captain if captain didn't play
- Handles auto-substitutions (bench players replacing 0-point starters)
- Applies chip effects (Bench Boost, Free Hit, etc.)
- Subtracts transfer costs
- Returns NET points for gameweek

**Used by:** H2H fixtures, My Team, league standings, rankings

#### K-109: Full K-108c Migration
**Scope:** 26 endpoints across 7 major features

Migrated all endpoints from old calculation methods to K-108c:
- My Team (player modals, pitch view, gameweek scores)
- H2H Fixtures (match scores, common players)
- League Standings (total points, rankings)
- Manager Profile (season totals, form, records)
- Rankings (GW points, worst GWs, transfers, chips)
- Stats Tab (player stats verification)
- Players Tab (season stats, filtering, sorting)

**Result:** 100% consistency across entire app

#### K-110: Player Season Stats Calculator
**File:** `src/lib/playerCalculator.ts`

Calculates ALL player season stats by summing K-108 gameweek data:
- Total points (sum of calculated_points)
- Goals, assists, clean sheets
- Minutes, starts, full appearances
- Bonus, BPS
- Yellow/red cards, penalties, own goals
- Saves, goals conceded

**Replaced:** FPL API bootstrap-static (often stale/incorrect)

**Used by:** Players Tab, Player Detail Modals

#### K-111: Data Pipeline Audit
**Document:** `K-111-DATA-PIPELINE-AUDIT.md`

Comprehensive audit of all data sync mechanisms to verify K-108c compatibility:

**Findings:**
- ❌ League sync didn't populate K-108 data
- ❌ Quick sync didn't include K-108
- ❌ First-time loads missing K-108 data
- ❌ K-108 sync was manual-only script

**Recommendation:** Integrate K-108 into league sync (implemented in K-112)

#### K-112: Auto-Sync Integration
**File:** `src/lib/leagueSync.ts`

Integrated K-108 sync automatically into all league sync flows:

**Smart K-108 Integration:**
- Checks which GWs need K-108 data before syncing
- Auto-syncs K-108 for missing GWs (global operation, benefits all leagues)
- Fast path optimization (skips if data exists)
- Works for: first-time setup, settings sync, quick sync, new GW completion

**Performance:**
- Fresh sync (17 GWs): 40-70 seconds total
- New GW only: 5-10 seconds total
- Data exists (skip): 3-5 seconds (fast path)

#### K-113: Production Database Verification
**Document:** K-113 investigation results

Verified production database ready for K-108c deployment:
- ✅ `calculated_points` column exists
- ✅ 100% populated for all 17 completed GWs
- ✅ 12,610 records (760 players × 17 GWs)
- ✅ Last synced: Dec 23, 2025 at 15:27:37
- ✅ All gameweeks have K-108 data

**Conclusion:** Production ready, no manual sync needed

### What Changed in v4.0.0

**For Users:**
- ✅ **No visible changes** - scores stay accurate
- ✅ **No action required** - everything automatic
- ✅ **Consistent data** - all features use same source
- ✅ **Faster syncs** - optimized with fast path
- ✅ **More accurate** - verified against FPL official scores

**For Developers:**
- ✅ **26 endpoints migrated** to K-108c
- ✅ **4 new calculation functions** (K-108, K-108c, K-110)
- ✅ **Auto-sync integration** (K-112)
- ✅ **Single source of truth** throughout codebase
- ✅ **Verified accuracy** across all features

### Technical Implementation

**Database Schema:**
```sql
-- K-108 data storage
player_gameweek_stats (
  player_id INT,
  gameweek INT,
  calculated_points INT,        -- K-108 calculated points
  points_breakdown JSONB,        -- How points calculated
  total_points INT,              -- FPL official points
  minutes INT,
  goals_scored INT,
  assists INT,
  -- ... all other stats
)
```

**Calculation Flow:**
```
1. FPL API live data
      ↓
2. pointsCalculator.ts (K-108)
      ↓
3. player_gameweek_stats.calculated_points
      ↓
4. teamCalculator.ts (K-108c) ← All endpoints use this
      ↓
5. Frontend displays consistent scores
```

### Production Deployment Details

**Pre-Deployment Verification (K-113):**
- ✅ Database connection verified
- ✅ K-108 data 100% populated (GW1-17)
- ✅ Staging tested successfully
- ✅ Shared database (staging/production)
- ✅ Data pre-warmed by staging

**Deployment:**
- Date: December 24, 2025
- From: staging branch (v3.7.4) → main (v4.0.0)
- Commits merged: 45 commits (v3.4.31 → v4.0.0)
- Database impact: None (data already exists)
- User impact: Zero downtime, transparent transition

**Post-Deployment Expectations:**
- ✅ All existing leagues work immediately
- ✅ Scores remain accurate (K-108 data matches current)
- ✅ New leagues populate K-108 data automatically
- ✅ New GW syncs include K-108 data (first sync ~15-30s extra)
- ✅ Subsequent syncs fast (K-112 fast path)

### Impact on Existing Users

**Existing Leagues (Already Loaded):**
- ✅ **No sync required** - K-108 data already exists in database
- ✅ **Scores stay the same** - K-108 matches current calculations
- ✅ **100% transparent** - users won't notice any change
- ✅ **All features work** - My Team, H2H, standings, rankings, stats

**New Leagues (First-Time Setup):**
- ✅ **Single "Set Up League" action** - K-112 handles K-108 sync
- ✅ **K-108 data populated** automatically on first sync
- ✅ **No manual intervention** - fully automated

**After New Gameweek Completes:**
- ✅ **First user to sync** - triggers K-112 K-108 sync for new GW (~15-30s)
- ✅ **All other users** - benefit from global K-108 data (fast)
- ✅ **No admin action** - completely automated

### Files Modified in v4.0.0 Migration

**Core Calculation:**
- `src/lib/pointsCalculator.ts` (K-108)
- `src/lib/teamCalculator.ts` (K-108c)
- `src/lib/playerCalculator.ts` (K-110)

**Data Sync:**
- `src/lib/leagueSync.ts` (K-112 integration)
- `src/scripts/sync-player-gw-stats.ts` (K-108 manual script)

**API Endpoints (26 migrated):**
- `src/app/api/team/[teamId]/route.ts`
- `src/app/api/team/[teamId]/gameweek/[gw]/route.ts`
- `src/app/api/team/[teamId]/history/route.ts`
- `src/app/api/team/[teamId]/current-team/route.ts`
- `src/app/api/league/[leagueId]/matches/[gw]/route.ts`
- `src/app/api/league/[leagueId]/standings/route.ts`
- `src/app/api/league/[leagueId]/live-match/[matchId]/route.ts`
- `src/app/api/league/[leagueId]/rankings/route.ts`
- `src/app/api/league/[leagueId]/rankings/gw-points/route.ts`
- `src/app/api/league/[leagueId]/rankings/worst-gameweeks/route.ts`
- `src/app/api/league/[leagueId]/rankings/transfers/route.ts`
- `src/app/api/league/[leagueId]/rankings/chips/route.ts`
- `src/app/api/players/route.ts` (K-110)
- `src/app/api/players/[id]/route.ts` (K-110)
- ...and 12 more endpoints

**Documentation:**
- `K-111-DATA-PIPELINE-AUDIT.md` (created)
- `K-113-RESULTS.md` (investigation)
- `VERSION_HISTORY.md` (this file)
- `README.md` (version updated)

### Known Issues: None

All K-108c endpoints verified accurate to FPL official scores.

### Migration Path from v3.x

**For Production Deployment:**
1. ✅ K-108 data already populated (verified in K-113)
2. ✅ Deploy v4.0.0 to main branch
3. ✅ Railway auto-deploys
4. ✅ Users experience zero downtime
5. ✅ No manual database operations needed

**For New Installations:**
1. Clone repo
2. Run migrations (K-108 migration included)
3. Sync first league (K-112 auto-populates K-108)
4. All features work immediately

### Performance Metrics

**Calculation Accuracy:**
- ✅ K-108 vs FPL official: 99.9%+ match rate
- ✅ Verified across 17 gameweeks
- ✅ Mismatches logged and investigated

**Sync Performance:**
| Operation | v3.x Time | v4.0.0 Time | Notes |
|-----------|-----------|-------------|-------|
| First league sync | 30-40s | 40-70s | +K-108 sync (once) |
| Subsequent syncs | 30-40s | 3-5s | Fast path (skip K-108) |
| New GW first sync | 5-10s | 8-15s | +K-108 for 1 GW |
| New GW other syncs | 5-10s | 3-5s | Fast path |

**Database Efficiency:**
- ✅ K-108 sync is global (benefits all leagues)
- ✅ Fast path skips if data exists
- ✅ No redundant calculations

### Future Enhancements

Potential improvements for v4.1.0+:
- Automated K-108 sync via cron job (Vercel Pro)
- K-108 data validation endpoint
- Historical season support (2023/24, 2022/23)
- K-108 calculation audit logs

### Credits

**Developed by:** Claude Code
**Requested by:** Greg
**Architecture:** K-108c Single Source of Truth
**Testing:** League 804742 (Dedoume FPL 9th edition)
**Database:** Railway PostgreSQL
**Deployment:** Railway (staging + production)

---

## v3.7.4 - K-112: Integrate K-108 Sync into League Sync (Dec 23, 2025)

**🔴 CRITICAL PRODUCTION FIX:** K-108c endpoints now populate automatically on league sync.

### The Problem (Production Blocker)

Before this release, K-108c system (`player_gameweek_stats.calculated_points`) was **completely disconnected** from user-facing sync mechanisms:

- ❌ First-time league setup: K-108c data NOT synced
- ❌ Settings "Sync" button: K-108c data NOT synced
- ❌ Quick sync (missing GWs): K-108c data NOT synced
- ❌ Result: **ALL teams showed 0 points** because calculated_points was NULL

**Impact:** Production users would see WRONG SCORES (all zeros) until admin manually ran `npm run sync:player-gw-stats`.

### The Solution

Integrated K-108 sync **automatically** into both main sync flows:

**Smart K-108 Integration:**
```
User clicks "Sync"
    ↓
syncLeagueData() starts
    ↓
Checks: Which GWs need K-108 data?
    ↓
┌─────────────────┬────────────────────┐
│ Missing K-108   │ K-108 exists       │
│ data for GWs    │ for all GWs        │
├─────────────────┼────────────────────┤
│ Sync K-108 now  │ Skip (fast path)   │
│ (global op)     │ No work needed ✓   │
└─────────────────┴────────────────────┘
    ↓
Continue with manager data sync
    ↓
Done - K-108c endpoints work! ✅
```

### Changes

**File Modified:** `src/lib/leagueSync.ts`

1. **Added K-108 Check Function** (`getGameweeksMissingK108Data`)
   - Queries database for which GWs have `calculated_points` populated
   - Returns list of missing GWs that need syncing

2. **Added K-108 Sync Function** (`syncK108PlayerStats`)
   - Fetches live data from FPL API for missing GWs
   - Calculates points using `pointsCalculator.ts` (K-108 formula)
   - Populates `player_gameweek_stats.calculated_points`
   - Populates `points_breakdown` (JSON of how points calculated)
   - Global operation (all 760 players, benefits all leagues)

3. **Integrated into `syncLeagueData()`** (main sync)
   - Checks for missing K-108 data before syncing managers
   - If missing → syncs K-108 data automatically
   - If exists → fast path (no extra work)

4. **Integrated into `syncMissingGWs()`** (quick sync)
   - Same pattern for incremental sync
   - Only syncs K-108 for GWs that are both missing from league AND missing K-108 data

### Performance

| Scenario | K-108 Time | Total Sync Time | Notes |
|----------|------------|-----------------|-------|
| **Fresh sync (17 GWs)** | 20-40 seconds | 40-70 seconds | First-time league load |
| **New GW only (1 GW)** | 2-3 seconds | 5-10 seconds | After each GW completes |
| **Data exists (skip)** | 0 seconds | 3-5 seconds | Fast path ✓ |

### Impact

- ✅ **First-time league setup**: K-108c data populated automatically
- ✅ **Settings sync button**: K-108c data updated automatically
- ✅ **Quick sync**: K-108c data synced for missing GWs
- ✅ **New GW completion**: Users can sync immediately, K-108 included
- ✅ **No manual intervention**: Admin never needs to run `npm run sync:player-gw-stats`
- ✅ **Global efficiency**: K-108 sync runs once, benefits all leagues
- ✅ **Fast path optimization**: Skips if data already exists

### What Users See

**Before (v3.7.3):**
```
User clicks "Sync" → Manager data synced → K-108c missing → ALL TEAMS 0 POINTS ❌
Admin must manually run: npm run sync:player-gw-stats
```

**After (v3.7.4):**
```
User clicks "Sync" → K-108 checked → K-108 synced if needed → ALL SCORES CORRECT ✅
```

### K-111 Audit Compliance

This release resolves **ALL** findings from K-111 Data Pipeline Audit:

| K-111 Finding | Status |
|---------------|--------|
| League sync doesn't call K-108 sync | ✅ **FIXED** |
| No automated K-108 sync | ✅ **FIXED** |
| Quick sync doesn't include K-108 | ✅ **FIXED** |
| First-time load missing K-108 data | ✅ **FIXED** |
| K-108 sync is separate script | ✅ **FIXED** (now integrated) |

### Production Readiness

**Before v3.7.4:** ⛔ **BLOCKED** - Users would see wrong scores
**After v3.7.4:** ✅ **READY** - All data syncs automatically

### Technical Details

**K-108 Sync is Global:**
- Not league-specific (all 760 players)
- One sync benefits ALL leagues
- Database check ensures no duplicate work
- Efficient: Only syncs missing GWs

**Points Calculation:**
- Uses shared `pointsCalculator.ts` (same as manual script)
- Matches FPL official scoring exactly
- Stores breakdown in `points_breakdown` JSON column

**Error Handling:**
- Syncs individual GWs independently (one failure doesn't block others)
- Logs errors but continues
- Returns sync result summary (synced count, error count)

### Related Versions

- v3.7.1 (K-110): Player season totals from K-108
- v3.7.2 (K-109 Phase 7): Fix bonus double-counting
- v3.7.3 (K-110 Extended): All player season stats from K-108
- **v3.7.4 (K-112)**: Integrate K-108 into league sync ← **This release** 🔴

---

## v3.7.3 - K-110 Extended: All Player Season Stats from K-108 (Dec 23, 2025)

**Feature:** Extend K-110 to calculate ALL player season stats from K-108 data, not just total_points.

### The Problem

v3.7.1 implemented K-110 for player season **total_points** only. All other cumulative stats (goals, assists, minutes, bonus, BPS, clean sheets, etc.) were still using stale FPL API bootstrap data with 24-48h delay.

**Example: Haaland after GW17**
- ✅ TOTAL: 151 pts (K-110 v3.7.1 - accurate!)
- ❌ GOALS: 17 (should be 18 - missing GW17)
- ❌ STARTS: 16 (should be 17 - missing GW17)
- ❌ MINUTES: 1,372 (should be 1,462 - missing GW17)
- ❌ BONUS: 28 (should be 31 - missing GW17)

### The Solution

Calculate **ALL** cumulative season stats by aggregating from `player_gameweek_stats` table:

```sql
SELECT
  player_id,
  SUM(calculated_points) as total_points,
  SUM(goals_scored) as goals,
  SUM(assists) as assists,
  SUM(minutes) as minutes,
  SUM(bonus) as bonus,
  SUM(bps) as bps,
  SUM(clean_sheets) as clean_sheets,
  SUM(goals_conceded) as goals_conceded,
  SUM(saves) as saves,
  SUM(yellow_cards) as yellow_cards,
  SUM(red_cards) as red_cards,
  SUM(own_goals) as own_goals,
  SUM(penalties_missed) as penalties_missed,
  SUM(penalties_saved) as penalties_saved,
  COUNT(CASE WHEN minutes > 0 THEN 1 END) as starts,
  COUNT(CASE WHEN minutes >= 60 THEN 1 END) as full_appearances
FROM player_gameweek_stats
WHERE gameweek <= $1
GROUP BY player_id
```

### Changes

**Files Modified:**

1. **`src/lib/playerCalculator.ts`**
   - Updated `PlayerSeasonStats` interface to include all stats (not just total_points)
   - Renamed `calculatePlayerSeasonTotal()` → `calculatePlayerSeasonStats()` (returns full object)
   - Renamed `calculateAllPlayerSeasonTotals()` → `calculateAllPlayerSeasonStats()` (returns Map of full objects)
   - Both functions now aggregate ALL columns from `player_gameweek_stats`

2. **`src/app/api/players/route.ts`**
   - Updated to use `calculateAllPlayerSeasonStats()` instead of `calculateAllPlayerSeasonTotals()`
   - Now replaces ALL FPL bootstrap stats with K-110 calculated stats
   - Returns both K-110 stats (displayed) and original FPL stats (for comparison)
   - Logs discrepancies for verification

3. **`src/app/api/players/[id]/route.ts`**
   - Updated to use `calculatePlayerSeasonStats()` instead of `calculatePlayerSeasonTotal()`
   - `totals` object now includes all K-110 calculated stats
   - Added `starts` field (COUNT of GWs with minutes > 0)
   - Returns both K-110 stats (displayed) and original FPL stats (for comparison)

### Impact

- ✅ **Instant accuracy** for ALL player season stats (no 24-48h delay)
- ✅ **Players Tab** shows accurate cumulative stats immediately after GW sync
- ✅ **Player Detail Modal** shows accurate stats in "Stats" section
- ✅ **Consistent** - All stats use same K-108 data source
- ✅ **Performance** - Single batch query < 100ms for all 760 players

### Stats Now Calculated from K-108

| Category | Stats |
|----------|-------|
| **Points** | total_points |
| **Attacking** | goals, assists |
| **Appearances** | starts, full_appearances, minutes |
| **Bonus** | bonus, bps |
| **Defensive** | clean_sheets, goals_conceded, saves |
| **Discipline** | yellow_cards, red_cards |
| **Negatives** | own_goals, penalties_missed |
| **GK Specific** | penalties_saved |

**Note:** Expected stats (xG, xA, xGI) still use FPL bootstrap as they're not stored in `player_gameweek_stats`.

### Testing

After GW17 sync, Haaland should now show:
- ✅ Total: 151 pts (was already correct in v3.7.1)
- ✅ Goals: 18 (was 17 - now includes GW17)
- ✅ Starts: 17 (was 16 - now includes GW17)
- ✅ Minutes: 1,462 (was 1,372 - now includes GW17)
- ✅ Bonus: 31 (was 28 - now includes GW17)

### Relationship to K-108

| Feature | What It Does |
|---------|--------------|
| **K-108** | Player GW points (`calculated_points` column) |
| **K-108c** | Team GW totals (sum of player points) |
| **K-110 v3.7.1** | Player season total points (SUM of calculated_points) |
| **K-110 v3.7.3** | Player season ALL stats (SUM of ALL columns) ← **This release** |

---

## v3.7.2 - K-109 Phase 7: Fix Live Match Modal Bonus Double-Counting (Dec 23, 2025)

**Bug Fix:** Captain and Common Players in Live Match Modal were showing incorrect scores due to bonus being counted twice.

### The Bug

**Symptoms:**
- Haaland (TC) showing: **57 pts** ❌
- Should show: **48 pts** ✅
- Bonus points were being added to total_points (which already includes bonus), then multiplied by captain multiplier

**Example (Haaland TC):**
```
WRONG calculation:
- rawCaptainPoints = 16 (includes 3 bonus)
- captainBonusInfo.bonusPoints = 3
- captainPointsWithBonus = 16 + 3 = 19  ❌ (bonus counted twice!)
- captainPoints = 19 × 3 = 57 ❌

CORRECT calculation:
- rawCaptainPoints = 16 (includes 3 bonus)
- captainPoints = 16 × 3 = 48 ✅
```

### Root Cause

**File:** `src/lib/liveMatch.ts` lines 159-173

The code was adding bonus points to `rawCaptainPoints`, but FPL API's `total_points` **already includes bonus**. This caused bonus to be counted twice before applying the captain multiplier.

**Old Code (Bug):**
```typescript
const rawCaptainPoints = captainLive?.stats?.total_points || 0;
const captainBonusInfo = getBonusInfo(...);
const captainPointsWithBonus = rawCaptainPoints + (captainBonusInfo.bonusPoints || 0); // ❌ ADDS BONUS AGAIN!
const captainPoints = captainPointsWithBonus * captainMultiplier;
```

**New Code (Fixed):**
```typescript
const rawCaptainPoints = captainLive?.stats?.total_points || 0;
// FPL API total_points ALREADY includes bonus - just multiply
const captainPoints = rawCaptainPoints * captainMultiplier; // ✅ CORRECT!
// Get bonus info for display purposes only
const captainBonusInfo = getBonusInfo(...);
```

### Changes

**File Modified:**
- `src/lib/liveMatch.ts` - Fixed bonus double-counting in two sections:
  1. **Captain Section (lines 154-174):** Removed bonus addition before captain multiplier
  2. **Common Players Section (lines 960-989):** Removed bonus addition before captain multiplier

**Impact:**
- ✅ Live Match Modal captain points now accurate
- ✅ Triple Captain (TC) shows correct points (e.g., 16 × 3 = 48, not 57)
- ✅ Regular Captain (C) shows correct points (e.g., 16 × 2 = 32, not 35)
- ✅ Common Players section shows correct points (no more bonus double-counting)
- ✅ Bench section verified correct (no bug found)
- ✅ All sections now use total_points directly without adding bonus again
- ✅ No more user trust issues with conflicting scores

### Testing

**Test Case: Haaland TC with 16 base points (includes 3 bonus)**
- Before: 57 pts ❌ (bonus double-counted)
- After: 48 pts ✅ (correct: 16 × 3)

**Test Case: Regular captain with bonus**
- Before: Points + (bonus × 2) ❌
- After: Points × 2 ✅

### Technical Details

FPL API returns:
- `total_points`: Includes ALL points (base + bonus) ✅
- `bonus`: The bonus value (for display/reference only)

Captain calculation should:
- ✅ Use `total_points` directly (bonus already included)
- ✅ Multiply by captain multiplier (2 or 3)
- ✅ Store bonus value for display purposes only
- ❌ Never add bonus to total_points (would double-count)

### Related

This bug was introduced in K-63e when provisional bonus display was added. The comment "Add bonus to raw points BEFORE applying captain multiplier" was incorrect - the bonus is already in the raw points from FPL API.

**Bug Hunt Results:**
- ✅ Captain section - Bug found and FIXED
- ✅ Common Players section - Bug found and FIXED (same pattern)
- ✅ Bench section - Verified NO BUG (correctly uses total_points directly)

---

## v3.7.1 - K-110: Player Season Totals Single Source of Truth (Dec 23, 2025)

**Feature:** Calculate accurate player season totals from K-108 data instead of relying on stale FPL API bootstrap totals.

### The Problem

- **Players Tab Total:** Shows stale FPL bootstrap `total_points` (updated 24-48h after each GW)
- **GW Points:** Shows accurate K-108 `calculated_points` for individual gameweeks
- **Example:** Haaland GW17 = 16 pts (accurate), but season total = 135 (missing GW17), actual should be 151

### The Solution (K-110)

Calculate player season total by summing all K-108 `calculated_points`:

```sql
SELECT SUM(calculated_points) as season_total
FROM player_gameweek_stats
WHERE player_id = $1 AND gameweek <= $2
```

### Changes

**New File:**
- `src/lib/playerCalculator.ts` - Player season total calculation functions

**Updated Endpoints:**
- `/api/players` - Now shows K-110 calculated season totals for all 760 players
- `/api/players/[id]` - Player detail modal shows K-110 calculated total

**Functions Added:**
- `calculatePlayerSeasonTotal(playerId, throughGameweek)` - Single player
- `calculateAllPlayerSeasonTotals(throughGameweek)` - Batch for all players
- `getCurrentGameweek()` - Helper to determine GW to calculate through

### Impact

- ✅ **Instant accuracy** - No 24-48h delay waiting for FPL bootstrap update
- ✅ **Players Tab** - Shows accurate totals immediately after GW sync
- ✅ **Player Modal** - TOTAL stat box shows K-110 calculated total
- ✅ **Consistent** - Uses same K-108 data as individual GW points
- ✅ **Performance** - Batch query for all 760 players: < 100ms

### Example

**Before (Stale FPL Bootstrap):**
- Haaland: 135 pts (missing GW17's 16 pts)

**After (K-110 Calculated):**
- Haaland: 151 pts (135 + 16 = accurate!)

### Logging

```
[K-110] Calculating season totals for all players through GW17
[K-110] Calculated 458 player season totals in 87ms
[K-110] Haaland: FPL=135, K-110=151, Diff=16
```

### Technical Details

**API Response Changes:**
```typescript
// /api/players response now includes:
{
  total_points: 151,        // K-110 calculated total
  fpl_total_points: 135,    // Original FPL bootstrap (for comparison)
  // ... other fields
}

// /api/players/[id] response now includes:
{
  totals: {
    points: 151,            // K-110 calculated total
    fpl_points: 135,        // Original FPL bootstrap
    // ... other stats
  }
}
```

### Files Modified
- `src/lib/playerCalculator.ts` (NEW)
- `src/app/api/players/route.ts`
- `src/app/api/players/[id]/route.ts`
- `package.json` (v3.7.1)
- `VERSION_HISTORY.md`
- `README.md`

### Relationship to K-108/K-108c

| Feature | What It Does |
|---------|--------------|
| **K-108** | Player GW points (`calculated_points` column) |
| **K-108c** | Team GW totals (sum of player points) |
| **K-110** | Player season totals (sum of all GW points) |

K-110 builds on K-108 - it simply sums the `calculated_points` we already have.

---

## v3.7.0 - K-109 COMPLETE: Full K-108c Migration (Dec 23, 2025)

**MAJOR MILESTONE:** Complete migration to K-108c single source of truth across entire application.

### Changes

**Phase 5: My Team Endpoints**
- Migrated `/api/team/[teamId]/info` to use K-108c
- Migrated `/api/team/[teamId]/history` to use K-108c
- Replaced `calculateManagerLiveScore()` with `calculateTeamGameweekScore()`
- GW points and transfer costs now from K-108c (100% consistent)
- Fixes inconsistency where stat boxes used K-108c but info endpoint didn't

**Phase 6: League Stats Endpoints**
- Migrated `/api/league/[id]/stats/gameweek/[gw]` to use K-108c
- Migrated `/api/league/[id]/stats` (standings table) to use K-108c
- Replaced `calculateMultipleManagerScores()` with parallel K-108c calls
- All league-wide live scores now calculated with single source of truth
- League standings table now shows 100% accurate live GW scores

**Code Cleanup:**
- Removed all dependencies on old `scoreCalculator.ts` functions from production endpoints
- Only remaining usage: `/api/league/[id]/fixtures/[gw]/live` (live match modal - uses different pattern)
- Comprehensive `[K-109 Phase 5]` and `[K-109 Phase 6]` debug logging throughout

**Migration Summary:**
```
✅ My Team stat boxes (v3.6.2)
✅ My Team info endpoint (v3.7.0)
✅ My Team history modal (v3.7.0)
✅ My Team pitch view (v3.6.4)
✅ Rivals tab fixtures (v3.6.3)
✅ Stats GW rankings (v3.6.5)
✅ Stats GW winners (v3.7.0)
✅ Stats Season best/worst (v3.6.6)
✅ League standings table (v3.7.0)
```

### Files Modified
- `src/app/api/team/[teamId]/info/route.ts` - Migrated to K-108c
- `src/app/api/team/[teamId]/history/route.ts` - Migrated to K-108c
- `src/app/api/league/[id]/stats/gameweek/[gw]/route.ts` - Migrated to K-108c
- `src/app/api/league/[id]/stats/route.ts` - Migrated to K-108c
- `package.json` (v3.7.0)
- `VERSION_HISTORY.md`
- `README.md`

### Impact
- ✅ **100% consistency** - All endpoints use same calculation method
- ✅ **My Team** - Stat boxes, info, history, pitch view all show identical GW points
- ✅ **Rivals Tab** - H2H fixtures use K-108c
- ✅ **Stats GW** - Rankings and winners both use K-108c
- ✅ **Stats Season** - Best/worst GWs include live data from K-108c
- ✅ **League Standings** - Live GW scores in table use K-108c
- ✅ **No more double-counting** - Captain, chips, auto-subs, transfer costs all calculated once

### Technical Details

**Old Pattern (Removed):**
```typescript
const scores = await calculateMultipleManagerScores(entryIds, gw, status);
const score = await calculateManagerLiveScore(teamId, gw, status);
```

**New Pattern (K-108c):**
```typescript
const teamScore = await calculateTeamGameweekScore(teamId, gw);
const points = teamScore.points.net_total;

// For multiple managers (parallel):
const scores = await Promise.all(
  entryIds.map(id => calculateTeamGameweekScore(id, gw))
);
```

### Performance
- **My Team:** ~100ms (1 K-108c call)
- **Rivals Tab:** ~1-2s (10 K-108c calls in parallel)
- **Stats GW:** ~2-3s (20 K-108c calls in parallel)
- **League Standings:** ~2-3s (20 K-108c calls in parallel)
- **Stats Season:** ~2-3s during live GW (20 K-108c calls), ~50ms between GWs (DB only)

### Testing
1. Navigate to league 804742
2. Check My Team tab - all sections should show identical GW points
3. Check Rivals tab - fixtures should match FPL official scores
4. Check Stats > GW - rankings and winners should be consistent
5. Check Stats > Season - best GWs should include current GW when live
6. Check Overview standings table - live GW scores should be accurate
7. Look for `[K-109 Phase 5]` and `[K-109 Phase 6]` logs in console

### What's Left?
- Live match modal (`/api/league/[id]/fixtures/[gw]/live`) - Optional, uses different pattern with pre-fetched data

### Related
- K-108: Player points (100% accuracy)
- K-108c: Team totals calculation
- K-109 Phases 1-6: Complete application migration (✅ DONE)

---

## v3.6.6 - K-109 Phase 4: Stats Season Tab Uses K-108c for Live GW (Dec 23, 2025)

**Feature:** Hybrid approach for Stats > Season tab - database for completed GWs, K-108c for live GW.

### Changes

**Season Stats API Hybrid Approach:**
- Updated `/api/league/[id]/stats/season` to detect current GW status
- Best/Worst Gameweeks now uses K-108c for live/current GW
- Completed GWs continue using fast database queries
- Live GW scores calculated in parallel for all 20 managers

**BestWorstGameweeks Function:**
- Added current GW status detection (completed vs in_progress vs upcoming)
- Database query for completed GWs only
- K-108c parallel calculation for live GW
- Merged results for complete historical + live view
- Comprehensive debug logging with `[K-109 Phase 4]` prefix

**Frontend Debug Logging:**
- Added console logging to `BestWorstGW` component
- Shows unique GWs in dataset to verify live GW inclusion
- Logs top 3 best/worst scores for verification

**Code Pattern:**
```typescript
// Completed GWs from DB (fast)
const dbScores = await db.query(/* ... */);

// If current GW is live, add K-108c scores
if (currentGW && currentGWStatus !== 'completed') {
  const liveScores = await Promise.all(
    managers.map(m => calculateTeamGameweekScore(m.entry_id, currentGW))
  );
  allScores = [...dbScores, ...liveScores];
}
```

### Files Modified
- `src/app/api/league/[id]/stats/season/route.ts` - Added K-108c hybrid logic
- `src/components/Stats/season/BestWorstGW.tsx` - Added debug logging
- `package.json` (v3.6.6)
- `VERSION_HISTORY.md`
- `README.md`

### Impact
- ✅ Best/Worst Gameweeks includes current GW scores when live
- ✅ Historical data still uses fast DB queries
- ✅ Season stats now show complete picture during live GWs
- ✅ Consistent with K-109 hybrid approach

### Performance
- **During live GW:** 20 K-108c calls + DB queries (~2-3s total)
- **Between GWs:** DB queries only (~50-100ms)
- Only calculates live scores when current GW is in_progress

### Testing
- Navigate to league 804742 > Stats > Season tab
- During live GW: verify Best Gameweeks includes current GW
- Check console for `[K-109 Phase 4]` logs showing hybrid calculation
- Between GWs: verify fast DB-only response

### Related
- K-108: Player points (100% accuracy)
- K-108c: Team totals calculation
- K-109 Phase 1: My Team stat boxes (✅ Complete)
- K-109 Phase 2: Rivals tab (✅ Complete)
- K-109 Phases 2-4: My Team pitch view (✅ Complete)
- K-109 Phase 3: Stats GW rankings (✅ Complete)
- K-109 Phase 4: Stats Season tab (✅ Complete)

---

## v3.6.5 - K-109 Phase 3: Stats GW Rankings Uses K-108c (Dec 23, 2025)

**Feature:** Integrated K-108c single source of truth into Stats > GW tab rankings.

### Changes

**Stats > GW Tab Integration:**
- Updated `/api/league/[id]/stats/gameweek/[gw]/rankings` to use K-108c
- Replaced dual-path logic (completed vs live) with single K-108c calculation
- All 20 managers now calculated in parallel using `calculateTeamGameweekScore()`
- Added comprehensive [K-109 Phase 3] debug logging to API endpoint

**Frontend Debug Logging:**
- Added console logging to `GWPointsLeaders` component
- Added console logging to `GWRankingsModal` component
- Logs show data flow from API to frontend components

**Code Simplification:**
- Removed status detection (completed vs live) - K-108c handles both
- Simplified from ~170 lines with dual paths to ~100 lines single path
- Consistent error handling with 0 points fallback

### Files Modified
- `src/app/api/league/[id]/stats/gameweek/[gw]/rankings/route.ts` - Complete rewrite using K-108c
- `src/components/Stats/sections/GWPointsLeaders.tsx` - Added debug logging
- `src/components/Stats/GWRankingsModal.tsx` - Added debug logging
- `package.json` (v3.6.5)
- `VERSION_HISTORY.md`
- `README.md`

### Impact
- ✅ Stats > GW rankings now 100% accurate for all gameweeks
- ✅ No more dual-path logic complexity (completed vs live)
- ✅ Consistent calculation across entire app (My Team, Rivals, Stats)
- ✅ Parallel processing for performance with 20 managers

### Testing
- Test with league 804742, navigate to Stats > GW tab
- Check GW17 (or any completed GW) rankings
- Verify all 20 managers show correct points
- Look for `[K-109 Phase 3]` console logs in both API and frontend
- Click "View Full Rankings" to open modal and verify display

### Related
- K-108: Player points (100% accuracy)
- K-108c: Team totals calculation
- K-109 Phase 1: Stat boxes (✅ Complete)
- K-109 Phase 2: Rivals tab (✅ Complete)
- K-109 Phases 2-4: My Team pitch view (✅ Complete)
- K-109 Phase 3: Stats GW rankings (✅ Complete)

---

## v3.6.4 - K-109 Phases 2-4: My Team Pitch View Uses K-108c (Dec 23, 2025)

**Feature:** Complete My Team integration with K-108c - pitch view, auto-subs, and player modal.

### Changes

**Phase 2: Pitch View Player Cards**
- Updated `/api/team/[teamId]/gameweek/[gw]` to use K-108c
- Player points now from `player_gameweek_stats.calculated_points` (100% accurate)
- Removed dependency on old `calculateManagerLiveScore()`
- Simplified endpoint: fetch from DB, enrich with FPL API data
- Returns same format so frontend works without changes

**Phase 3: Auto-Sub Indicators**
- Auto-sub flags now from K-108c `auto_subs` data
- `is_sub_in` and `is_sub_out` flags set correctly
- Frontend already has visual indicators (will be enhanced later)
- Console logs show auto-sub count for debugging

**Phase 4: Player Modal Breakdown**
- Added K-108c breakdown to API response
- Includes: starting_xi_total, captain_bonus, bench_boost_total, auto_sub_total
- Player modal can now show accurate score breakdown
- Transfer costs correctly displayed

**Code Cleanup:**
- Removed old scoreCalculator dependency from My Team
- New endpoint is 212 lines vs old 260+ lines (cleaner)
- All K-108 data from single source (database)
- Consistent with Rivals tab implementation

### Files Modified
- `src/app/api/team/[teamId]/gameweek/[gw]/route.ts` - Complete rewrite using K-108c
- `package.json` (v3.6.4)
- `VERSION_HISTORY.md`
- `README.md`

### Impact
- ✅ My Team pitch view shows 100% accurate points
- ✅ Auto-sub indicators work correctly from K-108c data
- ✅ Player modal has full score breakdown
- ✅ Consistent calculation across entire app (My Team, Rivals, Stats)

### Testing
- Test with league 804742, select your team
- Navigate to My Team tab
- Check GW17 (or any completed GW)
- Verify player points match FPL exactly
- Look for `[K-109 Phase 2]` and `[K-109 Phase 3]` console logs

### Related
- K-108: Player points (100% accuracy)
- K-108c: Team totals calculation
- K-109 Phase 1: Stat boxes (✅ Complete)
- K-109 Phases 2-4: Pitch view (✅ Complete)

---

## v3.6.3 - K-109 Phase 2: Rivals Tab Uses K-108c (Dec 23, 2025)

**Feature:** Replaced complex score calculations in Rivals tab with K-108c single source of truth.

### Changes

**Shared Score Calculation Function:**
- Created `calculateTeamGameweekScore()` in `teamCalculator.ts`
- Single source of truth for team score calculations
- Used by both Rivals tab and future endpoints
- Returns full breakdown: points, chips, auto-subs, transfer costs

**Rivals Tab Integration:**
- Updated `/api/league/[id]/fixtures/[gw]` to use K-108c
- Replaced `calculateMultipleManagerScores()` with `calculateScoresViaK108c()`
- All 10 H2H fixture scores now use K-108c (100% accurate)
- Added [K-109 Phase 2] debug logging throughout

**Code Cleanup:**
- Removed dependency on old `scoreCalculator.ts` in fixtures endpoint
- Kept K-108c endpoint unchanged (needs detailed pick data for response)
- Simplified score calculation logic with shared function

### Files Modified
- `src/lib/teamCalculator.ts` - Added `calculateTeamGameweekScore()` function
- `src/app/api/league/[id]/fixtures/[gw]/route.ts` - Use K-108c for all scores

### Impact
- ✅ All Rivals tab H2H scores 100% accurate (match FPL official)
- ✅ Captain, chips, auto-subs, transfer costs all correctly calculated
- ✅ Shared function ensures consistency across all endpoints
- ✅ Performance: Parallel score calculations for all managers

### Testing
- Test with league 804742, GW17
- Verify all 10 H2H fixture scores match FPL
- Check console logs for `[K-109 Phase 2]` messages

### Related
- K-108: Player points calculation (100% accuracy)
- K-108c: Team totals endpoint
- K-109 Phase 1: My Team stat boxes (✅ Complete)
- K-109 Phase 2: Rivals tab integration (✅ Complete)

---

## v3.6.2 - K-109 Phase 1: My Team Stat Boxes Use K-108c (Dec 23, 2025)

**Feature:** Integrated K-108c team totals calculation into My Team stat boxes for 100% accuracy.

### Changes

**My Team Tab Integration (K-109 Phase 1):**
- Updated stat boxes to fetch from `/api/gw/[gw]/team/[teamId]` (K-108c endpoint)
- GW Points now uses `points.net_total` from K-108c (100% accurate, validated)
- Transfer Cost uses `points.transfer_cost` from K-108c
- Other stats (overall points, rank, team value) still from existing `/api/team/[teamId]/info`
- Updated both initial fetch and manual refresh logic

**Bug Fixes:**
- Fixed TypeScript error in `teamCalculator.ts` - bench boost can't have triple captain
- Fixed Map iteration in test scripts for TypeScript strict mode compatibility

### Files Modified
- `src/components/Dashboard/MyTeamTab.tsx` - Updated fetchStats() and handleRefresh() to use K-108c
- `src/lib/teamCalculator.ts` - Fixed captain multiplier logic in bench boost block
- `src/scripts/test-provisional-bonus.ts` - Fixed Map.entries() iteration
- `src/scripts/test-team-totals.ts` - Fixed Map.entries() iteration

### Impact
- ✅ My Team GW points now 100% accurate (matches FPL official totals)
- ✅ Transfer costs display correctly from K-108c calculation
- ✅ No breaking changes - incremental integration (Phase 1 only)
- ✅ Build passes TypeScript strict checks

### Next Steps
- Phase 2: Update pitch view player cards (TBD)
- Phase 3: Add auto-sub indicators (TBD)
- Phase 4: Update player modal (TBD)

### Related
- K-108: Single Source of Truth for player points (100% accuracy)
- K-108b: Provisional bonus calculation
- K-108c: Team totals with chips and auto-subs
- K-109: My Team integration (Phase 1 of 4)

---

## v3.6.1 - CRITICAL: Fix Provisional Bonus for Completed GWs (K-106a) (Dec 23, 2025)

**Critical Bug Fix:** Provisional bonus points were being added to player scores even for completed gameweeks, causing significant point inflation.

### Problem

For completed GWs, the FPL API's `total_points` field already includes official bonus points. The app was incorrectly adding provisional bonus on top of this, double-counting bonus for any player who earned it.

**Example:**
- Haaland GW17 official points: 16 (includes 3 bonus already)
- App calculated: 16 + 3 provisional = 19 ❌
- With Triple Captain: 19 × 3 = 57 pts ❌
- Correct: 16 × 3 = 48 pts ✅

### Root Cause

`/api/team/[teamId]/gameweek/[gw]/route.ts` (line 189) was calling `calculateProvisionalBonus()` without checking if the gameweek was completed. For completed GWs, `player.points` from `scoreCalculator` already contains official bonus baked into `total_points`.

### Solution

Added status check before calculating provisional bonus:
```typescript
const provisionalBonus = status === 'completed' ? 0 : calculateProvisionalBonus(player.id, fixturesData);
```

### Files Modified
- `src/app/api/team/[teamId]/gameweek/[gw]/route.ts` - Added GW status guard (line 191)

### Impact
- ✅ Completed GW scores now match FPL official totals
- ✅ Captain multipliers apply to correct base (Haaland TC: 48 not 57)
- ✅ Live GWs still show provisional bonus correctly
- ✅ No impact on other score calculations (`liveMatch.ts` already had this check)

### Testing
- Verified: GW17 completed, Haaland with 3 bonus
  - TC (×3): Shows 48 pts ✅ (was 57 ❌)
  - C (×2): Shows 32 pts ✅ (was 38 ❌)

### Related
- Investigation: K-105 (Score Calculation Architecture)
- Bug discovered during architecture review

---

## 📚 Version History Index

This project's complete version history has been split into multiple files for better readability and maintainability. Each file contains detailed changelogs for its respective version range.

### Current & Recent Versions

- **[v3.5-v3.6 (Dec 22, 2025)](./version-history/v3.5-v3.6.md)** - Mobile Optimization & UI Polish
  - v3.6.0: Mobile Optimization & UI Polish (K-97 to K-103)
  - v3.5.x: Layout Consistency Release (K-75 to K-103)
  - 19 versions

- **[v3.3-v3.4 (Dec 19-22, 2025)](./version-history/v3.3-v3.4.md)** - Bugfixes & Polish
  - v3.4.x: Admin panel fixes, error handling, BPS improvements (K-55 to K-87)
  - v3.3.x: Mobile UI polish, responsive headers, GW rankings (K-49 to K-54)
  - 71 versions

- **[v3.1-v3.2 (Dec 18-19, 2025)](./version-history/v3.1-v3.2.md)** - UI Improvements
  - v3.2.x: Responsive labels, header improvements (K-49 to K-50)
  - v3.1.x: Value rankings, player modal fixes
  - 27 versions

- **[v2.7-v3.0 (Dec 16-18, 2025)](./version-history/v2.7-v3.0.md)** - Database Caching & Infrastructure
  - v3.0.x: Sync infrastructure, performance optimizations
  - v2.9.x: Quick sync, auto-sync progress
  - v2.8.x: Manual refresh, admin endpoints
  - v2.7.x: K-27 Database Caching & Hotfixes
  - 53 versions

- **[v2.5-v2.6 (Dec 14-16, 2025)](./version-history/v2.5-v2.6.md)** - Players Tab & Features
  - v2.6.x: Players Tab Database Integration
  - v2.6.0-alpha: Players Tab Foundation
  - v2.5.x: Player Features & UI Polish (30 versions)

### Previous Major Versions

- **[v2.4 Part 2 (Dec 12-14, 2025)](./version-history/v2.4-part2.md)** - My Team Mobile-First
  - RivalFPL branding, breakpoint fixes, pitch redesign
  - FPL-style player cards, desktop layout fixes
  - 21 versions

- **[v2.4 Part 1 (Dec 10-12, 2025)](./version-history/v2.4-part1.md)** - My Team Mobile-First
  - GW selector, transfers display, stat boxes
  - Formation layout, responsive design
  - 24 versions

- **[v2.2-v2.3 (Dec 2025)](./version-history/v2.2-v2.3.md)** - My Team UI Polish & Redesign
  - v2.3.x: My Team UI Polish & Mobile Optimization
  - v2.2.x: My Team Redesign

- **[v2.0-v2.1 (Dec 2025)](./version-history/v2.0-v2.1.md)** - Multi-League Support
  - v2.0.x: **MAJOR MILESTONE** - Multi-league support
  - v2.1.x: League management improvements

### Legacy Versions

- **[v1.x (Oct-Dec 2024)](./version-history/v1.x.md)** - Foundation & Initial Features
  - v1.26.x: Large League Support & Error Handling
  - v1.25.x: Position History & Reddit Launch
  - v1.24.x: Live Match Modal & Analytics
  - v1.23.x - v1.0.0: Core features and foundation

---

## 🚀 Quick Reference

### Latest Changes (v3.6.0 - Dec 22, 2025)

**Major Release:** Comprehensive mobile optimization and UI improvements

- **K-103**: Shortened GW labels in tables (removed "GW" prefix, saved ~17px per cell)
- **K-102**: Tightened Players tab columns for mobile (390px screens now fit all 5 columns)
- **K-101**: Matched Season GWs text style to Players count (consistent styling)
- **K-100**: Optimized Players tab header (reduced from 4 rows to 3, saved ~40px)
- **K-99**: Updated Stats Team grid (added RANK, removed redundant header)
- **K-98**: Added team name to My Team header (with truncation for long names)
- **K-97**: Fixed Season Statistics header (shortened label, matched nav bar styling)

### Recent Highlights

- **v3.6.0**: Mobile Optimization & UI Polish (7 improvements)
- **v3.5.0**: Layout Consistency Release (K-81 to K-87 fixes)
- **v3.4.x**: Admin panel analytics, error handling, BPS live updates
- **v3.3.0**: Mobile UI polish, GW rankings, responsive headers
- **v3.0.0**: Sync Infrastructure Release
- **v2.9.0**: Auto-sync progress bar on first league load
- **v2.8.0**: Auto-sync league data on first load
- **v2.7.0**: K-27 Comprehensive Database Caching (5 new tables, 10 new scripts)
- **v2.6.7**: Players tab database integration complete
- **v2.5.12**: Defensive Contribution points (DEFCON)
- **v2.5.11**: FPL-style player points breakdown
- **v2.5.0**: Players database schema + sync job + API endpoints
- **v2.4.x**: Major My Team mobile-first redesign (45+ versions)
- **v2.0.0**: Multi-league support (MAJOR MILESTONE)

---

## 🔗 Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Project context and development guidelines
- [README.md](./README.md) - Project overview and setup instructions
- [DATABASE.md](./DATABASE.md) - Database schema and sync scripts
- [ENDPOINTS.md](./ENDPOINTS.md) - API endpoints reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Project architecture and data flow
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

---

**Note:** For complete detailed changelogs, see the individual version files linked above. Each file contains comprehensive descriptions, problem statements, solutions, and technical details for every version release.
