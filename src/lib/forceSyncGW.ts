/**
 * K-146: Force Sync GW
 *
 * Manual sync logic for admin panel to sync specific gameweeks for specific leagues.
 * Reuses K-142's syncCompletedGW function for the actual sync work.
 * K-146b: Added post-sync validation to ensure data is actually valid
 */

import { syncCompletedGW } from '@/lib/k142-auto-sync';
import { getDatabase } from '@/lib/db';
import { hasValidManagerHistory, hasValidPlayerStats } from '@/lib/dataValidation';

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

  // K-146c: Get fresh database connection for validation
  // syncCompletedGW uses its own connection, so we need a fresh one to see committed data
  console.log(`[K-146c] Getting fresh database connection for validation...`);
  const freshDb = await getDatabase();

  // Step 4: Get player stats count (global, not per-league)
  const playersResult = await freshDb.query(
    'SELECT COUNT(*) as count FROM player_gameweek_stats WHERE gameweek = $1',
    [gameweek]
  );

  const playersCount = parseInt(playersResult.rows[0]?.count || '0');

  // K-146b/K-146c: VERIFY sync actually worked by running validation with detailed logging
  console.log(`[K-146b] Verifying sync results...`);

  // K-146c: Check actual row counts and point totals for debugging
  const managerCheck = await freshDb.query(`
    SELECT COUNT(*) as row_count, SUM(COALESCE(points, 0)) as total_points
    FROM manager_gw_history
    WHERE league_id = $1 AND event = $2
  `, [leagueId, gameweek]);

  const playerCheck = await freshDb.query(`
    SELECT COUNT(*) as row_count, SUM(COALESCE(calculated_points, 0)) as total_points
    FROM player_gameweek_stats
    WHERE gameweek = $1
  `, [gameweek]);

  console.log(`[K-146c] Manager data: ${managerCheck.rows[0]?.row_count || 0} rows, ${managerCheck.rows[0]?.total_points || 0} total points`);
  console.log(`[K-146c] Player data: ${playerCheck.rows[0]?.row_count || 0} rows, ${playerCheck.rows[0]?.total_points || 0} total points`);

  const hasManagers = await hasValidManagerHistory(freshDb, leagueId, gameweek);
  const hasPlayers = await hasValidPlayerStats(freshDb, gameweek);

  if (!hasManagers) {
    console.error(`[K-146b] ✗ Validation failed: manager_gw_history has invalid/zero data`);
    console.error(`[K-146c] Debug: Rows=${managerCheck.rows[0]?.row_count}, Points=${managerCheck.rows[0]?.total_points}`);
    throw new Error(`Sync completed but validation failed: manager data is invalid or missing`);
  }

  if (!hasPlayers) {
    console.error(`[K-146b] ✗ Validation failed: player_gameweek_stats has invalid/zero calculated_points`);
    console.error(`[K-146c] Debug: Rows=${playerCheck.rows[0]?.row_count}, Points=${playerCheck.rows[0]?.total_points}`);
    throw new Error(`Sync completed but validation failed: player stats data is invalid or missing`);
  }

  console.log(`[K-146b] ✓ Validation passed: data is valid`);
  console.log(`[K-146] Force sync complete: ${managersCount} managers, ${playersCount} players`);

  return {
    managersCount,
    playersCount
  };
}
