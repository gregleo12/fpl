/**
 * K-108: Single Source of Truth - Points Calculator
 *
 * Calculates FPL points based on player stats and position.
 * These calculations should EXACTLY match FPL's official scoring.
 *
 * FPL Scoring Rules (2024/25 Season):
 * https://fantasy.premierleague.com/help/rules
 */

export interface PlayerStats {
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  defensive_contribution: number;
}

export interface PointsBreakdown {
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  defensive_contribution: number;
}

export type Position = 1 | 2 | 3 | 4; // GK, DEF, MID, FWD

export interface CalculatedPoints {
  total: number;
  breakdown: PointsBreakdown;
}

/**
 * Calculate FPL points for a player based on their stats and position
 */
export function calculatePoints(
  stats: PlayerStats,
  position: Position
): CalculatedPoints {

  const breakdown: PointsBreakdown = {
    minutes: 0,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    goals_conceded: 0,
    own_goals: 0,
    penalties_saved: 0,
    penalties_missed: 0,
    yellow_cards: 0,
    red_cards: 0,
    saves: 0,
    bonus: 0,
    defensive_contribution: 0,
  };

  // 1. MINUTES PLAYED
  // 60+ minutes = 2 pts, 1-59 minutes = 1 pt, 0 minutes = 0 pts
  if (stats.minutes >= 60) {
    breakdown.minutes = 2;
  } else if (stats.minutes > 0) {
    breakdown.minutes = 1;
  }

  // 2. GOALS SCORED (position-based)
  const goalsPoints: Record<Position, number> = {
    1: 10,  // Goalkeeper
    2: 6,   // Defender
    3: 5,   // Midfielder
    4: 4,   // Forward
  };
  breakdown.goals_scored = stats.goals_scored * goalsPoints[position];

  // 3. ASSISTS (all positions)
  breakdown.assists = stats.assists * 3;

  // 4. CLEAN SHEETS (GK/DEF/MID only, requires 60+ minutes)
  // Forwards don't get clean sheet points
  if (stats.minutes >= 60 && stats.clean_sheets > 0) {
    const csPoints: Record<Position, number> = {
      1: 4,   // Goalkeeper
      2: 4,   // Defender
      3: 1,   // Midfielder
      4: 0,   // Forward (no CS points)
    };
    breakdown.clean_sheets = csPoints[position];
  }

  // 5. GOALS CONCEDED (GK/DEF only, per 2 goals)
  // Only goalkeepers and defenders lose points for goals conceded
  // NOTE: Applies regardless of minutes played (not just 60+)
  if (position === 1 || position === 2) {
    // -1 point for every 2 goals conceded
    breakdown.goals_conceded = -Math.floor(stats.goals_conceded / 2);
  }

  // 6. SAVES (GK only, per 3 saves)
  // Only goalkeepers get points for saves
  if (position === 1) {
    // +1 point for every 3 saves
    breakdown.saves = Math.floor(stats.saves / 3);
  }

  // 7. PENALTIES SAVED (all positions)
  breakdown.penalties_saved = stats.penalties_saved * 5;

  // 8. PENALTIES MISSED (all positions)
  breakdown.penalties_missed = stats.penalties_missed * -2;

  // 9. YELLOW CARDS (all positions)
  breakdown.yellow_cards = stats.yellow_cards * -1;

  // 10. RED CARDS (all positions)
  breakdown.red_cards = stats.red_cards * -3;

  // 11. OWN GOALS (all positions)
  breakdown.own_goals = stats.own_goals * -2;

  // 12. BONUS POINTS (all positions)
  // Bonus is awarded after the match based on BPS (Bonus Points System)
  // During live games, this will be 0 (we calculate provisional bonus separately)
  // After game finishes, this will be 0, 1, 2, or 3
  breakdown.bonus = stats.bonus;

  // 13. DEFENSIVE CONTRIBUTION (DEF/MID/FWD)
  // Official FPL stat - awards bonus points for defensive actions
  // DEF: 10+ DC = +2 pts (one-time bonus)
  // MID: 12+ DC = +2 pts (one-time bonus)
  // FWD: 12+ DC = +2 pts (one-time bonus)
  if (position === 2 && stats.defensive_contribution >= 10) {
    breakdown.defensive_contribution = 2;
  } else if (position === 3 && stats.defensive_contribution >= 12) {
    breakdown.defensive_contribution = 2;
  } else if (position === 4 && stats.defensive_contribution >= 12) {
    breakdown.defensive_contribution = 2;
  }

  // CALCULATE TOTAL
  const total = Object.values(breakdown).reduce((sum, pts) => sum + pts, 0);

  return { total, breakdown };
}

