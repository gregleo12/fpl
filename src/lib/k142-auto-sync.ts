/**
 * K-142: Auto-Sync Completed GW to Database
 *
 * Automatically syncs completed gameweek data from FPL API to database
 * after a 10-hour safety buffer to ensure FPL has finalized all data.
 *
 * K-144: Now uses shared validation functions from dataValidation.ts for DRY principle.
 */

import { getDatabase } from '@/lib/db';
import { hasValidPlayerStats, hasValidTeamHistory, hasValidManagerHistory } from '@/lib/dataValidation';
import { syncK108PlayerStats } from '@/lib/leagueSync';

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

    // K-144: Use shared validation functions
    const hasTeam = await hasValidTeamHistory(db, entryId, gw);
    const hasPlayers = await hasValidPlayerStats(db, gw);

    const isValid = hasTeam && hasPlayers;

    console.log(`[K-142b/K-144] checkDatabaseHasTeamGWData: entry=${entryId}, gw=${gw}, team=${hasTeam}, players=${hasPlayers}, valid=${isValid}`);

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

    // K-144: Use shared validation functions
    const hasManagers = await hasValidManagerHistory(db, leagueId, gw);
    const hasPlayers = await hasValidPlayerStats(db, gw);

    const isValid = hasManagers && hasPlayers;

    console.log(`[K-142c/K-144] checkDatabaseHasGWData: league=${leagueId}, gw=${gw}, managers=${hasManagers}, players=${hasPlayers}, valid=${isValid}`);

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

    // K-146b: Sync player gameweek stats with calculated_points
    // This is required for validation to pass (hasValidPlayerStats checks calculated_points)
    console.log(`[K-142/K-146b] Syncing player gameweek stats with K-108 calculated_points...`);
    try {
      const result = await syncK108PlayerStats(db, [gw], bootstrap);
      console.log(`[K-142/K-146b] Player stats sync complete: ${result.synced} players, ${result.errors} errors`);
    } catch (error) {
      console.error(`[K-142/K-146b] Error syncing player stats:`, error);
      // Don't throw - manager data is already synced, player stats can be retried
    }

    console.log(`[K-142] ===== Successfully synced GW${gw} for league ${leagueId} =====`);

  } catch (error) {
    console.error(`[K-142] Error syncing GW${gw}:`, error);
    throw error;
  }
}

/**
 * K-145: Helper function to check if safety buffer has passed for a GW
 * Returns true if enough time has passed since GW finished (10+ hours)
 */
async function checkSafetyBuffer(gw: number): Promise<{ passed: boolean; hoursSinceFinished: number }> {
  const gwFinishTime = await getGWFinishTime(gw);
  const hoursSinceFinished = (Date.now() - gwFinishTime) / (1000 * 60 * 60);
  const passed = hoursSinceFinished >= SYNC_BUFFER_HOURS;

  return { passed, hoursSinceFinished };
}

/**
 * Main orchestrator: Check if a completed GW needs syncing and trigger if needed
 * K-148: Smart validation - checks latest 2 GWs only, scans backwards only if invalid found
 * Called on league load - runs in background, non-blocking
 */
