import { getDatabase } from '../lib/db.js';

async function checkScores() {
  const db = await getDatabase();

  console.log('Checking h2h_matches for GW16...\n');

  const result = await db.query(`
    SELECT id, event, entry_1_id, entry_2_id, entry_1_points, entry_2_points, winner
    FROM h2h_matches
    WHERE league_id = 804742 AND event = 16
    ORDER BY id
    LIMIT 10
  `);

  console.log('h2h_matches rows:');
  result.rows.forEach((row: any) => {
    console.log(`  Match ${row.id}: ${row.entry_1_id} (${row.entry_1_points ?? 'NULL'}) vs ${row.entry_2_id} (${row.entry_2_points ?? 'NULL'}) - winner: ${row.winner}`);
  });

  process.exit(0);
}

checkScores();
