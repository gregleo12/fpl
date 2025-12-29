/**
 * Add performance indexes for My Team DB optimization
 *
 * These indexes are critical for fast query performance when fetching
 * completed gameweek data from the database instead of FPL API.
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addPerformanceIndexes() {
  try {
    console.log('Starting index creation...\n');

    // Index 1: player_gameweek_stats(event, element_id)
    console.log('1. Creating index on player_gameweek_stats(event, element_id)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_player_gw_stats_event_element
      ON player_gameweek_stats(event, element_id)
    `);
    console.log('   ✓ Created idx_player_gw_stats_event_element\n');

    // Index 2: pl_fixtures(event, finished)
    console.log('2. Creating index on pl_fixtures(event, finished)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pl_fixtures_event_finished
      ON pl_fixtures(event, finished)
    `);
    console.log('   ✓ Created idx_pl_fixtures_event_finished\n');

    // Index 3: manager_picks(entry_id, event)
    console.log('3. Creating index on manager_picks(entry_id, event)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_manager_picks_entry_event
      ON manager_picks(entry_id, event)
    `);
    console.log('   ✓ Created idx_manager_picks_entry_event\n');

    // Verify indexes were created
    console.log('Verifying indexes...\n');

    const verifyQueries = [
      {
        table: 'player_gameweek_stats',
        indexName: 'idx_player_gw_stats_event_element'
      },
      {
        table: 'pl_fixtures',
        indexName: 'idx_pl_fixtures_event_finished'
      },
      {
        table: 'manager_picks',
        indexName: 'idx_manager_picks_entry_event'
      }
    ];

    for (const { table, indexName } of verifyQueries) {
      const result = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1 AND indexname = $2
      `, [table, indexName]);

      if (result.rows.length > 0) {
        console.log(`✓ ${indexName}:`);
        console.log(`  ${result.rows[0].indexdef}\n`);
      } else {
        console.log(`✗ ${indexName}: NOT FOUND\n`);
      }
    }

    console.log('Index creation complete!');

  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addPerformanceIndexes();
