import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'fpl.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS leagues (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS managers (
      id INTEGER PRIMARY KEY,
      entry_id INTEGER UNIQUE NOT NULL,
      player_name TEXT NOT NULL,
      team_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS h2h_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      league_id INTEGER NOT NULL,
      event INTEGER NOT NULL,
      entry_1_id INTEGER NOT NULL,
      entry_1_points INTEGER NOT NULL,
      entry_2_id INTEGER NOT NULL,
      entry_2_points INTEGER NOT NULL,
      winner INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (league_id) REFERENCES leagues(id),
      FOREIGN KEY (entry_1_id) REFERENCES managers(entry_id),
      FOREIGN KEY (entry_2_id) REFERENCES managers(entry_id)
    );

    CREATE TABLE IF NOT EXISTS league_standings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      league_id INTEGER NOT NULL,
      entry_id INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      matches_played INTEGER DEFAULT 0,
      matches_won INTEGER DEFAULT 0,
      matches_drawn INTEGER DEFAULT 0,
      matches_lost INTEGER DEFAULT 0,
      points_for INTEGER DEFAULT 0,
      points_against INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (league_id) REFERENCES leagues(id),
      FOREIGN KEY (entry_id) REFERENCES managers(entry_id),
      UNIQUE(league_id, entry_id)
    );

    CREATE INDEX IF NOT EXISTS idx_h2h_matches_league ON h2h_matches(league_id);
    CREATE INDEX IF NOT EXISTS idx_h2h_matches_event ON h2h_matches(event);
    CREATE INDEX IF NOT EXISTS idx_standings_league ON league_standings(league_id);
  `);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
