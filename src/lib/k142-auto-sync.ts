/**
 * K-142: Auto-Sync Completed GW to Database
 *
 * Automatically syncs completed gameweek data from FPL API to database
 * after a 10-hour safety buffer to ensure FPL has finalized all data.
 */

import { getDatabase } from '@/lib/db';

const SYNC_BUFFER_HOURS = 10;

/**
 * Get the timestamp when a gameweek finished
 * Uses last fixture kickoff + 2.5 hours (match duration + buffer)
 */
export async function getGWFinishTime(gw: number): Promise<number> {
  try {
    const fixturesResponse = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`);
    if (!fixturesResponse.ok) {
      console.error(`[K-142] Failed to fetch fixtures for GW${gw}`);
      return Date.now(); // Return now to fail the buffer check
    }

    const fixtures = await fixturesResponse.json();

    // Check if all fixtures have finished
    const allFinished = fixtures.every((f: any) => f.finished);
    if (!allFinished) {
      console.log(`[K-142] GW${gw} has unfinished fixtures, not ready for sync`);
      return Date.now(); // Return now to fail the buffer check
    }

    // Find the last fixture's kickoff time
    const kickoffTimes = fixtures
      .map((f: any) => new Date(f.kickoff_time).getTime())
      .filter((time: number) => !isNaN(time));

    if (kickoffTimes.length === 0) {
      console.error(`[K-142] No valid kickoff times for GW${gw}`);
      return Date.now();
    }

    const lastKickoff = Math.max(...kickoffTimes);

    // Add 2.5 hours for match duration + buffer
    const finishTime = lastKickoff + (2.5 * 60 * 60 * 1000);

    return finishTime;
  } catch (error) {
    console.error(`[K-142] Error getting GW${gw} finish time:`, error);
    return Date.now();
  }
}

/**
 * K-142b: Check if database has VALID data for a manager's gameweek (any league)
 * Used by team-specific routes that don't have league context
 * Valid = has manager data with non-zero points AND player stats exist
 */
export async function checkDatabaseHasTeamGWData(entryId: number, gw: number): Promise<boolean> {
  try {
    const db = await getDatabase();

    // First check if manager_gw_history has VALID data (non-zero points)
    const managerResult = await db.query(`
      SELECT COUNT(*) as count, SUM(points) as total_points
      FROM manager_gw_history
      WHERE entry_id = $1 AND event = $2
    `, [entryId, gw]);

    const managerRows = parseInt(managerResult.rows[0]?.count || '0');
    const managerPoints = parseFloat(managerResult.rows[0]?.total_points || '0');

    if (managerRows === 0 || managerPoints === 0) {
      console.log(`[K-142b] checkDatabaseHasTeamGWData: entry=${entryId}, gw=${gw}, managerRows=${managerRows}, managerPoints=${managerPoints}, valid=false (no valid manager data)`);
      return false;
    }

    // Also check if player_gameweek_stats has any non-zero points for this GW
    // This ensures we're not using stale player data
    const playerStatsResult = await db.query(`
      SELECT SUM(total_points) as total_points
      FROM player_gameweek_stats
      WHERE gameweek = $1
    `, [gw]);

    const playerTotalPoints = parseFloat(playerStatsResult.rows[0]?.total_points || '0');
    const isValid = playerTotalPoints > 0;

    console.log(`[K-142b] checkDatabaseHasTeamGWData: entry=${entryId}, gw=${gw}, managerRows=${managerRows}, managerPoints=${managerPoints}, playerPoints=${playerTotalPoints}, valid=${isValid}`);

    return isValid;
  } catch (error) {
    console.error(`[K-142b] Error checking team ${entryId} database for GW${gw}:`, error);
    return false;
  }
}

/**
 * K-142c: Check if database has VALID data for a gameweek
 * Valid = manager data has non-zero points AND player stats have non-zero points
 *
 * CRITICAL: Fixtures endpoint uses K-108c which needs BOTH:
 * - manager_gw_history (for picks, chips, transfer costs)
 * - player_gameweek_stats (for player points)
 *
 * If manager data exists but player stats are zeros, K-108c will calculate 0 pts for all teams.
 */
export async function checkDatabaseHasGWData(leagueId: number, gw: number): Promise<boolean> {
  try {
    const db = await getDatabase();

    // Check if manager_gw_history has VALID data (non-zero points) for this GW
    const managerResult = await db.query(`
      SELECT
        COUNT(*) as total_rows,
        SUM(points) as total_points
      FROM manager_gw_history
      WHERE league_id = $1 AND event = $2
    `, [leagueId, gw]);

    const managerRows = parseInt(managerResult.rows[0]?.total_rows || '0');
    const managerPoints = parseFloat(managerResult.rows[0]?.total_points || '0');

    if (managerRows === 0 || managerPoints === 0) {
      console.log(`[K-142c] checkDatabaseHasGWData: league=${leagueId}, gw=${gw}, managerRows=${managerRows}, managerPoints=${managerPoints}, valid=false (no valid manager data)`);
      return false;
    }

    // K-142c: ALSO check if player_gameweek_stats has any non-zero points for this GW
    // This is CRITICAL because K-108c (used by fixtures) relies on player stats
    const playerStatsResult = await db.query(`
      SELECT SUM(total_points) as total_points
      FROM player_gameweek_stats
      WHERE gameweek = $1
    `, [gw]);

    const playerTotalPoints = parseFloat(playerStatsResult.rows[0]?.total_points || '0');
    const isValid = playerTotalPoints > 0;

    console.log(`[K-142c] checkDatabaseHasGWData: league=${leagueId}, gw=${gw}, managerRows=${managerRows}, managerPoints=${managerPoints}, playerPoints=${playerTotalPoints}, valid=${isValid}`);

    return isValid;
  } catch (error) {
    console.error(`[K-142c] Error checking database for GW${gw}:`, error);
    return false;
  }
}

/**
 * Sync a completed gameweek to database
 * Calls existing sync functions for all K-27 tables
 */
export async function syncCompletedGW(leagueId: number, gw: number): Promise<void> {
  console.log(`[K-142] ===== Starting GW${gw} sync for league ${leagueId} =====`);

  try {
    const db = await getDatabase();

    // Get league managers
    const managersResult = await db.query(`
      SELECT DISTINCT m.entry_id, m.player_name, m.team_name
      FROM managers m
      JOIN league_standings ls ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
      ORDER BY m.entry_id
    `, [leagueId]);

    const managers = managersResult.rows;
    console.log(`[K-142] Found ${managers.length} managers in league ${leagueId}`);

    if (managers.length === 0) {
      console.log(`[K-142] No managers found, aborting sync`);
      return;
    }

    // Fetch bootstrap data for player info
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!bootstrapResponse.ok) {
      throw new Error('Failed to fetch bootstrap data');
    }
    const bootstrap = await bootstrapResponse.json();

    // 1. Sync manager GW history (points, transfers, rank)
    console.log(`[K-142] Syncing manager GW history...`);
    for (const manager of managers) {
      try {
        const historyResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${manager.entry_id}/history/`);
        if (!historyResponse.ok) continue;

        const historyData = await historyResponse.json();
        const gwHistory = historyData.current?.find((h: any) => h.event === gw);

        if (gwHistory) {
          await db.query(`
            INSERT INTO manager_gw_history (
              league_id, entry_id, event, points, total_points, rank, bank,
              value, event_transfers, event_transfers_cost, points_on_bench
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (league_id, entry_id, event) DO UPDATE SET
              points = EXCLUDED.points,
              total_points = EXCLUDED.total_points,
              rank = EXCLUDED.rank,
              bank = EXCLUDED.bank,
              value = EXCLUDED.value,
              event_transfers = EXCLUDED.event_transfers,
              event_transfers_cost = EXCLUDED.event_transfers_cost,
              points_on_bench = EXCLUDED.points_on_bench
          `, [
            leagueId, manager.entry_id, gw,
            gwHistory.points, gwHistory.total_points, gwHistory.rank, gwHistory.bank,
            gwHistory.value, gwHistory.event_transfers, gwHistory.event_transfers_cost,
            gwHistory.points_on_bench
          ]);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[K-142] Error syncing history for manager ${manager.entry_id}:`, error);
      }
    }

    // 2. Sync manager picks
    console.log(`[K-142] Syncing manager picks...`);
    for (const manager of managers) {
      try {
        const picksResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${gw}/picks/`);
        if (!picksResponse.ok) continue;

        const picksData = await picksResponse.json();

        for (const pick of picksData.picks || []) {
          await db.query(`
            INSERT INTO manager_picks (
              league_id, entry_id, event, player_id, position,
              multiplier, is_captain, is_vice_captain
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (league_id, entry_id, event, player_id) DO UPDATE SET
              position = EXCLUDED.position,
              multiplier = EXCLUDED.multiplier,
              is_captain = EXCLUDED.is_captain,
              is_vice_captain = EXCLUDED.is_vice_captain
          `, [
            leagueId, manager.entry_id, gw, pick.element, pick.position,
            pick.multiplier, pick.is_captain, pick.is_vice_captain
          ]);
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[K-142] Error syncing picks for manager ${manager.entry_id}:`, error);
      }
    }

    // 3. Sync manager chips
    console.log(`[K-142] Syncing manager chips...`);
    for (const manager of managers) {
      try {
        const picksResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${gw}/picks/`);
        if (!picksResponse.ok) continue;

        const picksData = await picksResponse.json();

        if (picksData.active_chip) {
          await db.query(`
            INSERT INTO manager_chips (league_id, entry_id, event, chip_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (league_id, entry_id, event) DO UPDATE SET
              chip_name = EXCLUDED.chip_name
          `, [leagueId, manager.entry_id, gw, picksData.active_chip]);
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`[K-142] Error syncing chips for manager ${manager.entry_id}:`, error);
      }
    }

    // 4. Sync transfers
    console.log(`[K-142] Syncing manager transfers...`);
    for (const manager of managers) {
      try {
        const transfersResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${manager.entry_id}/transfers/`);
        if (!transfersResponse.ok) continue;

        const transfers = await transfersResponse.json();
        const gwTransfers = transfers.filter((t: any) => t.event === gw);

        for (const transfer of gwTransfers) {
          await db.query(`
            INSERT INTO manager_transfers (
              league_id, entry_id, event, time, element_in, element_in_cost,
              element_out, element_out_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (league_id, entry_id, event, element_in, element_out) DO UPDATE SET
              time = EXCLUDED.time,
              element_in_cost = EXCLUDED.element_in_cost,
              element_out_cost = EXCLUDED.element_out_cost
          `, [
            leagueId, manager.entry_id, transfer.event, transfer.time,
            transfer.element_in, transfer.element_in_cost,
            transfer.element_out, transfer.element_out_cost
          ]);
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`[K-142] Error syncing transfers for manager ${manager.entry_id}:`, error);
      }
    }

    console.log(`[K-142] ===== Successfully synced GW${gw} for league ${leagueId} =====`);

  } catch (error) {
    console.error(`[K-142] Error syncing GW${gw}:`, error);
    throw error;
  }
}

/**
 * Main orchestrator: Check if a completed GW needs syncing and trigger if needed
 * Called on league load - runs in background, non-blocking
 */
export async function checkAndSyncCompletedGW(leagueId: number): Promise<void> {
  try {
    console.log(`[K-142] Checking for completed GW sync need for league ${leagueId}...`);

    // 1. Get current GW status from FPL API
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!bootstrapResponse.ok) {
      console.error('[K-142] Failed to fetch bootstrap data');
      return;
    }

    const data = await bootstrapResponse.json();

    // 2. Find the most recent finished GW
    const finishedGWs = data.events
      .filter((e: any) => e.finished)
      .sort((a: any, b: any) => b.id - a.id);

    if (finishedGWs.length === 0) {
      console.log('[K-142] No finished GWs yet');
      return;
    }

    const latestFinishedGW = finishedGWs[0];
    console.log(`[K-142] Latest finished GW: ${latestFinishedGW.id}`);

    // 3. Check if 10+ hours have passed since GW finished
    const gwFinishTime = await getGWFinishTime(latestFinishedGW.id);
    const hoursSinceFinished = (Date.now() - gwFinishTime) / (1000 * 60 * 60);

    if (hoursSinceFinished < SYNC_BUFFER_HOURS) {
      console.log(`[K-142] GW${latestFinishedGW.id} finished ${hoursSinceFinished.toFixed(1)}h ago, waiting for ${SYNC_BUFFER_HOURS}h buffer`);
      return;
    }

    console.log(`[K-142] GW${latestFinishedGW.id} finished ${hoursSinceFinished.toFixed(1)}h ago (>${SYNC_BUFFER_HOURS}h), checking database...`);

    // 4. Check if database has valid data for this GW
    const hasValidData = await checkDatabaseHasGWData(leagueId, latestFinishedGW.id);

    if (hasValidData) {
      console.log(`[K-142] GW${latestFinishedGW.id} already synced to database ✓`);
      return;
    }

    // 5. Sync the completed GW
    console.log(`[K-142] Triggering sync for GW${latestFinishedGW.id} (${hoursSinceFinished.toFixed(1)}h since completion)`);
    await syncCompletedGW(leagueId, latestFinishedGW.id);

  } catch (error) {
    console.error('[K-142] Auto-sync error:', error);
    // Don't throw - this is a background operation, shouldn't break the page
  }
}
