# Stats Update Investigation - Why Season Stats Don't Update Properly

## Issue
Season statistics (like winning streaks) don't update properly after new gameweeks are completed. User reports a 5 GW winning streak that's not showing in the "Best Streaks" section.

## Root Cause

### Data Flow Problem
The app has a **data synchronization gap** between when matches are played and when stats are updated.

```
1. Matches completed on FPL → 2. Dashboard loads → 3. Stats display OLD data
                                       ↓
                                (Missing step!)
                                Sync h2h_matches table
```

### Technical Details

#### Where Match Data is Stored
File: `/src/app/api/league/[id]/route.ts` (lines 159-201)

- **Endpoint**: `GET /api/league/${leagueId}`
- **Purpose**: Fetches fresh data from FPL API and populates `h2h_matches` table
- **When it runs**:
  - ✅ During initial setup (setup/team page)
  - ❌ **NOT** when Dashboard loads
  - ❌ **NOT** during pull-to-refresh

```typescript
// This is what populates h2h_matches with latest data
for (const match of allMatches) {
  await db.query(`
    INSERT INTO h2h_matches
    (league_id, event, entry_1_id, entry_1_points, entry_2_id, entry_2_points, winner)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (league_id, event, entry_1_id, entry_2_id) DO UPDATE SET
      entry_1_points = $4,
      entry_2_points = $6,
      winner = $7
  `, [...]);
}
```

#### Where Season Stats Are Calculated
File: `/src/app/api/league/[id]/stats/season/route.ts` (lines 322-474)

- **Endpoint**: `GET /api/league/${leagueId}/stats/season`
- **Purpose**: Calculates streaks from `h2h_matches` table
- **Problem**: Only **reads** from database, doesn't **update** it

```typescript
// This reads from h2h_matches to calculate streaks
const matchesData = await db.query(`
  SELECT entry_1_id, entry_2_id, event, winner
  FROM h2h_matches
  WHERE league_id = $1 AND event = ANY($2)
  ORDER BY entry_id, event ASC
`, [leagueId, gameweeks]);

// Calculates HISTORICAL max streaks from this data
// If h2h_matches is outdated, streaks will be wrong!
```

#### Where Dashboard Fetches Data
File: `/src/app/dashboard/page.tsx` (lines 51-91)

- **What it fetches**:
  - ✅ `/api/league/${leagueId}/stats` - Current standings (reads from DB)
  - ✅ `/api/player/${playerId}` - Player profile
  - ❌ **MISSING**: `/api/league/${leagueId}` - Update h2h_matches table

```typescript
// Dashboard only reads from database, never updates it!
const [leagueResponse, playerResponse] = await Promise.all([
  fetch(`/api/league/${leagueId}/stats`),  // Reads DB
  fetch(`/api/player/${playerId}`)         // Reads DB
]);

// Should also call:
// fetch(`/api/league/${leagueId}`) // Updates DB from FPL API
```

## Timeline of What Happens

### Scenario: User's 5-Win Streak Not Showing

1. **GW10**: User wins (now on 5-win streak)
2. **GW10 Finishes**: FPL updates match results
3. **User Opens App**: Dashboardloads
   - ❌ Dashboard calls `/api/league/${leagueId}/stats` (reads old DB data)
   - ❌ Stats tab shows old streaks from outdated h2h_matches table
4. **User Pulls to Refresh**: Still shows old data
   - ❌ Pull-to-refresh calls same endpoints (still reads old DB data)
5. **User Closes App**: Frustrated, streak still not showing

### What SHOULD Happen

1. **GW10**: User wins (now on 5-win streak)
2. **GW10 Finishes**: FPL updates match results
3. **User Opens App**: Dashboard loads
   - ✅ Dashboard calls `/api/league/${leagueId}` **FIRST** (syncs DB with FPL)
   - ✅ Then calls `/api/league/${leagueId}/stats` (reads fresh DB data)
   - ✅ Stats tab shows correct current streaks
4. **User Pulls to Refresh**: Gets latest data
   - ✅ Syncs h2h_matches table again
   - ✅ Shows up-to-date streaks

## Solution Options

### Option 1: Add DB Sync to Dashboard Load (Recommended)
**Pros**: Ensures data is always fresh on every dashboard visit
**Cons**: Slightly slower initial load

