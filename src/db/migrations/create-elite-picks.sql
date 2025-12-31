-- K-200: Elite Picks Migration
-- Creates tables for tracking Top 10K ownership data

-- Table to store individual player picks from elite managers
CREATE TABLE IF NOT EXISTS elite_picks (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  sample_tier VARCHAR(20) NOT NULL DEFAULT 'top10k', -- 'top500', 'top10k', etc
  entry_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  is_captain BOOLEAN DEFAULT FALSE,
  is_vice_captain BOOLEAN DEFAULT FALSE,
  multiplier INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(gameweek, sample_tier, entry_id, player_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_elite_picks_gw_tier ON elite_picks(gameweek, sample_tier);
CREATE INDEX IF NOT EXISTS idx_elite_picks_player ON elite_picks(player_id);
CREATE INDEX IF NOT EXISTS idx_elite_picks_entry ON elite_picks(entry_id);
CREATE INDEX IF NOT EXISTS idx_elite_picks_team_lookup ON elite_picks(gameweek, sample_tier, player_id);

-- Metadata table to track sync status
CREATE TABLE IF NOT EXISTS elite_sync_status (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  sample_tier VARCHAR(20) NOT NULL,
  teams_fetched INTEGER DEFAULT 0,
  total_teams INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(gameweek, sample_tier)
);

CREATE INDEX IF NOT EXISTS idx_elite_sync_status_lookup ON elite_sync_status(gameweek, sample_tier, status);
