import { getDatabase } from '../lib/db';

async function checkGW16State() {
  const leagueId = 804742;
  const gw = 16;
  const db = await getDatabase();

  try {
    console.log('=== Checking GW16 State for League 804742 ===\n');

    // Check manager_gw_history
    const gwResult = await db.query(`
      SELECT COUNT(*) as rows, COUNT(DISTINCT entry_id) as managers
      FROM manager_gw_history
      WHERE league_id = $1 AND event = $2
    `, [leagueId, gw]);
    console.log('manager_gw_history GW16:', gwResult.rows[0]);

    // Check entry_captains
    const captainsResult = await db.query(`
      SELECT COUNT(*) as rows
      FROM entry_captains
      WHERE event = $1
      AND entry_id IN (SELECT entry_id FROM league_standings WHERE league_id = $2)
    `, [gw, leagueId]);
    console.log('entry_captains GW16:', captainsResult.rows[0]);

    // Check manager_chips
    const chipsResult = await db.query(`
      SELECT COUNT(*) as rows
      FROM manager_chips
      WHERE league_id = $1 AND event = $2
    `, [leagueId, gw]);
    console.log('manager_chips GW16:', chipsResult.rows[0]);

    // Check all GWs that exist
    const allGWsResult = await db.query(`
      SELECT DISTINCT event
      FROM manager_gw_history
      WHERE league_id = $1
      ORDER BY event
    `, [leagueId]);
    const events = allGWsResult.rows.map(r => r.event);
    console.log('\nAll synced GWs for league 804742:', events);

    // Check league sync status
    const leagueResult = await db.query(`
      SELECT id, name, sync_status, last_synced
      FROM leagues
      WHERE id = $1
    `, [leagueId]);
    console.log('\nLeague sync status:', leagueResult.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkGW16State();
