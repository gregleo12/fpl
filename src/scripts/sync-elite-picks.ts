/**
 * K-200: Sync Elite Picks
 *
 * Fetches picks from top-ranked FPL managers and stores in database.
 *
 * Week 1: 500 team sample (pages 1-10 of top 10K)
 * Week 2: Full 10K teams (pages 1-200)
 *
 * Usage: npm run sync:elite-picks
 */

import { getDatabase } from '../lib/db';

// Configuration
const SAMPLE_TIER = 'top500'; // Week 1: top500 sample
const TOTAL_PAGES = 10; // 10 pages × 50 teams = 500 teams
const DELAY_BETWEEN_REQUESTS = 150; // 150ms = ~6-7 requests/sec
const BATCH_SIZE = 50; // Process 50 teams at a time
const PAUSE_BETWEEN_BATCHES = 3000; // 3 seconds between batches

interface FPLPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface FPLPicksResponse {
  picks: FPLPick[];
  entry_history: {
    event: number;
  };
}

interface StandingsEntry {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with delay and retry logic
 */
async function fetchWithDelay(url: string, delayMs: number = DELAY_BETWEEN_REQUESTS): Promise<any> {
  await sleep(delayMs);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  // Handle rate limiting
  if (response.status === 429) {
    console.log('⚠️  Rate limited, waiting 30 seconds...');
    await sleep(30000);
    return fetchWithDelay(url, delayMs * 2); // Exponential backoff
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get current gameweek from bootstrap-static
 */
async function getCurrentGameweek(): Promise<number> {
  console.log('📅 Fetching current gameweek...');
  const data = await fetchWithDelay('https://fantasy.premierleague.com/api/bootstrap-static/');

  const currentEvent = data.events.find((e: any) => e.is_current);
  if (!currentEvent) {
    throw new Error('No current gameweek found');
  }

  console.log(`✓ Current gameweek: ${currentEvent.id}`);
  return currentEvent.id;
}

/**
 * Fetch top team IDs from overall league standings
 */
async function fetchTopTeamIds(totalPages: number): Promise<number[]> {
  console.log(`📋 Fetching top ${totalPages * 50} team IDs...`);

  const teamIds: number[] = [];

  for (let page = 1; page <= totalPages; page++) {
    const url = `https://fantasy.premierleague.com/api/leagues-classic/314/standings/?page_standings=${page}`;
    const data = await fetchWithDelay(url);

    const entries: StandingsEntry[] = data.standings.results;
    entries.forEach(entry => teamIds.push(entry.entry));

    console.log(`  Page ${page}/${totalPages}: ${entries.length} teams (total: ${teamIds.length})`);
  }

  console.log(`✓ Fetched ${teamIds.length} team IDs`);
  return teamIds;
}

/**
 * Fetch picks for a single team
 */
async function fetchTeamPicks(entryId: number, gameweek: number): Promise<FPLPicksResponse | null> {
  try {
    const url = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gameweek}/picks/`;
    return await fetchWithDelay(url);
  } catch (error) {
    console.error(`  ❌ Failed to fetch picks for team ${entryId}:`, error);
    return null;
  }
}

/**
 * Store picks in database
 */
async function storePicks(
  db: any,
  gameweek: number,
  sampleTier: string,
  entryId: number,
  picks: FPLPick[]
) {
  const values = picks.map(pick => ({
    gameweek,
    sample_tier: sampleTier,
    entry_id: entryId,
    player_id: pick.element,
    is_captain: pick.is_captain,
    is_vice_captain: pick.is_vice_captain,
    multiplier: pick.multiplier,
  }));

  // Batch insert with ON CONFLICT
  for (const pick of values) {
    await db.query(
      `INSERT INTO elite_picks
        (gameweek, sample_tier, entry_id, player_id, is_captain, is_vice_captain, multiplier)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (gameweek, sample_tier, entry_id, player_id)
      DO UPDATE SET
        is_captain = EXCLUDED.is_captain,
        is_vice_captain = EXCLUDED.is_vice_captain,
        multiplier = EXCLUDED.multiplier`,
      [
        pick.gameweek,
        pick.sample_tier,
        pick.entry_id,
        pick.player_id,
        pick.is_captain,
        pick.is_vice_captain,
        pick.multiplier,
      ]
    );
  }
}

/**
 * Update sync status
 */
async function updateSyncStatus(
  db: any,
  gameweek: number,
  sampleTier: string,
  status: string,
  teamsFetched: number,
  totalTeams: number,
  errorMessage?: string
) {
  const now = new Date();
  const startedAt = status === 'in_progress' ? now : null;
  const completedAt = status === 'completed' || status === 'failed' ? now : null;

  await db.query(
    `INSERT INTO elite_sync_status
      (gameweek, sample_tier, status, teams_fetched, total_teams, started_at, completed_at, error_message)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (gameweek, sample_tier)
    DO UPDATE SET
      status = EXCLUDED.status,
      teams_fetched = EXCLUDED.teams_fetched,
      total_teams = EXCLUDED.total_teams,
      started_at = COALESCE(elite_sync_status.started_at, EXCLUDED.started_at),
      completed_at = EXCLUDED.completed_at,
      error_message = EXCLUDED.error_message`,
    [gameweek, sampleTier, status, teamsFetched, totalTeams, startedAt, completedAt, errorMessage || null]
  );
}

/**
 * Process teams in batches
 */
async function processTeamsInBatches(
  db: any,
  teamIds: number[],
  gameweek: number,
  sampleTier: string
) {
  console.log(`\n🔄 Processing ${teamIds.length} teams in batches of ${BATCH_SIZE}...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < teamIds.length; i += BATCH_SIZE) {
    const batch = teamIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(teamIds.length / BATCH_SIZE);

    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (teams ${i + 1}-${Math.min(i + BATCH_SIZE, teamIds.length)})`);

    // Process batch
    for (const entryId of batch) {
      const picksData = await fetchTeamPicks(entryId, gameweek);

      if (picksData && picksData.picks) {
        await storePicks(db, gameweek, sampleTier, entryId, picksData.picks);
        successCount++;
        process.stdout.write('.');
      } else {
        failCount++;
        process.stdout.write('x');
      }

      // Update progress
      if ((successCount + failCount) % 50 === 0) {
        await updateSyncStatus(db, gameweek, sampleTier, 'in_progress', successCount, teamIds.length);
      }
    }

    console.log(`\n  ✓ Batch complete (success: ${successCount}, failed: ${failCount})`);

    // Pause between batches
    if (i + BATCH_SIZE < teamIds.length) {
      console.log(`  ⏸️  Pausing ${PAUSE_BETWEEN_BATCHES / 1000}s before next batch...`);
      await sleep(PAUSE_BETWEEN_BATCHES);
    }
  }

  return { successCount, failCount };
}

/**
 * Main sync function
 */
async function syncElitePicks() {
  const startTime = Date.now();
  console.log('🚀 K-200: Elite Picks Sync Starting...');
  console.log(`📊 Sample tier: ${SAMPLE_TIER}`);
  console.log(`📄 Pages to fetch: ${TOTAL_PAGES} (${TOTAL_PAGES * 50} teams)`);
  console.log('');

  const db = await getDatabase();

  try {
    // Step 1: Get current gameweek
    const gameweek = await getCurrentGameweek();

    // Step 2: Fetch top team IDs
    const teamIds = await fetchTopTeamIds(TOTAL_PAGES);

    // Step 3: Mark sync as in progress
    await updateSyncStatus(db, gameweek, SAMPLE_TIER, 'in_progress', 0, teamIds.length);

    // Step 4: Process teams in batches
    const { successCount, failCount } = await processTeamsInBatches(db, teamIds, gameweek, SAMPLE_TIER);

    // Step 5: Mark sync as completed
    await updateSyncStatus(db, gameweek, SAMPLE_TIER, 'completed', successCount, teamIds.length);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n\n✅ Sync completed successfully!');
    console.log(`📊 Total teams: ${teamIds.length}`);
    console.log(`✓ Success: ${successCount}`);
    console.log(`✗ Failed: ${failCount}`);
    console.log(`⏱️  Duration: ${duration} minutes`);

    // Verify data
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM elite_picks WHERE gameweek = $1 AND sample_tier = $2',
      [gameweek, SAMPLE_TIER]
    );
    console.log(`📁 Total picks stored: ${countResult.rows[0].total}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);

    // Mark as failed
    const gameweek = await getCurrentGameweek();
    await updateSyncStatus(
      db,
      gameweek,
      SAMPLE_TIER,
      'failed',
      0,
      TOTAL_PAGES * 50,
      error instanceof Error ? error.message : 'Unknown error'
    );

    process.exit(1);
  }
}

// Run sync
syncElitePicks();
