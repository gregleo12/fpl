-- K-165b: League GW Sync Status Tracking Table
-- Tracks sync progress for each league/gameweek combination

CREATE TABLE IF NOT EXISTS league_gw_sync (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  gameweek INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Status values: pending, in_progress, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(league_id, gameweek)
);

-- Index for fast status lookups
CREATE INDEX IF NOT EXISTS idx_league_gw_sync_status
  ON league_gw_sync(league_id, gameweek, status);

-- Index for finding failed syncs
CREATE INDEX IF NOT EXISTS idx_league_gw_sync_failed
  ON league_gw_sync(status, updated_at)
  WHERE status = 'failed';

COMMENT ON TABLE league_gw_sync IS 'K-165b: Tracks sync status for each league/gameweek to ensure reliable background syncing';
COMMENT ON COLUMN league_gw_sync.status IS 'pending = not started, in_progress = syncing now, completed = success, failed = error after retries';
COMMENT ON COLUMN league_gw_sync.retry_count IS 'Number of retry attempts (max 3)';
