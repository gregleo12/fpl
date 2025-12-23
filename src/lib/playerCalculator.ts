/**
 * K-110: Player Season Totals - Single Source of Truth
 *
 * Calculates accurate player season totals by summing K-108 calculated_points
 * instead of relying on stale FPL API bootstrap totals (24-48h delay).
 *
 * Created: December 23, 2025
 */

import { getDatabase } from './db';

export interface PlayerSeasonStats {
  player_id: number;
  season_total: number;
  games_played: number;
}

/**
 * Calculate season total for a single player through a specific gameweek
 *
 * @param playerId - Player ID
 * @param throughGameweek - Calculate total up to and including this GW
 * @returns Season total points (from K-108 calculated_points)
 */
export async function calculatePlayerSeasonTotal(
  playerId: number,
  throughGameweek: number
): Promise<number> {
  const db = await getDatabase();

  console.log(`[K-110] Calculating season total for player ${playerId} through GW${throughGameweek}`);

  const result = await db.query(`
    SELECT COALESCE(SUM(calculated_points), 0) as season_total
    FROM player_gameweek_stats
    WHERE player_id = $1 AND gameweek <= $2
  `, [playerId, throughGameweek]);

  const total = result.rows[0]?.season_total || 0;
  console.log(`[K-110] Player ${playerId} season total: ${total} points`);

  return total;
}

/**
 * Calculate season totals for ALL players (batch query for efficiency)
 * Used by Players Tab to show accurate totals for all 760 players
 *
 * @param throughGameweek - Calculate totals up to and including this GW
 * @returns Map of player_id -> season_total
 */
export async function calculateAllPlayerSeasonTotals(
  throughGameweek: number
): Promise<Map<number, number>> {
  const db = await getDatabase();

  console.log(`[K-110] Calculating season totals for all players through GW${throughGameweek}`);

  const startTime = Date.now();

  const result = await db.query(`
    SELECT player_id, COALESCE(SUM(calculated_points), 0) as season_total
    FROM player_gameweek_stats
    WHERE gameweek <= $1
    GROUP BY player_id
  `, [throughGameweek]);

  const totals = new Map<number, number>();
  for (const row of result.rows) {
    totals.set(row.player_id, row.season_total);
  }

  const duration = Date.now() - startTime;
  console.log(`[K-110] Calculated ${totals.size} player season totals in ${duration}ms`);

  return totals;
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
