import { getDatabase } from '../../lib/db.js';

const FPL_API = 'https://fantasy.premierleague.com/api';

interface Chip {
  name: string;
  time: string;
  event: number;
}

interface HistoryResponse {
  chips: Chip[];
}

async function syncManagerChips(leagueId: number) {
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

    console.log(`[Chips Sync] Syncing chips for ${managers.rows.length} managers in league ${leagueId}`);

    let totalChips = 0;
    let errors = 0;

    for (const manager of managers.rows) {
      try {
        console.log(`[Chips Sync] Fetching chips for ${manager.player_name} (${manager.entry_id})...`);

        const response = await fetch(
          `${FPL_API}/entry/${manager.entry_id}/history/`
        );

        if (!response.ok) {
          console.error(`[Chips Sync] ✗ ${manager.entry_id}: HTTP ${response.status}`);
          errors++;
          continue;
        }

        const data: HistoryResponse = await response.json();

        if (!data.chips || data.chips.length === 0) {
          console.log(`[Chips Sync] ⚠ ${manager.player_name}: No chips used yet`);
          continue;
        }

        for (const chip of data.chips) {
          await db.query(`
            INSERT INTO manager_chips
            (league_id, entry_id, chip_name, event)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (entry_id, chip_name, event) DO NOTHING
          `, [
            leagueId,
            manager.entry_id,
            chip.name,
            chip.event
          ]);
          totalChips++;
        }

        console.log(`[Chips Sync] ✓ ${manager.player_name}: ${data.chips.length} chips`);

      } catch (error) {
        console.error(`[Chips Sync] ✗ ${manager.entry_id}:`, error);
        errors++;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n[Chips Sync] Complete!`);
    console.log(`  Total chips synced: ${totalChips}`);
    console.log(`  Errors: ${errors}`);

    // Verify total
    const countResult = await db.query('SELECT COUNT(*) FROM manager_chips WHERE league_id = $1', [leagueId]);
    console.log(`  Total chips in database: ${countResult.rows[0].count}`);

    // Breakdown by chip type
    const breakdownResult = await db.query(`
      SELECT chip_name, COUNT(*) as count
      FROM manager_chips
      WHERE league_id = $1
      GROUP BY chip_name
      ORDER BY count DESC
    `, [leagueId]);

    console.log(`\n  Chip breakdown:`);
    breakdownResult.rows.forEach((row: any) => {
      console.log(`    ${row.chip_name}: ${row.count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('[Chips Sync] Fatal error:', error);
    process.exit(1);
  }
}

// Get league ID from command line or use default
const leagueId = process.argv[2] ? parseInt(process.argv[2]) : 804742;

console.log(`[Chips Sync] Starting sync for league ${leagueId}...`);
syncManagerChips(leagueId);
