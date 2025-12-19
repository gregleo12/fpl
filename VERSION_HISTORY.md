# FPL H2H Analytics - Version History

**Project Start:** October 23, 2024
**Total Releases:** 275+ versions
**Current Version:** v3.3.16 (December 19, 2025)

---

## v3.3.16 - K-54c: Reduce Players Tab PLAYER Column Width (Dec 19, 2025)

**UI IMPROVEMENT:** Reduced PLAYER column width by 20% to save horizontal space on mobile and adjusted VALUE header to just "£" symbol.

### Changes Made

**1. PLAYER Column Width Reduction**

Reduced sticky PLAYER column width by 20% across all breakpoints:

| Breakpoint | Before | After | Reduction |
|------------|--------|-------|-----------|
| Desktop | 160px | 128px | -32px |
| Tablet (768px) | 140px | 112px | -28px |
| Mobile (480px) | 130px | 104px | -26px |

**2. VALUE Header Update**

Changed VALUE column header from "Value" to just "£" for more compact display:
- **Before:** `Value` (5 characters)
- **After:** `£` (1 character)

### Impact
- Saves 20-25% horizontal space in PLAYER column
- Long player names truncate with ellipsis (`...`) - already implemented
- More compact VALUE header saves additional space
- Better mobile fit on 390px screens
- More room for stats columns

**Example Compact Stats headers:**
```
PLAYER          £       %      PT
```

**Example row with truncation:**
```
Haaland FWD·MCI   15.0m   73.3%   135
Alexander-Ar...   7.5m    45.2%   89
```

**Files Modified:**
- `/src/components/Players/columns.ts` - Changed "Value" label to "£"
- `/src/components/Players/PlayersTab.module.css` - Reduced .playerHeader and .playerCell min-width by 20%

**Note:** Player name truncation with ellipsis was already implemented via existing CSS:
```css
.playerName {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

---

## v3.3.15 - K-54c: Players Tab Column Formatting Updates (Dec 19, 2025)

**UI IMPROVEMENT:** Improved Players tab column labels and value formatting for better mobile display and clarity.

### Changes Made

**Compact Stats View:**

| Column | Before | After |
|--------|--------|-------|
| Value header | £ | Value |
| Value format | £15.0m | 15.0m |
| TSB header | TSB | % |
| TSB format | 73.30% | 73.3% (1 decimal) |
| Points header | Pts | PT |
| Form format | 6.60 | 6.6 (1 decimal) |

**Example Compact Stats row:**
```
PLAYER              Value    %       PT    Form
Haaland FWD·MCI     15.0m   73.3%   135   6.6
```

**All Stats View:**

| Column | Before | After |
|--------|--------|-------|
| TSB header | TSB | % |
| TSB format | 73.30% | 73.3% (1 decimal) |
| Total Points header | Total | PT |
| Points/Game header | Pts/G | PT/G |

### Impact
- More compact column headers (£ → Value, TSB → %, Pts → PT)
- Cleaner value display without redundant symbols
- Consistent 1-decimal precision for percentages and form
- Better mobile fit - shorter headers and values save horizontal space
- Clearer data visualization

**Files Modified:**
- `/src/components/Players/columns.ts` - Updated COMPACT_COLUMNS and ALL_COLUMNS definitions

**Technical Details:**
- Removed £ symbol from value format (now handled by "m" suffix)
- Changed TSB format from `${v}%` to `${parseFloat(v).toFixed(1)}%`
- Added form format to show 1 decimal: `parseFloat(v).toFixed(1)`
- Standardized all "Pts" references to "PT" for consistency

---

## v3.3.14 - K-54c: Fix Players Tab Sticky Column Transparency (Dec 19, 2025)

**BUG FIX:** Fixed transparent background on sticky PLAYER column that caused scrolling content to show through.

### Problem
When horizontally scrolling the Players table, data columns scrolled behind the sticky PLAYER column and were partially visible through the transparent background. This caused values like "5.0m" to appear instead of "£15.0m" (with £1 hidden behind the column).

### Solution
Made all sticky column backgrounds fully opaque:

**Before:**
```css
.playerHeader {
  background: rgba(0, 0, 0, 0.3); /* 30% opaque - transparent */
}

.row:hover .playerCell {
  background: rgba(26, 26, 46, 0.98); /* 98% opaque - slightly transparent */
}
```

**After:**
```css
.playerHeader {
  background: #0e0a1f; /* Fully opaque */
}

.row:hover .playerCell {
  background: #1a1a2e; /* Fully opaque */
}
```

### Impact
- No more content showing through sticky column when scrolling
- Clean separation between sticky PLAYER column and scrolling data columns
- All price values and stats fully visible
- Works in both Compact Stats and All Stats views

**Files Modified:**
- `/src/components/Players/PlayersTab.module.css` - Made sticky column backgrounds solid

---

## v3.3.13 - K-54c: Merge RESULT and MARGIN Columns in Match History (Dec 19, 2025)

**UI IMPROVEMENT:** Combined RESULT and MARGIN columns into a single compact RESULT column showing "W +11" or "L -2" format for better mobile display.

### Changes Made

**Table Column Reduction:**
- **Before:** 6 columns (GW | Opponent | Score | Chips | Result | Margin)
- **After:** 5 columns (GW | Opponent | Score | Chips | Result)

**New RESULT Format:**
- Win: `W +11` (green text)
- Loss: `L -2` (red text)
- Draw: `D 0` (grey text)

**Impact:**
- Reduced table width by 16% (6 columns → 5 columns)
- Better mobile fit on 390px screens (iPhone 12 Pro)
- Result and margin now displayed together logically
- Maintains color coding for quick visual scanning
- No horizontal scroll needed

**Files Modified:**
- `/src/components/Stats/MyTeamView.tsx` - Merged columns in Match History table

**Technical Details:**
- Removed separate `<th>Margin</th>` header
- Combined result letter and margin value in single cell
- Color applied to entire cell based on W/L/D result
- Format: `{result} {margin > 0 ? '+' : ''}{margin}`

---

## v3.3.12 - Swap RESULT and MARGIN Columns in Match History (Dec 19, 2025)

**UI IMPROVEMENT (SUPERSEDED BY v3.3.13):** Swapped the order of RESULT and MARGIN columns.

**UI IMPROVEMENT:** Swapped the order of RESULT and MARGIN columns in Match History table for better visual flow.

### Changes Made
- Match History table column order changed from:
  - **Before:** GW | Opponent | Score | Chips | Margin | Result
  - **After:** GW | Opponent | Score | Chips | Result | Margin

**Impact:**
- Result badge (W/D/L) now appears before margin value
- More logical flow: see the result first, then the margin
- Maintains all existing styling and functionality

**Files Modified:**
- `/src/components/Stats/MyTeamView.tsx` - Swapped table header and cell order

---

## v3.3.11 - K-54c Tweak: Increase Edge Padding to 6px (Dec 19, 2025)

**UI ADJUSTMENT:** Increased edge padding from 4px to 6px (50% more) for better visual breathing room on mobile.

### Changes Made
- Adjusted container padding from 4px to 6px
- Provides slightly more comfortable edge spacing while maintaining the edge-to-edge feel
- Total gap is now 6px on each side instead of 4px

**Visual Impact:**
- Before: 4px gap (very tight to edges)
- After: 6px gap (comfortable edge-to-edge)
- Still significantly more compact than original 16px gap

**Files Modified:**
- `/src/components/Stats/StatsHub.module.css` - Padding change from 4px to 6px

---

## v3.3.10 - K-54c HOTFIX: Stats Tab - Edge-to-Edge Containers Fix (Dec 19, 2025)

**BUG FIX:** Fixed edge-to-edge implementation by using negative margins to compensate for parent container padding.

### Problem
v3.3.9 attempted to reduce edge padding to 4px, but the parent `.content` container (from dashboard page) has 1rem (16px) padding on mobile. The total gap was still 20px (16px parent + 4px container), not the desired 4px.

### Solution
Used negative margins on StatsHub container to pull content back to the edges:

```css
@media (max-width: 480px) {
  .container {
    /* Compensate for parent .content padding (1rem = 16px) */
    margin-left: -1rem;
    margin-right: -1rem;
    /* Then add back the desired 4px padding */
    padding: 4px;
    background: transparent;
    box-shadow: none;
  }
}
```

**Math:**
- Parent `.content` padding: 16px (pushes content in)
- Container negative margin: -16px (pulls content back out)
- Container padding: 4px (final desired gap)
- **Result: 16px - 16px + 4px = 4px total gap ✓**

### Impact
- Content now truly nearly touches phone edges (4px gap)
- Maximizes screen real estate on mobile
- Cleaner, more immersive interface

### Technical Details

**Files Modified:**
- `/src/components/Stats/StatsHub.module.css` - Added negative margins

**Root Cause:**
- Dashboard page's `<main className={styles.content}>` wrapper has built-in padding for ALL tabs
- Stats tab needed to override this padding without affecting other tabs

**Applies To:**
- Team tab (MyTeamView)
- GW tab (GameweekView)
- Season tab (SeasonView)
- Players tab (PlayersTab)

**Target Device:** iPhone 12 Pro (390px width) and similar mobile devices

---

## v3.3.9 - K-54c: Stats Tab - Edge-to-Edge Containers (Dec 19, 2025)

**UI IMPROVEMENT (INCOMPLETE - SEE v3.3.10):** First attempt at reducing edge padding. Worked partially but didn't account for parent container padding.

---

## v3.3.8 - K-54b: Stats Team Tab - Content & Bug Fixes (Dec 19, 2025)

**BUG FIX + CONTENT:** Fixed horizontal overflow bug and improved content clarity in Stats Team tab following K-54a CSS changes.

### Changes Made

**1. Shortened Section Titles (No Wrapping on Mobile)**

Reduced title lengths to prevent wrapping on narrow screens:

| Before | After |
|--------|-------|
| League Position Over Time | Position History |
| Chips Faced Against | Chips Faced |
| Recent Form (Last 5) | Form (Last 5) |

**Impact:** All section titles now fit on single line at 390px width (iPhone 12 Pro).

**2. Simplified Chip Labels in Match History**

Removed verbose prefixes from chip badges in Match History table:

**Before:**
```
┌──────────┐  ┌──────────┐
│ YOU: FH  │  │ OPP: WC  │
└──────────┘  └──────────┘
```

**After:**
```
┌──────┐  ┌──────┐
│  FH  │  │  WC  │
└──────┘  └──────┘
```

Color coding distinguishes ownership:
- Green badge with green border = Your chip
- Pink badge with pink border = Opponent chip

**Impact:**
- Cleaner, more compact chip display
- Color distinction remains clear
- Saves horizontal space in table

**3. Fixed Horizontal Overflow Bug**

Added CSS rules to prevent content from being cut off or causing horizontal scrolling:

**Container-level fixes:**
```css
.myTeamTab {
  overflow-x: hidden; /* Prevent horizontal overflow */
  max-width: 100vw; /* Ensure container doesn't exceed viewport */
}

