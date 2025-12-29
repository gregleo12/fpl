import { getDatabase } from '../../lib/db.js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('[Migration] Running add_missing_player_columns.sql...');

  const db = await getDatabase();

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_missing_player_columns.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Run migration
    await db.query(migrationSQL);
    console.log('[Migration] ✅ Successfully added missing columns to players table');

    // Verify columns exist
    const columnsCheck = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'players'
      AND column_name IN ('team_code', 'event_points', 'cost_change_start')
      ORDER BY column_name
    `);

    console.log('[Migration] Columns verified:', columnsCheck.rows.map(r => r.column_name));

    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Error:', error);
    process.exit(1);
  }
}

runMigration();
