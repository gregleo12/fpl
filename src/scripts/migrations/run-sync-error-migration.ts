#!/usr/bin/env tsx

/**
 * Migration Script: Add last_sync_error column
 * Run with: npx tsx src/scripts/run-sync-error-migration.ts
 */

import { getDatabase } from '../../lib/db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('[Migration] Starting: add_last_sync_error');

  const db = await getDatabase();

  try {
    // Read migration SQL
    const migrationPath = path.join(__dirname, '../db/migrations/add_last_sync_error.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('[Migration] Executing SQL...');

    // Execute migration
    await db.query(migrationSQL);

    console.log('[Migration] ✅ Successfully added last_sync_error column');
    console.log('[Migration] ✅ Auto-reset any stuck syncs (>10 minutes)');

    // Verify column exists
    const result = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'leagues' AND column_name = 'last_sync_error'
    `);

    if (result.rows.length > 0) {
      console.log('[Migration] ✅ Verification: last_sync_error column exists');
      console.log(`[Migration]    Type: ${result.rows[0].data_type}`);
    } else {
      console.error('[Migration] ⚠️ WARNING: Column not found after migration');
    }

    // Check if any leagues were auto-reset
    const resetResult = await db.query(`
      SELECT id, name, sync_status, last_sync_error
      FROM leagues
      WHERE last_sync_error LIKE 'Auto-reset%'
    `);

    if (resetResult.rows.length > 0) {
      console.log(`[Migration] ℹ️ Auto-reset ${resetResult.rows.length} stuck leagues:`);
      resetResult.rows.forEach((league: any) => {
        console.log(`[Migration]    - League ${league.id}: ${league.name}`);
        console.log(`[Migration]      Status: ${league.sync_status}`);
        console.log(`[Migration]      Error: ${league.last_sync_error}`);
      });
    } else {
      console.log('[Migration] ℹ️ No stuck leagues found');
    }

    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Failed:', error);
    process.exit(1);
  }
}

runMigration();
