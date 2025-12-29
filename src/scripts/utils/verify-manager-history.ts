import { getDatabase } from '../../lib/db.js';

async function verify() {
  const db = await getDatabase();

  // Verify by GW
  const byGW = await db.query(`
    SELECT event, COUNT(*) as managers, SUM(event_transfers_cost) as total_hits
    FROM manager_gw_history
    GROUP BY event
    ORDER BY event
  `);

  console.log('Data by Gameweek:');
  byGW.rows.forEach((r: any) => {
    console.log(`  GW${r.event}: ${r.managers} managers, ${r.total_hits} total hit points`);
  });

  // Sample data - biggest hits
  const sample = await db.query(`
    SELECT m.player_name, mh.event, mh.points, mh.event_transfers_cost as hits
    FROM manager_gw_history mh
    JOIN managers m ON m.entry_id = mh.entry_id
    WHERE mh.event_transfers_cost > 0
    ORDER BY mh.event_transfers_cost DESC
    LIMIT 5
  `);

  console.log('\nTop 5 Biggest Hits:');
  sample.rows.forEach((r: any) => {
    console.log(`  ${r.player_name} - GW${r.event}: ${r.points} pts, -${r.hits} hit`);
  });

  // Total hits by manager
  const totalHits = await db.query(`
    SELECT m.player_name,
           SUM(mh.event_transfers_cost) as total_hits,
           COUNT(CASE WHEN mh.event_transfers_cost > 0 THEN 1 END) as times_hit
    FROM manager_gw_history mh
    JOIN managers m ON m.entry_id = mh.entry_id
    GROUP BY m.player_name
    HAVING SUM(mh.event_transfers_cost) > 0
    ORDER BY total_hits DESC
    LIMIT 5
  `);

  console.log('\nManagers Who Took Most Hits:');
  totalHits.rows.forEach((r: any) => {
    console.log(`  ${r.player_name}: -${r.total_hits} pts (${r.times_hit} GWs)`);
  });

  process.exit(0);
}

verify();
