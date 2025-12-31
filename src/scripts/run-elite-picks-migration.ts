/**
 * K-200: Run Elite Picks Migration
 *
 * Creates elite_picks and elite_sync_status tables
 *
 * Usage: npm run migrate:elite-picks
 */

import { getDatabase } from '../lib/db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🚀 Starting elite picks migration...');

  const db = await getDatabase();

  try {
    // Read migration SQL file
    const migrationPath = path.join(process.cwd(), 'src/db/migrations/create-elite-picks.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await db.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Tables created:');
    console.log('  - elite_picks');
    console.log('  - elite_sync_status');

    // Verify tables exist
    const tablesResult = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('elite_picks', 'elite_sync_status')
      ORDER BY table_name
    `);

    console.log('');
    console.log('Verified tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
