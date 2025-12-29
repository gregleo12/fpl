/**
 * K-146: Force Sync GW
 *
 * Manual sync logic for admin panel to sync specific gameweeks for specific leagues.
 * K-146d: Simplified to use the exact same sync path as regular force sync (which works perfectly).
 * Just calls syncCompletedGW() which is proven working across 129 leagues.
 */

import { syncCompletedGW } from '@/lib/k142-auto-sync';
import { getDatabase } from '@/lib/db';

interface SyncResult {
  managersCount: number;
  playersCount: number;
}

/**
 * Force sync a gameweek for a specific league
 * K-146d: Uses the proven working sync path (same as Settings force sync)
 */
export async function syncGameweekForLeague(
  leagueId: number,
  gameweek: number
): Promise<SyncResult> {
  console.log(`[K-146d] Force sync GW${gameweek} for league ${leagueId} using proven sync path...`);

  const db = await getDatabase();

  // Step 1: Get manager count (for reporting)
  const managersResult = await db.query(`
    SELECT COUNT(DISTINCT m.entry_id) as count
    FROM managers m
    JOIN league_standings ls ON ls.entry_id = m.entry_id
    WHERE ls.league_id = $1
  `, [leagueId]);

  const managersCount = parseInt(managersResult.rows[0]?.count || '0');

  // Step 2: Clear existing data (force clean slate for manual sync)
  console.log(`[K-146d] Clearing existing data for league ${leagueId} GW${gameweek}...`);

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

  // Step 3: Call the proven working sync function
  // This is the exact same function used by:
  // - K-148 auto-sync (proven working)
  // - Settings force sync (just confirmed working)
  // - First-time league setup
  console.log(`[K-146d] Calling syncCompletedGW (proven working sync path)...`);
  await syncCompletedGW(leagueId, gameweek);

  // Step 4: Get player stats count (for reporting)
  const playersResult = await db.query(
    'SELECT COUNT(*) as count FROM player_gameweek_stats WHERE gameweek = $1',
    [gameweek]
  );

  const playersCount = parseInt(playersResult.rows[0]?.count || '0');

  console.log(`[K-146d] ✓ Sync complete: ${managersCount} managers, ${playersCount} players`);

  return {
    managersCount,
    playersCount
  };
}
