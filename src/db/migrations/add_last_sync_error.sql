-- Migration: Add last_sync_error column to leagues table
-- Date: December 20, 2025
-- Purpose: Track sync errors for debugging stuck syncs (K-60)

-- Add last_sync_error column
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

-- One-time fix: Reset any currently stuck leagues (stuck > 10 minutes)
UPDATE leagues
SET sync_status = 'failed',
    last_sync_error = 'Auto-reset: sync stuck in syncing status for >10 minutes'
WHERE sync_status = 'syncing'
AND last_synced < NOW() - INTERVAL '10 minutes';

-- Add comment
COMMENT ON COLUMN leagues.last_sync_error IS 'Error message from last failed sync (K-60)';
