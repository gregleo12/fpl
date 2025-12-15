import { getDatabase } from '../lib/db.js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('[Migration] Running add_players_tables.sql...');

  const db = await getDatabase();

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_players_tables.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Run migration
    await db.query(migrationSQL);
    console.log('[Migration] ✅ Successfully created tables: teams, players, player_gameweek_stats');

    // Verify tables exist
    const tablesCheck = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('teams', 'players', 'player_gameweek_stats')
    `);

    console.log('[Migration] Tables found:', tablesCheck.rows.map(r => r.table_name));

    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Error:', error);
    process.exit(1);
  }
}

runMigration();
