import { getDatabase } from '../../lib/db.js';

const FPL_API = 'https://fantasy.premierleague.com/api';

interface Pick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface PicksResponse {
  picks: Pick[];
}

async function syncManagerPicks(leagueId: number, maxGW?: number) {
  const db = await getDatabase();

  try {
    // Determine max GW to sync
    let finalGW = maxGW;
    if (!finalGW) {
      // Get current GW from FPL API
      const bootstrapResponse = await fetch(`${FPL_API}/bootstrap-static/`);
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const currentEvent = bootstrapData.events?.find((e: any) => e.is_current);
        if (currentEvent) {
          // Sync up to the previous GW (current GW is still live)
          finalGW = currentEvent.finished ? currentEvent.id : currentEvent.id - 1;
        }
      }

      if (!finalGW) {
        console.error('[Picks Sync] Could not determine max GW');
        process.exit(1);
      }
    }

    // Get all managers in league via league_standings
    const managers = await db.query(`
      SELECT DISTINCT ls.entry_id, m.player_name
      FROM league_standings ls
      JOIN managers m ON m.entry_id = ls.entry_id
      WHERE ls.league_id = $1
      ORDER BY ls.entry_id
    `, [leagueId]);

    console.log(`[Picks Sync] Syncing picks for ${managers.rows.length} managers in league ${leagueId}`);
    console.log(`[Picks Sync] Gameweeks: 1 to ${finalGW}`);

    let totalPicks = 0;
    let skippedGWs = 0;
    let errors = 0;

    for (const manager of managers.rows) {
      console.log(`\n[Picks Sync] Processing ${manager.player_name} (${manager.entry_id})...`);

      for (let gw = 1; gw <= finalGW; gw++) {
        try {
          // Check if already synced
          const existing = await db.query(
            'SELECT 1 FROM manager_picks WHERE entry_id = $1 AND event = $2 LIMIT 1',
            [manager.entry_id, gw]
          );

          if (existing.rows.length > 0) {
            skippedGWs++;
            continue;
          }

          // Fetch picks from FPL API
          const response = await fetch(
            `${FPL_API}/entry/${manager.entry_id}/event/${gw}/picks/`
          );

          if (!response.ok) {
            console.error(`[Picks Sync]   ✗ GW${gw}: HTTP ${response.status}`);
            errors++;
            continue;
          }

          const data: PicksResponse = await response.json();

          if (!data.picks || data.picks.length === 0) {
            console.log(`[Picks Sync]   ⚠ GW${gw}: No picks found`);
            continue;
          }

          // Insert picks
          for (const pick of data.picks) {
            await db.query(`
              INSERT INTO manager_picks
              (league_id, entry_id, event, player_id, position, multiplier, is_captain, is_vice_captain)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (league_id, entry_id, event, player_id) DO NOTHING
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
            totalPicks++;
          }

          console.log(`[Picks Sync]   ✓ GW${gw}: ${data.picks.length} picks`);

        } catch (error) {
          console.error(`[Picks Sync]   ✗ GW${gw}:`, error);
          errors++;
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 100));
      }
    }

    console.log(`\n[Picks Sync] Complete!`);
    console.log(`  Total picks synced: ${totalPicks}`);
    console.log(`  Gameweeks skipped (already synced): ${skippedGWs}`);
    console.log(`  Errors: ${errors}`);

    // Verify total
    const countResult = await db.query('SELECT COUNT(*) FROM manager_picks WHERE league_id = $1', [leagueId]);
    console.log(`  Total picks in database: ${countResult.rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('[Picks Sync] Fatal error:', error);
    process.exit(1);
  }
}

// Get league ID and max GW from command line or use defaults
const leagueId = process.argv[2] ? parseInt(process.argv[2]) : 804742;
const maxGW = process.argv[3] ? parseInt(process.argv[3]) : undefined;

console.log(`[Picks Sync] Starting sync for league ${leagueId}...`);
syncManagerPicks(leagueId, maxGW);
