import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function auditSimple() {
  try {
    console.log('Connecting to database...\n');

    // Just get table names
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`Found ${result.rows.length} tables:\n`);
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.table_name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

auditSimple();
