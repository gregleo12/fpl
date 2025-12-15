-- Migration: Add Manager Picks Table
-- Version: K-27.1
-- Description: Cache manager picks (15 players) for each gameweek

CREATE TABLE IF NOT EXISTS manager_picks (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  event INTEGER NOT NULL,              -- gameweek number
  player_id INTEGER NOT NULL,
  position INTEGER NOT NULL,           -- 1-15 (1-11 starting, 12-15 bench)
  multiplier INTEGER DEFAULT 1,        -- 0=benched, 1=normal, 2=captain, 3=TC
  is_captain BOOLEAN DEFAULT FALSE,
  is_vice_captain BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(league_id, entry_id, event, player_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_picks_entry_event ON manager_picks(entry_id, event);
CREATE INDEX IF NOT EXISTS idx_manager_picks_league_event ON manager_picks(league_id, event);
CREATE INDEX IF NOT EXISTS idx_manager_picks_league ON manager_picks(league_id);
