/**
 * K-146: Force Sync GW
 *
 * Manual sync logic for admin panel to sync specific gameweeks for specific leagues.
 * Reuses K-142's syncCompletedGW function for the actual sync work.
 */

import { syncCompletedGW } from '@/lib/k142-auto-sync';
import { getDatabase } from '@/lib/db';

interface SyncResult {
  managersCount: number;
  playersCount: number;
}

/**
 * Force sync a gameweek for a specific league
 * Deletes existing data and re-fetches from FPL API
 */
export async function syncGameweekForLeague(
  leagueId: number,
  gameweek: number
): Promise<SyncResult> {
  console.log(`[K-146] Force sync GW${gameweek} for league ${leagueId}...`);

  const db = await getDatabase();

  // Step 1: Get manager count before sync (for reporting)
  const managersResult = await db.query(`
    SELECT COUNT(DISTINCT m.entry_id) as count
    FROM managers m
    JOIN league_standings ls ON ls.entry_id = m.entry_id
    WHERE ls.league_id = $1
  `, [leagueId]);

  const managersCount = parseInt(managersResult.rows[0]?.count || '0');

  // Step 2: Clear existing data for this league+GW (force clean slate)
  console.log(`[K-146] Clearing existing data for league ${leagueId} GW${gameweek}...`);

  await db.query(
    'DELETE FROM manager_gw_history WHERE league_id = $1 AND event = $2',
    [leagueId, gameweek]
  );

  await db.query(
    'DELETE FROM manager_picks WHERE league_id = $1 AND event = $2',
    [leagueId, gameweek]
  );

  await db.query(
    'DELETE FROM manager_chips WHERE league_id = $1 AND event = $2',
    [leagueId, gameweek]
  );

  // Step 3: Use K-142's sync function to fetch fresh data
  console.log(`[K-146] Fetching fresh data from FPL API...`);
  await syncCompletedGW(leagueId, gameweek);

  // Step 4: Get player stats count (global, not per-league)
  const playersResult = await db.query(
    'SELECT COUNT(*) as count FROM player_gameweek_stats WHERE gameweek = $1',
    [gameweek]
  );

  const playersCount = parseInt(playersResult.rows[0]?.count || '0');

  console.log(`[K-146] Force sync complete: ${managersCount} managers, ${playersCount} players`);

  return {
    managersCount,
    playersCount
  };
}
