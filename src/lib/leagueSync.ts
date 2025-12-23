import { getDatabase } from '@/lib/db';
import { calculatePoints, type Position } from '@/lib/pointsCalculator';

const SYNC_INTERVAL_HOURS = 24; // Re-sync if older than 24 hours

/**
 * K-112: Check which gameweeks are missing K-108 calculated_points data
 * Returns array of GW numbers that need K-108 syncing
 */
async function getGameweeksMissingK108Data(
  db: any,
  maxGW: number
): Promise<number[]> {
  console.log(`[K-108 Check] Checking for missing calculated_points up to GW${maxGW}...`);

  // Query: For each GW, check if ANY player has calculated_points
  const result = await db.query(`
    SELECT DISTINCT gameweek
    FROM player_gameweek_stats
    WHERE gameweek <= $1
      AND calculated_points IS NOT NULL
    ORDER BY gameweek
  `, [maxGW]);

  const populatedGWs = new Set(result.rows.map((r: any) => parseInt(r.gameweek)));
  const missingGWs: number[] = [];

  for (let gw = 1; gw <= maxGW; gw++) {
    if (!populatedGWs.has(gw)) {
      missingGWs.push(gw);
    }
  }

  if (missingGWs.length > 0) {
    console.log(`[K-108 Check] Missing calculated_points for GWs: ${missingGWs.join(', ')}`);
  } else {
    console.log(`[K-108 Check] All GWs 1-${maxGW} have calculated_points ✓`);
  }

  return missingGWs;
}

/**
 * K-112: Sync K-108 calculated_points for specified gameweeks
 * This is a GLOBAL operation (affects all 760 players, benefits all leagues)
 */
