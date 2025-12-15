-- Migration: Add Defensive Contribution Column
-- Version: 2.5.12
-- Description: Add defensive_contribution field to player_gameweek_stats table

ALTER TABLE player_gameweek_stats
ADD COLUMN IF NOT EXISTS defensive_contribution INTEGER DEFAULT 0;
