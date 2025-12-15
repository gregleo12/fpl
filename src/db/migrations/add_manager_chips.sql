-- Migration: Add Manager Chips Table
-- Version: K-27.3
-- Description: Cache manager chip usage (WC, BB, TC, FH)

CREATE TABLE IF NOT EXISTS manager_chips (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  chip_name VARCHAR(20) NOT NULL,  -- 'wildcard', 'bboost', '3xc', 'freehit'
  event INTEGER NOT NULL,           -- gameweek used
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(entry_id, chip_name, event)
);

CREATE INDEX IF NOT EXISTS idx_manager_chips_league ON manager_chips(league_id);
CREATE INDEX IF NOT EXISTS idx_manager_chips_entry ON manager_chips(entry_id);
CREATE INDEX IF NOT EXISTS idx_manager_chips_event ON manager_chips(league_id, event);
