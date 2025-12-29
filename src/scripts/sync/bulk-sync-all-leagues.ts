/**
 * K-115: Bulk Sync All Leagues for K-108 Data
 *
 * One-time migration script to ensure all 126 tracked leagues have K-108
 * calculated_points populated in player_gameweek_stats.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://postgres:PASSWORD@caboose.proxy.rlwy.net:45586/railway"
 *   npm run sync:all-leagues
 *
 * Runtime: ~1.5-2 hours (30 second delay between leagues)
 */

import { getDatabase } from '../../lib/db';
import { syncLeagueData } from '../../lib/leagueSync';

interface League {
  id: number;
  name: string;
}

interface SyncError {
  id: number;
  name: string;
  error: string;
}

const DELAY_BETWEEN_LEAGUES_MS = 30000; // 30 seconds (conservative, safe)

async function bulkSyncAllLeagues() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         K-115: Bulk Sync All Leagues for K-108 Data          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const db = await getDatabase();

  // 1. Fetch all leagues from database
  console.log('[1/3] Fetching all leagues from database...');
  const leaguesResult = await db.query(`
    SELECT id, name FROM leagues ORDER BY id
  `);

  const leagues: League[] = leaguesResult.rows;
  console.log(`✅ Found ${leagues.length} leagues to sync\n`);

  if (leagues.length === 0) {
    console.log('⚠️  No leagues found. Exiting.');
    process.exit(0);
  }

  // Estimate runtime
  const estimatedMinutes = Math.ceil((leagues.length * DELAY_BETWEEN_LEAGUES_MS) / 60000);
  console.log(`⏱️  Estimated runtime: ~${estimatedMinutes}-${estimatedMinutes * 2} minutes\n`);

  // 2. Process each league sequentially
  console.log('[2/3] Starting league sync...\n');

  let success = 0;
  let failed = 0;
  const errors: SyncError[] = [];

  for (let i = 0; i < leagues.length; i++) {
    const league = leagues[i];
    const progress = `[${i + 1}/${leagues.length}]`;
    const percentage = Math.round(((i + 1) / leagues.length) * 100);

    try {
      console.log(`${progress} (${percentage}%) Syncing: ${league.name} (ID: ${league.id})...`);

      // Call syncLeagueData directly (includes K-112 K-108 sync)
      await syncLeagueData(league.id, false);

      console.log(`${progress} ✅ Success: ${league.name}`);
      success++;

    } catch (error: any) {
      console.error(`${progress} ❌ Failed: ${league.name}`);
      console.error(`         Error: ${error.message}`);
      failed++;
      errors.push({
        id: league.id,
        name: league.name,
        error: error.message,
      });
    }

    // Rate limiting delay (except after last league)
    if (i < leagues.length - 1) {
      const delaySeconds = DELAY_BETWEEN_LEAGUES_MS / 1000;
      console.log(`${progress} ⏳ Waiting ${delaySeconds}s before next league...\n`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LEAGUES_MS));
    }
  }

  // 3. Summary report
  const endTime = Date.now();
  const totalMinutes = Math.round((endTime - startTime) / 60000);

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      Sync Complete                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`✅ Success: ${success}/${leagues.length}`);
  console.log(`❌ Failed: ${failed}/${leagues.length}`);
  console.log(`⏱️  Total time: ${totalMinutes} minutes\n`);

  if (errors.length > 0) {
    console.log('Failed leagues:');
    errors.forEach(e => {
      console.log(`  - ${e.name} (ID: ${e.id})`);
      console.log(`    Error: ${e.error}`);
    });
    console.log('');
  }

  // Close database connection
  await db.end();

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the script
bulkSyncAllLeagues().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
