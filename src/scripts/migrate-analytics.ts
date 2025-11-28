import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Creating analytics tables...');

    // Table 1: Raw request tracking (keep 30 days)
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_requests (
        id SERIAL PRIMARY KEY,
        league_id INTEGER,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL DEFAULT 'GET',
        timestamp TIMESTAMP DEFAULT NOW(),
        user_hash VARCHAR(64) NOT NULL,
        response_time_ms INTEGER,
        status_code INTEGER DEFAULT 200
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_requests_timestamp
        ON analytics_requests(timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_requests_league
        ON analytics_requests(league_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_requests_user
        ON analytics_requests(user_hash);
    `);
    console.log('✅ Created analytics_requests table');

    // Table 2: Daily aggregated summaries (keep forever)
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_daily (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        league_id INTEGER,
        unique_users INTEGER DEFAULT 0,
        total_requests INTEGER DEFAULT 0,
        avg_response_time_ms INTEGER,
        error_count INTEGER DEFAULT 0,
        UNIQUE(date, league_id)
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_daily_date
        ON analytics_daily(date);
    `);
    console.log('✅ Created analytics_daily table');

    // Table 3: League metadata tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_leagues (
        league_id INTEGER PRIMARY KEY,
        league_name VARCHAR(255),
        team_count INTEGER DEFAULT 0,
        first_seen TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW(),
        total_requests INTEGER DEFAULT 0,
        total_unique_users INTEGER DEFAULT 0
      );
    `);
    console.log('✅ Created analytics_leagues table');

    console.log('🎉 Migration complete!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
