import { getDatabase } from '../lib/db.js';

async function verify() {
  const db = await getDatabase();

  // Total transfers
  const totalResult = await db.query('SELECT COUNT(*) FROM manager_transfers');
  console.log(`Total transfers in database: ${totalResult.rows[0].count}`);

  // Breakdown by gameweek
  const byGW = await db.query(`
    SELECT event, COUNT(*) as count
    FROM manager_transfers
    GROUP BY event
    ORDER BY event
  `);

  console.log('\nTransfers by Gameweek:');
  byGW.rows.forEach((r: any) => {
    console.log(`  GW${r.event}: ${r.count} transfers`);
  });

  // Most active managers
  const byManager = await db.query(`
    SELECT m.player_name, COUNT(*) as transfer_count
    FROM manager_transfers mt
    JOIN managers m ON m.entry_id = mt.entry_id
    GROUP BY m.player_name
    ORDER BY transfer_count DESC
  `);

  console.log('\nMost Active Managers:');
  byManager.rows.slice(0, 5).forEach((r: any) => {
    console.log(`  ${r.player_name}: ${r.transfer_count} transfers`);
  });

  // Most transferred in
  const mostIn = await db.query(`
    SELECT
      mt.player_in as player_id,
      p.web_name,
      COUNT(*) as transfer_count
    FROM manager_transfers mt
    JOIN players p ON p.id = mt.player_in
    GROUP BY mt.player_in, p.web_name
    ORDER BY transfer_count DESC
    LIMIT 5
  `);

  console.log('\nMost Transferred In:');
  mostIn.rows.forEach((r: any) => {
    console.log(`  ${r.web_name}: ${r.transfer_count} times`);
  });

  // Most transferred out
  const mostOut = await db.query(`
    SELECT
      mt.player_out as player_id,
      p.web_name,
      COUNT(*) as transfer_count
    FROM manager_transfers mt
    JOIN players p ON p.id = mt.player_out
    GROUP BY mt.player_out, p.web_name
    ORDER BY transfer_count DESC
    LIMIT 5
  `);

  console.log('\nMost Transferred Out:');
  mostOut.rows.forEach((r: any) => {
    console.log(`  ${r.web_name}: ${r.transfer_count} times`);
  });

  // Sample recent transfers
  const sample = await db.query(`
    SELECT
      m.player_name,
      mt.event,
      pin.web_name as player_in,
      pout.web_name as player_out
    FROM manager_transfers mt
    JOIN managers m ON m.entry_id = mt.entry_id
    JOIN players pin ON pin.id = mt.player_in
    JOIN players pout ON pout.id = mt.player_out
    ORDER BY mt.event DESC, mt.transfer_time DESC
    LIMIT 10
  `);

  console.log('\nRecent Transfers (Last 10):');
  sample.rows.forEach((r: any) => {
    console.log(`  ${r.player_name} - GW${r.event}: ${r.player_out} → ${r.player_in}`);
  });

  process.exit(0);
}

verify();
