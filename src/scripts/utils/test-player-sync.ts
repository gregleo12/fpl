/**
 * Test script for player sync
 * Run with: npx ts-node src/scripts/test-player-sync.ts
 */

import { syncPlayers } from '@/lib/sync/playerSync';
import { getDatabase } from '@/lib/db';

async function main() {
  console.log('=== Testing Player Sync ===\n');

  try {
    // Run the sync
    const result = await syncPlayers();

    console.log('\n=== Sync Results ===');
    console.log(`Players Updated: ${result.playersUpdated}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.error('\nErrors:');
      result.errors.forEach((err, idx) => {
        console.error(`  ${idx + 1}. ${err}`);
      });
    }

    // Verify data in database
    const db = await getDatabase();

    console.log('\n=== Database Verification ===');

    // Count players
    const playersCount = await db.query('SELECT COUNT(*) as count FROM players');
    console.log(`Total Players: ${playersCount.rows[0].count}`);

    // Count teams
    const teamsCount = await db.query('SELECT COUNT(*) as count FROM teams');
    console.log(`Total Teams: ${teamsCount.rows[0].count}`);

    // Top scorers
    const topScorers = await db.query(`
      SELECT web_name, team_short, position, total_points, now_cost
      FROM players
      ORDER BY total_points DESC
      LIMIT 10
    `);

    console.log('\nTop 10 Players by Points:');
    topScorers.rows.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.web_name} (${p.team_short}, ${p.position}) - ${p.total_points} pts (£${p.now_cost / 10}m)`);
    });

    // Most expensive players
    const mostExpensive = await db.query(`
      SELECT web_name, team_short, position, total_points, now_cost
      FROM players
      ORDER BY now_cost DESC
      LIMIT 5
    `);

    console.log('\nMost Expensive Players:');
    mostExpensive.rows.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.web_name} (${p.team_short}, ${p.position}) - £${p.now_cost / 10}m (${p.total_points} pts)`);
    });

    // Position breakdown
    const positionBreakdown = await db.query(`
      SELECT position, COUNT(*) as count
      FROM players
      GROUP BY position
      ORDER BY position
    `);

    console.log('\nPlayers by Position:');
    positionBreakdown.rows.forEach(p => {
      console.log(`  ${p.position}: ${p.count}`);
    });

    console.log('\n✓ Player sync test completed successfully!');

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