/**
 * Validate our calculated points against FPL's official total_points
 * Returns true if they match, false otherwise
 */
export function validatePoints(
  calculated: number,
  fplTotal: number
): { match: boolean; difference: number } {
  const match = calculated === fplTotal;
  const difference = calculated - fplTotal;

  return { match, difference };
}

/**
 * Get position label from element_type number
 */
export function getPositionLabel(elementType: Position): string {
  const labels: Record<Position, string> = {
    1: 'GKP',
    2: 'DEF',
    3: 'MID',
    4: 'FWD',
  };
  return labels[elementType] || 'Unknown';
}

/**
 * Check if a position gets clean sheet points
 */
export function positionGetsCleanSheet(position: Position): boolean {
  // GK, DEF, MID get clean sheet points
  // FWD does not
  return position === 1 || position === 2 || position === 3;
}

/**
 * Check if a position loses points for goals conceded
 */
export function positionLosesPointsForGoalsConceded(position: Position): boolean {
  // Only GK and DEF lose points for goals conceded
  return position === 1 || position === 2;
}

/**
 * Check if a position gets points for saves
 */
export function positionGetsSavePoints(position: Position): boolean {
  // Only GK gets points for saves
  return position === 1;
}

/**
 * K-108b: Provisional Bonus Points Calculation
 */

export interface PlayerLiveData {
  id: number;
  team: number;
  bps: number;
  minutes: number;
}

export interface BPSGroup {
  bps: number;
  players: PlayerLiveData[];
}

/**
 * Group players by their BPS value (for handling ties)
 */
function groupByBPS(players: PlayerLiveData[]): BPSGroup[] {
  const groups: BPSGroup[] = [];

  for (const player of players) {
    const existingGroup = groups.find(g => g.bps === player.bps);
    if (existingGroup) {
      existingGroup.players.push(player);
    } else {
      groups.push({ bps: player.bps, players: [player] });
    }
  }

  // Sort groups by BPS descending
  groups.sort((a, b) => b.bps - a.bps);

  return groups;
}

/**
 * Determine bonus points for a given position in ranking
 * Handles tiebreaker rules
 */
function getBonusForPosition(position: number): number {
  if (position === 1) {
    return 3; // 1st place gets 3
  } else if (position === 2) {
    return 2; // 2nd place gets 2
  } else if (position === 3) {
    return 1; // 3rd place gets 1
  }
  return 0; // 4th+ get nothing
}

/**
 * Calculate provisional bonus points for all fixtures
 *
 * Returns a map of player_id -> provisional_bonus
 *
 * Rules:
 * - Top 3 BPS in each fixture get bonus (3, 2, 1)
 * - Only players with minutes > 0 are eligible
 * - Ties are handled according to FPL rules
 *
 * @param includeFinished - If true, calculate for finished fixtures too (for testing)
 */
export function calculateProvisionalBonus(
  fixtures: Array<{ id: number; team_h: number; team_a: number; started: boolean; finished: boolean }>,
  allPlayers: PlayerLiveData[],
  includeFinished: boolean = false
): Map<number, number> {
  const bonusMap = new Map<number, number>();

  // Process each fixture
  for (const fixture of fixtures) {
    // Skip if not started
    if (!fixture.started) {
      continue;
    }

    // Skip finished fixtures unless testing
    if (fixture.finished && !includeFinished) {
      continue;
    }

    // Get players in this fixture who have played
    const fixturePlayers = allPlayers.filter(p =>
      (p.team === fixture.team_h || p.team === fixture.team_a) && p.minutes > 0
    );

    if (fixturePlayers.length === 0) {
      continue;
    }

    // Sort by BPS descending
    const sorted = fixturePlayers.sort((a, b) => b.bps - a.bps);

    // Group by BPS to handle ties
    const bpsGroups = groupByBPS(sorted);

    // Award bonus points
    let position = 1;

    for (const group of bpsGroups) {
      // Stop if we've gone past 3rd place
      if (position > 3) {
        break;
      }

      const bonusPoints = getBonusForPosition(position);

      // Award bonus to all players in this group
      for (const player of group.players) {
        bonusMap.set(player.id, bonusPoints);
      }

      // Move to next position
      position += group.players.length;
    }
  }

  return bonusMap;
}
