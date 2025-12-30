import { Pool } from 'pg';

async function querySchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Connecting to database...');
    const result = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    console.log('\nDatabase Schema:\n');
    let currentTable = '';
    result.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        console.log(`\n${row.table_name}:`);
        currentTable = row.table_name;
      }
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    console.log(`\nTotal columns: ${result.rows.length}`);
    await pool.end();
  } catch (error) {
    console.error('Error querying schema:', error);
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
}

querySchema();
