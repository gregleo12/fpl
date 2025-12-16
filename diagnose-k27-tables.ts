import { Pool } from 'pg';

async function diagnoseK27Tables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Checking K-27 tables on staging database...\n');

    // Check if tables exist
    console.log('📋 Step 1: Checking if tables exist...');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('manager_picks', 'player_gameweek_stats', 'manager_gw_history', 'manager_chips')
      ORDER BY table_name;
    `);

    console.log(`Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
    console.log('');

    if (tablesResult.rows.length < 4) {
      console.log('❌ ERROR: Not all K-27 tables exist!');
      console.log('Missing tables:', ['manager_picks', 'player_gameweek_stats', 'manager_gw_history', 'manager_chips']
        .filter(t => !tablesResult.rows.find(r => r.table_name === t)));
      await pool.end();
      return;
    }

    // Check row counts for test league 804742
    console.log('📊 Step 2: Checking row counts for league 804742...');
    const countsResult = await pool.query(`
      SELECT 'manager_picks' as table_name, COUNT(*) as rows FROM manager_picks WHERE league_id = 804742
      UNION ALL
      SELECT 'player_gameweek_stats', COUNT(*) FROM player_gameweek_stats
      UNION ALL
      SELECT 'manager_gw_history', COUNT(*) FROM manager_gw_history WHERE league_id = 804742
      UNION ALL
      SELECT 'manager_chips', COUNT(*) FROM manager_chips WHERE league_id = 804742;
    `);

    let hasEmptyTables = false;
    countsResult.rows.forEach(row => {
      const count = parseInt(row.rows);
      const status = count === 0 ? '❌' : '✓';
      console.log(`  ${status} ${row.table_name}: ${count.toLocaleString()} rows`);
      if (count === 0) hasEmptyTables = true;
    });
    console.log('');

    if (hasEmptyTables) {
      console.log('❌ PROBLEM IDENTIFIED: One or more K-27 tables are EMPTY!');
      console.log('\n💡 SOLUTION: Run the K-27 sync scripts to populate the tables:');
      console.log('   npm run sync:manager-picks');
      console.log('   npm run sync:manager-history');
      console.log('   npm run sync:manager-chips');
      console.log('\n   Or revert to FPL API approach temporarily.');
    } else {
      console.log('✅ All tables exist and have data!');
      console.log('\n🤔 The issue might be something else. Check the actual error from browser Network tab.');
    }

    // Additional check: Sample a few rows from manager_picks to verify data structure
    console.log('\n🔬 Step 3: Sampling manager_picks data...');
    const sampleResult = await pool.query(`
      SELECT entry_id, event, player_id, is_captain, multiplier, position
      FROM manager_picks
      WHERE league_id = 804742
      LIMIT 3;
    `);

    if (sampleResult.rows.length > 0) {
      console.log('Sample rows:');
      sampleResult.rows.forEach(row => {
        console.log(`  Entry ${row.entry_id}, GW${row.event}: Player ${row.player_id} (${row.is_captain ? 'Captain' : 'Not captain'}, x${row.multiplier})`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    await pool.end();
    process.exit(1);
  }
}

diagnoseK27Tables();
