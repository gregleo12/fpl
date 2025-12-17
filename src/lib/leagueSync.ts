import { getDatabase } from '@/lib/db';

const SYNC_INTERVAL_HOURS = 24; // Re-sync if older than 24 hours

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

    // Sync each manager
    for (const entryId of managerIds) {
      await syncManagerData(db, leagueId, entryId, completedGWs, bootstrap);
    }

    // Mark as completed
    await db.query(`
      UPDATE leagues
      SET sync_status = 'completed', last_synced = NOW()
      WHERE id = $1
    `, [leagueId]);

    console.log(`[Sync] League ${leagueId} sync completed`);

  } catch (error) {
    console.error(`[Sync] League ${leagueId} sync failed:`, error);

    await db.query(`
      UPDATE leagues SET sync_status = 'failed' WHERE id = $1
    `, [leagueId]);
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

    // 3. Sync GW history
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

    // 4. Sync picks and captains for each GW
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
