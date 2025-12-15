import { getDatabase } from '../lib/db.js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('[Migration] Adding defensive_contribution column...');
  const db = await getDatabase();

  try {
    await db.query(`
      ALTER TABLE player_gameweek_stats
      ADD COLUMN IF NOT EXISTS defensive_contribution INTEGER DEFAULT 0;
    `);
    console.log('[Migration] ✅ Successfully added defensive_contribution column');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Error:', error);
    process.exit(1);
  }
}

runMigration();
