# FPL H2H Analytics - Complete Version History

**Project Start:** October 23, 2024
**Total Releases:** 190+ versions
**Current Version:** v2.4.15 (December 12, 2025)

---

## 🎨 v2.4.x - My Team Mobile-First Layout Restructure (Dec 2025)

### v2.4.15 - Use Exact Stats Tab CSS for All Containers (Dec 12, 2025)
**CONSISTENCY:** Applied Stats tab styling to all My Team containers for cohesive design
- **Purple Gradient Background:** Changed all containers to Stats tab gradient
  - Old: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)` (dark blue)
  - New: `linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(55, 0, 60, 0.6) 100%)` (purple/magenta)
  - Source: `/src/components/Stats/season/Leaderboard.module.css` `.card`
- **Increased Border Radius:** Changed from 12px to 16px for all containers
  - More rounded corners match Stats tab appearance
- **Updated Stat Boxes (5 above pitch):**
  - Background: Purple gradient (was dark blue)
  - Border-radius: 16px (was 12px)
  - Padding: 14px 10px (slightly increased for better proportion)
- **Updated Team Value Boxes (2 below pitch):**
  - Background: Purple gradient (was dark blue)
  - Border-radius: 16px (was 12px)
  - Padding: 16px 24px (unchanged)
- **Updated Pitch Container:**
  - Background: Purple gradient (was dark blue)
  - Border-radius: 16px (was 12px)
  - Border and padding unchanged
- **Updated GW Transfers Container:**
  - Background: Purple gradient (was dark blue)
  - Border-radius: 16px (was 12px)
  - Padding: 1.5rem (increased from 16px for consistency)
- **Updated Collapsible Sections:**
  - Background: Purple gradient (was dark blue)
  - Border-radius: 16px (was 12px)
  - Overflow: hidden (unchanged)
- **Impact:** My Team tab now matches Stats tab appearance with unified purple gradient theme
- **Design Goal:** App-wide visual consistency - all tabs feel like the same application
- **Files:**
  - Modified: `src/components/Dashboard/Dashboard.module.css` (stat boxes, team value boxes)
  - Modified: `src/components/PitchView/PitchView.module.css` (pitch container)
  - Modified: `src/components/PitchView/StatsPanel.module.css` (GW transfers, collapsible sections)

### v2.4.14 - Fix Container Styling + GW Transfers Static Display (Dec 12, 2025)
**CONSISTENCY:** Made all boxes match app UI styling, converted GW Transfers to static display
- **Fixed Stat Boxes Styling:** Updated to match Stats tab design
  - Border-radius: 12px (was 10px)
  - Container padding: 12px (was 0 8px)
  - Flex-wrap: nowrap (was wrap)
  - Min-width: 62px, max-width: 85px
  - Value font-size: 1.4rem (was 1.3rem)
  - Label font-size: 0.55rem (was 0.6rem)
  - Label color: rgba(255,255,255,0.5) (was 0.6)
  - Label margin-top: 6px (was 4px)
  - Sub font-size: 0.7rem (was 0.65rem)
- **Fixed Team Value Boxes Styling:** Updated to match app card design
  - Border-radius: 12px (was 10px)
  - Padding: 16px 24px (was 12px 20px)
  - Container padding: 16px 12px (was 12px 8px)
  - Min-width: 130px (was 100px)
  - Value font-size: 1.4rem (was 1.2rem)
  - Label color: rgba(255,255,255,0.5) (was 0.6)
  - Label margin-top: 6px (was 4px)
- **Converted GW Transfers to Static Container:** Removed collapsible dropdown
  - Changed from CollapsibleSection component to static div
  - Always visible when transfers exist
  - Container background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%)
  - Container border: 1px solid rgba(255,255,255,0.1), 12px border-radius
  - Container padding: 16px with 12px margin-top
  - Title: 0.85rem, #10b981 color, uppercase, 0.05em letter-spacing
  - List: flex column with 8px gap
  - Maintains transfer card styling with player details and net summary
- **Mobile Breakpoint:** Added for screens under 400px
  - Stat boxes: 56px min-width, 1.2rem value, 0.5rem label
  - Container gap: 6px, padding: 8px
  - Border-radius: 10px on mobile
- **Impact:** All containers now have consistent app UI styling, GW Transfers always visible
- **Files:**
  - Modified: `src/components/Dashboard/Dashboard.module.css` (updated stat boxes and team value boxes)
  - Modified: `src/components/PitchView/StatsPanel.tsx` (converted GW Transfers to static container)
  - Modified: `src/components/PitchView/StatsPanel.module.css` (added GW Transfers container styles)

### v2.4.13 - Increase Player Card Size & Improve Pitch Markings (Dec 11, 2025)
**SIZE & VISIBILITY:** Increased player card sizes and made pitch markings more visible
- **Increased Player Card Sizes:** Players were too small to see clearly
  - Card width: 58-68px (was 52-60px)
  - Kit container: 48x52px (was 40x44px)
  - Name font: 0.65rem (was 0.6rem)
  - Name padding: 3px 6px (was 2px 4px)
  - Name max-width: 66px (was 58px)
  - Points font: 0.75rem (was 0.65rem)
  - Points padding: 4px 12px (was 3px 10px)
  - Points min-width: 32px (was 28px)
- **Mobile Player Card Sizes:** Scaled appropriately for small screens
  - Card width: 54-64px (was 46-50px)
  - Kit container: 44x48px (was 30x34px)
  - Name font: 0.6rem (was 0.48rem)
  - Name max-width: 60px (was 50px)
  - Points font: 0.7rem (was 0.6rem)
  - Points padding: 3px 10px
  - Bench cards: 48-56px wide
- **Improved Pitch Markings:** Made lines more visible with better sizing
  - Pitch min-height: 420px (was 400px)
  - Penalty box: 200x75px with rgba(255,255,255,0.12) lines
  - 6-yard box: 110x32px with 3px border-radius
  - Penalty spot: 5x5px at top 55px
  - Goal frame: 80x22px with subtle net (7px grid)
  - Halfway line: bottom 85px, 8% margin, 0.12 opacity
  - All lines use consistent subtle white: rgba(255,255,255,0.12)
- **Mobile Pitch Adjustments:** Scaled pitch markings for mobile
  - Penalty box: 160x60px
  - 6-yard box: 90x26px
  - Penalty spot: top 45px
  - Goal frame: 70x18px
  - Halfway line: bottom 75px
- **Impact:** Players are now clearly visible and readable, pitch markings provide proper football field context
- **Files:**
  - Modified: `src/components/PitchView/PlayerCard.module.css` (increased all card sizes)
  - Modified: `src/components/PitchView/PitchView.module.css` (improved pitch markings visibility)

### v2.4.12 - Pitch Redesign - App UI Colors & Simple Line Drawing (Dec 11, 2025)
**VISUAL REDESIGN:** Replaced green grass pitch with dark app UI colors and simple line markings
- **Background:** Changed from green grass to dark app card gradient
  - Removed: Green gradient (#2d4a3e → #35573f)
  - New: Dark gradient linear-gradient(135deg, #1e293b 0%, #0f172a 100%)
  - Matches app's overall dark theme and card styling
  - Border-radius: 12px, min-height: 400px
- **Removed Grass Texture:** Deleted grass stripes (::before pseudo-element)
  - No more fake grass texture
  - Clean, flat background
  - Minimalist design
- **Updated Pitch Markings:** Simple white line drawings
  - All lines: rgba(255,255,255,0.15) for subtle appearance
  - Penalty box: 180x70px with rounded bottom corners
  - 6-yard box: 100x30px with rounded bottom corners
  - Halfway line: positioned 70px from bottom
  - Penalty spot: 4x4px at top 50px
- **Simplified Goal Frame:** Cleaner design
  - Size: 90x25px (desktop), 80x20px (mobile)
  - Border: 2px solid rgba(255,255,255,0.3)
  - Background: rgba(0,0,0,0.3)
  - Simple net pattern with 8px grid
  - Net lines: rgba(255,255,255,0.08)
- **Hidden Corner Arcs:** Removed for cleaner look
  - display: none on all corner arcs
  - Less visual clutter
  - Focus on essential pitch elements
- **Mobile Adjustments:** Scaled down markings
  - Penalty box: 160x60px
  - 6-yard box: 90x28px
  - Goal frame: 80x20px
  - Penalty spot: top 42px
  - Halfway line: bottom 60px
- **Impact:** Pitch now matches app's dark theme, looks more professional and less game-like
- **Files:**
  - Modified: `src/components/PitchView/PitchView.module.css` (all pitch styling)

### v2.4.11 - Transfers Section Cleanup (Dec 11, 2025)
**CLEANUP:** Removed redundant "Transfers" section and restyled "GW Transfers" with card design
- **Removed "TRANSFERS" Section:** Deleted season totals collapsible section
  - Season Total transfers (not actionable info)
  - Hits Taken with cost (not actionable info)
  - Removed transfersTotal, transfersHits, transfersHitsCost state
- **Restyled "GW TRANSFERS" Section:** Card-based design matching app aesthetic
  - **Transfer Cards:** Each transfer displayed in individual card
    - Background: rgba(255,255,255,0.03)
    - Border: 1px solid rgba(255,255,255,0.08)
    - Border-radius: 8px, padding: 10px 12px
    - Horizontal layout with players and point differential
  - **Player Display:**
    - Player Out: rgba(255,255,255,0.7) color
    - Arrow: → in rgba(255,255,255,0.4)
    - Player In: #10b981 (green) color
    - Points shown in smaller font (0.75rem) in rgba(255,255,255,0.5)
  - **Point Differential:** Right-aligned, color-coded
    - Positive: +X in #10b981 (green)
    - Negative: -X in #ef4444 (red)
    - Neutral: 0 in rgba(255,255,255,0.5)
    - Font size: 0.9rem, bold
  - **Summary:** Net points shown at bottom
    - "Net: +X pts (after -Y hit: +Z pts)" format
    - Border-top separator (1px solid rgba(255,255,255,0.05))
    - Font size: 0.8rem, lighter color
- **Impact:** Cleaner stats panel, transfer details more readable with card design
- **Files:**
  - Modified: `src/components/PitchView/StatsPanel.tsx` (removed Transfers section, restyled GW Transfers)
  - Modified: `src/components/PitchView/StatsPanel.module.css` (added transfer card styles)

### v2.4.10 - Team Value Boxes Below Pitch (Dec 11, 2025)
**LAYOUT ENHANCEMENT:** Moved Squad Value info from collapsible section to prominent boxes below pitch
- **Added Team Value Boxes:** 2 boxes displayed below pitch (after bench)
  - **Team Value:** Shows total squad value (e.g., "£103.8m")
  - **In Bank:** Shows available funds (e.g., "£0.0m")
  - Positioned between pitch and stats sections
  - Visible on both mobile and desktop layouts
- **App Card Styling:** Boxes match other stat boxes design
  - Dark gradient background: linear-gradient(135deg, #1e293b, #0f172a)
  - Border: 1px solid rgba(255,255,255,0.1)
  - Border-radius: 10px
  - Centered text with uppercase labels
  - Min-width: 100px, padding: 12px 20px
  - Gap: 12px between boxes
- **Data Formatting:** Values formatted as £X.Xm (e.g., £103.8m)
  - Fetched from team info API (teamValue and bank in 0.1m units)
  - Formula: £${(value / 10).toFixed(1)}m
- **Removed Squad Value Section:** Deleted collapsible section from StatsPanel
  - No duplicate information
  - Cleaner stats panel
  - Removed teamValue and bank state from StatsPanel
- **Impact:** Squad value more prominent and visible, consistent box design, no need to expand section
- **Files:**
  - Modified: `src/components/Dashboard/MyTeamTab.tsx` (added teamValue/bank state, fetch data, team value boxes JSX)
  - Modified: `src/components/Dashboard/Dashboard.module.css` (team value boxes styles)
  - Modified: `src/components/PitchView/StatsPanel.tsx` (removed Squad Value section and related state)

### v2.4.9 - Remove Redundant Stats Sections (Dec 11, 2025)
**CLEANUP:** Removed redundant "This Gameweek" and "Overall" stats sections now that data is shown in boxes above pitch
- **Removed "THIS GAMEWEEK" Section:** Deleted entire collapsible section
  - Points (now in boxes)
  - Rank (now in boxes)
  - Transfers (now in boxes)
  - Average Points (removed - not critical)
- **Removed "OVERALL" Section:** Deleted entire collapsible section
  - Points (now in boxes)
  - Rank (now in boxes)
  - Total Players (removed - not critical)
- **Kept Remaining Sections:** Other sections still visible
  - Squad Value (Team Value, In Bank)
  - Transfers (Season Total, Hits Taken)
  - GW Transfers (Transfer details)
- **Cleaned Up Code:** Removed unused state variables and data fetching
  - Removed: overallPoints, overallRank, totalPlayers, gwPoints, gwRank, averagePoints state
  - Kept: teamValue, bank, gwTransfers, transfersTotal, transfersHits, transfersHitsCost, currentGW, currentGWTransfers
  - Simplified data fetching to only set needed state
- **Impact:** Cleaner stats panel, no duplicate information, faster rendering, less API data to process
- **Files:**
  - Modified: `src/components/PitchView/StatsPanel.tsx` (removed sections, cleaned state)

### v2.4.8 - Stats Boxes Above Pitch - 5 Boxes in App Style (Dec 11, 2025)
**MAJOR LAYOUT CHANGE:** Moved stats from pitch overlay to 5 separate boxes above pitch in app card style
- **Removed Pitch Stats Overlay:** Stats no longer displayed ON the pitch
  - Deleted stats overlay boxes from pitch (Points and Transfers)
  - Goalkeeper now fully visible without overlay blocking view
  - Cleaner pitch appearance
- **Removed Overall Stats Row:** Deleted old 2-stat row above GW selector
- **Added 5 Stat Boxes Above Pitch:** New card-style boxes showing all key stats
  - **GW Points:** Current gameweek points (e.g., "66")
  - **GW Rank:** Gameweek rank formatted (e.g., "1.3M" for 1,315,462)
  - **Transfers:** Transfer count with hit cost in red if applicable (e.g., "2" with "(-4)")
  - **Total Points:** Overall points with comma formatting (e.g., "896")
  - **Overall Rank:** Overall rank formatted (e.g., "248K" for 247,994)
- **Number Formatting:** Smart formatting for large numbers
  - 1M+ shows as "X.XM" (e.g., "1.3M")
  - 1K+ shows as "XK" (e.g., "248K")
  - <1K shows as-is (e.g., "896")
- **App Card Styling:** Boxes match Stats tab card design
  - Dark gradient background: linear-gradient(135deg, #1e293b, #0f172a)
  - Border: 1px solid rgba(255,255,255,0.1)
  - Border-radius: 10px
  - Centered text, uppercase labels
  - Flexible width with min 60px, max 80px
- **Responsive Layout:** 5 boxes wrap on mobile (3+2 or all in one row)
  - Gap: 8px between boxes
  - Centered alignment
  - Padding: 0 8px on container
- **Impact:** All key stats visible at a glance, cleaner pitch view, consistent card design, better mobile layout
- **Files:**
  - Modified: `src/components/Dashboard/MyTeamTab.tsx` (added 5 stat boxes, removed old row, added formatRank helper)
  - Modified: `src/components/Dashboard/Dashboard.module.css` (stat boxes styles, removed old overall stats row)
  - Modified: `src/components/PitchView/PitchView.tsx` (removed stats overlay, removed gwPoints/gwTransfers props)
  - Modified: `src/components/PitchView/PitchView.module.css` (removed pitch stats overlay styles)
  - Modified: `src/app/api/team/[teamId]/info/route.ts` (already returns gwRank - no changes needed)

### v2.4.7 - My Team - Copy FPL App Layout Exactly (Dec 11, 2025)
**MAJOR REDESIGN:** Copied official FPL app layout exactly - no creativity, just matching the source
- **Overall Stats Row:** Added above GW selector
  - Overall Points displayed on left (e.g., "896")
  - Overall Rank on right with arrow indicator (e.g., "▲ 247,994")
  - Underlined labels matching FPL app style
  - Fetched from team info API endpoint
- **Removed View Stats Toggle:** Stats sections now always visible and scrollable
  - Deleted toggle button entirely from mobile layout
  - Stats scroll normally below pitch like FPL app
  - Better UX - no hidden content
- **Fixed Stats Boxes on Pitch:** Made larger and properly positioned
  - Increased padding: 10px 16px (was 8px 14px)
  - Increased min-width: 85px (was 75px)
  - Larger value font: 1.8rem (was 1.6rem)
  - Better background: rgba(30,41,59,0.95) with proper border
  - Hit cost now has red background pill
- **Dark Grey-Green Pitch:** Changed from bright green to muted FPL colors
  - New gradient: #2d4a3e → #35573f → #2d4a3e (was #1e4d2b → #236b38)
  - More subtle grass stripes (30px/60px pattern with rgba(0,0,0,0.05))
  - Border-radius: 8px (was 16px)
  - Border: 1px solid (was 2px)
  - Professional muted appearance matching FPL app
- **Proper Goal Net:** Updated net pattern to match FPL
  - Wider goal: 120px (was 110px), taller: 35px (was 32px)
  - Net lines at 6px intervals with rgba(255,255,255,0.15)
  - Darker background: rgba(0,0,0,0.5) (was 0.4)
  - Thicker border: 3px solid rgba(255,255,255,0.5) (was 0.6)
- **Smaller Player Cards:** Compact size matching FPL app
  - Card width: 52-60px (was 54-58px)
  - Kit size: 40x44px (was 38x42px)
  - Name font: 0.6rem with dark background pill
  - Points font: 0.65rem with proper padding (3px 10px)
  - Removed bench-specific sizing - uses same opacity modifier
- **Subtle Pitch Markings:** Reduced prominence
  - Border width: 1px (was 2px)
  - Opacity: 0.2 (was 0.25)
  - Halfway line: 1px height, 0.15 opacity (was 2px, 0.25)
  - All markings more subtle matching FPL app
- **Stats Sections UI Consistency:** Match app card style exactly
  - Card background: linear-gradient(135deg, #1e293b, #0f172a)
  - Border-radius: 12px, margin: 12px bottom
  - Toggle padding: 14px 16px, green title (#10b981)
  - Content padding: 0 16px 16px
  - Stat rows: 10px padding, rgba text colors
  - Hover: rgba(255,255,255,0.03) background
- **Impact:** Exact FPL app aesthetic, professional appearance, consistent UI across all sections
- **Files:**
  - Modified: `src/components/Dashboard/MyTeamTab.tsx` (overall stats, removed toggle, always show stats)
  - Modified: `src/components/Dashboard/Dashboard.module.css` (overall stats styles, deleted toggle styles)
  - Modified: `src/components/PitchView/PitchView.module.css` (dark pitch, goal net, stat boxes, subtle markings)
  - Modified: `src/components/PitchView/PlayerCard.module.css` (smaller cards, proper sizing)
  - Modified: `src/components/PitchView/StatsPanel.module.css` (match app card style)

### v2.4.6 - My Team Visual Polish - Compact Cards & Darker Pitch (Dec 11, 2025)
**MAJOR VISUAL POLISH:** Enhanced pitch aesthetics with stats overlay, darker colors, smaller cards matching official FPL app
- **Stats Overlay:** Added semi-transparent stat boxes ON the pitch itself
  - Points displayed in top-left corner
  - Transfers displayed in top-right corner with hit cost in red when applicable
  - Dark background (rgba(15,23,42,0.9)) with backdrop blur
  - Always visible without taking vertical space
- **Darker Pitch:** Changed from bright green to muted gradient (#1e4d2b → #236b38)
  - More subtle grass stripes using rgba(0,0,0,0.06) transparency
  - All pitch markings reduced from 0.4 to 0.25 opacity (penalty boxes, goal area, corner arcs)
  - More professional appearance matching official FPL app
- **Goal Net Texture:** Added visible crosshatch pattern to goal
  - Dual repeating-linear-gradient for vertical and horizontal net lines
  - White lines at 0.12 opacity on dark background
  - Height increased from 12px to 32px for better visibility
- **Smaller Player Cards:** Made cards compact like FPL app
  - Desktop: min-width 80px → 54px, kit 70px → 38x42px, name 0.8rem → 0.55rem
  - Bench cards even more compact: 48px min-width
  - Points badge smaller: 0.85rem → 0.7rem, reduced padding
  - Captain/vice badges: 20px → 16px
  - Mobile (768px): Cards 50px, kit 34x38px, name 0.5rem
  - Mobile (480px): Cards 46px, kit 30x34px, name 0.48rem
- **Tighter Spacing:** Reduced gaps between rows with smaller cards
  - Pitch row gap: 0.75rem → 0.6rem, margin-bottom: 1.5rem → 1rem
  - Bench gap: 0.75rem → 0.6rem, padding-top: 1rem → 0.75rem
  - Mobile (768px): gap 0.4rem, margin-bottom 0.75rem
- **Mobile Responsive:** Stats overlay scales down on smaller screens
  - 768px: Stat boxes 60px min-width, value 1.3rem, label 0.6rem
  - 480px: Stat boxes 50px min-width, value 1.1rem, label 0.55rem
- **Impact:** Professional FantasyPL aesthetic, more compact pitch view, better information density
- **Files:**
  - Modified: `src/components/PitchView/PitchView.tsx` (added gwPoints/gwTransfers props, stats overlay JSX)
  - Modified: `src/components/Dashboard/MyTeamTab.tsx` (fetch stats, pass to PitchView)
  - Modified: `src/components/PitchView/PitchView.module.css` (darker pitch, subtle markings, goal net, stats overlay, tighter spacing, mobile adjustments)
  - Modified: `src/components/PitchView/PlayerCard.module.css` (smaller cards, reduced sizes, mobile breakpoints)

### v2.4.5 - My Team Structure - Remove Clutter, Add Stats Toggle (Dec 11, 2025)
**MAJOR STRUCTURE CHANGES:** Removed unnecessary UI elements and added stats toggle for cleaner, more focused mobile experience
- **Removed Header Bar:** Deleted TeamHeader component showing "FC Matos* / Greg Lienart" + stats - users know their own team
- **Removed Formation Badge:** Deleted "3-4-3" pill from pitch - formation visible from player positions
- **Removed BENCH Label:** Hidden "BENCH" text label - visual separation (border line) sufficient
- **Simplified GW Selector:** Removed button borders and backgrounds - minimal arrows and text only
- **Added Stats Toggle:** "View Stats" button below pitch reveals/hides all stats sections (hidden by default)
- **Cleaner Mobile Layout:** Pitch takes center stage without header clutter
- **Impact:** Faster focus on pitch, cleaner visual hierarchy, stats available on demand
- **Files:**
  - Modified: `src/components/Dashboard/MyTeamTab.tsx` (removed TeamHeader, added stats toggle state/button)
  - Modified: `src/components/Dashboard/Dashboard.module.css` (added viewStatsButton styles)
  - Modified: `src/components/PitchView/PitchView.tsx` (removed formation badge JSX)
  - Modified: `src/components/PitchView/PitchView.module.css` (hidden bench label)
  - Modified: `src/components/PitchView/GWSelector.module.css` (minimal button styling)
  - Deleted: `src/components/PitchView/TeamHeader.tsx`, `TeamHeader.module.css`
  - Deleted: `src/components/PitchView/QuickStats.tsx`, `QuickStats.module.css`

### v2.4.4 - UI Consistency - Match App Style (Dec 11, 2025)
**UX POLISH:** Unified My Team tab visual style with rest of app for consistent look and feel
- **Green Accent Color:** Section titles now use app-wide green accent (#10b981) instead of faded white
- **Brighter Text:** Increased text opacity across all components for better readability
  - Manager name: 0.6 → 0.7
  - Stat labels: 0.5 → 0.7
  - Section toggle headers: #fff → rgba(255,255,255,0.9)
  - Toggle icons: 0.5 → 0.7
- **Interactive Elements:** Added green accent to hover states
  - GW selector buttons show green border/background on hover
  - Collapsible section headers show green border on hover
- **Visual Consistency:** My Team now matches styling of Stats, Rankings, and Match Details
- **Impact:** Cohesive app-wide design, improved text contrast, better visual hierarchy
- **Files:**
  - Modified: `src/components/PitchView/TeamHeader.module.css` (brighter text)
  - Modified: `src/components/PitchView/StatsPanel.module.css` (green section titles, brighter text, green hover accent)
  - Modified: `src/components/PitchView/GWSelector.module.css` (green hover accent)
  - Modified: `src/components/PitchView/QuickStats.module.css` (brighter text)

### v2.4.3 - Pitch Redesign - FantasyPL Style Half-Pitch (Dec 11, 2025)
**MAJOR VISUAL REDESIGN:** Transformed full-pitch view into half-pitch perspective matching official FantasyPL app
- **Half-Pitch Perspective:** Only shows from goal to midfield (removed full-field view)
- **Goal Frame Enhanced:** Visible goal frame behind goalkeeper with thicker borders
- **Bench Integrated:** Bench now part of pitch container (not separate card) with divider line
- **Removed Elements:**
  - Center circle and center spot (not needed for half-pitch)
  - Bottom penalty box, goal area, and penalty spot
  - Bottom corner arcs (kept only top corners)
  - Bottom goal frame (hidden)
- **Halfway Line:** Repositioned from 35% to bottom of pitch (above bench area)
- **Visual Depth:** Maintained grass stripes for realistic field appearance
- **Layout:** GK positioned in goal, DEF near penalty box, MID in middle, FWD near halfway line
- **Impact:** More focused view matching official FPL aesthetic, cleaner design, better use of space
- **Files:**
  - Modified: `src/components/PitchView/PitchView.module.css` (half-pitch styling, removed full-field elements)
  - Modified: `src/components/PitchView/PitchView.tsx` (removed bottom markings, bench integration)

### v2.4.2 - Stats Section Cleanup (Dec 11, 2025)
**UX IMPROVEMENT:** Removed noise and fixed incorrect hits calculation
- **Removed:** "Highest Points" from This Gameweek section (not useful information)
- **Fixed:** "Hits Taken" now shows correct season total instead of 0
- **API Update:** Fetches entry history to sum all `event_transfers_cost` values
- **Calculation:** Divides total cost by 4 to get number of hits
- **Display:** Shows both hit count and total points lost (e.g., "3 (-12pts)")
- **Impact:** Users now see accurate season hits data
- **Files:**
  - Modified: `src/components/PitchView/StatsPanel.tsx` (removed highestPoints, updated display)
  - Modified: `src/app/api/team/[teamId]/transfers/route.ts` (fixed hits calculation)

### v2.4.1 - Compact Header - Merge Team Info + Stats (Dec 11, 2025)
**UX IMPROVEMENT:** Saved vertical space by merging team header and stats into one compact bar
- **Mobile Layout:** Merged TeamHeader and QuickStats into single compact component
- **Layout:** Team info on left (team name primary, manager name secondary), stats on right
- **Removed:** Separate QuickStats component from mobile layout
- **Vertical Space Saved:** One row instead of two before pitch
- **Stats:** Points, Rank, Transfers displayed inline with team info
- **Responsive:** Further compacted on small screens (< 768px and < 375px)
- **Impact:** Users see their pitch even faster with more compact mobile header
- **Files:**
  - Modified: `src/components/PitchView/TeamHeader.tsx` (added stats props and display)
  - Modified: `src/components/PitchView/TeamHeader.module.css` (horizontal layout)
  - Modified: `src/components/Dashboard/MyTeamTab.tsx` (removed QuickStats, pass stats to TeamHeader)

### v2.4.0 - Mobile Layout Restructure (Dec 11, 2025)
**MAJOR UX IMPROVEMENT:** Completely restructured My Team layout for mobile-first experience
- **Mobile Layout (< 1024px):**
  - Team header with manager name and team name at top
  - GW selector moved above pitch for easier access
  - Quick stats row (Points | Rank | Transfers) before pitch
  - Pitch and bench fully visible without scrolling past stats wall
  - Detailed collapsible stats sections below pitch
- **Desktop Layout (≥ 1024px):**
  - Unchanged: Two-column layout with full stats panel on left, pitch on right
  - Stats panel shows team header and all sections (full mode)
  - Pitch view includes GW selector
- **New Components:**
  - `TeamHeader`: Displays manager and team name in mobile header
  - `GWSelector`: Standalone gameweek selector (reusable)
  - `QuickStats`: Horizontal stats row for mobile (Points, Rank, Transfers)
- **Component Updates:**
  - `StatsPanel`: Added `mode` prop ('full' | 'collapsible-only') for responsive rendering
  - `PitchView`: Added `showGWSelector` prop to conditionally show/hide GW selector
  - `MyTeamTab`: Separate mobile and desktop layouts with responsive CSS switching
- **Impact:** Mobile users see their team immediately without scrolling through massive stats panel
- **Impact:** Better information hierarchy on mobile with quick stats at top, detailed stats below
- **Files:**
  - Created: `src/components/PitchView/TeamHeader.tsx`, `src/components/PitchView/TeamHeader.module.css`
  - Created: `src/components/PitchView/GWSelector.tsx`, `src/components/PitchView/GWSelector.module.css`
  - Created: `src/components/PitchView/QuickStats.tsx`, `src/components/PitchView/QuickStats.module.css`
  - Modified: `src/components/PitchView/StatsPanel.tsx`
  - Modified: `src/components/PitchView/PitchView.tsx`
  - Modified: `src/components/Dashboard/MyTeamTab.tsx`
  - Modified: `src/components/Dashboard/Dashboard.module.css`

---

## 🎨 v2.3.x - My Team UI Polish & Mobile Optimization (Dec 2025)

### v2.3.1 - Fix Desktop Collapsible Sections Bug (Dec 11, 2025)
**CRITICAL FIX:** Desktop now shows all section content correctly
- Bug: Sections with `defaultOpen={false}` hid content on desktop
- Root Cause: Conditional rendering (`{isOpen && <div>}`) prevented CSS override
- Fix: Always render content div, control visibility with CSS classes
- Added: `.open` and `.closed` classes for state-based styling
- Desktop: Both classes override to `display: block` (always visible)
- Mobile: `.closed` hides with `display: none`, `.open` shows
- Impact: Desktop users can now see Overall, Squad Value, Transfers sections
- Files: `src/components/PitchView/StatsPanel.tsx`, `src/components/PitchView/StatsPanel.module.css`

### v2.3.0 - Add Collapsible Sections & Compact Mobile Layout (Dec 10, 2025)
**UI POLISH:** Improved stats panel with collapsible sections for better mobile experience
- Added: Collapsible sections on mobile (tap to expand/collapse)
- Desktop: Sections always open with cleaner header styling
- Mobile: "This Gameweek" open by default, others collapsed to reduce scrolling
- Sections: This Gameweek, Overall, Squad Value, Transfers, GW Transfers
- Added: Hover states and tap affordance for future interactivity
- Styling: More compact desktop padding (1.5rem → 1.25rem)
- Styling: Mobile padding reduced (1.5rem → 1rem)
- Impact: Mobile users no longer scroll through massive stats block to reach pitch
- Impact: Cleaner, more organized information architecture
- Files: `src/components/PitchView/StatsPanel.tsx`, `src/components/PitchView/StatsPanel.module.css`

---

## 🎨 v2.2.x - My Team Redesign (Dec 2025)

### v2.2.7 - Sync Left Panel with Gameweek Selection (Dec 10, 2025)
**FEATURE:** Left panel stats now update when gameweek changes
- Fixed: StatsPanel now syncs with selected GW from arrow navigation
- Lifted: GW state from PitchView to MyTeamTab for shared control
- Added: `selectedGW` prop to both StatsPanel and PitchView
- Added: GW query parameter support to `/api/team/[teamId]/info` route
- Flow: Arrow click → MyTeamTab state update → both panels refetch with new GW
- Impact: Users can now view historical GW stats in left panel, not just current GW
- Files: `src/components/Dashboard/MyTeamTab.tsx`, `src/components/PitchView/PitchView.tsx`, `src/components/PitchView/StatsPanel.tsx`, `src/app/api/team/[teamId]/info/route.ts`

### v2.2.6 - Improve Formation Badge Placement (Dec 10, 2025)
**UX FIX:** Formation badge now positioned inside pitch area
- Moved: Formation badge from floating above pitch to top-left corner inside pitch
- Styled: Smaller, more subtle design with dark background and blur effect
- Changed: Position from `inline-block` to `absolute` at top-left (1rem, 1rem)
- Reduced: Font size from 0.85rem to 0.75rem (desktop) and 0.7rem (mobile)
- Added: Backdrop blur, subtle shadow, and better opacity for modern look
- Impact: Badge looks intentional and integrated with pitch, not awkwardly floating
- Files: `src/components/PitchView/PitchView.tsx`, `src/components/PitchView/PitchView.module.css`

### v2.2.5 - Add Current GW Transfer Details (Dec 10, 2025)
**FEATURE:** Display detailed transfer information with player names and points
- Added: Current GW transfers section showing player-by-player breakdown
- Display Format: "PlayerOut (Xpts) → PlayerIn (Ypts) = ±Z"
- Added: Net gain calculation for each transfer
- Added: Total net gain summary with hit cost factored in
- Backend: Updated `/api/team/[teamId]/transfers` to fetch player points from bootstrap
- Frontend: New transfer detail section with styled player names and net gains
- Impact: Users can now see exactly how their transfers performed in current gameweek
- Files: `src/app/api/team/[teamId]/transfers/route.ts`, `src/components/PitchView/StatsPanel.tsx`, `src/components/PitchView/StatsPanel.module.css`

### v2.2.4 - Add FPL-wide Average and Highest Points (Dec 10, 2025)
**FEATURE:** Display league-wide statistics in My Team Stats panel
- Added: Average Points row to "This Gameweek" section
- Added: Highest Points row to "This Gameweek" section
- Backend: Updated `/api/team/[teamId]/info` to extract stats from bootstrap events array
- Frontend: Updated StatsPanel to display `averagePoints` and `highestPoints`
- Data Source: FPL bootstrap-static API events[currentGW-1].average_entry_score and .highest_score
- Impact: Users can now compare their GW performance against FPL-wide averages
- Files: `src/app/api/team/[teamId]/info/route.ts`, `src/components/PitchView/StatsPanel.tsx`

### v2.2.3 - Remove Duplicate Header Stats (Dec 10, 2025)
**UX CLEANUP:** Removed redundant Points and Transfers boxes from pitch view header
- Removed: Duplicate GW Stats section showing Points and Transfers
- Reason: Information already displayed in left panel's "This Gameweek" section
- Result: Cleaner layout without redundant information
- Impact: Left panel still shows Points, Rank, and Transfers as comprehensive stats
- Files: `src/components/PitchView/PitchView.tsx`

### v2.2.2 - Fix Pitch Markings Alignment (Dec 10, 2025)
**UX FIX:** Pitch markings now properly positioned relative to player rows
- Fixed: Halfway line moved from 50% to 35% from top
- Fixed: Center circle repositioned to 35% (aligned with halfway line)
- Fixed: Center spot repositioned to 35% (aligned with halfway line)
- Result: Halfway line now clearly between defenders and midfielders
- Result: Center circle no longer cuts through defender row
- Impact: Pitch looks like actual football pitch with proper perspective
- Files: `src/components/PitchView/PitchView.module.css`

### v2.2.1 - Negative Scores & Bigger Player Cards (Dec 10, 2025)
**UX IMPROVEMENTS:** Enhanced fixtures and pitch view display
- Added: Negative fixture scores show in parentheses format (4) instead of -4
- Reason: Prevents confusing displays like "-4 - 4" → now shows as "(4) - 4"
- Fixed: Player cards made bigger to prevent name truncation
- Desktop: Cards 60px → 80px, kits 70px, name max-width 95px
- Mobile: Cards 50px → 65px, kits 60px, name max-width 80px
- Impact: Names like "B.Fernandes" and "Woltemade" now display fully
- Files: `src/components/Fixtures/FixturesTab.tsx`, `src/components/PitchView/PlayerCard.module.css`

---

## 🎉 v2.0.x - Multi-League Support (Dec 2025) - **MAJOR MILESTONE**

### v2.0.20 - Odd-Numbered League Support + Cleanup (Dec 9, 2025)
**FEATURE:** Support for H2H leagues with odd number of teams (AVERAGE opponent)
- Added: AVERAGE entries stored with entry_id = -1 in database
- Added: Matches vs AVERAGE now captured and stored in h2h_matches table
- Added: AVERAGE row appears in League Rankings (italic, 60% opacity styling)
- Fixed: No longer skips AVERAGE as "corrupted data" from FPL API
- Backend: Updated `/api/league/[id]/route.ts` to handle null entry_id (AVERAGE)
- Frontend: Updated LeagueTab to detect and style AVERAGE entries
- Test League: 754307 (Powerleague 2025, 31 teams)
- Also: Documented admin deployment exception for `/admin` and `/api/admin` routes
- Also: Activity toggle (Managers/Requests) with dynamic data filtering in admin panel
- Note: Package version was 2.0.19, now properly bumped to 2.0.20
- Files: `src/app/api/league/[id]/route.ts`, `src/components/Dashboard/LeagueTab.tsx`, `DEPLOYMENT.md`, `CLAUDE.md`

### v2.0.18 - Update Documentation to v2.0.18 (Dec 8, 2025)
**DOCUMENTATION:** Updated all version documentation to reflect current state
- Updated: VERSION_HISTORY_COMPLETE.md with versions 2.0.13-2.0.17
- Updated: README.md current version from v1.26.6 to v2.0.18
- Updated: README.md changelog reference to VERSION_HISTORY_COMPLETE.md
- Added: Complete documentation of admin panel debug and fix process
- Context: Versions 2.0.13-2.0.17 fixed admin panel showing zeros issue
- Files: `VERSION_HISTORY_COMPLETE.md`, `README.md`

### v2.0.17 - Clean Up Debug Endpoints (Dec 8, 2025)
**CLEANUP:** Removed temporary debug files after fixing admin panel
- Removed: `/api/debug/db-info` endpoint (temporary debugging)
- Removed: `/api/debug/table-info` endpoint (temporary debugging)
- Removed: `test-queries.js` script (temporary debugging)
- Status: Admin panel now working correctly with real analytics data
- Note: Debug endpoints were only needed to diagnose the build-time database connection issue
- Files: Deleted `src/app/api/debug/*`, `test-queries.js`

### v2.0.16 - Fix Admin Panel - Add force-dynamic (Dec 8, 2025)
**CRITICAL FIX:** Admin panel now displays real analytics data instead of zeros
- Problem: Admin panel showing all zeros despite database having 23,958 records
- Root Cause: Next.js tried to prerender admin routes during build, but `postgres.railway.internal` hostname only available at runtime
- Error: `getaddrinfo ENOTFOUND postgres.railway.internal`
- Fixed: Added `export const dynamic = 'force-dynamic'` to admin API routes
- Routes: `/api/admin/stats/route.ts`, `/api/admin/leagues/route.ts`
- Impact: Routes now execute only at request time when database connection available
- Result: Admin panel displays correct data (23,958 requests, 385 users, 107 leagues)
- Files: `api/admin/stats/route.ts`, `api/admin/leagues/route.ts`

### v2.0.15 - Add Error Details to Admin Stats Response (Dec 8, 2025)
**DEBUG:** Added detailed error information to identify failing queries
- Added: Return error message in JSON response
- Added: Return error stack trace in JSON response
- Purpose: Identify which specific query was failing in admin stats
- Result: Revealed "getaddrinfo ENOTFOUND postgres.railway.internal" error during build
- Files: `api/admin/stats/route.ts`

### v2.0.14 - Add Table Structure Debug Endpoint (Dec 8, 2025)
**DEBUG:** Created endpoint to verify database table structure
- Added: `/api/debug/table-info` endpoint
- Checks: Table existence via information_schema.columns
- Checks: Column names and data types
- Tests: Simple COUNT query and sample row retrieval
- Result: Confirmed analytics_requests table exists with 23,912 rows
- Result: Confirmed all expected columns present (id, league_id, endpoint, method, timestamp, user_hash, response_time_ms, status_code, selected_team_id)
- Files: `src/app/api/debug/table-info/route.ts`

### v2.0.13 - Add Debug Endpoint for Database Connection (Dec 8, 2025)
**DEBUG:** Created endpoint to check production DATABASE_URL
- Added: `/api/debug/db-info` endpoint
- Shows: Masked DATABASE_URL being used by production
- Shows: Analytics requests count and last record timestamp
- Purpose: Verify which database production is actually connecting to
- Result: Confirmed production uses `postgres.railway.internal:5432`
- Result: Confirmed database has 23,895 rows of analytics data
- Files: `src/app/api/debug/db-info/route.ts`

### v2.0.12 - Add Enhanced Analytics Debug Logging (Dec 5, 2025)
**DEBUG:** Added detailed logging to diagnose analytics tracking issue
- Added: Log track URL construction (protocol, host)
- Added: Log fetch response status
- Added: Log parsed response JSON
- Added: More detailed error logging with URL
- Purpose: Diagnose why analytics not being tracked since Friday
- Files: `src/middleware.ts`

### v2.0.11 - Fix Analytics Tracking (Dec 5, 2025)
**CRITICAL BUG FIX:** Analytics now saving to database - admin stats will populate
- Fixed: Analytics tracking was failing silently trying to write to non-existent analytics_leagues table
- Fixed: Removed all references to analytics_leagues from analytics.ts
- Changed: trackRequest() now only writes to analytics_requests table
- Changed: updateLeagueMetadata() is now a no-op (metadata computed on-demand)
- Changed: aggregateDailyStats() no longer updates analytics_leagues
- Impact: Analytics will now be tracked and saved to database
- Impact: Admin dashboard will show real stats after this deployment
- Files: `lib/analytics.ts`

### v2.0.10 - Fix Admin Dashboard Stats API (Dec 5, 2025)
**CRITICAL BUG FIX:** Fixed admin dashboard showing "Cannot read properties of undefined"
- Fixed: Admin stats API was querying non-existent `analytics_leagues` table
- Fixed: Error handler was missing `uniqueManagers` field in fallback response
- Changed: Rewrote queries to use only `analytics_requests` table
- Changed: Aggregate league stats directly from analytics_requests
- Added: Proper integer casting for all numeric fields
- Impact: Admin dashboard now loads without client-side errors
- Impact: Stats display correctly even when database is empty
- Files: `api/admin/stats/route.ts`

### v2.0.9 - Fix Admin Panel Sort Handler (Dec 5, 2025)
**BUG FIX:** Fixed client-side error in admin panel sort logic
- Fixed: handleSort trying to access leagues[0] when array is empty
- Fixed: Changed to check field name instead of runtime type checking
- Changed: Use predefined list of numeric fields instead of leagues[0]?.[field]
- Impact: Admin panel no longer crashes on initial load
- Files: `app/admin/leagues/page.tsx:51-63`

### v2.0.8 - Fix Admin Panel Type Casting (Dec 5, 2025)
**BUG FIX:** Fixed client-side error in admin panel caused by type mismatch
- Fixed: Admin panel showing "client-side exception has occurred" error
- Fixed: PostgreSQL COUNT() returns bigint (string), frontend expects number
- Added: Explicit ::integer casts for all numeric fields in query
- Fields cast: league_id, team_count, total_requests, unique_users, unique_managers
- Files: `api/admin/leagues/route.ts`

### v2.0.7 - Fix Admin Panel (Dec 5, 2025)
**BUG FIX:** Admin panel now works - fixed missing league_metadata table error
- Fixed: Admin panel `/admin/leagues` was broken - returning 500 error
- Fixed: Rewrote query to use existing tables instead of non-existent `league_metadata`
- Changed: Now uses CTEs to aggregate data from `analytics_requests` and `h2h_matches`
- Changed: League names now show as "League {id}" (metadata table didn't exist)
- Data: Total requests, unique users, unique managers from analytics_requests
- Data: Team count from h2h_matches
- Files: `api/admin/leagues/route.ts`

### v2.0.6 - Fix Gameweek Stats Showing ALL Leagues (Dec 5, 2025)
**CRITICAL BUG FIX:** Gameweek stats now correctly filtered by current league only
- Fixed: Gameweek stats (Captain Picks, Chips, Hits, Winners, Top Performers) were showing data from ALL leagues in database
- Fixed: `fetchManagers` function now filters by leagueId using EXISTS subquery
- Fixed: SQL query now joins h2h_matches to get only managers in selected league
- Impact: Captain Picks - now shows only captains from current league managers
- Impact: Chips Played - now shows only chips from current league managers
- Impact: Hits Taken - now shows only hits from current league managers
- Impact: Gameweek Winners - now shows only highest/lowest scores from current league
- Impact: Top Performers - now shows only players owned by current league managers
- Files: `api/league/[id]/stats/gameweek/[gw]/route.ts:313-326`

### v2.0.5 - Fix Season Stats Showing Multiple Leagues (Dec 5, 2025)
**CRITICAL BUG FIX:** Season stats now correctly filtered by current league only
- Fixed: Season stats were aggregating data across ALL leagues user is in
- Fixed: Player API now requires and filters by leagueId parameter
- Fixed: SQL query now includes `WHERE league_id = $2` filter
- Updated: Dashboard passes leagueId when fetching player data
- Impact: Highest Score, Lowest Score, Biggest Win, Biggest Loss now league-specific
- Impact: Match history, chips played, and all stats now scoped to current league
- Files: `api/player/[id]/route.ts`, `dashboard/page.tsx`

### v2.0.4 - Add Contact Footer to Settings (Dec 5, 2025)
**FEATURE:** Added contact information footer to Settings page
- Added: Contact footer section at bottom of Settings page
- Content: "Found a bug? Have feedback?" with Reddit and X links
- Link: Reddit u/gregleo (https://reddit.com/u/gregleo)
- Link: X @greglienart (https://x.com/greglienart)
- Styling: Subtle muted colors, small text, center aligned
- UX: Links open in new tab with proper security attributes
- Visual: Separated from content with border and extra spacing
- Files: `SettingsTab.tsx`, `SettingsTab.module.css`

### v2.0.3 - My Leagues UI Polish (Dec 5, 2025)
**UI IMPROVEMENT:** My Leagues section now visually matches Settings page theme
- Updated: My Leagues CSS completely rewritten to match Settings page styling
- Visual: Green theme matching action buttons (rgba(0, 255, 135, ...))
- Visual: Title now uppercase with letter-spacing like other section titles
- Visual: League items styled as cards with proper spacing and borders
- Visual: Current league has green border matching app accent color
- Visual: Hover effects with translateY(-2px) matching action buttons
- Visual: Add button styled consistently with primary actions
- Consistency: All colors changed from CSS variables to explicit rgba values
- File: `/src/components/Settings/MyLeagues.module.css` (244 lines rewritten)

### v2.0.2 - Remember Team Selection Per League (Dec 5, 2025)
**UX IMPROVEMENT:** App now remembers which team you are in each league
- Fixed: Saved leagues now store team info (myTeamId, myTeamName, myManagerName)
- Feature: First time switching to a league → team selection required
- Feature: Subsequent switches → instant switch, no team re-selection
- Smart: Auto-updates team info whenever you're in Settings
- Storage: savedLeagues now includes `{id, name, myTeamId, myTeamName, myManagerName}`
- UX: Much faster league switching for frequently used leagues

### v2.0.1 - Fix League Switching Flow (Dec 5, 2025)
**BUG FIX:** Fixed league switching to include team selection step
- Fixed: Clicking a saved league now redirects to team selection page
- Fixed: No more "Team not found in league" error
- Fixed: No more false error alert when switch succeeds
- Flow: Click league → Select your team → Dashboard loads
- Previous issue: Tried to auto-match team, failed if names didn't match
- Uses same team selection flow as "Change Team" button

### v2.0.0 - My Leagues: Save & Switch Between Multiple Leagues (Dec 5, 2025)
**MAJOR FEATURE:** Multi-league support - manage up to 5 leagues from Settings
- Added: "My Leagues" section in Settings page
- Feature: Save up to 5 leagues with names and IDs in localStorage
- Feature: Current league highlighted with green border and checkmark
- Feature: Click any league to switch (reloads dashboard with new league)
- Feature: Remove leagues with confirmation (cannot remove current league)
- Feature: Add new leagues by entering league ID (fetches name automatically)
- Storage: Uses new 'savedLeagues' localStorage key (array of {id, name})
- UX: Shows max limit message when 5 leagues saved
- Files: `/src/components/Settings/MyLeagues.tsx` + CSS module

---

## v1.26.x Series - Large League Support & Error Handling (Jan 2025)

### v1.26.14 - Remove Legacy League Route (Dec 5, 2025)
**CODE CLEANUP:** Removed old legacy `/league/[leagueId]` route and related code
- Deleted: `/src/app/league/[leagueId]/` directory (legacy league and player pages)
- Deleted: `/src/components/BottomNav.tsx` (old bottom navigation)
- Deleted: `/src/components/BottomNav.module.css` (old nav styling)
- Fixed: Removed broken navigation in LeagueTab component
- Result: `/league/804742` now returns 404 (as expected)
- Impact: Cleaner codebase, no dead code, /dashboard is the only league viewing route
- Note: Main app flow unchanged - users still access via /dashboard

### v1.26.13 - Add AFCON Special Rule for GW16 (Dec 5, 2025)
**NEW FEATURE:** Special AFCON rule - everyone gets 5 FT for GW16
- Added: Special rule override for GW16 due to AFCON break
- Reason: FPL is giving all managers 5 FT to adjust for African players unavailable
- Implementation: After normal FT calculation, if currentGW === 16, set ftBalance to 5
- Also cleaned up: Removed all debug logging from FT calculation
- Location: `/api/league/[id]/matches/[matchId]/route.ts:160-163`

### v1.26.12 - Fix FT Showing Wrong Gameweek (Dec 5, 2025) ✅ **ACTUAL FIX**
**CRITICAL FIX:** FT now shows correctly for current gameweek (not next gameweek)
- Issue: When viewing GW14 fixture, app showed FT for AFTER GW14 (2 FT) instead of FOR GW14 (1 FT)
- Root cause: Calculation added +1 FT after last completed GW, showing FT for next period
- Previous logic: Process through GW13 → add +1 FT → show 2 FT (for GW15)
- New logic: Process through GW13 → DON'T add +1 FT → show 1 FT (for GW14)
- Implementation: Only add +1 FT if there's another completed GW after current one
- Debug logging: Added comprehensive logging to trace calculations in production
- Location: `/api/league/[id]/matches/[matchId]/route.ts:122-170`

### v1.26.11 - Fix GW1 Special Case in FT Calculation (Dec 5, 2025) ❌ **INCOMPLETE**
**CRITICAL FIX:** Fixed GW1 double-counting issue in FT calculation
- Issue: GW1 was being processed as normal GW, adding +1 FT incorrectly
- Root cause: GW1 has no FT available (0), but after it ends you get 1 FT for GW2
- Previous logic: Process GW1 as (0-0+1=1), then GW2 as (1-1+1=1) - double-counted
- New logic: Skip GW1 processing, just set ftBalance=1 for GW2, then process GW2+
- Location: `/api/league/[id]/matches/[matchId]/route.ts:130-134`

### v1.26.10 - Fix FT Calculation Logic (Dec 5, 2025) ❌ **INCOMPLETE**
**CRITICAL FIX:** Corrected Free Transfers calculation with proper FPL rules
- Fixed: GW1 starts with 0 FT (not 1)
- Fixed: Cap is 5 FT (not 2)
- Fixed: Wildcard/Free Hit don't add +1 FT for next GW (was adding incorrectly)
- Fixed: Only normal GWs (including BB/TC) add +1 FT after consuming transfers
- Rules: Start 0 FT → Each normal GW: consume transfers, then +1 FT (max 5)
- Location: `/api/league/[id]/matches/[matchId]/route.ts:122-144`

### v1.26.9 - Reverse Form Display Order (Dec 5, 2025)
**UX IMPROVEMENT:** Form (W/L/D) now displays oldest→newest (left to right)
- Changed: Form badges now show chronologically (oldest GW on left, newest on right)
- Previous: Newest→oldest (confusing for users expecting timeline flow)
- Locations: League standings table + Match details modal
- Implementation: Reversed arrays in 2 API endpoints for consistent display
- Files: `/api/league/[id]/stats/route.ts:52` + `/api/league/[id]/matches/[matchId]/route.ts:94`

### v1.26.8 - Fix FT Calculation Bug (Dec 5, 2025)
**BUG FIX:** Free Transfers showing incorrect value in upcoming fixtures modal
- Fixed: FT calculation loop processing current gameweek, causing off-by-one error
- Root cause: Loop included current GW data from `historyData.current`
- Solution: Added early break when reaching current gameweek
- Impact: FTs now show correct value for current/upcoming gameweeks
- Location: `/api/league/[id]/matches/[matchId]/route.ts:125-127`

### v1.26.7 - Admin Leagues Page (Dec 5, 2025)
**NEW FEATURE:** Dedicated sortable leagues page in admin panel
- Added `/admin/leagues` page with full league list
- Sortable columns: click headers to sort by any field
- Smart sorting: desc for numbers, asc for text, toggleable direction
- Sort indicators: ⇅ (unsorted), ↑ (ascending), ↓ (descending)
- Visual enhancements: hover effects on sortable columns
- Navigation: "View All" button from admin dashboard
- API endpoint: `/api/admin/leagues` fetches all league metadata

### v1.26.6 - Null Entry Handling (Jan 4, 2025) ✅ **WORKING**
**CRITICAL FIX:** Handle corrupted FPL data with null entry_ids
- Fixed: League 754307 (32 teams) failing immediately
- Root cause: FPL API returns null entry_id for deleted/removed teams
- Added null checks before database inserts
- Skip corrupted entries with warning logs
- Gracefully handle leagues with deleted accounts

### v1.26.5 - Debug Logging (Jan 4, 2025)
Added comprehensive error logging to diagnose failures
- Log each API call attempt with success/failure details
- Helped identify v1.26.6 null entry issue

### v1.26.4 - Performance Optimization (Jan 4, 2025)
**MAJOR optimization** to bypass Railway's 30-second timeout
- Strip down `/api/league/[id]` to fetch ONLY essential data
- Remove 832+ API calls (captain picks, chips, manager history)
- Processing time: **60-90s → <5s** for large leagues
- Enables support for leagues up to 50 teams

### v1.26.3 - Timeout Fix Attempt (Jan 4, 2025)
- Increased axios timeout to 90 seconds
- Added loading message after 3 seconds

### v1.26.2 - Classic League Error Messages (Jan 3, 2025)
**URGENT fix** for Reddit launch
- Clear error messages for Classic league IDs
- API-side detection with friendly messages
- Impact: 84 users, 28 leagues

### v1.26.1 - Y-Axis Visibility (Jan 2, 2025)
- Show all ranks 1-30 on position graph
- Better visibility for top 20 teams

### v1.26.0 - Position Comparison (Jan 2, 2025)
**NEW FEATURE:** Compare position history vs opponents
- Dual-line chart: green (you) vs red (opponent)
- Opponent selector dropdown

---

## v1.25.x Series - Position History & Reddit Launch (Dec 2024 - Jan 2025)

### v1.25.6 - Position History Bug Fix (Jan 2, 2025)
- Fixed type mismatch: string vs number in entry_id comparison
- Position history now loads correctly

### v1.25.5 - Quick Access Collapsible (Jan 2, 2025)
- Hide "Dedoume FPL 9th Edition" button for professional look
- Collapsible Quick Access section

### v1.25.4 - Revert FPL Login (Jan 1, 2025)
- Reverted to League ID entry only
- Removed FPL authentication code (blocked by anti-bot)

### v1.25.3 - Smart Line Breaks Fix (Dec 31, 2024)
- Improved capital detection logic for line breaks

### v1.25.2 - Smart Line Breaks (Dec 31, 2024)
- Automatic line breaks for long team names

### v1.25.1 - Team Selection Improvements (Dec 31, 2024)
- Equal card heights, alphabetical sort, capitalize names

### v1.25.0 - League Position Over Time (Dec 30, 2024)
**NEW FEATURE:** Position history chart in My Team Stats
- Track league position across all gameweeks
- Line chart showing rank progression

---

## v1.24.x Series - Live Match Modal & Analytics (Dec 2024)

### v1.24.6 - Team Selection Optimization (Dec 29, 2024)
- Reduce wasted space on team selection screen

### v1.24.5 - Managers Tracking (Dec 28, 2024)
- Added Managers metrics with time breakdowns

### v1.24.4 - Team Selection UX (Dec 28, 2024)
- Enhanced team selection screen layout
- Added tracking for unique managers

### v1.24.3 - Live Modal Enhancements (Dec 27, 2024)
- Show detailed bench players with positions
- Fixed provisional bonus display

### v1.24.2 - Live Modal UI Cleanup (Dec 27, 2024)
- Remove clutter, reorder sections

### v1.24.1 - Live Rankings Fix (Dec 26, 2024)
- Include current GW projected results in rankings

### v1.24.0 - Single Source of Truth (Dec 26, 2024)
**Architecture refactor:** Consistent scoring across all components
- All calculations use shared `scoreCalculator.ts`

---

## v1.23.x Series - Auto-Sub Fixes (Dec 2024)

### v1.23.3 - Simpler Auto-Sub Logic (Dec 25, 2024)
- Simplified player ID comparison ignoring auto-sub differences

### v1.23.2 - Auto-Sub in Common Players (Dec 25, 2024)
- Handle different effective squads from auto-subs

### v1.23.1 - Live Modal Auto-Sub Timing (Dec 24, 2024)
- Accurate provisional bonus calculation
- Better auto-sub timing based on fixture status

### v1.23.0 - Auto-Sub Timing Fix (Dec 24, 2024)
**Critical fix:** Only sub players from started/finished fixtures
- Prevents premature auto-substitutions

---

## v1.22.x Series - Analytics System (Nov-Dec 2024)

### v1.22.9 - Time-Based Analytics (Nov 30, 2024)
- Time breakdowns for requests and users

### v1.22.8 - Unique Users Fix (Nov 30, 2024)
- Calculate unique users in real-time

### v1.22.7 - Debug Logging (Nov 30, 2024)
- Debug stats endpoint for zero counts

### v1.22.6 - Analytics URL Fix (Nov 30, 2024)
- Use forwarded headers instead of localhost

### v1.22.5 - Middleware Debug Logging (Nov 29, 2024)
- Comprehensive debug logging for tracking

### v1.22.4 - Analytics Debugging (Nov 29, 2024)
- Add analytics debugging logs

### v1.22.3 - Request Tracking Fix (Nov 29, 2024)
- Fix request tracking logic

### v1.22.2 - Desktop Nav Width (Nov 29, 2024)
- Constrain nav bar width on desktop

### v1.22.1 - Desktop Tab Spacing (Nov 29, 2024)
- Fix top spacing for tabs on desktop

### v1.22.0 - Re-enable Analytics (Nov 29, 2024)
- Analytics system working correctly

---

## v1.21.x Series - Analytics Fixes (Nov 2024)

### v1.21.3 - Disable Analytics (Nov 29, 2024)
**HOTFIX:** Temporarily disable analytics while debugging

### v1.21.2 - Fixtures Spacing (Nov 29, 2024)
- Increase Fixtures top spacing on desktop

### v1.21.1 - Fixtures Tab Fix (Nov 29, 2024)
- Fix Fixtures tab overlap on desktop

### v1.21.0 - Daily Aggregation (Nov 29, 2024)
**Phase 2:** Daily aggregation system for analytics
- Aggregate data daily for performance

---

## v1.20.0 - Analytics Charts (Nov 28, 2024)
**Phase 4:** Charts and polish for analytics dashboard
- Visual charts for request trends
- User activity graphs

---

## v1.19.0 - Analytics Dashboard (Nov 28, 2024)
**Complete admin dashboard:**
- Real-time analytics data display
- Health monitoring integration
- Request/user/league metrics

---

## v1.18.0 - Analytics Foundation (Nov 28, 2024)
**Phase 1:** Silent data collection system
- Database tables: `api_requests`, `daily_stats`
- Tracking middleware for all API requests

---

## v1.17.0 - Admin Dashboard (Nov 28, 2024)
**Centralization:** Single admin dashboard at `/admin`
- Combined health monitoring
- Unified admin interface

---

## v1.16.x Series - Mobile Navigation (Nov 2024)

13 iterations to perfect mobile PWA experience:
- v1.16.13: Remove gradient overlay on desktop
- v1.16.12: Purple gradient for iOS status bar
- v1.16.11: Extend gradient to safe area
- v1.16.10: Translucent status bar
- v1.16.9: Black status bar style
- v1.16.8: Extend gradient coverage
- v1.16.7: Match status bar to dark background
- v1.16.6: Add gradient overlay behind nav
- v1.16.5: Floating nav with transparent wrapper
- v1.16.4: Solid nav background + scroll to top
- v1.16.3: **CRITICAL FIX** - Actual nav positioning
- v1.16.2: Force PWA cache refresh
- v1.16.1: Restore bottom position
- v1.16.0: **MAJOR** - Responsive nav (bottom mobile, top desktop)

---

## v1.15.x Series - Stats Hub Polish (Nov 2024)

### v1.15.4 - Code Cleanup (Nov 28, 2024)
- Remove debug console.logs and dead code

### v1.15.3 - Gameweek Toggle Fix (Nov 28, 2024)
- Fix Best/Worst gameweeks showing identical data

### v1.15.2 - Chips Faced Fix (Nov 18, 2024)
- Use chip history API for accurate data

### v1.15.1 - Stats Hub Polish (Nov 18, 2024)
- Remove "Stats Hub" title
- Fix captain percentage calculation

### v1.15.0 - Stats Hub UI (Nov 18, 2024)
**Major improvements:** Mobile PWA optimization
- Vertical space optimization
- Modal fixes

---

## v1.14.x Series - Fixtures UI & Modals (Nov 2024)

### v1.14.0 - Clickable Leaderboards (Nov 13, 2024)
**Major feature:** Click any leaderboard → view all 20 managers
- Reusable modal component
- Smooth animations

### v1.14.22 - Modal Scroll Overlay (Nov 5, 2024)
- Fix modal scroll overlay conflict

### v1.14.21 - Modal Scroll Behavior (Nov 5, 2024)
- Fix modal scroll behavior

### v1.14.20 - Modal Content Layout (Nov 5, 2024)
- Fix modal content layout CSS

### v1.14.19 - Unified Bottom Sheet (Nov 5, 2024)
- Unify fixture modals with bottom sheet

### v1.14.18 - Smart Toggle Defaults (Nov 4, 2024)
- Smart LIVE/OFFICIAL toggle defaults

### v1.14.17 - Rankings Cache Fix (Nov 4, 2024)
- Fix stale OFFICIAL rankings cache

### v1.14.16 - Rankings Spacing (Nov 4, 2024)
- Optimize Rankings page spacing

### v1.14.15 - Update Notification (Nov 4, 2024)
- Fix stuck update notification

### v1.14.14 - Modal Safe Area (Nov 4, 2024)
- Fix modal safe area padding on iOS

### v1.14.13 - Unified Modal (Nov 4, 2024)
- Unified modal for live and completed fixtures

### v1.14.12 - Rounded Corners (Nov 4, 2024)
- Consistent rounded corners

### v1.14.11 - Navigator Padding (Nov 4, 2024)
- Remove redundant navigator padding

### v1.14.10 - Card Spacing (Nov 4, 2024)
- Fix redundant card spacing

### v1.14.9 - Vertical Spacing (Nov 4, 2024)
- Consistent 10px vertical spacing

### v1.14.8 - Card Heights (Nov 4, 2024)
- Natural card heights with comfortable spacing

### v1.14.7 - Balanced Padding (Nov 4, 2024)
- Equal top/bottom padding

### v1.14.6 - Compact Cards (Nov 4, 2024)
- Reduce bottom padding

### v1.14.5 - Line Spacing (Nov 4, 2024)
- Reduce line spacing for compact layout

### v1.14.4 - Info Line Spacing (Nov 4, 2024)
- Tighter spacing below info line

### v1.14.3 - Text Format (Nov 4, 2024)
- Text format for chips and hits

### v1.14.2 - Duplicate Badges (Nov 4, 2024)
- Remove duplicate hit badges

### v1.14.1 - Chip/Hit Display (Nov 3, 2024)
- Fix completed gameweeks chip/hit display

---

## v1.13.x Series - Season Stats (Nov 2024)

### v1.13.1 - Quick Fixes (Nov 13, 2024)
- Toggle styling consistency
- Chips faced display bug fix
- Captain points percentage

### v1.13.0 - Complete Feature Set (Nov 13, 2024)
**Major release:** Season-long statistics
- Chip Performance (Played & Faced leaderboards)
- Streaks (historical maximum with GW ranges)
- Captain Points (season total with percentages)
- Best/Worst Gameweeks

---

## v1.12.x Series - Fixture Cards (Nov 2024)

### v1.12.1 - Critical Bug Fixes (Nov 3, 2024)
- Fix 4 critical bugs in 3-line cards

### v1.12.0 - Compact 3-Line Cards (Nov 3, 2024)
**New design:** Compact 3-line fixture cards

---

## v1.11.x Series - Stats Hub Development (Nov 2024)

### v1.11.14 - Unknown Manager Names (Nov 12, 2024)
- Fix Unknown managers in Consistency leaderboard

### v1.11.13 - Captain Points Fix (Nov 12, 2024)
- Fetch captain data from FPL API directly

### v1.11.12 - Manager Names Fix (Nov 12, 2024)
- Get ALL managers from h2h_matches

### v1.11.11 - Parameter Binding Fix (Nov 12, 2024)
- Fix PostgreSQL parameter binding error

### v1.11.10 - Boundary Fixes (Nov 11, 2024)
- Filter placeholder GWs, improve null handling

### v1.11.9 - Initial Chips Fix (Nov 11, 2024)
- Fetch chips data from FPL API

### v1.11.8 - Dual Cache System (Nov 11, 2024)
- Captain + chips cache optimization

### v1.11.7 - Remove Cache Optimization (Nov 11, 2024)
- Fix chips data not populating

### v1.11.6 - Type Conversion Fix (Nov 11, 2024)
- Fix PostgreSQL AVG type conversion

### v1.11.5 - LIVE Badge Logic (Nov 11, 2024)
- Fix LIVE badge logic and Season Stats SQL

### v1.11.4 - Live Gameweek Detection (Nov 11, 2024)
- Fix live gameweek detection

### v1.11.3 - Versioning Guidelines (Nov 11, 2024)
- Add versioning guidelines to context

### v1.11.2 - Container Gaps (Nov 3, 2024)
- Standardize container gaps across tabs

### v1.11.0 - Season Stats (Nov 11, 2024)
**Major feature:** Season Stats with leaderboards
- Historical trends

---

## v1.10.0 - Stats Hub (Nov 10, 2024)
**MAJOR FEATURE:** Replace Awards with comprehensive Stats Hub
- 5 gameweek statistics sections:
  - Captain Picks
  - Chips Played
  - Hits Taken
  - Gameweek Winners
  - Differentials
- Real-time data aggregation
- GW selector with live badge

---

## v1.9.x Series - Provisional Bonus & Team Fixtures (Nov 2024)

### v1.9.8 - Provisional Bonus Fix (Nov 10, 2024)
**CRITICAL FIX:** Use complete fixtures data with ALL players
- Fetch fixtures from FPL API
- Extract ALL players' BPS per match
- Award bonus to top 3 BPS per fixture

### v1.9.7 - Provisional Bonus Implementation (Nov 10, 2024)
- Implement provisional bonus calculation for H2H fixtures

### v1.9.6 - Modal Header Fix (Nov 10, 2024)
- Fix Fixture Details Modal header - centered, balanced

### v1.9.5 - Badge Positioning (Nov 10, 2024)
- Move team badges to outer edges

### v1.9.4 - Modal Header Structure (Nov 10, 2024)
- Fix Fixture Details Modal header structure

### v1.9.3 - Defensive Contribution (Nov 10, 2024)
- Add per-player defensive contribution

### v1.9.2 - Layout Fix (Nov 10, 2024)
- Fix Team Fixtures layout - mirror away team

### v1.9.1 - Ultra-Compact Fixtures (Nov 10, 2024)
- Add ultra-compact Team Fixtures with team logos

---

## v1.8.0 - Team Fixtures Tab (Nov 10, 2024)
**NEW FEATURE:** Team Fixtures tab with independent state
- Complete fixture view per team
- Team-centric navigation

---

## v1.7.x Series - Live Match Modal (Oct-Nov 2024)

### v1.7.9 - Context Documentation (Nov 9, 2024)
- Remove debug logging, add context files

### v1.7.8 - Live Rankings Fix (Nov 9, 2024)
**CRITICAL FIX:** Calculate live rankings with auto-subs
- Added `calculateLiveScoreWithAutoSubs` helper

### v1.7.3 - Live Match Modal Fix (Oct 25, 2024)
- Better score calculation and objectivity

### v1.7.2 - CORS Fix (Oct 25, 2024)
- Fix CORS issue with live match data

### v1.7.1 - Loading Overlay (Oct 25, 2024)
- Add loading overlay and error handling

### v1.7.0 - Live Fixture Modal (Oct 25, 2024)
**NEW FEATURE:** Live Match tracking
- Real-time match scores
- Auto-substitution display
- Provisional bonus

---

## v1.6.x Series - Fixtures UI (Oct 2024)

### v1.6.3 - UI Improvements (Oct 25, 2024)
- Remove timeline, add GW dropdown selector

### v1.6.2 - Fixture State Detection (Oct 25, 2024)
- Smart GW selection based on fixture state

### v1.6.0 - League Awards (Oct 24, 2024)
**NEW FEATURE:** League Awards & Performance Stats
- Awards system

---

## v1.5.x Series - Opponent Insights & Navigation (Oct-Nov 2024)

### v1.5.13 - Team Selection Fix (Nov 9, 2024)
- Fix team selection without Remember Me checkbox

### v1.5.12 - OFFICIAL Mode Fix (Nov 9, 2024)
- Exclude current live gameweek from OFFICIAL mode

### v1.5.11 - Toggle Default (Nov 9, 2024)
- Show LIVE by default when GW is active

### v1.5.10 - Toggle Persistence (Nov 9, 2024)
- Fix LIVE/OFFICIAL toggle state persistence

### v1.5.9 - Toggle Gameweek (Nov 9, 2024)
- Show correct gameweek in toggle

### v1.5.8 - Consolidate Fixes (Nov 9, 2024)
- Team selection and ranking toggle fixes

### v1.5.6 - Strategic Intel Mobile (Oct 25, 2024)
- Fix Strategic Intel mobile alignment

### v1.5.5 - Free Transfers Fix (Oct 24, 2024)
- Accurate season tracking for Free Transfers

### v1.5.3 - Visual Symmetry (Nov 8, 2024)
- Mirror fixture info line for symmetry

### v1.5.2 - Position Differentials (Nov 8, 2024)
- Add position differentials to live match analysis

### v1.5.1 - Navigation Fix (Nov 8, 2024)
- Fix player profile navigation (5 tabs)

### v1.5.0 - Navigation Modernization (Nov 8, 2024)
**MAJOR UPDATE:** Navigation and captain data fixes
- Modern navigation structure

---

## v1.4.x Series - Match Details (Oct 2024)

### v1.4.4 - Mobile Grid Override (Oct 24, 2024)
- Fix opponent insights grid on mobile

### v1.4.3 - Width Alignment (Oct 24, 2024)
- Fix width alignment in grid

### v1.4.2 - Layout Improvement (Oct 24, 2024)
- Side-by-side comparison layout

### v1.4.1 - Stats Display Fix (Oct 24, 2024)
- Fix RANK and TOT displaying wrong player's stats

### v1.4.0 - Expandable Match Details (Oct 24, 2024)
**NEW FEATURE:** Expandable match details
- Brief #9 implementation

---

## v1.3.x Series - Responsive Grid (Oct 2024)

### v1.3.3 - Stat Box Fix (Oct 24, 2024)
- Fix stat box stretching on large screens

### v1.3.2 - Mobile Text Sizing (Oct 24, 2024)
- Mobile text sizing improvements

### v1.3.1 - Mobile Layout Fix (Oct 24, 2024)
- Fix chips & FT sections on mobile

### v1.3.0 - Responsive Grid (Oct 24, 2024)
**NEW FEATURE:** Implement responsive grid
- Clean opponent chips & FT display (Brief #8)

---

## v1.2.x Series - Chip Detection (Oct 2024)

### v1.2.5 - Center Content (Oct 24, 2024)
- Center opponent insights on mobile

### v1.2.4 - UI Improvement (Oct 24, 2024)
- Improve opponent insights UI

### v1.2.3 - Chip Renewal Logic (Oct 24, 2024)
- Max 1 of each chip, renew in GW19

### v1.2.2 - Wildcard Count (Oct 24, 2024)
- Show 2 wildcards available

### v1.2.1 - Chip Detection Fix (Oct 24, 2024)
- Use FPL API history endpoint

### v1.2.0 - Chip Detection (Oct 24, 2024)
**MAJOR FIX:** Fix chip detection system
- Move to v1.2

---

## v1.1.x Series - Initial Features (Oct 2024)

### v1.1.31 - Header Alignment (Oct 24, 2024)
- Fix header and navbar alignment

### v1.1.30 - Pill-Style Tabs (Oct 24, 2024)
**UI UPDATE:** Pill-style tabs (Brief #7)
- Improved navigation alignment

### v1.1.29 - Actual Chips (Oct 24, 2024)
- Fetch actual available chips from FPL API

### v1.1.28 - Chip Accuracy (Oct 24, 2024)
- Fix chip accuracy
- Add Free Transfers

### v1.1.27 - Default Gameweek (Oct 24, 2024)
- Default Fixtures to current/upcoming gameweek

### v1.1.26 - Future GW Navigation (Oct 24, 2024)
**NEW FEATURE:** Enable future GW navigation
- Enhance opponent insights

### v1.1.25 - Fixtures Navigator (Oct 24, 2024)
- Align Fixtures navigator with design

### v1.1.1 - Navigation Consistency (Oct 23, 2024)
- Navigation consistency improvements

### v1.1.0 - Fixtures Tab (Oct 23, 2024)
**INITIAL RELEASE:** Add Fixtures tab
- Strategic opponent insights

---

## Summary Statistics

**Total Versions:** 170+ releases
**Development Period:** October 23, 2024 - December 8, 2025 (~14 months)
**Average Release Frequency:** ~2.4 versions per day

**Major Milestones:**
- v1.1.0 (Oct 23): Initial Fixtures tab
- v1.7.0 (Oct 25): Live Match tracking
- v1.10.0 (Nov 10): Stats Hub
- v1.13.0 (Nov 13): Season statistics
- v1.16.0 (Nov 28): Responsive navigation
- v1.18.0 (Nov 28): Analytics foundation
- v1.25.0 (Dec 30): Position history graph
- v1.26.0 (Jan 2): Position comparison
- v1.26.6 (Jan 4): Large league support

**Series Breakdown:**
- v1.1.x: 31 releases (Fixtures & Opponent Insights)
- v1.2.x-v1.6.x: 25 releases (Chip detection, UI improvements)
- v1.7.x: 9 releases (Live Match Modal)
- v1.8.x-v1.9.x: 8 releases (Team Fixtures, Provisional Bonus)
- v1.10.x-v1.15.x: 35 releases (Stats Hub development)
- v1.16.x: 13 releases (Mobile navigation perfection)
- v1.17.x-v1.22.x: 18 releases (Analytics system)
- v1.23.x-v1.24.x: 10 releases (Auto-subs, Live rankings)
- v1.25.x: 6 releases (Position history)
- v1.26.x: 6 releases (Large leagues, error handling)

---

**Last Updated:** December 10, 2025
**Maintained By:** Claude Code (automated after every deployment)