async function syncK108PlayerStats(
  db: any,
  gameweeks: number[],
  bootstrap: any
): Promise<{ synced: number; errors: number }> {
  console.log(`[K-108 Sync] Starting sync for ${gameweeks.length} gameweek(s): ${gameweeks.join(', ')}`);

  const players = bootstrap.elements || [];
  const teams = bootstrap.teams || [];

  // Build team lookup
  const teamLookup: { [key: number]: any } = {};
  teams.forEach((team: any) => {
    teamLookup[team.id] = team;
  });

  let synced = 0;
  let errors = 0;

  // Process each gameweek
  for (const gw of gameweeks) {
    try {
      console.log(`[K-108 Sync] Fetching live data for GW${gw}...`);

      // Fetch fixtures for this GW
      const fixturesResponse = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`);
      if (!fixturesResponse.ok) {
        console.error(`[K-108 Sync] Failed to fetch fixtures for GW${gw}`);
        errors++;
        continue;
      }
      const fixtures = await fixturesResponse.json();

      // Build fixture lookup by team
      const fixturesByTeam: { [key: number]: any } = {};
      fixtures.forEach((fixture: any) => {
        fixturesByTeam[fixture.team_h] = {
          id: fixture.id,
          opponent_team_id: fixture.team_a,
          opponent_short: teamLookup[fixture.team_a]?.short_name || 'UNK',
          was_home: true,
          started: fixture.started || false,
          finished: fixture.finished || false,
        };
        fixturesByTeam[fixture.team_a] = {
          id: fixture.id,
          opponent_team_id: fixture.team_h,
          opponent_short: teamLookup[fixture.team_h]?.short_name || 'UNK',
          was_home: false,
          started: fixture.started || false,
          finished: fixture.finished || false,
        };
      });

      // Fetch live data
      const liveResponse = await fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`);
      if (!liveResponse.ok) {
        console.error(`[K-108 Sync] Failed to fetch live data for GW${gw}`);
        errors++;
        continue;
      }
      const liveData = await liveResponse.json();

      let gwSynced = 0;

      // Process each player
      for (const player of players) {
        try {
          const liveElement = liveData.elements.find((e: any) => e.id === player.id);
          if (!liveElement) {
            // Player didn't play this GW, skip
            continue;
          }

          const stats = liveElement.stats;
          const fixture = fixturesByTeam[player.team];

          // Calculate points using K-108 formula
          const calculated = calculatePoints({
            minutes: stats.minutes || 0,
            goals_scored: stats.goals_scored || 0,
            assists: stats.assists || 0,
            clean_sheets: stats.clean_sheets || 0,
            goals_conceded: stats.goals_conceded || 0,
            own_goals: stats.own_goals || 0,
            penalties_saved: stats.penalties_saved || 0,
            penalties_missed: stats.penalties_missed || 0,
            yellow_cards: stats.yellow_cards || 0,
            red_cards: stats.red_cards || 0,
            saves: stats.saves || 0,
            bonus: stats.bonus || 0,
            defensive_contribution: stats.defensive_contribution || 0,
          }, player.element_type as Position);

          const fplTotal = stats.total_points || 0;

          // Insert or update player_gameweek_stats with calculated_points
          await db.query(`
            INSERT INTO player_gameweek_stats (
              player_id, gameweek,
              fixture_id, opponent_team_id, opponent_short, was_home,
              fixture_started, fixture_finished,
              minutes, goals_scored, assists, clean_sheets, goals_conceded,
              own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards,
              saves, bonus, bps, defensive_contribution,
              influence, creativity, threat, ict_index,
              expected_goals, expected_assists, expected_goal_involvements,
              total_points, calculated_points, points_breakdown,
              updated_at
            ) VALUES (
              $1, $2,
              $3, $4, $5, $6,
              $7, $8,
              $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18,
              $19, $20, $21, $22,
              $23, $24, $25, $26,
              $27, $28, $29,
              $30, $31, $32,
              NOW()
            )
            ON CONFLICT (player_id, gameweek)
            DO UPDATE SET
              calculated_points = EXCLUDED.calculated_points,
              points_breakdown = EXCLUDED.points_breakdown,
              total_points = EXCLUDED.total_points,
              bonus = EXCLUDED.bonus,
              bps = EXCLUDED.bps,
              updated_at = NOW()
          `, [
            player.id, gw,
            fixture?.id || null,
            fixture?.opponent_team_id || null,
            fixture?.opponent_short || null,
            fixture?.was_home || false,
            fixture?.started || false,
            fixture?.finished || false,
            stats.minutes || 0,
            stats.goals_scored || 0,
            stats.assists || 0,
            stats.clean_sheets || 0,
            stats.goals_conceded || 0,
            stats.own_goals || 0,
            stats.penalties_saved || 0,
            stats.penalties_missed || 0,
            stats.yellow_cards || 0,
            stats.red_cards || 0,
            stats.saves || 0,
            stats.bonus || 0,
            stats.bps || 0,
            stats.defensive_contribution || 0,
            stats.influence || '0.0',
            stats.creativity || '0.0',
            stats.threat || '0.0',
            stats.ict_index || '0.0',
            stats.expected_goals || '0.00',
            stats.expected_assists || '0.00',
            stats.expected_goal_involvements || '0.00',
            fplTotal,
            calculated.total,
            JSON.stringify(calculated.breakdown),
          ]);

          gwSynced++;
          synced++;

        } catch (error) {
          console.error(`[K-108 Sync] Error processing player ${player.id} GW${gw}:`, error);
          errors++;
        }
      }

      console.log(`[K-108 Sync] GW${gw} complete: ${gwSynced} players synced`);

      // Rate limiting between GWs
      if (gw !== gameweeks[gameweeks.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`[K-108 Sync] Error syncing GW${gw}:`, error);
      errors++;
    }
  }

  console.log(`[K-108 Sync] Complete: ${synced} player records synced, ${errors} errors`);
  return { synced, errors };
}

/**
 * Sync PL fixtures (completed only)
 * This is league-independent and only needs to run once per sync
 */
