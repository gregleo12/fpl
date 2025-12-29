import { getDatabase } from '../../lib/db.js';
import { syncLeagueData } from '../../lib/leagueSync.js';

async function syncAllLeagues() {
  const db = await getDatabase();

  try {
    console.log('[Full Sync] Starting full sync for all leagues...\n');

    // Get all leagues
    const leaguesResult = await db.query(`
      SELECT l.id, l.name, COUNT(ls.entry_id) as manager_count
      FROM leagues l
      LEFT JOIN league_standings ls ON ls.league_id = l.id
      GROUP BY l.id, l.name
      ORDER BY l.id
    `);

    const leagues = leaguesResult.rows;
    console.log(`[Full Sync] Found ${leagues.length} leagues to sync\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < leagues.length; i++) {
      const league = leagues[i];
      console.log(`\n[${i + 1}/${leagues.length}] League ${league.id}: ${league.name} (${league.manager_count} managers)`);

      try {
        if (league.manager_count === '0' || !league.manager_count) {
          console.log('  ⚠️  No managers found, skipping');
          continue;
        }

        // Run full sync with force clear to ensure fresh data
        await syncLeagueData(league.id, true);

        console.log(`  ✅ Success`);
        successCount++;

        // Rate limiting - wait between leagues
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err: any) {
        console.log(`  ❌ Failed: ${err.message || err}`);
        failCount++;

        // Mark as failed in database
        await db.query(`
          UPDATE leagues SET sync_status = 'failed' WHERE id = $1
        `, [league.id]);
      }
    }

    console.log('\n========================================');
    console.log('[Full Sync] COMPLETE');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('[Full Sync] Fatal error:', error);
  } finally {
    process.exit(0);
  }
}

syncAllLeagues();
