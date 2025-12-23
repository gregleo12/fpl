-- Migration: Add K-108 Single Source of Truth Columns
-- Version: 3.6.2
-- Description: Add calculated_points, points_breakdown, and fixture status columns to player_gameweek_stats
-- Note: total_points remains as FPL's original value for validation

-- Add calculated_points column (our calculation - source of truth)
ALTER TABLE player_gameweek_stats
ADD COLUMN IF NOT EXISTS calculated_points INTEGER;

-- Add points_breakdown column (JSON breakdown of how points were calculated)
ALTER TABLE player_gameweek_stats
ADD COLUMN IF NOT EXISTS points_breakdown JSONB;

-- Add fixture status columns (for determining if game is live/completed)
ALTER TABLE player_gameweek_stats
ADD COLUMN IF NOT EXISTS fixture_started BOOLEAN DEFAULT FALSE;

ALTER TABLE player_gameweek_stats
ADD COLUMN IF NOT EXISTS fixture_finished BOOLEAN DEFAULT FALSE;

-- Add updated_at timestamp for tracking when data was last synced
ALTER TABLE player_gameweek_stats
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index on calculated_points for performance
CREATE INDEX IF NOT EXISTS idx_pgw_calculated_points ON player_gameweek_stats(calculated_points DESC);

-- Create index on fixture_finished for filtering live vs completed fixtures
CREATE INDEX IF NOT EXISTS idx_pgw_fixture_status ON player_gameweek_stats(fixture_finished, fixture_started);