export async function syncPLFixtures(db: any): Promise<void> {
  console.log('[Sync] Syncing PL fixtures...');

  try {
    const res = await fetch('https://fantasy.premierleague.com/api/fixtures/');
    if (!res.ok) {
      console.error(`[Sync] Failed to fetch fixtures: ${res.status}`);
      return;
    }

    const fixtures = await res.json();

    // Only sync COMPLETED fixtures (finished = true)
    const completedFixtures = fixtures.filter((f: any) => f.finished);

    for (const fixture of completedFixtures) {
      await db.query(`
        INSERT INTO pl_fixtures (
          id, event, team_h, team_a, team_h_score, team_a_score,
          team_h_difficulty, team_a_difficulty, kickoff_time,
          started, finished, finished_provisional, minutes, pulse_id, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (id) DO UPDATE SET
          team_h_score = EXCLUDED.team_h_score,
          team_a_score = EXCLUDED.team_a_score,
          finished = EXCLUDED.finished,
          finished_provisional = EXCLUDED.finished_provisional,
          minutes = EXCLUDED.minutes,
          updated_at = NOW()
      `, [
        fixture.id,
        fixture.event,
        fixture.team_h,
        fixture.team_a,
        fixture.team_h_score,
        fixture.team_a_score,
        fixture.team_h_difficulty,
        fixture.team_a_difficulty,
        fixture.kickoff_time,
        fixture.started,
        fixture.finished,
        fixture.finished_provisional,
        fixture.minutes,
        fixture.pulse_id
      ]);
    }

    console.log(`[Sync] Synced ${completedFixtures.length} completed PL fixtures`);
  } catch (err) {
    console.error('[Sync] PL fixtures sync failed:', err);
  }
}

/**
 * Check for missing completed gameweeks that aren't in the database yet
 */
export async function checkForMissingGWs(leagueId: number): Promise<number[]> {
  const db = await getDatabase();

  try {
    // Get latest completed GW from FPL API
    const bootstrapRes = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    const bootstrap = await bootstrapRes.json();
    const completedGWs = bootstrap.events
      .filter((e: any) => e.finished)
      .map((e: any) => e.id);

    // Get our synced GWs from DB
    const syncedResult = await db.query(`
      SELECT DISTINCT event
      FROM manager_gw_history
      WHERE league_id = $1
      ORDER BY event
    `, [leagueId]);

    const syncedGWs = syncedResult.rows.map((r: any) => parseInt(r.event));

    // Find missing GWs
    const missingGWs = completedGWs.filter((gw: number) => !syncedGWs.includes(gw));

    if (missingGWs.length > 0) {
      console.log(`[Sync] League ${leagueId} missing GWs:`, missingGWs);
    }

    return missingGWs;
  } catch (error) {
    console.error(`[Sync] Error checking for missing GWs:`, error);
    return [];
  }
}

/**
 * Sync only specific missing gameweeks (incremental sync)
 */