.section {
  margin-left: 0; /* No negative margins */
  margin-right: 0; /* No negative margins */
}
```

**Table-level fixes:**
```css
.table {
  width: 100%;
  overflow-x: auto; /* Allow horizontal scroll for tables if needed */
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

.table th,
.table td {
  white-space: nowrap; /* Prevent text wrapping */
  overflow: hidden; /* Hide overflowing content */
  text-overflow: ellipsis; /* Show ellipsis for cut-off text */
}
```

**Impact:**
- No content cut off on left side
- Tables can scroll horizontally if needed (won't push other content)
- Smooth touch scrolling on iOS devices
- Long text truncated with ellipsis instead of causing overflow

### Technical Details

**Files Modified:**
- `/src/components/Stats/MyTeamView.tsx` - Title and chip label changes
- `/src/components/Dashboard/PositionHistory.tsx` - Title change
- `/src/components/Dashboard/Dashboard.module.css` - Overflow fixes

**Component Changes:**
- Changed 3 section title strings
- Removed "You: " and "Opp: " prefixes from chip labels (2 locations)

**CSS Changes:**
- Added overflow-x: hidden to .myTeamTab
- Added max-width: 100vw to .myTeamTab
- Set margins to 0 on .section
- Added table overflow handling with touch scrolling
- Added text-overflow: ellipsis for table cells

### Before/After Summary

**Section Titles:**
- ❌ "League Position Over Time" (wraps on mobile)
- ✅ "Position History" (single line)

**Chip Labels:**
- ❌ "YOU: FH" and "OPP: WC" (verbose)
- ✅ "FH" (green) and "WC" (pink) - color-coded

**Overflow Bug:**
- ❌ Content cut off on left side
- ✅ All content visible, proper scrolling

### Files Modified
- `/src/components/Stats/MyTeamView.tsx`
- `/src/components/Dashboard/PositionHistory.tsx`
- `/src/components/Dashboard/Dashboard.module.css`

### Result
- All section titles fit on single line ✅
- No "YOU:" or "OPP:" prefixes in chip labels ✅
- Color distinction (green vs pink) remains clear ✅
- No horizontal overflow or content cut-off ✅
- Tables scroll smoothly if needed ✅
- Works on iPhone 12 Pro (390px) and similar devices ✅

---

## v3.3.7 - K-54a: Stats Team Tab - CSS Compact Layout for Mobile (Dec 19, 2025)

**UI IMPROVEMENT:** Compacted Stats Team tab layout for mobile devices (iPhone 12 Pro: 390px width) with CSS-only changes for better content density.

### Problem
Stats Team tab wasted excessive space on mobile:
- Containers narrower than bottom nav bar
- Too much internal padding
- Oversized sections requiring excessive scrolling
- Large stat boxes and form circles

### Solution
Applied aggressive CSS compaction targeting 390px-480px mobile devices:

**1. Container Width Optimization**
- Reduced side padding from default to 8px
- Containers now visually match nav bar width (edge-to-edge feel)
- Reduced gap between sections from 12px → 10px

**2. Section Internal Padding Reduction (30-40%)**
- Section padding: 24px → 10px 12px
- Section margin-bottom: 12px → 10px
- ~50% reduction in vertical spacing

**3. Section Title Compaction**
- Title font size: 1.125rem → 0.875rem
- Subtitle font size: 0.75rem → 0.6875rem
- Reduced margin below title to 8px

**4. Performance Grid (~25% Smaller)**
- Grid gap: 12px → 6px
- Stat card padding: 14px 10px → 8px 6px
- Stat card min-height: 70px → 60px
- Stat value font: 1.5rem → 1.4rem
- Stat label font: 0.625rem → 0.6rem
- Vertical gap between grids: 12px → 8px

**5. Recent Form Compaction**
- Form circles: 48px → 36px (25% smaller)
- Circle font size: 1.125rem → 0.8rem
- GW label font: 0.6875rem → 0.6rem
- Tighter spacing between label and circle

**6. Team Header Compaction**
- Manager name: 2rem → 1.5rem
- Team name subtitle: 1.1rem → 0.9rem
- Reduced margin between name and subtitle
- Rank badge padding: 6px 10px → 8px 12px
- Rank number: 1.25rem → 1.5rem

**7. Season Stats Grid**
- Uses same compaction as Performance grid
- All stat boxes ~25% smaller
- Labels remain readable at reduced sizes

**8. Tables and Chips**
- Table cell padding: 0.5rem 0.35rem → 0.4rem 0.3rem
- Chips summary padding: 1rem → 0.75rem
- Empty state padding: 3rem → 2rem

### Technical Details

**File Modified:**
- `/src/components/Dashboard/Dashboard.module.css`

**Media Query:**
- `@media (max-width: 480px)` - targets iPhone 12 Pro (390px) and similar devices

**CSS Approach:**
- All changes via CSS only - no component changes
- Same content, better density
- Uses `!important` flags where needed to override existing breakpoint styles
- Progressive enhancement approach (works on all devices, optimized for mobile)

**Sizing Strategy:**
- Reduced padding by 30-50%
- Reduced font sizes by 10-25%
- Reduced spacing/gaps by 30-40%
- Maintained 4-column grid layout (proven optimal)
- Preserved all functionality and readability

### Impact

**Before (Default Mobile):**
- Section padding: 24px
- Stat boxes: Large with 12px gaps
- Form circles: 48px
- Excessive scrolling required

**After (Compact Layout):**
- Section padding: 10-12px
- Stat boxes: Compact with 6px gaps
- Form circles: 36px
- Reduced scrolling, more content visible
- Containers match nav bar width

### Testing Notes

All sizing remains readable on:
- iPhone 12 Pro (390px width)
- iPhone SE (375px width)
- Standard Android phones (360-400px)

Desktop and tablet layouts unaffected - changes only apply to mobile breakpoint.

### Files Modified
- `/src/components/Dashboard/Dashboard.module.css`

### Result
- Containers match nav bar width ✅
- Internal padding reduced by 30-50% ✅
- Performance grid ~25% smaller ✅
- Recent Form circles reduced from 48px → 36px ✅
- Season Stats compact ✅
- Section titles smaller, don't wrap ✅
- All text still readable ✅
- No desktop regressions ✅

---

## v3.3.6 - GW Points Leaders - Move PTS Inline (Dec 19, 2025)

**UI IMPROVEMENT:** Changed PTS label placement from below the number to inline with the number for cleaner layout.

### Change Made

**Before:**
```
111
PTS
```

**After:**
```
111 PTS
```

### Technical Details
- PTS now appears inline with the number using a `<span>` element
- Maintains same styling: 0.625rem, uppercase, grey (50% opacity)
- Matches layout pattern used in Season tab components

### Font Size Reference
For future reference:
- **Manager name:** 0.9375rem (`.itemName`)
- **Team name:** 0.8125rem (`.itemMeta`) - grey, smaller

### Files Modified
- `/src/components/Stats/sections/GWPointsLeaders.tsx`

### Result
- PTS now inline with number ✅
- Cleaner, more compact layout ✅
- Consistent with Season tab styling ✅

---

## v3.3.5 - K-52c: GW Points Leaders - Fix Team Name Styling (Dec 19, 2025)

**BUG FIX:** Fixed team name styling in GW Points Leaders card to match Captain Points styling.

### Problem
Team names in GW Points Leaders were displaying with incorrect styling:
- Same size as manager name (too large)
- White color instead of grey
- Didn't match Captain Points card styling

### Root Cause
Component was using `.itemDetail` CSS class which didn't exist in Section.module.css, causing team names to inherit default styling instead of the intended grey, smaller styling.

### Fix
Changed CSS class from `.itemDetail` → `.itemMeta` to match Captain Points styling:
- **Font size:** 0.8125rem (smaller than manager name)
- **Color:** rgba(255, 255, 255, 0.5) (grey)
- **Margin top:** 0.25rem (proper spacing)

### Before/After

**Before:**
```
🥇  Guillaume de Posson
    FC SCORPIO              ← Same size, white
```

**After:**
```
🥇  Guillaume de Posson
    FC SCORPIO              ← Smaller, grey
```

### Technical Change
**GWPointsLeaders.tsx (line 53):**
```tsx
// Before
<div className={styles.itemDetail}>{manager.team_name}</div>

// After
<div className={styles.itemMeta}>{manager.team_name}</div>
```

### Files Modified
- `/src/components/Stats/sections/GWPointsLeaders.tsx`

### Result
- Team names now match Captain Points styling ✅
- Smaller font size (0.8125rem) ✅
- Grey color (50% opacity white) ✅
- Consistent styling across Stats tab cards ✅

---

## v3.3.4 - K-53: Season Tab UI Improvements (Dec 19, 2025)

**UI POLISH:** Enhanced Season tab with explanatory subtitles, renamed cards, and improved layouts for better readability and consistency.

### Changes Made

**1. Added Explanatory Subtitles to All Cards**
- **Captain Points:** "Total points from captain picks"
- **Chip Performance:** "Chips played throughout the season"
- **Streaks:** Already had "Longest winning streaks in H2H matches"
- **GW Records:** "Best individual gameweek scores"
- **Team Value:** "Current squad value"

**Why This Helps:** Users immediately understand what each card shows without needing to guess.

**2. Renamed Cards for Clarity**
- **"Best Gameweeks" → "GW Records"** - Shorter, more concise
- **"Best Streaks" → "Streaks"** - Cleaner title, toggle makes best/worst clear

**3. Layout Improvements**

**Captain Points - Pts After Number, % Below:**
```
Before:                After:
274 (30.3%)           274 PTS
    pts                   30.3%
```
- PTS now inline with number (uppercase, smaller, grey)
- Percentage moved below (more readable, cleaner)

**Streaks - GW Range Below Team Name:**
```
Before:                After:
Guillaume GW1-GW5     Guillaume
FC SCORPIO            FC SCORPIO
                      GW1-GW5
```
- GW range moved from inline to below team name
- Better vertical spacing, cleaner layout

**GW Records - Pts Inline with Number:**
```
Before:                After:
111                   111 PTS
pts
```
- PTS now inline with number (matches Captain Points style)
- Uppercase, smaller, grey text

### Technical Changes

**CaptainLeaderboard.tsx:**
- Added subtitle after title
- Changed layout: `{points} PTS` with `{percentage}%` below
- Used inline styles for PTS (0.75rem, grey, uppercase)

**ChipPerformance.tsx:**
- Wrapped title + subtitle in `<div>` for layout
- Added subtitle below title with proper spacing

**Streaks.tsx:**
- Changed "Best Streaks" → "Streaks"
- Removed `.nameWithRange` wrapper and `.gwRangeInline` class
- Moved GW range to new line below team name
- Added inline styles for GW range (0.75rem, rgba(255,255,255,0.4))

**BestWorstGW.tsx:**
- Changed "Best Gameweeks" → "GW Records"
- Added subtitle below title
- Changed layout to show `{points} PTS` inline
- Used inline styles for PTS (0.75rem, grey, uppercase)

**ValueLeaderboard.tsx:**
- Added subtitle after title in both data and no-data cases

### Files Modified
- `/src/components/Stats/season/CaptainLeaderboard.tsx`
- `/src/components/Stats/season/ChipPerformance.tsx`
- `/src/components/Stats/season/Streaks.tsx`
- `/src/components/Stats/season/BestWorstGW.tsx`
- `/src/components/Stats/season/ValueLeaderboard.tsx`

### Result
- All cards have explanatory subtitles ✅
- Cards renamed for clarity ✅
- Captain Points shows "274 PTS" with "30.3%" below ✅
- Streaks shows GW range below team name ✅
- GW Records shows "111 PTS" inline ✅
- Consistent styling across all Season cards ✅

---

## v3.3.3 - K-52b: GW Points Ranking Improvements (Dec 19, 2025)

**UI POLISH:** Enhanced GW Points Rankings with more stats and better styling to match existing design patterns.

### Improvements Made

**1. GW Points Modal - Added More Stats**

**New Stats Added:**
- **League Average:** Shows average GW points across all league members
- **Gap to Last:** Shows how many points ahead of last place (green, positive)

**Before:**
- Your points
- Your rank
- GW Winner
- Gap to 1st

**After:**
- Your points
- Your rank (with medal for top 3)
- GW Winner
- Your Rank
- Gap to 1st (red if negative)
- Gap to Last (green if positive) ← NEW
- League Avg (white text) ← NEW

**Why This Helps:**
- **Context:** See how your score compares to league average
- **Perspective:** Know if you're safe from last place
- **Motivation:** Positive reinforcement for beating the average

**2. GW Points Leaders Card - Match Season Rankings Style**

**Updated Styling:**
- Points now white (was green) to match Captain Points style
- PTS label smaller (0.625rem) and uppercase
- Team name already styled grey via `itemDetail` class
- Medal icons stay same size (1.25rem)

**Before:**
```
🥇  Guillaume de Posson
    FC SCORPIO
```

**After:**
```
🥇  Guillaume de Posson          111
    FC SCORPIO                   PTS
```

### Technical Changes

**GWPointsModal.tsx:**
- Added `avgPoints` calculation (sum of all points / total managers)
- Added `gapToLast` calculation (user points - last place points)
- Added new info rows conditionally shown
- Added `.positive` CSS class for green text

**GWPointsModal.module.css:**
- Added `.infoValue.positive { color: #00ff87; }`

**GWPointsLeaders.tsx:**
- Changed points color from `#00ff87` → `white`
- Changed PTS label size from `0.75rem` → `0.625rem`
- Added `textTransform: 'uppercase'` to PTS label

### Files Modified
- `/src/components/Dashboard/GWPointsModal.tsx`
- `/src/components/Dashboard/GWPointsModal.module.css`
- `/src/components/Stats/sections/GWPointsLeaders.tsx`

### Result
- Modal shows league average ✅
- Modal shows gap to last (green, positive) ✅
- GW Leaders card matches Captain Points styling ✅
- Team name smaller and grey ✅
- Points displayed on right in white ✅

---

## v3.3.2 - K-52: Add Gameweek Points Rankings Feature (Dec 19, 2025)

**NEW FEATURE:** Added GW points rankings to see who scored the most points in each gameweek, regardless of H2H results.

### Why This Feature?
- **Bragging rights:** See who "won" the gameweek with highest points
- **Performance context:** Understand your GW performance relative to league
- **Pure scoring:** Rankings based on points, not H2H matchup luck

### What's New

**1. Stats Tab → GW Points Leaders Card**
- Shows top 3 highest scorers for selected gameweek
- Medal icons (🥇🥈🥉) for top 3
- "View Full Rankings" button opens complete rankings modal
- Appears first in gameweek stats sections

**2. My Team → GW Points Tile (Now Clickable)**
- Click "GW PTS" tile to open detailed breakdown
- Shows:
  - Big points number with "Xth / 20" rank badge
  - GW winner name and points
  - Your rank in league
  - Gap to 1st place (if not 1st)
  - Link to view full GW rankings

**3. GW Rankings Modal (Full List)**
- All managers ranked by GW points
- Handles ties correctly (same points = same rank)
- Highlights your row with green background
- Medal emojis for top 3
- Scrollable list for all league members

### Technical Implementation

**New API Endpoint:**
- `/api/league/[id]/stats/gameweek/[gw]/rankings`
- Returns managers sorted by points DESC
- Calculates proper ranking with tie handling

**New Components:**
- `GWPointsLeaders.tsx` - Top 3 card for Stats tab
- `GWRankingsModal.tsx` - Full rankings modal (reusable)
- `GWPointsModal.tsx` - GW points breakdown for My Team

**Modified Components:**
- `StatsHub.tsx` - Integrated GW Points Leaders card
- `MyTeamTab.tsx` - Made GW PTS tile clickable

### Data Source
- Uses `manager_gw_history` table with `points` column
- Sorts by points DESC, then player name ASC
- Proper tie handling: multiple managers can share same rank

### Files Created
- `/src/app/api/league/[id]/stats/gameweek/[gw]/rankings/route.ts`
- `/src/components/Stats/sections/GWPointsLeaders.tsx`
- `/src/components/Stats/GWRankingsModal.tsx`
- `/src/components/Stats/GWRankingsModal.module.css`
- `/src/components/Dashboard/GWPointsModal.tsx`
- `/src/components/Dashboard/GWPointsModal.module.css`

### Files Modified
- `/src/components/Stats/StatsHub.tsx`
- `/src/components/Dashboard/MyTeamTab.tsx`

### Result
- Stats tab shows top 3 GW scorers ✅
- Click opens full rankings modal ✅
- My Team GW PTS tile now clickable ✅
- Modal shows rank, winner, gap to 1st ✅
- Works for all gameweeks (GW1-GW38) ✅
- Handles ties correctly ✅
- User's row highlighted in rankings ✅

---

## v3.3.1 - K-51: Fix Chip Badge Icon Alignment (Dec 19, 2025)

**UI FIX:** Fixed vertical alignment of chip badge icons (BB, TC, WC, FH) with text.

### Problem
Chip badge icons appeared slightly higher than text:
- ◎ BB - icon offset above "BB" text
- ☆ TC - icon offset above "TC" text
- ♻ WC - icon offset above "WC" text
- ⚡ FH - icon offset above "FH" text

### Investigation

**Component Location:**
- `/src/components/Stats/sections/ChipsPlayed.tsx` (lines 47-50)
- Uses Lucide icons: Target (BB), Star (TC), RefreshCw (WC), Zap (FH)

**Current CSS Found:**
```css
.chipBadge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  line-height: 1;  /* ← ROOT CAUSE */
}
```

**Root Cause:**
`line-height: 1` created tight vertical spacing where:
1. Text baseline didn't align with icon's vertical center
2. Font metrics (ascenders/descenders) pushed text slightly off-center
3. Lucide icons centered in flex container, but text used baseline alignment

### Fix Applied

Changed `line-height: 1` → `line-height: 1.2` to give text proper vertical breathing room.

```css
.chipBadge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  line-height: 1.2; /* Improved from 1 for better icon-text alignment */
}
```

### Files Modified
- `/src/components/Stats/sections/Section.module.css` (line 264)

### Result
- BB icon vertically centered with "BB" text ✅
- TC icon vertically centered with "TC" text ✅
- WC icon vertically centered with "WC" text ✅
- FH icon vertically centered with "FH" text ✅
- Consistent alignment across all chip badges ✅

---

## v3.3.0 - Mobile UI Polish: Responsive Headers & Labels (Dec 19, 2025)

**MINOR RELEASE:** Comprehensive mobile UI improvements across Rivals and Stats tabs for better responsive design.

### Summary
This release includes multiple coordinated fixes to ensure all tab headers work perfectly on all mobile screen sizes (320px - 430px+) and desktop. No more truncated labels, overlapping elements, or broken layouts.

### Features Included

**1. K-49e: Fixtures Header Investigation Fix**
- Fixed font size mismatches (GW number 60% too large, arrows 20% too large)
- Matched all font sizes to tabs exactly (0.9375rem)
- Fixed mobile stacking issue (changed flex-direction from column to row)
- Prevented wrapping (nowrap instead of wrap)

**2. K-49f: Rivals Header Final Fixes**
- Shortened "H2H Matches" → "H2H" (saves 8 characters)
- Removed dropdown arrow (▼) and made GW number clickable
- Increased mobile gap from 0.25rem → 0.5rem (prevents mingling)
- Added desktop responsive rules for proper scaling >769px

**3. K-50: Stats Tab Responsive Labels**
- Changed dynamic team name → "Team" (fixed 4-character width)
- Shortened "Gameweek" → "GW" (saves 6 characters)
- All 4 tabs now visible on iPhone SE (320px)
- No truncation at any screen width

### Why Minor Version (3.3.0)?
Multiple coordinated UI improvements that significantly enhance mobile experience across multiple tabs:
- 3 separate investigations/fixes
- Affects 2 major tabs (Rivals, Stats)
- Systematic approach to mobile responsiveness
- Measurable improvement in UX on all devices

### Files Modified
- `/src/components/Fixtures/FixturesTab.tsx`
- `/src/components/Fixtures/Fixtures.module.css`
- `/src/components/Stats/StatsHub.tsx`

### Overall Result
- All tabs work on iPhone SE 320px ✅
- All tabs work on iPhone standard 375px ✅
- All tabs work on iPhone Pro Max 430px ✅
- Desktop properly scales with nav width ✅
- No truncation/ellipsis anywhere ✅
- No overlapping/mingling elements ✅
- Cleaner, more compact UI ✅

---

## v3.2.23 - K-50: Stats Tab Header - Responsive Labels (Dec 19, 2025)

**UI FIX:** Fixed Stats tab header breaking on mobile due to long team names and labels.

### Problem
Stats tab header broke on mobile with:
1. **Long team names** (e.g., "SalahMoLeykoum F.C.*") pushed other tabs off screen
2. **"Gameweek" label** too long for smallest mobile devices (iPhone SE 320px)

### Solution
Shortened labels to fixed, predictable widths:

| Before | After |
|--------|-------|
| FC Matos* / SalahMoLeykoum F.C.* | **Team** |
| Gameweek | **GW** |
| Season | Season |
| Players | Players |

### Why "Team" Works
- **Fixed width:** Always 4 characters (predictable)
- **No truncation:** Never needs ellipsis (...)
- **Clear context:** Users know it's their team from the page context
- **Consistent:** Same for all users regardless of team name length

### Changes Made

**Before:**
```tsx
<button>
  {myTeamName}  {/* Could be 5-30+ characters */}
</button>
<button>
  Gameweek  {/* 8 characters */}
</button>
```

**After:**
```tsx
<button>
  Team  {/* Always 4 characters */}
</button>
<button>
  GW  {/* Always 2 characters */}
</button>
```

### Visual Results

**Before (breaks on mobile):**
```
[SalahMoLeykoum F.C.*] [Gameweek] [Season] [Play...
                                            ↑ Cut off
```

**After (fits all screens):**
```
[Team] [GW] [Season] [Players]
   ↑     ↑
 Fixed  Fixed
```

### Files Modified
- `/src/components/Stats/StatsHub.tsx` (line 125, line 131)

### Result
- All 4 tabs visible on iPhone SE (320px) ✅
- All 4 tabs visible on all screen sizes ✅
- No truncation/ellipsis at any width ✅
- Fixed-width labels = predictable layout ✅
- Tab functionality unchanged ✅

---

## v3.2.22 - K-49f: Rivals Header Final Fixes (Dec 19, 2025)

**UI POLISH:** Final responsive fixes for Rivals header - shortened label, removed dropdown arrow, improved spacing.

### Changes Made

**1. Shortened "H2H Matches" → "H2H"**
- Saves 8 characters of horizontal space
- Makes room for GW selector on smallest mobile devices (iPhone SE 320px)
- Cleaner, more compact design

**2. Removed Dropdown Arrow (▼)**
- Before: `← GW 17 ▼ →`
- After: `← GW 17 →`
- Made "GW 17" text clickable to open selector
- Saves ~20px horizontal space
- Simpler, cleaner interface

**3. Improved Mobile Spacing**
```css
/* Mobile - increased gap to prevent mingling */
.header {
  gap: 0.5rem; /* Was 0.25rem */
}
```
- Clear visible gap between tabs and GW selector
- Elements no longer touch/overlap on any mobile width

**4. Desktop Responsive Rules**
```css
@media (min-width: 769px) {
  .subTabsContainer { flex: 1; min-width: 0; }
  .navigatorWrapper { flex-shrink: 0; }
}
```
- Containers now properly fill available width
- Header scales properly with navigation bar width

### Visual Results

**Mobile (320px - 640px):**
```
┌─────────────────────────────────────┐
│ [🗡 H2H] [📅 Fixtures] │ ← GW 17 → │
└─────────────────────────────────────┘
         ↑ Clear gap ↑    ↑ No ▼
```

**Desktop (>769px):**
```
┌──────────────────────────────────────────────┐
│ [🗡 H2H] [📅 Fixtures]      │   ← GW 17 →   │
└──────────────────────────────────────────────┘
   ↑ Containers fill width, match nav bar ↑
```

### Files Modified
- `/src/components/Fixtures/FixturesTab.tsx` (label shortened, GW number made clickable, dropdown removed)
- `/src/components/Fixtures/Fixtures.module.css` (mobile gap, desktop responsive rules)

### Result
- Shorter label saves space on all devices ✅
- No dropdown arrow = cleaner UI + more space ✅
- Clear gap between elements on mobile ✅
- No mingling/overlapping at any width ✅
- Proper scaling on desktop (>769px) ✅

---

## v3.2.21 - K-49e: INVESTIGATION FIX - Fixtures Header CSS Issues (Dec 19, 2025)

**CRITICAL FIX:** Fixed persistent Fixtures header sizing and mobile layout issues through proper investigation.

### Problems Identified
Despite multiple previous "fixes" (v3.2.14, v3.2.16, v3.2.17, v3.2.18), two issues persisted:

1. **GW Selector Visually Larger Than Tabs Container**
   - GW number font: 1.5rem (24px) vs tab text: 0.9375rem (15px) - **60% larger**
   - Nav arrows font: 1.125rem (18px) vs tab text: 0.9375rem (15px) - **20% larger**

2. **Mobile Stacking Vertically Instead of Same Row**
   - Mobile @media set `flex-direction: column` causing stacking
   - `.header` had `flex-wrap: wrap` allowing wrapping

### Root Cause Analysis
Conducted thorough investigation (as explicitly requested) to identify exact CSS mismatches:
- `.gwNumber` font-size: 1.5rem (24px) - too large
- `.navButton` font-size: 1.125rem (18px) - too large
- Mobile breakpoint forcing column layout
- Header allowing flex-wrap

### Fixes Applied

**1. Matched Font Sizes to Tabs Exactly**
```css
/* Before */
.gwNumber { font-size: 1.5rem; }
.navButton { font-size: 1.125rem; }

/* After */
.gwNumber { font-size: 0.9375rem; }
.navButton { font-size: 0.9375rem; }
```

**2. Prevented Wrapping**
```css
/* Before */
.header {
  flex-wrap: wrap;
  gap: 1rem;
}

/* After */
.header {
  flex-wrap: nowrap;
  gap: 0.5rem;
}
```

**3. Fixed Mobile Layout**
```css
/* Before */
@media (max-width: 640px) {
  .header {
    flex-direction: column; /* CAUSED STACKING */
  }
}

/* After */
@media (max-width: 640px) {
  .header {
    flex-direction: row; /* KEEPS SAME LINE */
    gap: 0.25rem;
  }

  .subTabsContainer {
    flex: 1;
    min-width: 0;
  }

  .navigatorWrapper {
    flex-shrink: 0;
  }

  /* Responsive sizing */
  .gwNumber { font-size: 0.875rem; }
  .navButton { width: 32px; height: 32px; font-size: 0.875rem; }
}
```

### Files Modified
- `/src/components/Fixtures/Fixtures.module.css` (header, gwNumber, navButton, mobile media query)

### Result
- GW selector now SAME size as tabs container ✅
- Mobile stays on SAME ROW on all screen sizes ✅
- Font sizes perfectly matched across header ✅
- Proper responsive sizing for mobile devices ✅

### Lesson Learned
**Investigation first, changes second.** This issue persisted through 4+ "fixes" until proper investigation revealed exact font-size mismatches and mobile layout conflicts.

---

## v3.2.20 - Rename 'Rankings' Tab to 'Rank' in Bottom Navigation (Dec 19, 2025)

**UI CHANGE:** Shortened bottom navigation tab from "Rankings" to "Rank" for cleaner, more compact design.

### Change
- Bottom navigation: "Rankings" → "Rank"
- Icon remains: BarChart3 (unchanged)
- Functionality: No change (still shows league standings)

### Rationale
- **Shorter label:** Saves space on mobile navigation
- **Cleaner design:** More compact, less cluttered
- **Consistent with "Rivals":** Both tabs now use concise, punchy names

### Files Modified
- `/src/app/dashboard/page.tsx` (line 223)

### Result
- More compact tab label ✅
- Cleaner bottom navigation ✅
- Better mobile space utilization ✅

---

## v3.2.19 - Rename 'Fixtures' Tab to 'Rivals' in Bottom Navigation (Dec 19, 2025)

**UI CHANGE:** Renamed bottom navigation tab from "Fixtures" to "Rivals" for better branding.

### Change
- Bottom navigation: "Fixtures" → "Rivals"
- Icon remains: Target icon (unchanged)
- Functionality: No change (still shows H2H matches and team fixtures)

### Rationale
"Rivals" better represents the competitive, head-to-head nature of the tab content:
- H2H Matches: Direct rivalry between league members
- Team Fixtures: Viewing rival team lineups and performance

### Files Modified
- `/src/app/dashboard/page.tsx` (line 234)

### Result
- Clearer tab label ✅
- Better represents H2H competitive focus ✅
- More engaging, competitive branding ✅

---

## v3.2.18 - K-49d: Match GW Selector Style to Tabs Container (Dec 19, 2025)

**UI POLISH:** GW selector container now matches tabs container styling exactly for unified header appearance.

### Problem
GW selector container had different styling than tabs container:
- Different gap: 0.75rem vs 0.5rem
- Different padding: 0.5rem 1rem vs 0.25rem
- Nav buttons 36px vs tabs ~40px height

**Result:** Header looked inconsistent, not unified.

### Solution
Copied exact CSS from `.subTabsContainer` to `.navigatorWrapper` for perfect visual match.

### Changes Made

**1. Updated Container Styling**
```css
/* Before */
.navigatorWrapper {
  gap: 0.75rem;
  padding: 0.5rem 1rem;
}

/* After - matches tabs exactly */
.navigatorWrapper {
  gap: 0.5rem;
  padding: 0.25rem;
}
```

**2. Matched Button Heights**
```css
/* Before */
.navButton {
  width: 36px;
  height: 36px;
}

/* After - matches tab height */
.navButton {
  width: 40px;
  height: 40px;
}
```

### Before vs After

| Property | Tabs Container | GW Selector (Before) | GW Selector (After) |
|----------|----------------|---------------------|---------------------|
| gap | 0.5rem | 0.75rem ❌ | 0.5rem ✅ |
| padding | 0.25rem | 0.5rem 1rem ❌ | 0.25rem ✅ |
| background | rgba(0,0,0,0.3) | rgba(0,0,0,0.3) ✅ | rgba(0,0,0,0.3) ✅ |
| border-radius | 12px | 12px ✅ | 12px ✅ |
| border | 1px solid rgba(255,255,255,0.1) | 1px solid rgba(255,255,255,0.1) ✅ | 1px solid rgba(255,255,255,0.1) ✅ |
| button height | ~40px | 36px ❌ | 40px ✅ |

### Visual Result
```
Before:
┌───────────────────────────┐    ┌─────────────────┐
│ [H2H] [Fixtures]          │    │   ← GW 17 →     │
│ (consistent style)        │    │ (different)     │
└───────────────────────────┘    └─────────────────┘
        ↑ Mismatched styles ↑

After:
┌───────────────────────────┐    ┌─────────────────┐
│ [H2H] [Fixtures]          │    │   ← GW 17 →     │
│ (same style)              │    │ (same style)    │
└───────────────────────────┘    └─────────────────┘
        ↑ Perfectly matched ↑
```

### Files Modified
- `/src/components/Fixtures/Fixtures.module.css`

### Result
- Both containers have identical styling ✅
- Unified header appearance ✅
- Professional, consistent look ✅
- Buttons are same height ✅

---

## v3.2.17 - K-49c: Fixtures Header Final Polish - Shorter Labels + Icons (Dec 19, 2025)

**UI POLISH:** Shortened labels and replaced emojis with Lucide icons to keep header on same row on all mobile widths.

### Problem
On smallest mobile widths, tabs and GW selector stacked vertically instead of staying on same row.

**Root cause:** "Team Fixtures" label too long + emojis take extra space.

### Solution
1. **Shortened Labels**
   - "⚔️ H2H Matches" → "H2H Matches" (kept text)
   - "⚽ Team Fixtures" → "Fixtures" (saved ~4 characters)

2. **Replaced Emojis with Lucide Icons**
   - H2H Matches: `<Swords size={16} />` icon
   - Fixtures: `<Calendar size={16} />` icon
   - More compact and consistent than emojis

### Changes Made

**1. Added Lucide Icons Import**
```tsx
import { Swords, Calendar } from 'lucide-react';
```

**2. Updated Button Labels**
```tsx
// Before
⚔️ H2H Matches
⚽ Team Fixtures

// After
<Swords size={16} /> H2H Matches
<Calendar size={16} /> Fixtures
```

**3. Updated CSS for Icon Layout**
```css
.subTab {
  display: flex;
  align-items: center;
  gap: 6px;
}

.subTab svg {
  flex-shrink: 0;
}
```

### Before vs After

| Element | Before | After |
|---------|--------|-------|
| H2H Label | ⚔️ H2H Matches | 🗡 H2H Matches (Lucide icon) |
| Fixtures Label | ⚽ Team Fixtures | 📅 Fixtures (Lucide icon) |
| Layout (iPhone SE) | Stacks vertically ❌ | Same row ✅ |
| Layout (iPhone 15 Pro Max) | Same row | Same row ✅ |
| Icons | Emojis (inconsistent) | Lucide (consistent) ✅ |

### Files Modified
- `/src/components/Fixtures/FixturesTab.tsx` (imports + button labels)
- `/src/components/Fixtures/Fixtures.module.css` (icon flexbox layout)

### Result
- Tabs and GW selector stay on same row on ALL mobile widths ✅
- Cleaner, more professional icon design ✅
- Shorter "Fixtures" label saves space ✅
- Icons are consistent with app design ✅

### Bundle Impact
- Dashboard bundle: 58.7 kB → 58.8 kB (+0.1 kB from Lucide icons - negligible)

---

## v3.2.16 - K-49: Fixtures Tab - Copy Stats Section UI EXACTLY (Dec 19, 2025)

**REGRESSION FIX:** Previous sticky header implementation made things worse. Copied Stats section UI exactly for consistency.

### Problem
v3.2.14's sticky header implementation created issues:
- Way too much vertical space on top (~60px padding)
- Different UI style than Stats section
- Content scrolled behind header poorly
- Total header height ~240px (vs Stats ~100px)

### Solution
**Copied Stats section UI exactly** - don't reinvent, replicate what works.

### Changes Made

**1. Removed Sticky Positioning**
- Changed from sticky header to simple static header
- Matches Stats section's non-sticky design
- Removed complex z-index stacking

**2. Copied Container Styling**
```css
.container {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

@media (min-width: 769px) {
  .container {
    padding-top: 2.5rem; /* Matches Stats */
  }
}
```

**3. Added Header Wrapper**
```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}
```

**4. Updated Tab Styling** (matches Stats .viewToggle/.viewButton)
```css
.subTabsContainer {
  display: flex;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.25rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.subTab {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  /* ... matches Stats viewButton exactly */
}

.subTabActive {
  background: rgba(0, 255, 135, 0.2) !important;
  color: #00ff87 !important;
  border: 1px solid rgba(0, 255, 135, 0.3) !important;
}
```

**5. Updated GW Selector** (matches Stats .gwSelector)
```css
.navigatorWrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**6. Mobile Responsiveness** (matches Stats @media queries)
```css
@media (max-width: 640px) {
  .container { padding: 0.75rem; }
  .header { flex-direction: column; }
  .subTabsContainer { justify-content: center; }
  .navigatorWrapper { justify-content: center; }
}
```

### Before vs After

| Element | v3.2.14 (Bad) | v3.2.16 (Fixed) |
|---------|---------------|-----------------|
| Design | Sticky (complex) | Static (simple) |
| Top padding | ~60px | 1rem (mobile), 2.5rem (desktop) |
| Tab container | Sticky with solid background | Simple flex with transparent bg |
| GW selector | Sticky, 50px height | Simple flex, compact |
| Total header | ~240px | ~100px |
| Matches Stats? | No | Yes ✅ |

### Files Modified
- `/src/components/Fixtures/Fixtures.module.css`
- `/src/components/Fixtures/FixturesTab.tsx`

### Result
- Fixtures header now matches Stats section visually
- Minimal vertical space wasted
- Compact, clean design
- No sticky complexity
- Content scrolls normally

---

## v3.2.15 - K-48: Fix DC Points Calculation (Cap at +2) (Dec 19, 2025)

**BUG FIX:** Fixed Defensive Contribution points being calculated as cumulative instead of one-time bonus.

### Problem
DC points were calculated as cumulative, awarding multiple +2 bonuses for exceeding threshold:
- Senesi (DEF) with 21 DC incorrectly showed **+4 pts** (21 ÷ 10 = 2.1 → floor(2.1) × 2 = +4)
- Should only award **+2 pts** (one-time bonus when threshold reached)

### Root Cause
```typescript
// WRONG - cumulative calculation
if (position === 2) {
  return Math.floor(value / 10) * 2;  // 21 DC → floor(2.1) * 2 = +4 pts
}
if (position === 3) {
  return Math.floor(value / 12) * 2;  // 24 DC → floor(2) * 2 = +4 pts
}
```

### Solution
Changed to one-time bonus when threshold reached:
```typescript
// CORRECT - one-time bonus
if (position === 2) return value >= 10 ? 2 : 0;  // 21 DC → +2 pts
if (position === 3) return value >= 12 ? 2 : 0;  // 24 DC → +2 pts
```

### FPL DC Rules (Correctly Implemented)
| Position | Threshold | Bonus | Max per Match |
|----------|-----------|-------|---------------|
| **DEF** | 10 DC | +2 pts | +2 pts (once) |
| **MID** | 12 DC | +2 pts | +2 pts (once) |

**Key:** Reaching threshold = +2 pts. Going above threshold = still +2 pts (no extra).

### Examples (After Fix)
- Senesi (DEF): 21 DC → **+2 pts** (not +4) ✅
- Collins (DEF): 9 DC → **0 pts** (below threshold)
- Midfielder: 24 DC → **+2 pts** (not +4) ✅
- Midfielder: 11 DC → **0 pts** (below threshold)

### Files Modified
- `/src/components/PitchView/PlayerModal.tsx` (lines 97-101)

### Verification
- [x] DEF with 10+ DC shows +2 pts (not more)
- [x] DEF with 20+ DC still shows +2 pts
- [x] MID with 12+ DC shows +2 pts
- [x] MID with 24+ DC still shows +2 pts
- [x] Modal total now matches pitch card total
- [x] Players below threshold show 0 DC pts

---

## v3.2.14 - K-49: Fixtures Tab Sticky Header & Spacing Fix (Dec 19, 2025)

**ENHANCEMENT:** Made Fixtures Tab headers sticky and reduced vertical spacing to match Stats section.

### Problem
1. Tab toggle (H2H Matches / Team Fixtures) scrolled away - should be sticky
2. GW selector scrolled away - should be sticky
3. Too much vertical spacing between elements (10px gaps)
4. Content showed through headers when scrolling

### Solution
Made both tab toggle and GW selector sticky at the top with proper stacking:

**Sticky Positioning:**
```
┌─────────────────────────────┐
│  Nav Bar (60px mobile)      │ ← Fixed
├─────────────────────────────┤
│  [H2H] [Team Fixtures]      │ ← Sticky (z-index: 90)
├─────────────────────────────┤
│  [◄] GW16 [▼] [►]          │ ← Sticky (z-index: 80)
├─────────────────────────────┤
│  Scrollable Content         │
│  (Matches / Fixtures)       │
└─────────────────────────────┘
```

### Changes Made

**1. Made Tab Toggle Sticky**
```css
.subTabsContainer {
  position: sticky;
  top: calc(env(safe-area-inset-top, 0px) + 60px); /* Mobile */
  top: 80px; /* Desktop */
  z-index: 90;
  background: #0e0a1f; /* Solid background */
}
```

**2. Adjusted GW Selector Position**
```css
.navigatorWrapper {
  position: sticky;
  top: calc(env(safe-area-inset-top, 0px) + 60px + 48px + 8px); /* Mobile */
  top: calc(80px + 48px + 8px); /* Desktop = 136px */
  z-index: 80;
  background: #0e0a1f; /* Solid background */
}
```

**3. Reduced Vertical Spacing**
- Container gap: 10px → 8px
- Desktop padding-top: 2.5rem → 2rem
- Tab/Navigator spacing: 10px → 8px

### Files Modified
- `/src/components/Fixtures/Fixtures.module.css`

### User Experience
- Headers stay fixed at top when scrolling
- Cleaner, tighter spacing matching Stats section
- Solid backgrounds prevent see-through
- Smooth stacking with proper z-index layering

---

## v3.2.13 - K-47: Add Top % to Overall Rank Modal (Dec 19, 2025)

**ENHANCEMENT:** Added Top % context to rank numbers in Overall Rank Progress modal.

### Problem
Rank numbers (e.g., 194,426) lacked context without knowing what percentile they represent out of ~12.66M total FPL players.

### Solution
Added "Top %" display to all three summary boxes showing rank as a percentage of total players.

**Display:**
```
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    194,426    │   │    194,426    │   │  3,379,511    │
│   TOP 1.5%    │   │   TOP 1.5%    │   │   TOP 27%     │
│    CURRENT    │   │  BEST (GW16)  │   │  WORST (GW1)  │
└───────────────┘   └───────────────┘   └───────────────┘
```

### Calculation Logic
```typescript
const TOTAL_PLAYERS = 12660000; // ~12.66M FPL players

const getTopPercent = (rank: number): string => {
  const percent = (rank / TOTAL_PLAYERS) * 100;
  if (percent < 0.01) return '0.01';      // Elite (rank 1-1,265)
  if (percent < 0.1) return percent.toFixed(2);   // e.g., "0.05%"
  if (percent < 1) return percent.toFixed(1);     // e.g., "0.5%"
  return percent.toFixed(0);                      // e.g., "27%"
};
```

**Examples:**
- Rank 194,426 / 12,660,000 = 1.54% → "TOP 1.5%"
- Rank 3,379,511 / 12,660,000 = 26.7% → "TOP 27%"
- Rank 1,266 / 12,660,000 = 0.01% → "TOP 0.01%"

### UI Details
- **Color**: Green accent (`#00ff87`) matching brand
- **Placement**: Between rank value and label
- **Font Size**: 0.8rem (slightly larger than label)
- **Formatting**: Auto-adjusts decimals based on precision needed

### Benefits
- ✅ Provides meaningful context for rank numbers
- ✅ Shows relative performance out of millions of players
- ✅ Helps users understand achievement level (Top 1% vs Top 20%)
- ✅ Consistent display across Current, Best, and Worst ranks

### Files Modified
- `/src/components/Dashboard/RankProgressModal.tsx` - Add Top % calculation and display
- `/src/components/Dashboard/RankModals.module.css` - Add `.topPercent` styling

---

## v3.2.12 - K-46: Fix Players Tab Mobile Width (Dec 19, 2025)

**BUG FIX:** Players Tab now uses full screen width on mobile devices.

### Problem
Players Tab table on mobile didn't use full screen width:
- Table had excessive horizontal padding (12px on tablet, 8px on phone)
- Compact Stats view showed 4 columns but couldn't fit all 4 on screen without scrolling
- Other sections (My Team, Rankings, etc.) used full nav bar width, but Players Tab didn't
- Wasted horizontal space on both sides

**Reported Device:** iPhone 15 Pro Max (affects all mobile devices)

### Root Cause
`.container` CSS had uniform padding applied to all sides:
```css
@media (max-width: 768px) {
  .container { padding: 0.75rem; }  /* 12px all sides */
}
@media (max-width: 480px) {
  .container { padding: 0.5rem; }   /* 8px all sides */
}
```

This created unnecessary horizontal margins that prevented the table from using full width.

### Solution
Changed to separate vertical and horizontal padding:
```css
@media (max-width: 768px) {
  .container { padding: 0.75rem 0.25rem; }  /* 12px vertical, 4px horizontal */
}
@media (max-width: 480px) {
  .container { padding: 0.5rem 0.25rem; }   /* 8px vertical, 4px horizontal */
}
```

**Changes:**
- Reduced horizontal padding from **12px → 4px** on tablets (max-width: 768px)
- Reduced horizontal padding from **8px → 4px** on phones (max-width: 480px)
- Kept vertical padding unchanged for proper spacing between sections
- Minimal 4px horizontal padding prevents content from touching screen edges

### Benefits
- ✅ Table now uses full screen width matching navigation bar
- ✅ All 4 Compact Stats columns fit on screen without horizontal scroll
- ✅ Better mobile UX - maximizes available space
- ✅ Consistent with other tabs (My Team, Rankings, etc.)

### Files Modified
- `/src/components/Players/PlayersTab.module.css` - Reduced mobile horizontal padding

### Scope
**Only Players Tab affected** - other sections already render correctly:
- My Team ✅ (already correct)
- Rankings ✅ (already correct)
- Fixtures ✅ (already correct)
- Stats tabs ✅ (already correct)

---

## v3.2.11 - K-45: Filter Modal UI Fixes + Bulk Select Buttons (Dec 19, 2025)

**UI POLISH:** Updated Filter Players modal to match RivalFPL brand and added bulk select/unselect buttons.

### Problems Fixed
1. **Inconsistent Branding** - Filter modal styling didn't match other modals (Player Modal, Stat Modals)
2. **No Bulk Actions** - Users had to manually toggle 20 teams one-by-one to unselect all

### Solution 1: Match RivalFPL Brand
Updated modal styling to match the dark purple theme used throughout the app:
- **Background**: Dark purple gradient `linear-gradient(135deg, rgba(26, 26, 46, 0.98) 0%, rgba(55, 0, 60, 0.95) 100%)`
- **Overlay**: Darker backdrop `rgba(0, 0, 0, 0.8)` with blur
- **Shadow**: Deeper shadow `0 20px 60px rgba(0, 0, 0, 0.8)`
- **Accent**: Consistent green `#00ff87` for active states

**Reference**: Matched styling from `/src/components/Players/PlayerDetailModal.module.css`

### Solution 2: Bulk Select Buttons
Added "All" and "None" buttons for quick selection:

**Positions Section:**
```
POSITIONS        [All] [None]        1/4
```

**Teams Section:**
```
TEAMS            [All] [None]        20/20
```

**Button Behavior:**
- **All** - Selects all items (4 positions or 20 teams)
- **None** - Clears all selections
- Hover effect with green accent color
- Counter updates in real-time

### UI Details
**Bulk Action Buttons:**
- Small, compact design (uppercase text)
- Subtle background with border
- Green hover state matching brand
- Positioned between section title and counter

**Layout:**
```
┌──────────────────────────────────────────┐
│ POSITIONS    [ALL] [NONE]           1/4  │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│ │ GKP │ │ DEF │ │ MID │ │ FWD │          │
│ └─────┘ └─────┘ └─────┘ └─────┘          │
└──────────────────────────────────────────┘
```

### Implementation Details
**FilterModal.tsx:**
- Added `selectAllPositions()` and `unselectAllPositions()` functions
- Added `selectAllTeams()` and `unselectAllTeams()` functions
- Added bulk action buttons to section headers

**FilterModal.module.css:**
- Updated modal background to dark purple gradient
- Updated overlay opacity to 0.8
- Updated box shadow for depth
- Added `.bulkActions` flex container
- Added `.bulkButton` styles with green hover state

### Files Modified
- `/src/components/Players/FilterModal.tsx` - Add bulk select functions and buttons
- `/src/components/Players/FilterModal.module.css` - Match brand styling, add button styles

### Benefits
- ✅ Consistent visual identity across all modals
- ✅ Faster workflow for filtering teams/positions
- ✅ Better UX - one click vs 20 clicks to clear all teams
- ✅ Cleaner, more professional appearance

---

## v3.2.10 - K-44: Add Defensive Stats to Players Tab (Dec 19, 2025)

**FEATURE:** Added DC (Defensive Contribution) and DC/90 columns to Players Tab.

### Problem
Players Tab was missing defensive contribution stats, making it harder to evaluate defenders and goalkeepers effectively.

### Solution
Added two new columns to the "All Stats" view in the Defensive section:
- **DC** - Defensive Contribution (Clean Sheets + Saves)
- **DC/90** - Defensive Contribution per 90 minutes

### Calculation Logic
```typescript
DC = clean_sheets + saves
DC/90 = (DC / minutes) * 90
```

**Note:** FPL API doesn't provide individual defensive stats (blocks, interceptions, clearances), so DC is calculated using the available defensive metrics: clean_sheets and saves.

### Column Placement
Added after "Saves" column in the Defensive section:
```
... CS | GC | Saves | DC | DC/90 | Bonus | BPS ...
```

### Features
- ✅ DC column shows total defensive contribution
- ✅ DC/90 normalizes by minutes played (formatted to 2 decimals)
- ✅ Both columns are sortable (click header to sort)
- ✅ Tooltips explain what each column represents
- ✅ Works in "All Stats" view (not shown in "Compact Stats")
- ✅ Goalkeepers and defenders show higher values as expected

### Implementation Details
**PlayersTab.tsx:**
- Added computed `dc` and `dc_per_90` properties to player objects on fetch
- Calculated once when data loads for better performance

**columns.ts:**
- Added DC column definition (no format needed, direct value)
- Added DC/90 column with 2-decimal formatting

**Sorting:**
- DC and DC/90 are now sortable since they're pre-calculated properties
- Works seamlessly with existing sort infrastructure

### Files Modified
- `/src/components/Players/PlayersTab.tsx` - Add computed DC fields
- `/src/components/Players/columns.ts` - Add DC and DC/90 column definitions

---

## v3.2.9 - K-43: Fix Scrollable Tables in My Team Modals (Dec 19, 2025)

**BUG FIX:** Fixed GW breakdown tables not scrolling in K-38 and K-39 modals.

### Problem
- Tables showed only recent GWs (GW9-16)
- Users couldn't scroll to see earlier GWs (GW1-8)
- Content was cut off despite `max-height: 400px` being set

### Root Cause
`RankModals.module.css` had conflicting overflow properties:
```css
.tableContainer {
  overflow-y: auto;   /* Line 102 - enables vertical scroll */
  overflow: hidden;   /* Line 108 - overrides above, prevents scroll */
}
```

The `overflow: hidden` on line 108 was overriding `overflow-y: auto`, preventing scrolling.

### Solution
Changed `overflow: hidden;` to `overflow-x: hidden;` to:
- ✅ Enable vertical scrolling (`overflow-y: auto` works)
- ✅ Prevent horizontal overflow (preserves `border-radius` effect)
- ✅ Keep sticky headers visible during scroll

### Files Modified
- `/src/components/Dashboard/RankModals.module.css` - Fixed overflow conflict

### Affected Modals
- **K-38 Overall Rank Progress** - GW breakdown table now scrollable
- **K-39 Total Points Analysis** - GW breakdown table now scrollable

---

## v3.2.8 - K-42: Compact Form & Fixtures in Players Modal (Dec 19, 2025)

**UI POLISH:** Horizontal inline layout for Form & Fixtures sections - saves ~90px vertical space.

### Problem
Form & Fixtures sections in Players Modal used vertical lists, wasting space above tabs.
- Old layout: 6 rows (3 form + 3 fixtures) = ~150px vertical space
- Information cramped, less room for tab content

### Solution: Horizontal Inline Badges
**New Layout:**
```
FORM  [BUR(A) 16] [CRY(H) 8] [MCI(H) 8]
NEXT  [NFO(H) 2] [WHU(A) 2] [CRY(A) 3]
```

**Changes:**
- Form: Shows last 3 matches horizontally with opponent, venue, points
- Fixtures: Shows next 3 with opponent, venue, FDR difficulty
- 2 rows total instead of 6 = ~60px vertical space (saves 90px+)

### FDR Color Coding
| FDR | Difficulty | Color |
|-----|------------|-------|
| 1-2 | Easy | Green (`rgba(0, 255, 135, 0.2)`) |
| 3 | Medium | Gray/White |
| 4-5 | Hard | Red (`rgba(255, 75, 75, 0.2)`) |

### Implementation Details
**PlayerDetailModal.tsx:**
- Changed from vertical `.formBadges` and `.fixtureBadges` lists
- New `.compactStats` container with `.statRow` for each line
- `.badges` flex container for horizontal inline pills
- `.slice(0, 3)` limits to 3 most recent/upcoming
- FDR class applied: `fdrEasy`, `fdrMedium`, `fdrHard`

**PlayerDetailModal.module.css:**
- `.compactStats`: flex column with 0.5rem gap
- `.statRow`: flex row with label + badges
- `.statLabel`: 40px width, uppercase, muted color
- `.badge`: inline pill with 4px border-radius
- FDR styles with colored backgrounds and text
- Mobile responsive: smaller fonts and padding

### Before vs After
| Metric | Before | After |
|--------|--------|-------|
| Vertical space | ~150px | ~60px |
| Rows | 6 | 2 |
| Info shown | Same | Same |
| Space savings | - | 90px+ |

### Impact
- More vertical space for tab content (Matches, Stats, History)
- Cleaner, more compact appearance
- FDR colors provide quick visual difficulty assessment
- Responsive wrapping on mobile devices
- Better information density

### Files Changed
- `PlayerDetailModal.tsx` - Horizontal badge layout
- `PlayerDetailModal.module.css` - Compact styles, FDR colors, mobile responsive

---

## v3.2.7 - K-38/K-39: UI Polish & Player Modal Styling Match (Dec 19, 2025)

**UI FIX:** CSS improvements for K-38/K-39 modals to match Player Modal styling.

### Fix #1: Points Gap Table Full Width
**Problem:** Table not using full modal width, cramped appearance
**Solution:**
- Added `width: 100%` to `.gapTableSection` and `.gapTableContainer`
- Changed grid from fixed widths `70px 70px 90px 90px` to `1fr 1fr 1fr 1fr`
- Columns now spread evenly across full modal width

### Fix #2: Table Headers Solid Background
**Problem:** Content passed behind headers when scrolling (still semi-transparent)
**Solution:**
- Changed background from `#0e0a1f` to `rgba(26, 26, 46, 0.98)` (matches modal gradient)
- Confirmed `position: sticky; top: 0; z-index: 10;` applied
- Added `backdrop-filter: blur(10px)` for glass morphism effect
- Changed border color to `rgba(255, 255, 255, 0.15)` for better definition
- Applies to both `.tableHeader` and `.gapTableHeader`

### Fix #3: Match Player Modal Styling
**Referenced:** `/src/components/PitchView/PlayerModal.module.css`

**StatTileModal.module.css Changes:**
- Background: `linear-gradient(135deg, rgba(26, 26, 46, 0.98) 0%, rgba(55, 0, 60, 0.95) 100%)`
- Border: Changed from green accent to subtle `rgba(255, 255, 255, 0.1)`
- Box shadow: `0 20px 60px rgba(0, 0, 0, 0.8)` (deeper, more dramatic)
- Added fade-in animation: `fadeIn 0.2s ease`
- Added slide-up animation: `slideUp 0.3s ease`
- Overlay: `rgba(0, 0, 0, 0.8)` (darker backdrop)
- Header: Added `backdrop-filter: blur(10px)`

**RankModals.module.css Changes:**
- `.tableContainer`: Added full width, border, rounded corners
- `.gapTableContainer`: Changed background to `rgba(0, 0, 0, 0.3)`
- `.chartContainer`: Updated border to `rgba(255, 255, 255, 0.1)`
- Consistent dark purple theme throughout

### Impact
- Professional, polished appearance matching Player Modal
- Better readability with solid header backgrounds during scroll
- Full-width tables maximize space usage
- Consistent dark purple gradient theme across all modals
- Smooth animations enhance user experience

### Files Changed
- `StatTileModal.module.css` - Player Modal styling match
- `RankModals.module.css` - Full width tables, solid headers, dark purple theme

---

## v3.2.6 - K-39: Real FPL Rank Data & Top % Column (Dec 19, 2025)

**MAJOR FIX:** K-39 Points Gap table now uses real FPL rank threshold data instead of hardcoded estimates.

### Problem
- User with 985 pts at rank 194K saw rank 200K = 600 pts (completely wrong)
- Hardcoded estimates didn't reflect actual FPL season data
- No context on how exclusive each rank tier is

### Solution #1: Fetch Real Rank Thresholds
**FPL Proxy Enhanced:**
- Updated `/api/fpl-proxy` to support dynamic endpoints and query params
- Can now fetch: `bootstrap-static`, `leagues-classic/314/standings`, etc.
- Server-side proxy avoids CORS issues

**Rank Data Fetching:**
- Fetches actual players at target ranks from FPL's overall league (league 314)
- Each page has 50 entries: rank 1000 = page 20, rank 100000 = page 2000
- Gets real total points for each rank threshold
- Fetches total_players from bootstrap-static for accurate percentages

### Solution #2: Updated Rank Tiers
**Changed from:** 1, 100, 1K, 5K, 10K, 50K, 100K, 200K, 500K, 1M
**Changed to:** 1, 1K, 10K, 100K, 500K, 1M, 5M

**Rationale:**
- More useful tiers for long-term tracking
- Better spread across skill levels
- 5M represents bottom ~45% of active players

### Solution #3: Added Top % Column
**New column shows rank as percentage of total players (~11M):**
- Rank 1 = Top 0.00001%
- Rank 1K = Top 0.01%
- Rank 10K = Top 0.09%
- Rank 100K = Top 0.91%
- Rank 500K = Top 4.55%
- Rank 1M = Top 9.09%
- Rank 5M = Top 45.45%

**Impact:** Users can see how exclusive their rank is relative to all FPL players

### Gap Calculation
**Logic confirmed correct:**
- Positive (red, +X) = points needed to reach that rank (user below threshold)
- Negative (green, X) = points ahead of rank threshold (user above)

**Example:** User at 985 pts, rank 200K
- Rank 100K at ~1005 pts: Gap = +20 (red, need 20 more points)
- Rank 500K at ~965 pts: Gap = 20 (green, 20 points ahead)

### Technical Details
**API Changes:**
- `/api/fpl-proxy?endpoint=leagues-classic/314/standings&page_standings=20`
- Fetches multiple pages asynchronously for all rank tiers
- Handles errors gracefully (continues if individual rank fetch fails)

**UI Changes:**
- 4-column table: Rank | Top % | Points | Gap
- Loading state while fetching
- Error state if fetch fails
- Responsive grid: 70px 70px 90px 90px (desktop), 50px 60px 70px 70px (mobile)

### Files Changed
- `PointsAnalysisModal.tsx` - Real FPL data fetching, Top % calculation
- `RankModals.module.css` - 4-column layout, Top % styling
- `/api/fpl-proxy/route.ts` - Dynamic endpoint support

### Impact
- Accurate, real-time rank threshold data
- Context on rank exclusivity (Top % column)
- Better goal-setting for users (know exact points needed for targets)
- Data updates with each modal open (reflects current season standings)

---

## v3.2.5 - Fix K-38/K-39 Modals & Remove K-40 (Dec 19, 2025)

**BUG FIXES & CLEANUP:** Three fixes for modal improvements.

### Fix #1: K-39 Points Gap Section Empty
**Problem:**
- Points Gap to Ranks section showed header but no data rows
- useEffect tried to fetch from FPL API (failed with CORS)
- Even with estimates set, loading state caused conditional rendering issues

**Solution:**
- Removed async fetch logic and useEffect
- Use static estimated rank thresholds (based on GW16 2024/25 typical distributions)
- Removed loading state entirely
- Data now renders immediately

**Impact:**
- Points Gap table now displays 10 ranks: 1, 100, 1K, 5K, 10K, 50K, 100K, 200K, 500K, 1M
- Shows points at each rank and gap from user's points
- Red (+X) = points needed to reach rank
- Green (X) = points ahead of rank threshold

### Fix #2: K-38 & K-39 Table Headers Not Sticky
**Problem:**
- Table headers had transparent background (`rgba(0, 255, 135, 0.05)`)
- When scrolling, content passed through headers making them unreadable
- Headers needed solid background and proper sticky positioning

**Solution:**
- Changed `.tableHeader` background to solid `#0e0a1f` (dark purple)
- Changed `.gapTableHeader` background to solid `#0e0a1f`
- Added border-bottom with accent color for visual separation
- Confirmed `position: sticky; top: 0; z-index: 10;` applied to both

**Impact:**
- Headers stay fixed when scrolling (K-38 Rank Progress, K-39 Points Analysis)
- Solid background prevents content showing through
- Better readability during scroll

### Fix #3: Remove K-40 Transfer History Modal Entirely
**Problem:**
- K-40 Transfer History modal not meeting requirements
- Needs to be rebuilt as Transfer Comparison (revised K-40)

**Solution:**
- Deleted `TransferHistoryModal.tsx` component
- Deleted `TransferHistoryModal.module.css` styles
- Removed import from MyTeamTab.tsx
- Removed `showTransfersModal` state
- Removed click handler from Transfers tile
- Removed modal render from JSX

**Impact:**
- Transfers tile now non-clickable (plain stat display)
- Reduced bundle size: dashboard 59.3 kB → 58.1 kB
- Clean slate for revised K-40 Transfer Comparison feature

### Files Changed
- `PointsAnalysisModal.tsx` - Removed useEffect, using static thresholds
- `RankModals.module.css` - Solid backgrounds for sticky headers
- `MyTeamTab.tsx` - Removed Transfer History integration
- Deleted: `TransferHistoryModal.tsx`, `TransferHistoryModal.module.css`

---

## v3.2.4 - HOTFIX: Fix Transfer History Player Names (Dec 19, 2025)

**BUG FIX:** Transfer History modal showed GW sections but no player names due to CORS error fetching from FPL API.

### Problem
- Transfer History modal opened with correct summary stats
- GW sections displayed (GW13, GW3, etc.)
- Individual transfer rows not visible
- Console error: `TypeError: Failed to fetch` when calling FPL API directly

### Root Cause
- Component fetched player names directly from `https://fantasy.premierleague.com/api/bootstrap-static/`
- Browser blocked request with CORS error
- Players array stayed empty
- `getPlayerName()` returned 'Loading...' for all players
- Transfer rows rendered but invisible/cut off

### Solution
- Changed to use `/api/fpl-proxy` instead of direct FPL API call
- Our proxy runs server-side and avoids CORS issues
- Added better error handling with empty array fallback
- Added console logging for debugging

### Impact
- Transfer History modal now displays player names correctly
- Shows: "IN: Player Name £X.Xm" and "OUT: Player Name £X.Xm"
- No more CORS errors
- Works reliably across all browsers

---

## v3.2.3 - Revise K-39: Total Points Modal (Dec 19, 2025)

**FEATURE REVISION:** Improved K-39 Total Points Modal based on user feedback.

### Changes Made

**Removed (Not Useful):**
- Cumulative points chart (always goes up, not insightful)
- Milestones section (arbitrary targets, not meaningful)

**Enhanced Summary Stats:**
- Kept: Total, Avg/GW, Best GW
- Added: Worst GW with gameweek number
- Changed layout: 4 columns instead of 3

**New: Points Gap Table**
- Shows points needed/ahead for key ranks: 1, 100, 1K, 5K, 10K, 50K, 100K, 200K, 500K, 1M
- Each row: Rank, Points at rank, Gap from user
- Positive gap (red) = points needed to reach rank
- Negative gap (green) = points ahead of rank threshold
- Similar to FPL official app's rank comparison

**Kept:**
- GW breakdown table with VS AVG column
- Shows all gameweeks with cumulative totals

### Technical Details
- Added rank threshold fetching (currently using estimates)
- TODO: Fetch actual rank thresholds from FPL API or calculate from distribution
- Removed recharts dependency from this modal
- Added responsive layout for Points Gap Table

### Impact
- More actionable insights for users
- Clear view of what's needed to reach target ranks
- Removed clutter from chart and arbitrary milestones
- Better mobile responsiveness with 2x2 summary grid

---

## v3.2.2 - HOTFIX: Fix Database Column Names in Transfer History (Dec 19, 2025)

**BUG FIX:** Modals showed "No data available" due to incorrect database column names in API query.

### Problem
- K-38/39/40 modals opened but showed "No data available"
- Database had 18,737 rows in `manager_gw_history`, 320 rows for league 804742
- API query was failing silently with SQL error

### Root Cause
- API used FPL API column names: `element_in`, `element_out`, `element_in_cost`, `element_out_cost`, `time`
- Database actual schema uses: `player_in`, `player_out`, `player_in_cost`, `player_out_cost`, `transfer_time`
- SQL query failed with "column does not exist" error
- Empty arrays returned, triggering "No data available" message

### Solution
**API Fix (src/app/api/team/[teamId]/history/route.ts):**
- Updated query to use correct column names matching database schema
- Changed `element_in` → `player_in`
- Changed `element_out` → `player_out`
- Changed `element_in_cost` → `player_in_cost`
- Changed `element_out_cost` → `player_out_cost`
- Changed `time` → `transfer_time`

**Frontend Fix (TransferHistoryModal.tsx):**
- Updated TypeScript interface to match database schema
- Fixed all references in calculations and render code

### Impact
- Modals now correctly fetch and display data from database
- Transfer history shows actual player transfers
- Rank and points modals display historical data
- No more "No data available" for teams with synced data

---

## v3.2.1 - HOTFIX: Make Tile Modals Work with Empty Data (Dec 18, 2025)

**BUG FIX:** Stat tiles weren't clickable when database had no history data.

### Problem
- Tiles not clickable on staging
- API returned 500 error when `manager_gw_history` table empty
- Modals only rendered if `historyData` existed, so clicks did nothing
- Your team (5293769) has no data in `manager_gw_history` yet

### Root Cause
- API threw error when database query returned empty results
- Frontend only rendered modals conditionally: `{historyData && <Modals />}`
- If historyData was null, modals didn't exist in DOM
- Clicking tiles set state but nothing happened

### Solution
**API Fix:**
- Return empty arrays `{ history: [], transfers: [] }` instead of 500 error
- Allows UI to function even with no data

**Frontend Fix:**
- Always set `historyData`, even on error (with empty arrays)
- Modals now always render
- Each modal handles empty data with "No data available" message

### Impact
- Tiles now clickable even with empty database
- Modals open and show "No data available" messages
- Will work normally once database is synced
- Graceful degradation for missing data

---

## v3.2.0 - NEW FEATURE: My Team Tile Modals (K-38/39/40) (Dec 18, 2025)

**NEW FEATURE:** Added interactive modals for My Team stat tiles.

### What's New

Three stat tiles in My Team are now clickable, opening detailed analysis modals:

1. **Overall Rank Modal (K-38)** - 📊
   - Current, best, and worst rank summary
   - Rank progression chart (lower = better)
   - GW-by-GW breakdown with rank changes
   - Shows which GWs had biggest improvements/drops

2. **Total Points Modal (K-39)** - ⭐
   - Total points, average per GW, best GW summary
   - Cumulative points progression chart
   - Milestone tracking (500, 750, 1000, 1250, etc.)
   - Shows reached milestones and progress to next

3. **Transfer History Modal (K-40)** - 🔄
   - Total transfers, hit points, net spend summary
   - Transfers grouped by gameweek
   - IN/OUT player names with prices
   - Hit cost indicator per GW (Free vs -4 pts)

### Implementation

**New Components:**
- `StatTileModal.tsx` - Base modal component
- `RankProgressModal.tsx` - Overall rank analysis
- `PointsAnalysisModal.tsx` - Points progression & milestones
- `TransferHistoryModal.tsx` - Complete transfer history

**New API Endpoint:**
- `/api/team/[teamId]/history` - Fetches GW history and transfers from database

**UI Enhancements:**
- Stat tiles show pointer cursor on hover
- Smooth hover effects with green accent
- Escape key and click-outside to close
- Mobile responsive design
- Brand-consistent purple/green theme

### Data Sources
- Uses existing `manager_gw_history` table (K-27 cache)
- Uses existing `manager_transfers` table (K-27 cache)
- Fetches player names from FPL API bootstrap

### User Experience
- Click "TOTAL PTS" → Points analysis with milestones
- Click "OVERALL RANK" → Rank progression chart
- Click "TRANSFERS" → Complete transfer history
- All modals feature charts using recharts library

---

## v3.1.2 - HOTFIX: My Team Player Cards Showing Stale Points (Dec 18, 2025)

**BUG FIX:** Player cards on My Team pitch showing stale/incorrect points from database cache.

### Problem
- Player cards on pitch showed wrong points (e.g., Bruno Fernandes: 4 pts instead of 13 pts)
- v3.1.1 fixed the modal but not the pitch view
- Database has stale/incorrect data:
  - **DB**: Bruno GW16 = 4 pts, 45 mins, 0 goals, 1 assist, 0 bonus
  - **FPL API**: Bruno GW16 = 13 pts, 90 mins, 1 goal, 1 assist, 3 bonus

### Root Cause
- `scoreCalculator.ts` used database cache (K-27) for completed gameweeks
- Database `player_gameweek_stats` table had outdated data
- No sync script to refresh player stats
- Once DB had data (even if wrong), it never fell back to FPL API

### Solution
- **Disabled database fetch for player stats** in scoreCalculator
- Now always fetches fresh data from FPL API for player stats
- Still uses DB for manager picks, GW history, and chips (accurate)
- Still uses DB for fixtures (less critical if slightly stale)
- Ensures player points/stats are always accurate

### Files Changed
- `/src/lib/scoreCalculator.ts`
  - Set `dbLiveData = null` to force FPL API usage
  - Added comment explaining why DB fetch is disabled
  - Kept DB fetch code for potential future re-enabling if sync fixed

### Impact
- All player cards now show accurate points from FPL API
- Slight performance trade-off (API call vs DB query) for accuracy
- Ensures consistency with player modal (which uses FPL API)
- Fixes all players with stale database data, not just Bruno

### Why Not Fix DB Sync?
- No existing player stats sync script in package.json
- Database might continue to drift without regular syncing
- FPL API is source of truth - better to fetch fresh data
- K-27 cache useful for manager data but risky for player stats

---

## v3.1.1 - HOTFIX: Player Modal Total Points Calculation (Dec 18, 2025)

**BUG FIX:** Player modal showing incorrect total points.

### Problem
- Player modal displayed wrong total points (e.g., Bruno Fernandes GW16 showed 4 pts instead of 13 pts)
- Modal showed correct stat breakdown but wrong total
- Caused by mismatch between two data sources:
  - Initial `player.event_points` from scoreCalculator (uses database cache)
  - Stats breakdown from fresh FPL API data

### Solution
- Modal now **calculates total from displayed stats breakdown**
- Uses `calculateStatPoints()` function to sum all individual stat points
- Falls back to `player.event_points` only if stats unavailable
- Ensures total always matches the breakdown shown

### Files Changed
- `/src/components/PitchView/PlayerModal.tsx`
  - Added `calculatedTotal` logic to sum stats
  - Replaced hardcoded `player.event_points` with `actualTotalPoints`
  - Fixed captain multiplier calculation

### Impact
- All player modals now show accurate totals
- Fixes discrepancies for any players with stale database data
- Total now always matches visible breakdown

---

## v3.1.0 - Production Release: Value Rankings (Dec 18, 2025)

**PRODUCTION DEPLOYMENT:** Deploying v3.0.14-v3.0.18 to production.

### Features Included
- **K-37:** Value Rankings leaderboard in Season Stats
  - Shows Team Value rankings for all league managers
  - Top 5 in card view, full 20 in modal
  - Clean display with team value only (no redundant gain calculation)
- **K-36 Fix:** Removed Effective Value (not available in FPL API)
  - Simplified My Team to show: Team Value | In Bank
  - Investigated FPL API and confirmed selling prices aren't exposed

### Version Journey (v3.0.14 → v3.1.0)
- v3.0.14: Initial Value Rankings implementation
- v3.0.15: Effective Value debugging attempt
- v3.0.16: Changed to use last finished GW
- v3.0.17: Removed Effective Value entirely
- v3.0.18: Simplified display (removed gain text)

---

## v3.0.18 - Simplify Value Rankings Display (Dec 18, 2025)

**UI IMPROVEMENT:** Remove redundant value gain from Value Rankings.

### Change
- Removed "+£X.Xm" gain display from Value Rankings leaderboard
- Now shows only the team value (£105.0m format)
- Value gain is easy to calculate mentally (£105.0m - £100.0m = £5.0m)
- Cleaner, simpler display

### Before
```
£105.0m
+£5.0M
```

### After
```
£105.0m
```

---

## v3.0.17 - Remove Effective Value (Not Available in FPL API) (Dec 18, 2025)

**BREAKING CHANGE:** Remove Effective Value feature - FPL API doesn't expose individual player selling prices.

### Why Removed
After investigating the FPL API, discovered that **selling prices are NOT available** via the public API:
- `/entry/{id}/event/{gw}/picks/` returns only: `element`, `position`, `multiplier`, `is_captain`, `element_type`
- **NO `selling_price` or `purchase_price` fields** exist in picks data
- Entry endpoint only provides `last_deadline_value` (total team value) and `last_deadline_bank`
- **Effective Value (sell prices + bank) is IMPOSSIBLE to calculate**

### Changes Made

**My Team:**
- Removed "Eff Value" box
- Now shows only: Team Value | In Bank
- Removed all Effective Value calculation logic

**Season Stats - Value Rankings:**
- Removed toggle between "Team" and "Eff"
- Now shows "Team Value" only
- Simplified leaderboard (no switching needed)

**API Changes:**
- `/api/team/[teamId]/info`: Removed `effectiveValue` field from response
- `/api/league/[id]/stats/season`: Changed `valueRankings` from object to array
  - Before: `{ teamValue: [], effectiveValue: [] }`
  - After: `ValueData[]` (just team value rankings)

### What's Still Available
- ✅ **Team Value** - Total squad value (buy prices)
- ✅ **Bank** - Money in bank
- ✅ **Value Rankings** - Leaderboard by team value
- ✅ **Value Gain** - Profit from starting £100m

### Files Changed
- `/src/app/api/team/[teamId]/info/route.ts`
- `/src/components/Dashboard/MyTeamTab.tsx`
- `/src/app/api/league/[id]/stats/season/route.ts`
- `/src/components/Stats/season/ValueLeaderboard.tsx`
- `/src/components/Stats/SeasonView.tsx`

---

## v3.0.16 - HOTFIX: Use Last Finished GW for Effective Value (Dec 18, 2025)

**CRITICAL HOTFIX:** v3.0.15 used `current_event` which points to the NEXT upcoming gameweek, causing picks fetch to fail.

### Root Cause (Real Issue)
- Between gameweeks, `current_event` = 17 (next upcoming GW)
- GW17 hasn't started, so `/entry/{id}/event/17/picks/` returns no data
- Result: Effective Value calculation falls back to bank only (£0.1m)

### Fix
- Changed to use **last finished gameweek** instead of `current_event`
- Finds last GW where `finished = true` from bootstrap events
- Now fetches picks from GW16 (last completed) which has actual data

### Technical Changes

**K-36: `/api/team/[teamId]/info/route.ts`**
```typescript
// Before (WRONG):
const actualCurrentGW = entryData.current_event;  // Points to GW17 (upcoming)

// After (CORRECT):
const events = bootstrapData.events || [];
const lastFinishedGW = [...events].reverse().find(e => e.finished)?.id;  // GW16
```

**K-37: `/api/league/[id]/stats/season/route.ts`**
- Same fix applied to Value Rankings
- Changed from `e.is_current` to finding last `e.finished = true`

### Expected Results
- Effective Value: ~£102.4m (15 players + bank)
- Debug logs show `Last finished GW: 16` (not 17)
- `selling_price` values now present (50-70 range typical)

---

## v3.0.15 - HOTFIX: Fix Effective Value Calculation (Dec 18, 2025)

**HOTFIX RELEASE:** Fix critical bugs in Effective Value calculation (K-36 & K-37).

### Bugs Fixed

**Issue 1: selling_price Undefined**
- **Problem:** Effective Value showed £0.1m (bank only) instead of ~£102.4m
- **Root Cause:** When viewing historical gameweeks in My Team, code fetched picks for that old GW, which doesn't include current `selling_price` field
- **Fix:** Always fetch current squad picks (actualCurrentGW) for Effective Value, separate from selected GW picks (for rank/transfers)
- **Impact:** Effective Value now shows correct selling prices for all 15 players + bank

**Issue 2: Unit Conversion Error in K-37**
- **Problem:** Value Rankings calculated `(sellTotal / 10) + bank` which mixed units (pounds + tenths)
- **Root Cause:** Division by 10 applied only to sellTotal, not bank
- **Fix:** Changed to `(sellTotal + bank) / 10` to convert the total from tenths to millions
- **Impact:** Value Rankings now show correct effective values

### Technical Changes

**K-36: `/api/team/[teamId]/info/route.ts`**
- Split gameweek variables:
  - `actualCurrentGW`: Real current GW (from entry data)
  - `currentGW`: Selected GW for display (could be historical)
- Added second fetch for current squad:
  - `picksResponse`: Selected GW picks (for rank/transfers)
  - `currentSquadResponse`: Current GW picks (for selling prices)
- Updated Effective Value calculation to use `currentSquadData` with current bank
- Enhanced debug logging with JSON.stringify for full pick structure

**K-37: `/api/league/[id]/stats/season/route.ts`**
- Fixed unit conversion: `(sellTotal + bank) / 10` instead of `(sellTotal / 10) + bank`
- Both values now properly converted from tenths to millions

### Expected Results
- My Team Effective Value: ~£102.4m (not £0.1m)
- Value Rankings: Correct effective values for all managers
- Effective Value ≤ Team Value (always)
- Debug logs show `selling_price` values (not undefined)

---

## v3.0.14 - Add Value Rankings to Season Stats (Dec 18, 2025)

**FEATURE RELEASE:** Add Team Value and Effective Value leaderboards to Season Stats (K-37).

### New Features
- **Value Rankings Leaderboard:** Shows two new rankings in Season Stats
  - **Team Value:** Total squad value (buy price)
  - **Effective Value:** Spendable value (sell price + bank)
  - Toggle between Team and Effective views
  - Top 5 in card, full 20 managers in modal
  - Shows gain from starting £100.0m

### Technical Implementation
- Added `getValueRankings()` function to `/api/league/[id]/stats/season/route.ts`
- Fetches fresh data from FPL API (value changes daily, not cached)
- Reuses K-36 Effective Value calculation logic for consistency:
  - Team value: `entry_history.value / 10`
  - Bank: `entry_history.bank / 10`
  - Effective value: `(sum of selling_price / 10) + bank`
  - Fallback to purchase_price if selling_price unavailable
- Created `ValueLeaderboard.tsx` component with Team/Eff toggle
- Integrated into SeasonView.tsx Season Stats section

### Data Source
- Always fetches from FPL API (not database)
- Uses `/api/entry/{entry_id}/event/{current_gw}/picks/` endpoint
- Current gameweek determined from bootstrap-static

### UI/UX
- Matches existing leaderboard styling (dark purple gradient)
- 📈 emoji icon for value rankings
- Toggle buttons: "Team" | "Eff"
- Shows value in £X.Xm format
- Shows gain from starting value (+£X.Xm)
- Click to view full rankings in modal

---

## v3.0.13 - Debug Effective Value Calculation (Dec 18, 2025)

**DEBUG RELEASE:** Add debug logging to investigate K-36 Effective Value bug.

### Debug Additions
- **Issue:** Effective Value showing £0.1m instead of ~£102.4m on Greg's account
- **Root Cause:** Unknown - either `selling_price` field missing or calculation failing
- **Debug Logging Added:**
  - Team ID being processed
  - Number of picks in picks array
  - Sample of first pick structure
  - Bank value
  - Each pick's `selling_price` and `purchase_price` values
  - Total sell value calculated
  - Final effective value (sell + bank)

### Technical Changes
- Updated `/api/team/[teamId]/info/route.ts` with comprehensive console logging
- Logs each pick's selling price to identify if field exists and has correct values
- Will observe Railway logs when Greg loads My Team to diagnose issue

### Expected Outcome
- Log output will reveal if `selling_price` exists on picks
- Will show if calculation is correct but display is wrong
- Will identify if field is named differently in API response

---

## v3.0.12 - Players Tab Modal UI Improvements (Dec 18, 2025)

**PATCH RELEASE:** Improve readability and density in Players Tab modal.

### UI Improvements

**1. Results Badges - Better Contrast**
- Changed score badge text from white to dark grey/black
- Color: `#fff` → `rgba(0, 0, 0, 0.85)`
- Applies to win (green) and loss (red) badges
- Much better readability against colored backgrounds

**2. Stats Tab - More Compact**
- Reduced stat box padding: `0.75rem` → `0.5rem`
- Reduced stat value font size: `1.5rem` → `1.25rem`
- Reduced stat label font size: `0.75rem` → `0.7rem`
- Reduced stat group padding: `1rem` → `0.75rem`
- Reduced gap between groups: `1.25rem` → `0.875rem`
- Reduced gap between stat boxes: `0.5rem` → `0.375rem`
- **Result:** More stats fit on screen, especially on mobile
- Matches the compact density of My Team modal

### Impact
- Better readability in Matches tab (results section)
- More information density in Stats tab
- Improved mobile experience
- Consistent with My Team modal design

---

## v3.0.11 - HOTFIX: Fix Overview Tab Regression + Brand Styling (Dec 18, 2025)

**HOTFIX RELEASE:** Fix regression in My Team Player Modal Overview tab and align Players Tab modal styling with brand.

### Bug Fixes (Issue 1 - Regression)
- **CRITICAL:** Fixed My Team Player Modal Overview tab showing only "Defensive contribution: 0" and "Total Points"
  - **Root Cause:** FPL history uses `round` field, but modal looks for `gameweek` field
  - **Introduced in:** v3.0.9 when switching to FPL history format
  - **Fix:** Map `round` → `gameweek` in API response
  - **Impact:** Overview tab now shows full stats breakdown (goals, assists, clean sheets, minutes, bonus, BPS, etc.)

### UI Improvements (Issue 2 - Brand Consistency)
- **Players Tab Modal Styling:** Updated to match My Team modal brand
  - Changed from dark gray gradient to dark purple gradient
  - Background: `rgba(26, 26, 46, 0.98) → rgba(55, 0, 60, 0.95)`
  - Improved box-shadow for better depth
  - Consistent brand identity across both player modals

### Technical Changes
- Updated `/api/players/[id]` to map FPL `round` field to `gameweek`
- Updated `PlayerDetailModal.module.css` with brand purple gradient
- Both modals now use same color scheme

---

## v3.0.10 - Improve History Tab UX (Dec 18, 2025)

**PATCH RELEASE:** Improve History tab ordering and add current season in both player modals.

### UI Improvements
- **Reverse Season Order:** Most recent season now shown first (was oldest first)
- **Add Current Season:** 2024/25 season now displayed at top with "(Current)" label
  - Shows current season stats from `data.totals` or `player` data
  - Includes: points, goals, assists, minutes, current price
- **Applied to Both Modals:**
  - My Team PlayerModal: Card-based layout
  - Players Tab PlayerDetailModal: Table-based layout

### Technical Changes
- Reversed `pastSeasons` array using `[...data.pastSeasons].reverse()`
- Added current season as first item in history list
- Current season pulls from existing data (no new API calls)

---

## v3.0.9 - HOTFIX: Fix Players Tab Modal CORS Error (Dec 18, 2025)

**HOTFIX RELEASE:** Fix CORS error in Players Tab PlayerDetailModal.

### Bug Fixes
- **CRITICAL:** Fixed "TypeError: Failed to fetch" in Players Tab modal
  - **Root Cause:** PlayerDetailModal (K-26) was making client-side fetch to FPL API, causing CORS error
  - **Fix:** Updated to use `/api/players/[id]` endpoint server-side
  - **Impact:** Players Tab modal now loads correctly, all tabs work (Matches, Stats, History)

### Technical Changes
- Updated `/api/players/[id]/route.ts` to fetch full FPL history (with opponent/match details)
- Added `fixtures` to API response for upcoming matches
- Added FPL `history` array (not just DB history) to include opponent/score details
- Updated `PlayerDetailModal.tsx` to use `/api/players/[id]` instead of FPL API
- Modal now uses server-side API with no CORS issues

### API Response Changes
- `/api/players/[id]` now returns:
  - `history`: Full FPL history array (opponent, scores, match details)
  - `fixtures`: Upcoming fixtures with FDR
  - `pastSeasons`: Past season stats
  - Falls back to DB history if FPL API unavailable

---

## v3.0.8 - HOTFIX: Fix Player Modal CORS Error (Dec 18, 2025)

**HOTFIX RELEASE:** Fix CORS error preventing Player Modal from loading.

### Bug Fixes
- **CRITICAL:** Fixed "TypeError: Failed to fetch" in Player Modal
  - **Root Cause:** PlayerModal was making client-side fetch to FPL API for past seasons, causing CORS error
  - **Fix:** Moved past seasons fetch to server-side in `/api/players/[id]` route
  - **Impact:** Player Modal now loads correctly, all three tabs work

### Technical Changes
- Updated `/api/players/[id]/route.ts` to fetch `pastSeasons` from FPL API server-side
- Added `pastSeasons` to API response
- Removed client-side FPL API fetch from `PlayerModal.tsx`
- PlayerModal now uses `data.pastSeasons` from API response

### Never Do
- ❌ DON'T make client-side fetch calls to FPL API (causes CORS errors)
- ✅ DO fetch FPL API server-side in API routes

---

## v3.0.7 - Player Modal Tabs (Dec 18, 2025)

**PATCH RELEASE:** Add tabs to Player Modal for better organization and data access.

### New Features
- **Player Modal Tabs (K-34):** Three-tab navigation in Player Modal
  - **Overview Tab:** Current GW stats breakdown (reorganized existing content)
  - **Matches Tab:** GW-by-GW performance table with scrollable view
  - **History Tab:** Past seasons summary with lazy loading
- **Lazy Loading:** Past seasons data only fetched when History tab is clicked
- **Current GW Highlighting:** Active gameweek highlighted in Matches table
- **Empty States:** User-friendly messages when no data available
- **Sticky Table Headers:** Matches table header stays visible when scrolling

### Technical Changes
- Added tab state management to `PlayerModal.tsx`
- Created three inline tab components (Overview, Matches, History)
- Added `pastSeasons` state and lazy fetch logic
- Reused existing `/api/players/[id]` endpoint (no new API needed)
- History tab fetches from FPL API `element-summary` endpoint
- Matches table uses existing `history` data from player API

### UI Changes
- Tab navigation bar with active state highlighting
- Scrollable table for Matches tab (max-height: 400px)
- Season cards for History tab with hover effects
- Mobile responsive design for all tabs
- Comprehensive styling in `PlayerModal.module.css`

---

## v3.0.6 - Add Effective Value Stat (Dec 18, 2025)

**PATCH RELEASE:** Add Effective Value (sell value) stat to My Team.

### New Features
- **Effective Value Stat:** New stat box showing your actual liquidation value
  - Displays between Team Value and In Bank
  - Shows the cash you'd have if you sold all players
  - Accounts for 50% profit rule: `Sell Price = Purchase Price + floor((Current Price - Purchase Price) / 2)`
  - Uses FPL API `selling_price` field (no database changes needed)

### Technical Changes
- Updated `/api/team/[teamId]/info` to calculate and return `effectiveValue`
- Added `effectiveValue` state and display in `MyTeamTab.tsx`
- Calculation: Sum of all player selling prices + bank
- Graceful fallback: If picks data unavailable, effective value = 0

### UI Changes
- Team Value boxes now show 3 stats instead of 2:
  1. Team Value (total player current prices)
  2. Eff Value (what you'd get if sold all)
  3. In Bank (cash available)

---

## v3.0.5 - Column Name Fix (Dec 18, 2025)

**HOTFIX RELEASE:** Fix database query to use correct column names.

### Bug Fixes
- **CRITICAL:** Fixed `player_gameweek_stats` query to use correct column names
  - Changed `event` → `gameweek`
  - Changed `element_id` → `player_id`
  - These are the actual column names in the database schema
- Query now works correctly with existing indexes:
  - `idx_pgw_player_gw` on `(player_id, gameweek)` ✓
  - `idx_pl_fixtures_event_finished` on `(event, finished)` ✓
  - `idx_manager_picks_entry_event` on `(entry_id, event)` ✓

### Investigation Results
- Used `check-and-add-indexes.ts` script to inspect actual schema
- Confirmed all necessary indexes already exist in database
- No new indexes needed - just code fix

### Impact
- DB optimization now works correctly for completed GWs
- Will use existing indexes for fast query performance (< 50ms)

---

## v3.0.4 - Performance Investigation & Fix (Dec 18, 2025)

**HOTFIX RELEASE:** Critical performance optimization for My Team DB queries.

### Performance Fixes
- **MAJOR:** Fetch only 15 player stats instead of all 760 players
  - Before: Fetched ALL 760 players from `player_gameweek_stats`
  - After: Fetch only the 15 players in manager's squad
  - Impact: ~98% reduction in rows fetched (760 → 15)
- **Optimized query flow:** Fetch picks first, then use player IDs to filter stats query
- **Added comprehensive timing logs** for debugging bottlenecks
  - `[Perf] DB: manager picks` - Manager picks fetch time
  - `[Perf] DB fetch player stats (15 players)` - Player stats fetch time
  - `[Perf] DB fetch fixtures` - Fixtures fetch time
  - `[Perf] API: bootstrap` - Bootstrap API time
  - `[Perf] Total completed GW fetch` - Total time
- **Created index migration script** (`add-performance-indexes.ts`)

### Technical Changes
- Updated `fetchPlayerStatsFromDB()` to accept `playerIds` parameter
- Modified `fetchScoreData()` to extract player IDs from picks first
- Changed query: `WHERE event = $1 AND element_id = ANY($2)`
- Added timing instrumentation throughout data fetching pipeline

### Next Steps (Post-Deploy)
- Add database indexes for optimal performance:
  - `idx_player_gw_stats_event_element` on `player_gameweek_stats(event, element_id)`
  - `idx_pl_fixtures_event_finished` on `pl_fixtures(event, finished)`
  - `idx_manager_picks_entry_event` on `manager_picks(entry_id, event)`
- Run index script: `DATABASE_URL=... npx tsx src/scripts/add-performance-indexes.ts`

### Expected Performance
- DB queries: 10-50ms (down from 200-500ms with 760 rows)
- Total completed GW load: ~150-200ms (bootstrap still dominates at ~300-400ms)

---

## v3.0.3 - My Team DB Optimization (Dec 18, 2025)

**PATCH RELEASE:** Optimize My Team to use database for completed gameweeks.

### Performance Improvements
- **Database-First for Completed GWs:** My Team now uses database instead of FPL API for completed gameweeks
  - Player stats fetched from `player_gameweek_stats` table
  - Fixtures fetched from `pl_fixtures` table
  - Reduces external API calls from 3-4 per view to 1 (bootstrap only)
  - Target load time: < 200ms (down from 500ms+)
- **Graceful Fallback:** Automatically falls back to API if database data is missing
- **Live GW Unchanged:** Current/in-progress gameweeks still use API for real-time data

### Technical Changes
- Added `fetchPlayerStatsFromDB()` function in `/src/lib/scoreCalculator.ts`
- Added `fetchFixturesFromDB()` function in `/src/lib/scoreCalculator.ts`
- Updated `fetchScoreData()` to check GW status and use DB for completed GWs
- Data transformation matches FPL API format (no frontend changes needed)
- Console logging for debugging DB vs API usage

### Impact
- Completed GWs load ~60-70% faster
- Reduced load on FPL API
- Better user experience for historical data viewing
- No visual changes for users

---

## v3.0.2 - Sync Pipeline Enhancement (Dec 18, 2025)

**PATCH RELEASE:** Add manager_picks and pl_fixtures to automatic sync pipeline.

### New Features
- **Manager Picks Syncing:** Full squad selections (15 players) now synced automatically per GW
  - Includes starting 11 + 4 bench players
  - Synced in both full sync and incremental sync
  - Enables My Team to use database for completed GWs instead of API calls
- **PL Fixtures Syncing:** Premier League fixtures now synced automatically
  - Only completed fixtures synced (finished = true)
  - League-independent (synced once per sync run)
  - Enables fixture-based features to use database

### Technical
- Added `syncPLFixtures()` function in `/src/lib/leagueSync.ts`
- Added manager_picks sync to `syncManagerData()` function
- Added manager_picks sync to `syncMissingGWs()` function
- Added manager_picks to force clear cleanup section
- Both tables use ON CONFLICT upsert pattern for idempotency

### Performance Impact
- Reduces API calls for My Team when viewing completed GWs
- Enables offline/cached access to historical squad data

---

## v3.0.1 - Empty State Fix (Dec 18, 2025)

**PATCH RELEASE:** UX improvement for GW Transfers display.

### Bug Fixes
- Added "No transfers made" empty state message for GW Transfers
- GW Transfers container now displays for all GWs (previously hidden when empty)
- Improved styling for empty state (centered, italic, subtle color)

### Investigation Results
- Verified transfers data is working correctly (39,960 transfers synced across all leagues)
- Confirmed 0 transfers is legitimate data (5-50% of managers make no transfers per GW)
- Root cause: Empty state appeared broken, needed UX improvement

---

## v3.0.0 - Sync Infrastructure Release (Dec 18, 2025)

**MAJOR RELEASE:** Complete data sync infrastructure for all leagues.

### New Features
- **Auto-sync on first load (K-32a):** New leagues automatically sync all historical data with progress bar
- **Incremental sync (K-32b):** Returning users get missing completed GWs synced automatically
- **Quick Sync button (K-32d):** Fast sync of missing GWs only (1-5 seconds)
- **Full Re-sync button (K-32c):** Complete re-sync of all historical data
- **Transfers in sync pipeline:** GW Transfers now synced automatically for all leagues

### Bug Fixes
- Fixed GW Transfers SQL column error (pin.team → pin.team_id)
- Fixed incremental sync SQL placeholder bug ($13)
- Fixed player modal tabs data fetching

### Technical
- New sync functions in `/src/lib/leagueSync.ts`
- Sync status tracking in `leagues` table
- Progress bar component for first-time sync
- Manager transfers included in all sync operations

---

## 📚 Version History Index

This project's complete version history has been split into multiple files for better readability and maintainability.

### Current & Recent Versions

- **[v2.5.x - v2.7.x (Dec 2025)](./version-history/v2.5-v2.6.md)** - Latest development
  - v2.7.x: K-27 Database Caching & Hotfixes
  - v2.6.x: Players Tab Database Integration
  - v2.6.0-alpha: Players Tab Foundation
  - v2.5.x: Player Features & UI Polish (30 versions)

- **[v2.4.x Part 2 (Dec 2025)](./version-history/v2.4-part2.md)** - My Team Mobile-First (v2.4.45 - v2.4.25)
  - RivalFPL branding, breakpoint fixes, pitch redesign
  - FPL-style player cards, desktop layout fixes
  - 21 versions

- **[v2.4.x Part 1 (Dec 2025)](./version-history/v2.4-part1.md)** - My Team Mobile-First (v2.4.24 - v2.4.0)
  - GW selector, transfers display, stat boxes
  - Formation layout, responsive design
  - 24+ versions

### Previous Major Versions

- **[v2.2.x - v2.3.x (Dec 2025)](./version-history/v2.2-v2.3.md)** - My Team UI Polish & Redesign
  - v2.3.x: My Team UI Polish & Mobile Optimization
  - v2.2.x: My Team Redesign

- **[v2.0.x - v2.1.x (Dec 2025)](./version-history/v2.0-v2.1.md)** - Multi-League Support
  - v2.0.x: **MAJOR MILESTONE** - Multi-league support
  - v2.1.x: League management improvements

### Legacy Versions

- **[v1.x (Oct 2024 - Dec 2024)](./version-history/v1.x.md)** - Foundation & Initial Features
  - v1.26.x: Large League Support & Error Handling
  - v1.25.x: Position History & Reddit Launch
  - v1.24.x: Live Match Modal & Analytics
  - v1.23.x - v1.0.0: Core features and foundation

---

## 📝 Quick Reference

### Latest Changes (v2.7.5 - Dec 16, 2025)
- ⚡ **K-28: Season Stats Database Migration** - Migrated Season Stats to use K-27 cached tables
  - Before: 300+ FPL API calls (~10-30 seconds)
  - After: Single database queries (~1-2 seconds)
  - Captain Points: Now uses `manager_picks` + `player_gameweek_stats` + `manager_gw_history`
  - Chips Played/Faced: Now uses `manager_chips` table
  - Best/Worst GWs: Now uses `manager_gw_history` table
  - Trends Data: Now uses `manager_chips` table
  - Streaks: Already used `h2h_matches` (no change)
  - Performance improvement: ~90% faster (15s → 1.5s)

### Recent Highlights
- **v2.7.0**: K-27 Comprehensive Database Caching (5 new tables, 10 new scripts)
- **v2.6.x**: Complete Players tab with database integration
- **v2.5.12**: Defensive Contribution points (DEFCON)
- **v2.5.11**: FPL-style player points breakdown
- **v2.5.0**: Players database schema + sync job + API endpoints
- **v2.4.x**: Major My Team mobile-first redesign (45+ versions)
- **v2.0.0**: Multi-league support (MAJOR MILESTONE)

---

## 🔗 Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Project context and development guidelines
- [README.md](./README.md) - Project overview and setup instructions

---

**Note:** For the complete unabridged version history, see the individual files linked above. Each file contains detailed changelogs for its respective version range.
