import { getDatabase } from '../../lib/db.js';

async function checkHistory() {
  const db = await getDatabase();

  console.log('Checking manager_gw_history for GW16...\n');

  const result = await db.query(`
    SELECT
      mh.entry_id,
      m.player_name,
      mh.points,
      mh.event_transfers_cost,
      hm.entry_1_points,
      hm.entry_2_points
    FROM manager_gw_history mh
    JOIN managers m ON m.entry_id = mh.entry_id
    LEFT JOIN h2h_matches hm ON (hm.entry_1_id = mh.entry_id OR hm.entry_2_id = mh.entry_id) AND hm.event = 16
    WHERE mh.event = 16 AND mh.entry_id IN (4459464, 6846038)
    ORDER BY mh.entry_id
  `);

  console.log('GW16 History:');
  result.rows.forEach((row: any) => {
    console.log(`  ${row.player_name} (${row.entry_id}):`);
    console.log(`    manager_gw_history.points: ${row.points}`);
    console.log(`    manager_gw_history.event_transfers_cost: ${row.event_transfers_cost}`);
    console.log(`    h2h_matches score: ${row.entry_1_points || row.entry_2_points}`);
    console.log(`    Net score (points - transfers): ${row.points - row.event_transfers_cost}`);
  });

  process.exit(0);
}

checkHistory();