export async function checkAndSyncCompletedGW(leagueId: number): Promise<void> {
  try {
    console.log(`[K-148] Smart validation for league ${leagueId}...`);

    // 1. Get current GW status from FPL API
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!bootstrapResponse.ok) {
      console.error('[K-148] Failed to fetch bootstrap data');
      return;
    }

    const data = await bootstrapResponse.json();

    // 2. Find ALL finished GWs
    const finishedGWs = data.events
      .filter((e: any) => e.finished)
      .sort((a: any, b: any) => a.id - b.id); // Oldest first

    if (finishedGWs.length === 0) {
      console.log('[K-148] No finished GWs yet');
      return;
    }

    console.log(`[K-148] Total finished GWs: ${finishedGWs.length}`);

    // 3. K-148: Smart validation - check latest 2 GWs first
    const latestTwo = finishedGWs.slice(-2); // Get last 2 GWs
    console.log(`[K-148] Checking latest 2 GWs: ${latestTwo.map((e: any) => e.id).join(', ')}`);

    const invalidGWs: number[] = [];

    // Check latest 2 (newest first)
    for (let i = latestTwo.length - 1; i >= 0; i--) {
      const event = latestTwo[i];
      const hasValidData = await checkDatabaseHasGWData(leagueId, event.id);

      if (!hasValidData) {
        console.log(`[K-148] GW${event.id}: INVALID`);
        invalidGWs.push(event.id);
      }
    }

    if (invalidGWs.length === 0) {
      // Latest 2 are valid → trust older GWs
      console.log(`[K-148] Latest 2 GWs valid ✓ (2 queries, skipping ${finishedGWs.length - 2} older GWs)`);
      return;
    }

    // 4. Found invalid in latest 2 → scan backwards for more
    console.log(`[K-148] Found ${invalidGWs.length} invalid in latest 2, scanning older GWs...`);

    // Check older GWs (skip the 2 we already checked)
    for (let i = finishedGWs.length - 3; i >= 0; i--) {
      const event = finishedGWs[i];
      const hasValidData = await checkDatabaseHasGWData(leagueId, event.id);

      if (!hasValidData) {
        console.log(`[K-148] GW${event.id}: INVALID`);
        invalidGWs.push(event.id);
      }

      // Stop after finding 5 invalid total (rate limit detection)
      if (invalidGWs.length >= 5) {
        console.log(`[K-148] Found 5 invalid GWs, stopping scan`);
        break;
      }
    }

    console.log(`[K-148] Total invalid GWs found: ${invalidGWs.length} (${invalidGWs.join(', ')})`);

    // 5. Apply 10-hour buffer only to LATEST finished GW
    const latestFinishedGW = finishedGWs[finishedGWs.length - 1];
    const gwsToSync: number[] = [];

    for (const gw of invalidGWs) {
      if (gw === latestFinishedGW.id) {
        // For latest GW, check 10-hour buffer
        const { passed, hoursSinceFinished } = await checkSafetyBuffer(gw);

        if (!passed) {
          console.log(`[K-148] GW${gw}: Within 10-hour buffer (${hoursSinceFinished.toFixed(1)}h), skipping`);
          continue;
        }

        console.log(`[K-148] GW${gw}: Buffer passed (${hoursSinceFinished.toFixed(1)}h > ${SYNC_BUFFER_HOURS}h)`);
      } else {
        // Older GWs: sync immediately (no buffer needed)
        console.log(`[K-148] GW${gw}: Old GW, syncing immediately`);
      }

      gwsToSync.push(gw);
    }

    if (gwsToSync.length === 0) {
      console.log(`[K-148] No GWs ready to sync (latest within buffer)`);
      return;
    }

    // 6. Rate limiting - max 3 GWs per cycle
    const MAX_GWS_PER_CYCLE = 3;
    const gwsThisCycle = gwsToSync.slice(0, MAX_GWS_PER_CYCLE);

    if (gwsToSync.length > MAX_GWS_PER_CYCLE) {
      console.log(`[K-148] Limiting to ${MAX_GWS_PER_CYCLE} GWs this cycle. Remaining: ${gwsToSync.length - MAX_GWS_PER_CYCLE}`);
    }

    // 7. Sync the GWs
    for (const gw of gwsThisCycle) {
      console.log(`[K-148] Syncing GW${gw}...`);
      await syncCompletedGW(leagueId, gw);

      // Add delay between syncs to avoid rate limiting
      if (gwsThisCycle.indexOf(gw) < gwsThisCycle.length - 1) {
        console.log(`[K-148] Waiting 1s before next sync...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[K-148] Auto-sync complete. Synced ${gwsThisCycle.length} GW(s).`);

  } catch (error) {
    console.error('[K-148] Auto-sync error:', error);
    // Don't throw - this is a background operation, shouldn't break the page
  }
}
