-- Migration: Add Manager Gameweek History Table
-- Version: K-27.5
-- Description: Cache manager GW-by-GW history (points, hits, rank, team value, bank)

CREATE TABLE IF NOT EXISTS manager_gw_history (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  event INTEGER NOT NULL,              -- gameweek
  points INTEGER NOT NULL,             -- GW points (before hits)
  total_points INTEGER NOT NULL,       -- cumulative total
  rank INTEGER,                        -- overall rank
  rank_sort INTEGER,                   -- rank for sorting
  overall_rank INTEGER,                -- same as rank
  event_transfers INTEGER DEFAULT 0,   -- transfers made this GW
  event_transfers_cost INTEGER DEFAULT 0, -- hit points (4, 8, 12, etc)
  value INTEGER,                       -- team value (in 0.1m units)
  bank INTEGER,                        -- money in bank (in 0.1m units)
  points_on_bench INTEGER DEFAULT 0,   -- points left on bench
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(entry_id, event)
);

CREATE INDEX IF NOT EXISTS idx_manager_gw_history_entry ON manager_gw_history(entry_id);
CREATE INDEX IF NOT EXISTS idx_manager_gw_history_league_event ON manager_gw_history(league_id, event);
CREATE INDEX IF NOT EXISTS idx_manager_gw_history_league ON manager_gw_history(league_id);
