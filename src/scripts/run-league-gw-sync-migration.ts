#!/usr/bin/env node
/**
 * K-165b: Run League GW Sync Status Table Migration
 *
 * Creates the league_gw_sync table for tracking sync progress
 * per league/gameweek combination with retry logic.
 *
 * Usage:
 *   npx tsx src/scripts/run-league-gw-sync-migration.ts
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway')
      ? { rejectUnauthorized: false }
      : undefined
  });

  try {
    console.log('[K-165b] Starting league_gw_sync table migration...');

    // Read migration SQL file
    const migrationPath = join(process.cwd(), 'src/db/migrations/create-league-gw-sync.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('[K-165b] Executing migration SQL...');
    await pool.query(migrationSQL);

    // Verify table was created
    const verifyResult = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'league_gw_sync'
      ORDER BY ordinal_position
    `);

    if (verifyResult.rows.length === 0) {
      throw new Error('Migration failed: league_gw_sync table not found');
    }

    console.log('[K-165b] ✅ Migration completed successfully!');
    console.log('[K-165b] Created table: league_gw_sync');
    console.log(`[K-165b] Columns: ${verifyResult.rows.length}`);

    // Show table structure
    console.log('\n[K-165b] Table structure:');
    verifyResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Verify indexes
    const indexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'league_gw_sync'
    `);

    console.log(`\n[K-165b] Indexes created: ${indexResult.rows.length}`);
    indexResult.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

  } catch (error) {
    console.error('[K-165b] ❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n[K-165b] Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[K-165b] Migration script failed:', error);
    process.exit(1);
  });
