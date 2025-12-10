import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Creating leagues table...');

    // Drop existing table if it exists
    await client.query(`DROP TABLE IF EXISTS leagues;`);
    console.log('Dropped existing leagues table if it existed');

    // Create leagues table to store league metadata
    await client.query(`
      CREATE TABLE leagues (
        league_id INTEGER PRIMARY KEY,
        league_name VARCHAR(255) NOT NULL,
        team_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX idx_leagues_name
        ON leagues(league_name);
    `);

    console.log('✅ Created leagues table');

    // Populate with existing leagues from h2h_matches
    await client.query(`
      INSERT INTO leagues (league_id, league_name, team_count, created_at)
      SELECT
        league_id,
        'League ' || league_id as league_name,
        COUNT(DISTINCT entry_1_id) + COUNT(DISTINCT entry_2_id) as team_count,
        MIN(created_at) as created_at
      FROM h2h_matches
      GROUP BY league_id
      ON CONFLICT (league_id) DO NOTHING;
    `);

    console.log('✅ Populated leagues table with existing data');

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
