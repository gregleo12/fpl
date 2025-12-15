-- Migration: Add Manager Transfers Table
-- Version: K-27.4
-- Description: Cache all manager transfers (player in/out, GW, cost)

CREATE TABLE IF NOT EXISTS manager_transfers (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  event INTEGER NOT NULL,
  player_in INTEGER NOT NULL,
  player_out INTEGER NOT NULL,
  player_in_cost INTEGER NOT NULL,
  player_out_cost INTEGER NOT NULL,
  transfer_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(entry_id, event, player_in, player_out)
);

CREATE INDEX IF NOT EXISTS idx_manager_transfers_entry ON manager_transfers(entry_id);
CREATE INDEX IF NOT EXISTS idx_manager_transfers_event ON manager_transfers(league_id, event);
CREATE INDEX IF NOT EXISTS idx_manager_transfers_player_in ON manager_transfers(player_in);
CREATE INDEX IF NOT EXISTS idx_manager_transfers_player_out ON manager_transfers(player_out);
