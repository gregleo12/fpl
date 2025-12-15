import { getDatabase } from '../lib/db.js';

const FPL_API = 'https://fantasy.premierleague.com/api';

interface Transfer {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
}

async function syncManagerTransfers(leagueId: number) {
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

    console.log(`[Transfers Sync] Syncing transfers for ${managers.rows.length} managers in league ${leagueId}`);

    let totalTransfers = 0;
    let errors = 0;

    for (const manager of managers.rows) {
      try {
        console.log(`[Transfers Sync] Fetching transfers for ${manager.player_name} (${manager.entry_id})...`);

        const response = await fetch(
          `${FPL_API}/entry/${manager.entry_id}/transfers/`
        );

        if (!response.ok) {
          console.error(`[Transfers Sync] ✗ ${manager.entry_id}: HTTP ${response.status}`);
          errors++;
          continue;
        }

        const transfers: Transfer[] = await response.json();

        if (!transfers || transfers.length === 0) {
          console.log(`[Transfers Sync] ⚠ ${manager.player_name}: No transfers made yet`);
          continue;
        }

        // Filter for current season only (event >= 1)
        const currentSeasonTransfers = transfers.filter(t => t.event >= 1);

        for (const transfer of currentSeasonTransfers) {
          await db.query(`
            INSERT INTO manager_transfers
            (league_id, entry_id, event, player_in, player_out, player_in_cost, player_out_cost, transfer_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
          totalTransfers++;
        }

        console.log(`[Transfers Sync] ✓ ${manager.player_name}: ${currentSeasonTransfers.length} transfers`);

      } catch (error) {
        console.error(`[Transfers Sync] ✗ ${manager.entry_id}:`, error);
        errors++;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n[Transfers Sync] Complete!`);
    console.log(`  Total transfers synced: ${totalTransfers}`);
    console.log(`  Errors: ${errors}`);

    // Verify total
    const countResult = await db.query('SELECT COUNT(*) FROM manager_transfers WHERE league_id = $1', [leagueId]);
    console.log(`  Total transfers in database: ${countResult.rows[0].count}`);

    // Breakdown by gameweek
    const breakdownResult = await db.query(`
      SELECT event, COUNT(*) as count
      FROM manager_transfers
      WHERE league_id = $1
      GROUP BY event
      ORDER BY event
    `, [leagueId]);

    console.log(`\n  Transfers by Gameweek:`);
    breakdownResult.rows.forEach((row: any) => {
      console.log(`    GW${row.event}: ${row.count} transfers`);
    });

    process.exit(0);
  } catch (error) {
    console.error('[Transfers Sync] Fatal error:', error);
    process.exit(1);
  }
}

// Get league ID from command line or use default
const leagueId = process.argv[2] ? parseInt(process.argv[2]) : 804742;

console.log(`[Transfers Sync] Starting sync for league ${leagueId}...`);
syncManagerTransfers(leagueId);
