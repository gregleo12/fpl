import { getDatabase } from '../../lib/db.js';

async function verify() {
  const db = await getDatabase();

  // Total picks
  const totalResult = await db.query('SELECT COUNT(*) FROM manager_picks');
  console.log(`Total picks in database: ${totalResult.rows[0].count}`);

  // By gameweek
  const byGW = await db.query(`
    SELECT event, COUNT(DISTINCT entry_id) as managers, COUNT(*) as total_picks
    FROM manager_picks
    GROUP BY event
    ORDER BY event
  `);

  console.log('\nData by Gameweek:');
  byGW.rows.forEach((r: any) => {
    console.log(`  GW${r.event}: ${r.managers} managers, ${r.total_picks} picks`);
  });

  // Sample captains
  const captains = await db.query(`
    SELECT m.player_name, mp.event, mp.player_id
    FROM manager_picks mp
    JOIN managers m ON m.entry_id = mp.entry_id
    WHERE mp.is_captain = true
    ORDER BY mp.event DESC
    LIMIT 10
  `);

  console.log('\nSample Captain Picks (Last 10):');
  captains.rows.forEach((r: any) => {
    console.log(`  ${r.player_name} - GW${r.event}: Player ${r.player_id}`);
  });

  // Picks per manager
  const perManager = await db.query(`
    SELECT m.player_name, COUNT(DISTINCT mp.event) as gameweeks, COUNT(*) as total_picks
    FROM manager_picks mp
    JOIN managers m ON m.entry_id = mp.entry_id
    GROUP BY m.player_name
    ORDER BY gameweeks DESC
    LIMIT 5
  `);

  console.log('\nTop Managers by GWs Synced:');
  perManager.rows.forEach((r: any) => {
    console.log(`  ${r.player_name}: ${r.gameweeks} GWs, ${r.total_picks} picks`);
  });

  process.exit(0);
}

verify();
