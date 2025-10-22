import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let initialized = false;

async function initializeDatabase() {
  if (initialized) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS leagues (
      id BIGINT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS managers (
      id SERIAL PRIMARY KEY,
      entry_id BIGINT UNIQUE NOT NULL,
      player_name TEXT NOT NULL,
      team_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS h2h_matches (
      id SERIAL PRIMARY KEY,
      league_id BIGINT NOT NULL,
      event INTEGER NOT NULL,
      entry_1_id BIGINT NOT NULL,
      entry_1_points INTEGER NOT NULL,
      entry_2_id BIGINT NOT NULL,
      entry_2_points INTEGER NOT NULL,
      winner BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(league_id, event, entry_1_id, entry_2_id)
    );

    CREATE TABLE IF NOT EXISTS league_standings (
      id SERIAL PRIMARY KEY,
      league_id BIGINT NOT NULL,
      entry_id BIGINT NOT NULL,
      rank INTEGER NOT NULL,
      matches_played INTEGER DEFAULT 0,
      matches_won INTEGER DEFAULT 0,
      matches_drawn INTEGER DEFAULT 0,
      matches_lost INTEGER DEFAULT 0,
      points_for INTEGER DEFAULT 0,
      points_against INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(league_id, entry_id)
    );

    CREATE INDEX IF NOT EXISTS idx_h2h_matches_league ON h2h_matches(league_id);
    CREATE INDEX IF NOT EXISTS idx_h2h_matches_event ON h2h_matches(event);
    CREATE INDEX IF NOT EXISTS idx_standings_league ON league_standings(league_id);
  `);

  initialized = true;
}

export async function getDatabase() {
  await initializeDatabase();
  return pool;
}

export async function closeDatabase() {
  await pool.end();
}
