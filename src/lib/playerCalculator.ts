/**
 * K-110: Player Season Stats - Single Source of Truth
 *
 * Calculates accurate player season stats by summing ALL columns from
 * player_gameweek_stats instead of relying on stale FPL API bootstrap
 * cumulative totals (24-48h delay).
 *
 * Created: December 23, 2025
 * Extended: December 23, 2025 (v3.7.3 - All stats, not just points)
 */

import { getDatabase } from './db';

export interface PlayerSeasonStats {
  player_id: number;
  total_points: number;
  goals: number;
  assists: number;
  minutes: number;
  bonus: number;
  bps: number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
  yellow_cards: number;
  red_cards: number;
  own_goals: number;
  penalties_missed: number;
  penalties_saved: number;
  starts: number;
  full_appearances: number;
}

/**
 * Calculate ALL season stats for a single player through a specific gameweek
 *
 * @param playerId - Player ID
 * @param throughGameweek - Calculate stats up to and including this GW
 * @returns Complete season stats (from K-108 player_gameweek_stats)
 */
export async function calculatePlayerSeasonStats(
  playerId: number,
  throughGameweek: number
): Promise<PlayerSeasonStats> {
  const db = await getDatabase();

  console.log(`[K-110] Calculating season stats for player ${playerId} through GW${throughGameweek}`);

  const result = await db.query(`
    SELECT
      player_id,
      COALESCE(SUM(calculated_points), 0) as total_points,
      COALESCE(SUM(goals_scored), 0) as goals,
      COALESCE(SUM(assists), 0) as assists,
      COALESCE(SUM(minutes), 0) as minutes,
      COALESCE(SUM(bonus), 0) as bonus,
      COALESCE(SUM(bps), 0) as bps,
      COALESCE(SUM(clean_sheets), 0) as clean_sheets,
      COALESCE(SUM(goals_conceded), 0) as goals_conceded,
      COALESCE(SUM(saves), 0) as saves,
      COALESCE(SUM(yellow_cards), 0) as yellow_cards,
      COALESCE(SUM(red_cards), 0) as red_cards,
      COALESCE(SUM(own_goals), 0) as own_goals,
      COALESCE(SUM(penalties_missed), 0) as penalties_missed,
      COALESCE(SUM(penalties_saved), 0) as penalties_saved,
      COUNT(CASE WHEN minutes > 0 THEN 1 END) as starts,
      COUNT(CASE WHEN minutes >= 60 THEN 1 END) as full_appearances
    FROM player_gameweek_stats
    WHERE player_id = $1 AND gameweek <= $2
    GROUP BY player_id
  `, [playerId, throughGameweek]);

  if (result.rows.length === 0) {
    console.log(`[K-110] No stats found for player ${playerId}, returning zeros`);
    return {
      player_id: playerId,
      total_points: 0, goals: 0, assists: 0, minutes: 0,
      bonus: 0, bps: 0, clean_sheets: 0, goals_conceded: 0,
      saves: 0, yellow_cards: 0, red_cards: 0, own_goals: 0,
      penalties_missed: 0, penalties_saved: 0, starts: 0, full_appearances: 0
    };
  }

  const stats = result.rows[0];
  console.log(`[K-110] Player ${playerId}: ${stats.total_points} pts, ${stats.goals} goals, ${stats.assists} assists, ${stats.starts} starts`);

  return stats;
}

/**
 * Calculate ALL season stats for ALL players (batch query for efficiency)
 * Used by Players Tab to show accurate stats for all 760 players
 *
 * @param throughGameweek - Calculate stats up to and including this GW
 * @returns Map of player_id -> PlayerSeasonStats
 */
export async function calculateAllPlayerSeasonStats(
  throughGameweek: number
): Promise<Map<number, PlayerSeasonStats>> {
  const db = await getDatabase();

  console.log(`[K-110] Calculating season stats for all players through GW${throughGameweek}`);

  const startTime = Date.now();

  const result = await db.query(`
    SELECT
      player_id,
      COALESCE(SUM(calculated_points), 0) as total_points,
      COALESCE(SUM(goals_scored), 0) as goals,
      COALESCE(SUM(assists), 0) as assists,
      COALESCE(SUM(minutes), 0) as minutes,
      COALESCE(SUM(bonus), 0) as bonus,
      COALESCE(SUM(bps), 0) as bps,
      COALESCE(SUM(clean_sheets), 0) as clean_sheets,
      COALESCE(SUM(goals_conceded), 0) as goals_conceded,
      COALESCE(SUM(saves), 0) as saves,
      COALESCE(SUM(yellow_cards), 0) as yellow_cards,
      COALESCE(SUM(red_cards), 0) as red_cards,
      COALESCE(SUM(own_goals), 0) as own_goals,
      COALESCE(SUM(penalties_missed), 0) as penalties_missed,
      COALESCE(SUM(penalties_saved), 0) as penalties_saved,
      COUNT(CASE WHEN minutes > 0 THEN 1 END) as starts,
      COUNT(CASE WHEN minutes >= 60 THEN 1 END) as full_appearances
    FROM player_gameweek_stats
    WHERE gameweek <= $1
    GROUP BY player_id
  `, [throughGameweek]);

  const stats = new Map<number, PlayerSeasonStats>();
  for (const row of result.rows) {
    stats.set(row.player_id, row);
  }

  const duration = Date.now() - startTime;
  console.log(`[K-110] Calculated season stats for ${stats.size} players in ${duration}ms`);

  return stats;
}

/**
 * Get current gameweek (helper function)
 * Fetches from FPL API to determine which GW to calculate through
 *
 * @returns Current gameweek number
 */
export async function getCurrentGameweek(): Promise<number> {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');

    if (!response.ok) {
      console.error('[K-110] Failed to fetch bootstrap data, defaulting to GW17');
      return 17; // Safe fallback
    }

    const data = await response.json();
    const events = data.events || [];

    // Find current or most recent started gameweek
    const currentEvent = events.find((e: any) => e.is_current) ||
                        events.filter((e: any) => e.finished).pop() ||
                        events[0];

    const gw = currentEvent?.id || 17;
    console.log(`[K-110] Current gameweek: GW${gw}`);

    return gw;
  } catch (error) {
    console.error('[K-110] Error fetching current GW:', error);
    return 17; // Safe fallback
  }
}
