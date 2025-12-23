import { getDatabase } from '../lib/db.js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('[K-108 Migration] Running add_k108_columns.sql...');

  const db = await getDatabase();

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'add_k108_columns.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Run migration
    await db.query(migrationSQL);
    console.log('[K-108 Migration] ✅ Successfully added K-108 columns to player_gameweek_stats');

    // Verify columns were added
    const columnCheck = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'player_gameweek_stats'
      AND column_name IN ('calculated_points', 'points_breakdown', 'fixture_started', 'fixture_finished', 'updated_at')
      ORDER BY ordinal_position
    `);

    console.log('[K-108 Migration] New columns added:');
    columnCheck.rows.forEach((col: any) => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    });

    // Check new indexes
    const indexCheck = await db.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'player_gameweek_stats'
      AND indexname IN ('idx_pgw_calculated_points', 'idx_pgw_fixture_status')
    `);

    console.log('[K-108 Migration] New indexes created:');
    indexCheck.rows.forEach((idx: any) => {
      console.log(`  ✓ ${idx.indexname}`);
    });

    // Check existing data
    const dataCheck = await db.query(`
      SELECT COUNT(*) as count
      FROM player_gameweek_stats
    `);

    console.log(`\n[K-108 Migration] Existing records: ${dataCheck.rows[0].count}`);
    console.log('[K-108 Migration] These records will need calculated_points populated via sync script.');

    process.exit(0);
  } catch (error) {
    console.error('[K-108 Migration] ❌ Error:', error);
    process.exit(1);
  }
}

runMigration();
