import { getDatabase } from '../lib/db.js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('[Migration] Running add_manager_transfers.sql...');

  const db = await getDatabase();

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_manager_transfers.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Run migration
    await db.query(migrationSQL);
    console.log('[Migration] ✅ Successfully created manager_transfers table');

    // Verify table exists
    const tableCheck = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'manager_transfers'
      ORDER BY ordinal_position
    `);

    console.log('[Migration] Columns created:');
    tableCheck.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check indexes
    const indexCheck = await db.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'manager_transfers'
    `);

    console.log('[Migration] Indexes created:');
    indexCheck.rows.forEach((idx: any) => {
      console.log(`  - ${idx.indexname}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Error:', error);
    process.exit(1);
  }
}

runMigration();
