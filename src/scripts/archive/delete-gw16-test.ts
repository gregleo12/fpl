import { getDatabase } from '../../lib/db';

async function deleteGW16() {
  const leagueId = 804742;
  const gw = 16;
  const db = await getDatabase();

  try {
    console.log(`[Test] Deleting GW${gw} data for league ${leagueId}...`);

    // Delete manager_gw_history
    const gwResult = await db.query(`
      DELETE FROM manager_gw_history
      WHERE league_id = $1 AND event = $2
    `, [leagueId, gw]);
    console.log(`[Test] Deleted ${gwResult.rowCount} rows from manager_gw_history`);

    // Delete manager_chips
    const chipsResult = await db.query(`
      DELETE FROM manager_chips
      WHERE league_id = $1 AND event = $2
    `, [leagueId, gw]);
    console.log(`[Test] Deleted ${chipsResult.rowCount} rows from manager_chips`);

    // Delete entry_captains
    const captainsResult = await db.query(`
      DELETE FROM entry_captains
      WHERE event = $1
      AND entry_id IN (SELECT entry_id FROM league_standings WHERE league_id = $2)
    `, [gw, leagueId]);
    console.log(`[Test] Deleted ${captainsResult.rowCount} rows from entry_captains`);

    // Verify GW16 is missing
    console.log('\n[Test] Verifying GW16 is missing...');
    const verifyResult = await db.query(`
      SELECT DISTINCT event FROM manager_gw_history
      WHERE league_id = $1
      ORDER BY event
    `, [leagueId]);

    const events = verifyResult.rows.map(r => r.event);
    console.log(`[Test] Synced GWs for league ${leagueId}:`, events);

    if (!events.includes(16)) {
      console.log('\n✅ GW16 successfully deleted!');
      console.log('You can now test incremental sync by loading league 804742');
    } else {
      console.log('\n❌ GW16 still exists - deletion may have failed');
    }

    process.exit(0);
  } catch (error) {
    console.error('[Test] Error:', error);
    process.exit(1);
  }
}

deleteGW16();
