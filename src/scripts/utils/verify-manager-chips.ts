import { getDatabase } from '../../lib/db.js';

async function verify() {
  const db = await getDatabase();

  // Total chips
  const totalResult = await db.query('SELECT COUNT(*) FROM manager_chips');
  console.log(`Total chips in database: ${totalResult.rows[0].count}`);

  // Breakdown by chip type
  const byChip = await db.query(`
    SELECT chip_name, COUNT(*) as count
    FROM manager_chips
    GROUP BY chip_name
    ORDER BY chip_name
  `);

  console.log('\nChip breakdown:');
  byChip.rows.forEach((r: any) => {
    const chipNames: Record<string, string> = { 'wildcard': 'WC', 'bboost': 'BB', '3xc': 'TC', 'freehit': 'FH' };
    const display = chipNames[r.chip_name] || r.chip_name;
    console.log(`  ${display} (${r.chip_name}): ${r.count}`);
  });

  // Chips by gameweek
  const byGW = await db.query(`
    SELECT event, chip_name, COUNT(*) as count
    FROM manager_chips
    GROUP BY event, chip_name
    ORDER BY event, chip_name
  `);

  console.log('\nChips by Gameweek:');
  byGW.rows.forEach((r: any) => {
    const chipNames: Record<string, string> = { 'wildcard': 'WC', 'bboost': 'BB', '3xc': 'TC', 'freehit': 'FH' };
    const display = chipNames[r.chip_name] || r.chip_name;
    console.log(`  GW${r.event}: ${display} used ${r.count} times`);
  });

  // Managers who used chips
  const byManager = await db.query(`
    SELECT m.player_name, COUNT(*) as chips_used
    FROM manager_chips mc
    JOIN managers m ON m.entry_id = mc.entry_id
    GROUP BY m.player_name
    ORDER BY chips_used DESC
  `);

  console.log('\nTop Chip Users:');
  byManager.rows.slice(0, 5).forEach((r: any) => {
    console.log(`  ${r.player_name}: ${r.chips_used} chips`);
  });

  // Sample chip details
  const sample = await db.query(`
    SELECT m.player_name, mc.chip_name, mc.event
    FROM manager_chips mc
    JOIN managers m ON m.entry_id = mc.entry_id
    ORDER BY mc.event DESC
    LIMIT 10
  `);

  console.log('\nRecent Chip Usage (Last 10):');
  sample.rows.forEach((r: any) => {
    const chipNames: Record<string, string> = { 'wildcard': 'WC', 'bboost': 'BB', '3xc': 'TC', 'freehit': 'FH' };
    const display = chipNames[r.chip_name] || r.chip_name;
    console.log(`  ${r.player_name} - GW${r.event}: ${display}`);
  });

  process.exit(0);
}

verify();
