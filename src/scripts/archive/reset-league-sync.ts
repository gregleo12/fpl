import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

async function resetLeagueSync(leagueId: number) {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`\n========================================`);
    console.log(`Resetting League ${leagueId} Sync Data`);
    console.log(`========================================\n`);

    // Step 1: Clear manager_gw_history
    console.log(`[1/5] Clearing manager_gw_history...`);
    const gwHistoryResult = await pool.query(
      'DELETE FROM manager_gw_history WHERE league_id = $1',
      [leagueId]
    );
    console.log(`✓ Deleted ${gwHistoryResult.rowCount} rows from manager_gw_history\n`);

    // Step 2: Clear entry_captains
    console.log(`[2/5] Clearing entry_captains...`);
    const captainsResult = await pool.query(`
      DELETE FROM entry_captains
      WHERE entry_id IN (
        SELECT entry_id FROM league_standings WHERE league_id = $1
      )
    `, [leagueId]);
    console.log(`✓ Deleted ${captainsResult.rowCount} rows from entry_captains\n`);

    // Step 3: Clear manager_chips
    console.log(`[3/5] Clearing manager_chips...`);
    const chipsResult = await pool.query(
      'DELETE FROM manager_chips WHERE league_id = $1',
      [leagueId]
    );
    console.log(`✓ Deleted ${chipsResult.rowCount} rows from manager_chips\n`);

    // Step 4: Reset sync status
    console.log(`[4/5] Resetting sync status...`);
    const syncResult = await pool.query(
      `UPDATE leagues
       SET last_synced = NULL, sync_status = 'pending'
       WHERE id = $1`,
      [leagueId]
    );
    console.log(`✓ Reset sync status for league ${leagueId}\n`);

    // Step 5: Verify cleanup
    console.log(`[5/5] Verifying cleanup...`);

    const gwCheck = await pool.query(
      'SELECT COUNT(*) FROM manager_gw_history WHERE league_id = $1',
      [leagueId]
    );
    console.log(`  - manager_gw_history: ${gwCheck.rows[0].count} rows (should be 0)`);

    const captainCheck = await pool.query(`
      SELECT COUNT(*) FROM entry_captains
      WHERE entry_id IN (
        SELECT entry_id FROM league_standings WHERE league_id = $1
      )
    `, [leagueId]);
    console.log(`  - entry_captains: ${captainCheck.rows[0].count} rows (should be 0)`);

    const chipsCheck = await pool.query(
      'SELECT COUNT(*) FROM manager_chips WHERE league_id = $1',
      [leagueId]
    );
    console.log(`  - manager_chips: ${chipsCheck.rows[0].count} rows (should be 0)`);

    const statusCheck = await pool.query(
      'SELECT sync_status, last_synced FROM leagues WHERE id = $1',
      [leagueId]
    );
    const { sync_status, last_synced } = statusCheck.rows[0] || {};
    console.log(`  - sync_status: ${sync_status}`);
    console.log(`  - last_synced: ${last_synced || 'NULL'}`);

    console.log(`\n========================================`);
    console.log(`✓ League ${leagueId} reset complete!`);
    console.log(`========================================\n`);
    console.log(`Next steps:`);
    console.log(`1. Load league ${leagueId} on staging to trigger auto-sync`);
    console.log(`2. Watch Railway logs for sync progress`);
    console.log(`3. Verify Season Stats shows correct data\n`);

  } catch (error) {
    console.error('ERROR:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Get league ID from command line args
const leagueId = parseInt(process.argv[2]);

if (!leagueId || isNaN(leagueId)) {
  console.error('Usage: npx tsx src/scripts/reset-league-sync.ts <league_id>');
  console.error('Example: npx tsx src/scripts/reset-league-sync.ts 7381');
  process.exit(1);
}

resetLeagueSync(leagueId);
