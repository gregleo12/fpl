/**
 * Verify Elite Picks Data
 */

import { getDatabase } from '../lib/db';

async function verify() {
  const db = await getDatabase();

  // Check total picks
  const total = await db.query('SELECT COUNT(*) FROM elite_picks WHERE gameweek = 19');
  console.log('Total picks:', total.rows[0].count);

  // Check by team (Arsenal)
  const arsenal = await db.query(`
    SELECT p.web_name, COUNT(*) as ownership
    FROM elite_picks ep
    JOIN players p ON ep.player_id = p.id
    WHERE ep.gameweek = 19 AND ep.sample_tier = 'top500' AND p.team_id = 3
    GROUP BY p.web_name
    ORDER BY ownership DESC
    LIMIT 5
  `);
  console.log('\nTop 5 Arsenal players:');
  arsenal.rows.forEach(r => console.log(`  ${r.web_name}: ${r.ownership} (${(Number(r.ownership)/500*100).toFixed(1)}%)`));

  process.exit(0);
}

verify();
