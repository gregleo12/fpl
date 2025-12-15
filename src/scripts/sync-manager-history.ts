import { getDatabase } from '../lib/db.js';

const FPL_API = 'https://fantasy.premierleague.com/api';

interface ManagerHistoryGW {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  rank_sort: number;
  overall_rank: number;
  event_transfers: number;
  event_transfers_cost: number;
  value: number;
  bank: number;
  points_on_bench: number;
}

interface HistoryResponse {
  current: ManagerHistoryGW[];
  chips: any[];
  past: any[];
}

async function syncManagerHistory(leagueId: number) {
  const db = await getDatabase();

  try {
    // Get all managers in league via league_standings
    const managers = await db.query(`
      SELECT DISTINCT ls.entry_id, m.player_name
      FROM league_standings ls
      JOIN managers m ON m.entry_id = ls.entry_id
      WHERE ls.league_id = $1
      ORDER BY ls.entry_id
    `, [leagueId]);

    console.log(`[History Sync] Syncing history for ${managers.rows.length} managers in league ${leagueId}`);

    let totalRecords = 0;
    let errors = 0;

    for (const manager of managers.rows) {
      try {
        console.log(`[History Sync] Fetching history for ${manager.player_name} (${manager.entry_id})...`);

        const response = await fetch(
          `${FPL_API}/entry/${manager.entry_id}/history/`
        );

        if (!response.ok) {
          console.error(`[History Sync] ✗ ${manager.entry_id}: HTTP ${response.status}`);
          errors++;
          continue;
        }

        const data: HistoryResponse = await response.json();

        if (!data.current || data.current.length === 0) {
          console.log(`[History Sync] ⚠ ${manager.entry_id}: No GW history found`);
          continue;
        }

        for (const gw of data.current) {
          await db.query(`
            INSERT INTO manager_gw_history
            (league_id, entry_id, event, points, total_points, rank, rank_sort,
             overall_rank, event_transfers, event_transfers_cost, value, bank, points_on_bench)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (entry_id, event)
            DO UPDATE SET
              points = EXCLUDED.points,
              total_points = EXCLUDED.total_points,
              rank = EXCLUDED.rank,
              rank_sort = EXCLUDED.rank_sort,
              overall_rank = EXCLUDED.overall_rank,
              event_transfers = EXCLUDED.event_transfers,
              event_transfers_cost = EXCLUDED.event_transfers_cost,
              value = EXCLUDED.value,
              bank = EXCLUDED.bank,
              points_on_bench = EXCLUDED.points_on_bench
          `, [
            leagueId,
            manager.entry_id,
            gw.event,
            gw.points,
            gw.total_points,
            gw.rank,
            gw.rank_sort,
            gw.overall_rank,
            gw.event_transfers || 0,
            gw.event_transfers_cost || 0,
            gw.value,
            gw.bank,
            gw.points_on_bench || 0
          ]);
          totalRecords++;
        }

        console.log(`[History Sync] ✓ ${manager.player_name}: ${data.current.length} GWs`);

      } catch (error) {
        console.error(`[History Sync] ✗ ${manager.entry_id}:`, error);
        errors++;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n[History Sync] Complete!`);
    console.log(`  Total records: ${totalRecords}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Success rate: ${((managers.rows.length - errors) / managers.rows.length * 100).toFixed(1)}%`);

    process.exit(0);
  } catch (error) {
    console.error('[History Sync] Fatal error:', error);
    process.exit(1);
  }
}

// Get league ID from command line or use default
const leagueId = process.argv[2] ? parseInt(process.argv[2]) : 804742;

console.log(`[History Sync] Starting sync for league ${leagueId}...`);
syncManagerHistory(leagueId);
