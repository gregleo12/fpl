-- Migration: Add PL Fixtures Table
-- Version: K-27.6
-- Description: Cache all 380 Premier League fixtures (schedule, results, FDR)

CREATE TABLE IF NOT EXISTS pl_fixtures (
  id INTEGER PRIMARY KEY,
  event INTEGER,
  team_h INTEGER NOT NULL,
  team_a INTEGER NOT NULL,
  team_h_score INTEGER,
  team_a_score INTEGER,
  team_h_difficulty INTEGER,
  team_a_difficulty INTEGER,
  kickoff_time TIMESTAMP,
  started BOOLEAN DEFAULT FALSE,
  finished BOOLEAN DEFAULT FALSE,
  finished_provisional BOOLEAN DEFAULT FALSE,
  minutes INTEGER DEFAULT 0,
  pulse_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pl_fixtures_event ON pl_fixtures(event);
CREATE INDEX IF NOT EXISTS idx_pl_fixtures_team_h ON pl_fixtures(team_h);
CREATE INDEX IF NOT EXISTS idx_pl_fixtures_team_a ON pl_fixtures(team_a);