export async function syncMissingGWs(
  leagueId: number,
  missingGWs: number[]
): Promise<{ success: boolean; synced: number[] }> {
  if (missingGWs.length === 0) {
    return { success: true, synced: [] };
  }

  const db = await getDatabase();

  try {
    console.log(`[Sync] Syncing ${missingGWs.length} missing GWs for league ${leagueId}:`, missingGWs);

    // Get managers for this league
    const managersResult = await db.query(`
      SELECT DISTINCT entry_id FROM league_standings WHERE league_id = $1
    `, [leagueId]);
    const managers = managersResult.rows;

    // Get bootstrap data for player names
    const bootstrapRes = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    const bootstrap = await bootstrapRes.json();

    // ========== K-112: SYNC K-108 PLAYER STATS (GLOBAL OPERATION) ==========
    // Check if K-108 calculated_points exists for the missing GWs
    console.log(`[K-112] Quick sync: Checking K-108 data for missing GWs...`);
    const maxGW = Math.max(...missingGWs);
    const missingK108GWs = await getGameweeksMissingK108Data(db, maxGW);

    // Only sync K-108 for GWs that are both missing from league AND missing K-108 data
    const k108ToSync = missingK108GWs.filter(gw => missingGWs.includes(gw));

    if (k108ToSync.length > 0) {
      console.log(`[K-112] Quick sync: Syncing K-108 data for ${k108ToSync.length} GW(s): ${k108ToSync.join(', ')}`);
      const k108Result = await syncK108PlayerStats(db, k108ToSync, bootstrap);
      console.log(`[K-112] Quick sync K-108 complete: ${k108Result.synced} players, ${k108Result.errors} errors`);
    } else {
      console.log(`[K-112] Quick sync: K-108 data exists for all missing GWs ✓`);
    }
    // ========================================================================

    // Sync transfers for all managers (once per manager, covers all GWs)
    console.log(`[Sync] Syncing transfers for ${managers.length} managers...`);
    for (const manager of managers) {
      try {
        const transfersRes = await fetch(
          `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/transfers/`
        );
        if (transfersRes.ok) {
          const transfers = await transfersRes.json();
          const currentSeasonTransfers = (transfers || []).filter((t: any) =>
            t.event >= 1 && missingGWs.includes(t.event)
          );

          for (const transfer of currentSeasonTransfers) {
            await db.query(`
              INSERT INTO manager_transfers (
                league_id, entry_id, event, player_in, player_out,
                player_in_cost, player_out_cost, transfer_time
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (entry_id, event, player_in, player_out) DO NOTHING
            `, [
              leagueId,
              manager.entry_id,
              transfer.event,
              transfer.element_in,
              transfer.element_out,
              transfer.element_in_cost,
              transfer.element_out_cost,
              transfer.time
            ]);
          }
        }
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error(`[Sync] Transfer sync failed for manager ${manager.entry_id}:`, err);
      }
    }

    // Sync each missing GW
    for (const gw of missingGWs) {
      console.log(`[Sync] Syncing GW${gw} for league ${leagueId}...`);

      // Fetch live data for this GW (for points)
      const liveRes = await fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`);
      if (!liveRes.ok) {
        console.error(`[Sync] Failed to fetch live data for GW${gw}`);
        continue;
      }
      const liveData = await liveRes.json();

      // Sync each manager for this GW
      for (const manager of managers) {
        try {
          // Fetch manager's GW picks
          const picksRes = await fetch(
            `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${gw}/picks/`
          );

          if (!picksRes.ok) continue;
          const picksData = await picksRes.json();

          // Update GW history
          const history = picksData.entry_history;
          if (history) {
            await db.query(`
              INSERT INTO manager_gw_history (
                league_id, entry_id, event, points, total_points,
                rank, rank_sort, overall_rank, event_transfers, event_transfers_cost,
                value, bank, points_on_bench
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (entry_id, event) DO UPDATE SET
                points = EXCLUDED.points,
                total_points = EXCLUDED.total_points,
                points_on_bench = EXCLUDED.points_on_bench
            `, [
              leagueId, manager.entry_id, gw,
              history.points, history.total_points,
              history.rank, history.rank_sort, history.overall_rank,
              history.event_transfers, history.event_transfers_cost,
              history.value, history.bank, history.points_on_bench || 0
            ]);
          }

          // Update captain
          const captain = picksData.picks?.find((p: any) => p.is_captain);
          if (captain) {
            const player = bootstrap.elements.find((e: any) => e.id === captain.element);
            const playerLive = liveData.elements?.find((e: any) => e.id === captain.element);
            const captainPoints = (playerLive?.stats?.total_points || 0) * captain.multiplier;

            await db.query(`
              INSERT INTO entry_captains (entry_id, event, captain_element_id, captain_name, captain_points)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (entry_id, event) DO UPDATE SET
                captain_element_id = EXCLUDED.captain_element_id,
                captain_name = EXCLUDED.captain_name,
                captain_points = EXCLUDED.captain_points
            `, [manager.entry_id, gw, captain.element, player?.web_name || 'Unknown', captainPoints]);
          }

          // Update chip if used
          const chip = picksData.active_chip;
          if (chip) {
            await db.query(`
              INSERT INTO manager_chips (league_id, entry_id, chip_name, event)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (entry_id, chip_name, event) DO NOTHING
            `, [leagueId, manager.entry_id, chip, gw]);
          }

          // Sync full squad picks (15 players)
          const picks = picksData.picks || [];
          for (const pick of picks) {
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
              leagueId,
              manager.entry_id,
              gw,
              pick.element,
              pick.position,
              pick.multiplier,
              pick.is_captain,
              pick.is_vice_captain
            ]);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (err) {
          console.error(`[Sync] Error syncing manager ${manager.entry_id} GW${gw}:`, err);
        }
      }

      console.log(`[Sync] Completed GW${gw} for league ${leagueId}`);
    }

    // Update last_synced timestamp
    await db.query(`
      UPDATE leagues SET last_synced = NOW() WHERE id = $1
    `, [leagueId]);

    console.log(`[Sync] Successfully synced ${missingGWs.length} missing GWs for league ${leagueId}`);
    return { success: true, synced: missingGWs };

  } catch (error) {
    console.error(`[Sync] Failed to sync missing GWs for league ${leagueId}:`, error);
    return { success: false, synced: [] };
  }
}

export async function shouldSyncLeague(leagueId: number): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.query(`
    SELECT last_synced, sync_status
    FROM leagues
    WHERE id = $1
  `, [leagueId]);

  if (result.rows.length === 0) return true;

  const { last_synced, sync_status } = result.rows[0];

  // Don't sync if already syncing
  if (sync_status === 'syncing') return false;

  // Sync if never synced
  if (!last_synced) return true;

  // Sync if stale (older than 24 hours)
  const hoursSinceSync = (Date.now() - new Date(last_synced).getTime()) / (1000 * 60 * 60);
  return hoursSinceSync > SYNC_INTERVAL_HOURS;
}

export async function syncLeagueData(leagueId: number, forceClear: boolean = false): Promise<void> {
  const db = await getDatabase();

  try {
    // Mark as syncing
    await db.query(`
      UPDATE leagues SET sync_status = 'syncing' WHERE id = $1
    `, [leagueId]);

    console.log(`[Sync] Starting sync for league ${leagueId}${forceClear ? ' (force clear mode)' : ''}`);

    // Sync PL fixtures first (league-independent, only completed fixtures)
    await syncPLFixtures(db);

    // If force clear, delete all existing data for this league
    if (forceClear) {
      console.log(`[Sync] Force clearing existing data for league ${leagueId}...`);

      // Clear manager_gw_history
      const gwResult = await db.query(
        'DELETE FROM manager_gw_history WHERE league_id = $1',
        [leagueId]
      );
      console.log(`[Sync] Deleted ${gwResult.rowCount} rows from manager_gw_history`);

      // Clear entry_captains
      const captainsResult = await db.query(`
        DELETE FROM entry_captains
        WHERE entry_id IN (
          SELECT entry_id FROM league_standings WHERE league_id = $1
        )
      `, [leagueId]);
      console.log(`[Sync] Deleted ${captainsResult.rowCount} rows from entry_captains`);

      // Clear manager_chips
      const chipsResult = await db.query(
        'DELETE FROM manager_chips WHERE league_id = $1',
        [leagueId]
      );
      console.log(`[Sync] Deleted ${chipsResult.rowCount} rows from manager_chips`);

      // Clear manager_transfers
      const transfersResult = await db.query(
        'DELETE FROM manager_transfers WHERE league_id = $1',
        [leagueId]
      );
      console.log(`[Sync] Deleted ${transfersResult.rowCount} rows from manager_transfers`);

      // Clear manager_picks
      const picksResult = await db.query(
        'DELETE FROM manager_picks WHERE league_id = $1',
        [leagueId]
      );
      console.log(`[Sync] Deleted ${picksResult.rowCount} rows from manager_picks`);
    }

    // Get all managers in this league
    const managersResult = await db.query(`
      SELECT DISTINCT entry_id FROM league_standings WHERE league_id = $1
    `, [leagueId]);

    const managerIds = managersResult.rows.map(r => parseInt(r.entry_id));
    console.log(`[Sync] Found ${managerIds.length} managers`);

    // Get current gameweek
    const bootstrapRes = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    const bootstrap = await bootstrapRes.json();
    const currentGW = bootstrap.events.find((e: any) => e.is_current)?.id || 16;
    const completedGWs = Array.from({ length: currentGW }, (_, i) => i + 1);

    // ========== K-112: SYNC K-108 PLAYER STATS (GLOBAL OPERATION) ==========
    // Check if K-108 calculated_points exists for needed GWs
    // This is global (all 760 players), not league-specific - benefits all leagues
    console.log(`[K-112] Checking K-108 data status for GW1-${currentGW}...`);
    const missingK108GWs = await getGameweeksMissingK108Data(db, currentGW);

    if (missingK108GWs.length > 0) {
      console.log(`[K-112] K-108 data missing for ${missingK108GWs.length} gameweek(s), syncing now...`);
      const k108Result = await syncK108PlayerStats(db, missingK108GWs, bootstrap);
      console.log(`[K-112] K-108 sync complete: ${k108Result.synced} players, ${k108Result.errors} errors`);
    } else {
      console.log(`[K-112] K-108 data exists for all GWs, fast path ✓`);
    }
    // ========================================================================

    // Sync each manager
    for (const entryId of managerIds) {
      await syncManagerData(db, leagueId, entryId, completedGWs, bootstrap);
    }

    // Mark as completed
    await db.query(`
      UPDATE leagues
      SET sync_status = 'completed',
          last_synced = NOW(),
          last_sync_error = NULL
      WHERE id = $1
    `, [leagueId]);

    console.log(`[Sync] League ${leagueId} sync completed`);

  } catch (error: any) {
    console.error(`[Sync] League ${leagueId} sync failed:`, error);

    // Always update status to 'failed' with error message
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    await db.query(`
      UPDATE leagues
      SET sync_status = 'failed',
          last_sync_error = $2
      WHERE id = $1
    `, [leagueId, errorMessage]);

    // Re-throw to let caller know sync failed
    throw error;
  }
}

async function syncManagerData(
  db: any,
  leagueId: number,
  entryId: number,
  gameweeks: number[],
  bootstrap: any
): Promise<void> {
  try {
    console.log(`[Sync] Syncing manager ${entryId}...`);

    // 1. Fetch manager history
    const historyRes = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/history/`
    );
    if (!historyRes.ok) {
      console.log(`[Sync] Manager ${entryId} history fetch failed`);
      return;
    }
    const history = await historyRes.json();

    // 2. Sync chips
    for (const chip of history.chips || []) {
      if (gameweeks.includes(chip.event)) {
        await db.query(`
          INSERT INTO manager_chips (league_id, entry_id, chip_name, event)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (entry_id, chip_name, event) DO NOTHING
        `, [leagueId, entryId, chip.name, chip.event]);
      }
    }

    // 3. Sync transfers
    try {
      const transfersRes = await fetch(
        `https://fantasy.premierleague.com/api/entry/${entryId}/transfers/`
      );
      if (transfersRes.ok) {
        const transfers = await transfersRes.json();
        const currentSeasonTransfers = (transfers || []).filter((t: any) => t.event >= 1);

        for (const transfer of currentSeasonTransfers) {
          if (gameweeks.includes(transfer.event)) {
            await db.query(`
              INSERT INTO manager_transfers (
                league_id, entry_id, event, player_in, player_out,
                player_in_cost, player_out_cost, transfer_time
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (entry_id, event, player_in, player_out) DO NOTHING
            `, [
              leagueId,
              entryId,
              transfer.event,
              transfer.element_in,
              transfer.element_out,
              transfer.element_in_cost,
              transfer.element_out_cost,
              transfer.time
            ]);
          }
        }
        console.log(`[Sync] Manager ${entryId}: Synced ${currentSeasonTransfers.length} transfers`);
      }
    } catch (err) {
      console.log(`[Sync] Manager ${entryId}: Transfer sync failed:`, err);
    }

    // 4. Sync GW history
    const gwHistory = history.current || [];
    console.log(`[Sync] Manager ${entryId}: Found ${gwHistory.length} GW history entries`);

    for (const gw of gwHistory) {
      if (gameweeks.includes(gw.event)) {
        try {
          await db.query(`
            INSERT INTO manager_gw_history (
              league_id, entry_id, event, points, total_points,
              rank, rank_sort, overall_rank, event_transfers,
              event_transfers_cost, value, bank, points_on_bench
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (entry_id, event) DO UPDATE SET
              points = EXCLUDED.points,
              total_points = EXCLUDED.total_points,
              rank = EXCLUDED.rank,
              event_transfers = EXCLUDED.event_transfers,
              event_transfers_cost = EXCLUDED.event_transfers_cost,
              points_on_bench = EXCLUDED.points_on_bench
          `, [
            leagueId, entryId, gw.event, gw.points, gw.total_points,
            gw.rank, gw.rank_sort, gw.overall_rank, gw.event_transfers,
            gw.event_transfers_cost, gw.value, gw.bank, gw.points_on_bench
          ]);
          console.log(`[Sync] Manager ${entryId} GW${gw.event}: Inserted/updated`);
        } catch (error) {
          console.error(`[Sync] Manager ${entryId} GW${gw.event}: INSERT FAILED:`, error);
        }
      }
    }

    // 5. Sync picks and captains for each GW
    for (const gwNum of gameweeks) {
      try {
        const picksRes = await fetch(
          `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gwNum}/picks/`
        );
        if (!picksRes.ok) continue;

        const picksData = await picksRes.json();
        const picks = picksData.picks || [];

        // Find captain
        const captain = picks.find((p: any) => p.is_captain);
        if (captain) {
          // Get captain points from live data
          const liveRes = await fetch(
            `https://fantasy.premierleague.com/api/event/${gwNum}/live/`
          );
          if (liveRes.ok) {
            const liveData = await liveRes.json();
            const playerLive = liveData.elements.find((e: any) => e.id === captain.element);
            const captainPoints = (playerLive?.stats?.total_points || 0) * captain.multiplier;

            const playerInfo = bootstrap.elements.find((e: any) => e.id === captain.element);
            const captainName = playerInfo?.web_name || 'Unknown';

            await db.query(`
              INSERT INTO entry_captains (entry_id, event, captain_element_id, captain_name, captain_points)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (entry_id, event) DO UPDATE SET
                captain_points = EXCLUDED.captain_points,
                captain_name = EXCLUDED.captain_name
            `, [entryId, gwNum, captain.element, captainName, captainPoints]);
          }
        }

        // Sync full squad picks (15 players)
        for (const pick of picks) {
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
            leagueId,
            entryId,
            gwNum,
            pick.element,
            pick.position,
            pick.multiplier,
            pick.is_captain,
            pick.is_vice_captain
          ]);
        }
        console.log(`[Sync] Manager ${entryId} GW${gwNum}: Synced ${picks.length} picks`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (e) {
        // Skip this GW if error
        console.log(`[Sync] Manager ${entryId} GW ${gwNum} failed:`, e);
      }
    }

    console.log(`[Sync] Manager ${entryId} completed`);

  } catch (error) {
    console.error(`[Sync] Manager ${entryId} failed:`, error);
  }
}
