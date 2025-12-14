import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Running players tables migration...');

    // Read and execute the SQL migration file
    const sqlPath = join(process.cwd(), 'src/db/migrations/add_players_tables.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('✅ Players tables migration complete!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
