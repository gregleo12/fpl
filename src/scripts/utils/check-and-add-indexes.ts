/**
 * Check column names and add performance indexes
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkAndAddIndexes() {
  try {
    console.log('Step 1: Checking column names...\n');

    // Check player_gameweek_stats columns
    const playerStatsColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'player_gameweek_stats'
      ORDER BY ordinal_position
    `);
    console.log('player_gameweek_stats columns:');
    console.log(playerStatsColumns.rows.map(r => r.column_name).join(', '));
    console.log();

    // Check pl_fixtures columns
    const fixturesColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'pl_fixtures'
      ORDER BY ordinal_position
    `);
    console.log('pl_fixtures columns:');
    console.log(fixturesColumns.rows.map(r => r.column_name).join(', '));
    console.log();

    // Check manager_picks columns
    const picksColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'manager_picks'
      ORDER BY ordinal_position
    `);
    console.log('manager_picks columns:');
    console.log(picksColumns.rows.map(r => r.column_name).join(', '));
    console.log('\n' + '='.repeat(80) + '\n');

    console.log('Step 2: Creating indexes...\n');

    // Index 1: player_gameweek_stats
    // From the code, we use: WHERE event = $1 AND element_id = ANY($2)
    console.log('1. Creating index on player_gameweek_stats...');
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_player_gw_stats_event_element
        ON player_gameweek_stats(event, element_id)
      `);
      console.log('   ✓ Created idx_player_gw_stats_event_element\n');
    } catch (err: any) {
      console.log(`   ✗ Failed: ${err.message}\n`);
    }

    // Index 2: pl_fixtures
    // From the code, we use: WHERE event = $1 AND finished = true
    console.log('2. Creating index on pl_fixtures...');
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_pl_fixtures_event_finished
        ON pl_fixtures(event, finished)
      `);
      console.log('   ✓ Created idx_pl_fixtures_event_finished\n');
    } catch (err: any) {
      console.log(`   ✗ Failed: ${err.message}\n`);
    }

    // Index 3: manager_picks
    // From the code, we use: WHERE entry_id = $1 AND event = $2
    console.log('3. Creating index on manager_picks...');
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_manager_picks_entry_event
        ON manager_picks(entry_id, event)
      `);
      console.log('   ✓ Created idx_manager_picks_entry_event\n');
    } catch (err: any) {
      console.log(`   ✗ Failed: ${err.message}\n`);
    }

    console.log('='.repeat(80) + '\n');
    console.log('Step 3: Verifying indexes...\n');

    const indexes = await pool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('player_gameweek_stats', 'pl_fixtures', 'manager_picks')
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    if (indexes.rows.length > 0) {
      indexes.rows.forEach(idx => {
        console.log(`✓ ${idx.tablename}.${idx.indexname}`);
        console.log(`  ${idx.indexdef}\n`);
      });
    } else {
      console.log('No custom indexes found.\n');
    }

    console.log('='.repeat(80) + '\n');
    console.log('Step 4: Testing query plans...\n');

    // Test player_gameweek_stats query
    console.log('Testing player_gameweek_stats query...');
    const plan1 = await pool.query(`
      EXPLAIN
      SELECT * FROM player_gameweek_stats
      WHERE event = 16 AND element_id = ANY(ARRAY[1, 2, 3, 4, 5])
    `);
    plan1.rows.forEach(row => console.log(`  ${row['QUERY PLAN']}`));
    console.log();

    // Test pl_fixtures query
    console.log('Testing pl_fixtures query...');
    const plan2 = await pool.query(`
      EXPLAIN
      SELECT * FROM pl_fixtures
      WHERE event = 16 AND finished = true
    `);
    plan2.rows.forEach(row => console.log(`  ${row['QUERY PLAN']}`));
    console.log();

    // Test manager_picks query
    console.log('Testing manager_picks query...');
    const plan3 = await pool.query(`
      EXPLAIN
      SELECT * FROM manager_picks
      WHERE entry_id = 123456 AND event = 16
    `);
    plan3.rows.forEach(row => console.log(`  ${row['QUERY PLAN']}`));
    console.log();

    console.log('='.repeat(80));
    console.log('Index setup complete!');
    console.log('Look for "Index Scan" in query plans above (not "Seq Scan")');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkAndAddIndexes();