```typescript
// File: src/app/dashboard/page.tsx
async function fetchAllData(leagueId: string, playerId: string) {
  setIsLoading(true);

  // 1. FIRST: Sync database with latest FPL data
  await fetch(`/api/league/${leagueId}`);

  // 2. THEN: Fetch calculated stats from database
  const [leagueResponse, playerResponse] = await Promise.all([
    fetch(`/api/league/${leagueId}/stats`),
    fetch(`/api/player/${playerId}`)
  ]);

  // ...rest of code
}
```

### Option 2: Add "Refresh Stats" Button in Stats Tab
**Pros**: User control, doesn't slow down dashboard
**Cons**: Requires manual user action

```typescript
// File: src/components/Stats/SeasonView.tsx
async function refreshSeasonStats() {
  // Sync database first
  await fetch(`/api/league/${leagueId}`);

  // Then refetch season stats
  fetchSeasonStats();
}

// Add button to UI
<button onClick={refreshSeasonStats}>
  Refresh Stats
</button>
```

### Option 3: Scheduled Background Sync (Advanced)
**Pros**: Always up-to-date without user interaction
**Cons**: Complex, requires cron jobs, costs

- Set up cron job (cron-job.org or Vercel Cron)
- Call `/api/league/${leagueId}` every hour for tracked leagues
- Requires league tracking system

## Recommended Fix

**Implement Option 1** - Add DB sync to dashboard load and pull-to-refresh:

1. Update `fetchAllData()` in `/src/app/dashboard/page.tsx`
2. Call `/api/league/${leagueId}` before fetching stats
3. Add loading indicator for better UX
4. Consider caching sync results (e.g., only sync if >5 mins old)

## Performance Considerations

### Current Flow (FAST but STALE)
```
Dashboard Load → Read DB (50ms) → Display
Total: ~50ms
```

### With Fix (SLOWER but FRESH)
```
Dashboard Load → Sync DB from FPL (2-5s) → Read DB (50ms) → Display
Total: ~2-5 seconds
```

### Optimized Fix (BALANCED)
```
Dashboard Load → Check last sync time
  ├─ If <5 mins old → Read DB only (50ms)
  └─ If >5 mins old → Sync DB (2-5s) → Read DB (50ms)
```

## Implementation Example (Optimized)

```typescript
// File: src/app/dashboard/page.tsx

async function fetchAllData(leagueId: string, playerId: string) {
  setIsLoading(true);
  setError('');

  try {
    // Check if we need to sync (only if >5 mins since last sync)
    const lastSync = localStorage.getItem(`league_${leagueId}_last_sync`);
    const needsSync = !lastSync || (Date.now() - parseInt(lastSync)) > 5 * 60 * 1000;

    if (needsSync) {
      console.log('Syncing league data with FPL...');
      await fetch(`/api/league/${leagueId}`);
      localStorage.setItem(`league_${leagueId}_last_sync`, Date.now().toString());
    }

    // Fetch stats from database
    const [leagueResponse, playerResponse] = await Promise.all([
      fetch(`/api/league/${leagueId}/stats?t=${Date.now()}`),
      fetch(`/api/player/${playerId}?leagueId=${leagueId}&t=${Date.now()}`)
    ]);

    // ...rest of code
  } catch (err: any) {
    setError(err.message || 'Failed to load data');
  } finally {
    setIsLoading(false);
  }
}
```

## Testing the Fix

1. **Before Fix**: Check current streak in Season Stats
2. **Play/Complete Matches**: Wait for a new gameweek to finish
3. **Apply Fix**: Implement Option 1 (optimized)
4. **Test Scenarios**:
   - ✅ Dashboard load (cold start) → Should sync and show latest
   - ✅ Dashboard load (within 5 mins) → Should skip sync and be fast
   - ✅ Pull-to-refresh → Should force sync regardless of time
   - ✅ Switch between tabs → Should not re-sync unnecessarily

## Database Query Performance

Current `h2h_matches` table queries are efficient:
- Indexed on `(league_id, event)`
- Typical query time: <50ms for 500+ matches
- No performance concerns with current approach

The bottleneck is **FPL API fetching**, not database operations.

## Conclusion

**Problem**: Stats show outdated data because `h2h_matches` table is never updated after initial setup.

**Solution**: Add database sync step before reading stats, with 5-minute caching to balance freshness and performance.

**Impact**:
- Stats will always be up-to-date
- Minimal performance impact with caching
- Better user experience
