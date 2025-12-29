/**
 * K-144: Shared Data Validation Functions
 *
 * Used by:
 * - K-142 (runtime validation - should we use database or API?)
 * - K-144 (sync detection - which GWs need re-syncing?)
 *
 * Ensures consistent validation logic across the app.
 */

/**
 * Check if a gameweek has valid (non-zero) player stats
 * Used by both K-142 (runtime validation) and K-144 (sync detection)
 */
export async function hasValidPlayerStats(
  db: any,
  gameweek: number
): Promise<boolean> {
  const result = await db.query(`
    SELECT COUNT(*) as row_count,
           SUM(COALESCE(calculated_points, 0)) as total_points
    FROM player_gameweek_stats
    WHERE gameweek = $1
  `, [gameweek]);

  const row = result.rows[0];
  const rowCount = parseInt(row?.row_count || '0');
  const totalPoints = parseFloat(row?.total_points || '0');

  // Valid = has rows AND has non-zero total points
  return rowCount > 0 && totalPoints > 0;
}

/**
 * Check if a gameweek has valid (non-zero) manager history for a league
 */
export async function hasValidManagerHistory(
  db: any,
  leagueId: number,
  gameweek: number
): Promise<boolean> {
  const result = await db.query(`
    SELECT COUNT(*) as row_count,
           SUM(COALESCE(points, 0)) as total_points
    FROM manager_gw_history
    WHERE league_id = $1 AND event = $2
  `, [leagueId, gameweek]);

  const row = result.rows[0];
  const rowCount = parseInt(row?.row_count || '0');
  const totalPoints = parseFloat(row?.total_points || '0');

  // Valid = has rows AND has non-zero total points
  return rowCount > 0 && totalPoints > 0;
}

/**
 * Check if a gameweek has valid (non-zero) manager history for a specific team
 */
export async function hasValidTeamHistory(
  db: any,
  entryId: number,
  gameweek: number
): Promise<boolean> {
  const result = await db.query(`
    SELECT COUNT(*) as count,
           SUM(COALESCE(points, 0)) as total_points
    FROM manager_gw_history
    WHERE entry_id = $1 AND event = $2
  `, [entryId, gameweek]);

  const row = result.rows[0];
  const count = parseInt(row?.count || '0');
  const totalPoints = parseFloat(row?.total_points || '0');

  // Valid = has row AND has non-zero points
  return count > 0 && totalPoints > 0;
}

/**
 * Get detailed validation info for a gameweek (useful for logging)
 */
export async function getValidationDetails(
  db: any,
  gameweek: number,
  leagueId?: number
): Promise<{
  playerStats: { rowCount: number; totalPoints: number; valid: boolean };
  managerHistory?: { rowCount: number; totalPoints: number; valid: boolean };
}> {
  // Check player stats
  const playerResult = await db.query(`
    SELECT COUNT(*) as row_count,
           SUM(COALESCE(calculated_points, 0)) as total_points
    FROM player_gameweek_stats
    WHERE gameweek = $1
  `, [gameweek]);

  const playerRow = playerResult.rows[0];
  const playerRowCount = parseInt(playerRow?.row_count || '0');
  const playerTotalPoints = parseFloat(playerRow?.total_points || '0');

  const result: any = {
    playerStats: {
      rowCount: playerRowCount,
      totalPoints: playerTotalPoints,
      valid: playerRowCount > 0 && playerTotalPoints > 0
    }
  };

  // Check manager history if league ID provided
  if (leagueId !== undefined) {
    const managerResult = await db.query(`
      SELECT COUNT(*) as row_count,
             SUM(COALESCE(points, 0)) as total_points
      FROM manager_gw_history
      WHERE league_id = $1 AND event = $2
    `, [leagueId, gameweek]);

    const managerRow = managerResult.rows[0];
    const managerRowCount = parseInt(managerRow?.row_count || '0');
    const managerTotalPoints = parseFloat(managerRow?.total_points || '0');

    result.managerHistory = {
      rowCount: managerRowCount,
      totalPoints: managerTotalPoints,
      valid: managerRowCount > 0 && managerTotalPoints > 0
    };
  }

  return result;
}
