-- Migration: Add Players Tables
-- Version: 2.5.0
-- Description: Create tables for storing player data and gameweek stats

-- Table 1: Teams (reference data)
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  short_name VARCHAR(5) NOT NULL,
  strength INTEGER,
  strength_overall_home INTEGER,
  strength_overall_away INTEGER,
  strength_attack_home INTEGER,
  strength_attack_away INTEGER,
  strength_defence_home INTEGER,
  strength_defence_away INTEGER
);

-- Table 2: Players (current season summary)
CREATE TABLE IF NOT EXISTS players (
  -- Identity
  id INTEGER PRIMARY KEY,
  web_name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100),
  second_name VARCHAR(100),

  -- Team & Position
  team_id INTEGER NOT NULL,
  team_name VARCHAR(50),
  team_short VARCHAR(5),
  element_type INTEGER NOT NULL,
  position VARCHAR(10),

  -- Price & Ownership
  now_cost INTEGER NOT NULL,
  selected_by_percent DECIMAL(5,2),
  transfers_in INTEGER DEFAULT 0,
  transfers_out INTEGER DEFAULT 0,
  transfers_in_event INTEGER DEFAULT 0,
  transfers_out_event INTEGER DEFAULT 0,

  -- Season Totals
  total_points INTEGER DEFAULT 0,
  points_per_game DECIMAL(4,2) DEFAULT 0,
  form DECIMAL(4,2) DEFAULT 0,

  -- Playing Stats
  minutes INTEGER DEFAULT 0,
  starts INTEGER DEFAULT 0,

  -- Attacking Stats
  goals_scored INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  expected_goals DECIMAL(6,2) DEFAULT 0,
  expected_assists DECIMAL(6,2) DEFAULT 0,
  expected_goal_involvements DECIMAL(6,2) DEFAULT 0,

  -- Defensive Stats
  clean_sheets INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  expected_goals_conceded DECIMAL(6,2) DEFAULT 0,
  own_goals INTEGER DEFAULT 0,

  -- GK Stats
  saves INTEGER DEFAULT 0,
  penalties_saved INTEGER DEFAULT 0,

  -- Discipline
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  penalties_missed INTEGER DEFAULT 0,

  -- Bonus
  bonus INTEGER DEFAULT 0,
  bps INTEGER DEFAULT 0,

  -- ICT Index
  influence DECIMAL(6,2) DEFAULT 0,
  creativity DECIMAL(6,2) DEFAULT 0,
  threat DECIMAL(6,2) DEFAULT 0,
  ict_index DECIMAL(6,2) DEFAULT 0,

  -- Status
  status VARCHAR(5),
  chance_of_playing_next_round INTEGER,
  news TEXT,

  -- Metadata
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for players table
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(element_type);
CREATE INDEX IF NOT EXISTS idx_players_points ON players(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_players_price ON players(now_cost);

-- Table 3: Player Gameweek Stats (per-GW history)
CREATE TABLE IF NOT EXISTS player_gameweek_stats (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  gameweek INTEGER NOT NULL,

  -- Match Info
  fixture_id INTEGER,
  opponent_team_id INTEGER,
  opponent_short VARCHAR(5),
  was_home BOOLEAN,

  -- Result
  team_goals INTEGER,
  opponent_goals INTEGER,

  -- Points
  total_points INTEGER DEFAULT 0,

  -- Playing
  minutes INTEGER DEFAULT 0,
  starts INTEGER DEFAULT 0,

  -- Attacking
  goals_scored INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  expected_goals DECIMAL(5,2) DEFAULT 0,
  expected_assists DECIMAL(5,2) DEFAULT 0,
  expected_goal_involvements DECIMAL(5,2) DEFAULT 0,

  -- Defensive
  clean_sheets INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  expected_goals_conceded DECIMAL(5,2) DEFAULT 0,
  own_goals INTEGER DEFAULT 0,

  -- GK
  saves INTEGER DEFAULT 0,
  penalties_saved INTEGER DEFAULT 0,

  -- Discipline
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  penalties_missed INTEGER DEFAULT 0,

  -- Bonus
  bonus INTEGER DEFAULT 0,
  bps INTEGER DEFAULT 0,

  -- ICT
  influence DECIMAL(5,2) DEFAULT 0,
  creativity DECIMAL(5,2) DEFAULT 0,
  threat DECIMAL(5,2) DEFAULT 0,
  ict_index DECIMAL(5,2) DEFAULT 0,

  -- Price & Transfers (at that GW)
  value INTEGER,
  transfers_in INTEGER DEFAULT 0,
  transfers_out INTEGER DEFAULT 0,
  selected INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(player_id, gameweek)
);

-- Indexes for player_gameweek_stats table
CREATE INDEX IF NOT EXISTS idx_pgw_player ON player_gameweek_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_pgw_gameweek ON player_gameweek_stats(gameweek);
CREATE INDEX IF NOT EXISTS idx_pgw_player_gw ON player_gameweek_stats(player_id, gameweek);
