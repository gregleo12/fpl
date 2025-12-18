const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkIndexes() {
  try {
    console.log('Checking for specific indexes...\n');

    const targetIndexes = [
      'idx_player_gw_stats_event_element',
      'idx_pl_fixtures_event_finished',
      'idx_manager_picks_entry_event'
    ];

    // Get all indexes
    const result = await pool.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1)
      ORDER BY tablename, indexname
    `, [targetIndexes]);

    console.log(`Found ${result.rows.length} of ${targetIndexes.length} indexes:\n`);

    if (result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(`✓ ${row.indexname} on ${row.tablename}`);
        console.log(`  ${row.indexdef}\n`);
      });
    }

    // Check which ones are missing
    const foundIndexes = result.rows.map(r => r.indexname);
    const missingIndexes = targetIndexes.filter(idx => !foundIndexes.includes(idx));

    if (missingIndexes.length > 0) {
      console.log('Missing indexes:');
      missingIndexes.forEach(idx => {
        console.log(`✗ ${idx}`);
      });
    } else {
      console.log('All target indexes exist!');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkIndexes();
