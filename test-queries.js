const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres:LmoGdsXHMosNUwfCdKmPlaIMletkDZXj@caboose.proxy.rlwy.net:45586/railway";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testQueries() {
  try {
    console.log('Testing exact queries from admin stats API...\n');

    // Test 1: Total requests
    console.log('=== Query 1: Total Requests ===');
    const q1 = await pool.query('SELECT COUNT(*) as count FROM analytics_requests');
    console.log('Result:', q1.rows[0]);
    console.log('Count value:', q1.rows[0].count);
    console.log('Count type:', typeof q1.rows[0].count);
    console.log();

    // Test 2: Today's requests
    console.log('=== Query 2: Today\'s Requests ===');
    const q2 = await pool.query('SELECT COUNT(*) as count FROM analytics_requests WHERE timestamp >= CURRENT_DATE');
    console.log('Result:', q2.rows[0]);
    console.log();

    // Test 3: Last 7 days
    console.log('=== Query 3: Last 7 Days ===');
    const q3 = await pool.query(`SELECT COUNT(*) as count FROM analytics_requests WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'`);
    console.log('Result:', q3.rows[0]);
    console.log();

    // Test 4: Parse as API does
    console.log('=== Testing parseInt parsing ===');
    const parsed = parseInt(q1.rows[0].count);
    console.log('parseInt(count):', parsed);
    console.log('Parsed type:', typeof parsed);
    console.log('isNaN?:', isNaN(parsed));
    console.log();

    // Test 5: Check if count is actually a string
    console.log('=== Checking count data type ===');
    console.log('Raw count:', q1.rows[0].count);
    console.log('count || "0":', q1.rows[0].count || '0');
    console.log('parseInt(count || "0"):', parseInt(q1.rows[0].count || '0'));

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await pool.end();
  }
}

testQueries();
