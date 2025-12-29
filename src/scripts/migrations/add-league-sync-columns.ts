import { getDatabase } from '@/lib/db';

async function addLeagueSyncColumns() {
  const db = await getDatabase();

  try {
    console.log('Adding sync tracking columns to leagues table...');

    await db.query(`
      ALTER TABLE leagues
      ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP;
    `);
    console.log('✓ Added last_synced column');

    await db.query(`
      ALTER TABLE leagues
      ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'pending';
    `);
    console.log('✓ Added sync_status column');

    console.log('Migration complete!');
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addLeagueSyncColumns();
