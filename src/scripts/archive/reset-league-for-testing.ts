import { getDatabase } from '../../lib/db';

async function resetLeague() {
  const leagueId = 1533117;
  const db = await getDatabase();

  try {
    console.log(`[Reset] Resetting league ${leagueId} for sync testing...`);

    // 1. Reset sync status
    console.log('[Reset] Setting sync_status to pending and clearing last_synced...');
    const updateResult = await db.query(`
      UPDATE leagues
      SET sync_status = 'pending', last_synced = NULL
      WHERE id = $1
    `, [leagueId]);
    console.log(`[Reset] Updated ${updateResult.rowCount} league record`);

    // 2. Clear manager_gw_history
    console.log('[Reset] Clearing manager_gw_history...');
    const gwResult = await db.query(`
      DELETE FROM manager_gw_history WHERE league_id = $1
    `, [leagueId]);
    console.log(`[Reset] Deleted ${gwResult.rowCount} rows from manager_gw_history`);

    // 3. Clear manager_chips
    console.log('[Reset] Clearing manager_chips...');
    const chipsResult = await db.query(`
      DELETE FROM manager_chips WHERE league_id = $1
    `, [leagueId]);
    console.log(`[Reset] Deleted ${chipsResult.rowCount} rows from manager_chips`);

    // 4. Clear entry_captains
    console.log('[Reset] Clearing entry_captains...');
    const captainsResult = await db.query(`
      DELETE FROM entry_captains WHERE entry_id IN (
        SELECT entry_id FROM league_standings WHERE league_id = $1
      )
    `, [leagueId]);
    console.log(`[Reset] Deleted ${captainsResult.rowCount} rows from entry_captains`);

    // 5. Verify reset
    console.log('[Reset] Verifying reset...');
    const verifyResult = await db.query(`
      SELECT id, name, sync_status, last_synced FROM leagues WHERE id = $1
    `, [leagueId]);

    console.log('\n[Reset] ✅ Reset Complete!');
    console.log('League Status:', verifyResult.rows[0]);
    console.log('\nLeague is now ready for sync testing.');
    console.log('Visit: https://fpl-staging-production.up.railway.app');
    console.log(`Enter League ID: ${leagueId}`);

    process.exit(0);
  } catch (error) {
    console.error('[Reset] Error:', error);
    process.exit(1);
  }
}

resetLeague();
