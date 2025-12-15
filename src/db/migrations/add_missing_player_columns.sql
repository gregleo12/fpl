-- Migration: Add Missing Player Columns
-- Version: 2.6.8
-- Description: Add team_code, event_points, and cost_change_start columns to players table

ALTER TABLE players
ADD COLUMN IF NOT EXISTS team_code INTEGER;

ALTER TABLE players
ADD COLUMN IF NOT EXISTS event_points INTEGER DEFAULT 0;

ALTER TABLE players
ADD COLUMN IF NOT EXISTS cost_change_start INTEGER DEFAULT 0;
