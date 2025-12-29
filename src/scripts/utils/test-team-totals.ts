/**
 * Test Team Totals Calculation
 *
 * Validates our team total calculation against FPL's official totals
 * for all managers in a league.
 */

import { getDatabase } from '../../lib/db.js';
import { calculateTeamTotal, type ManagerPick, type PlayerData, type ChipType } from '../../lib/teamCalculator.js';

interface TestResult {
  entry_id: number;
  player_name: string;
  our_total: number;
  fpl_total: number;
  match: boolean;
  diff: number;
  active_chip: ChipType;
  transfer_cost: number;
  auto_subs_count: number;
}

async function testTeamTotals(leagueId: number, gameweek: number) {
  console.log(`\n[Team Totals Test] Testing League ${leagueId}, GW${gameweek}...`);
  console.log('='.repeat(80));

  const db = await getDatabase();

  try {
    // 1. Get all managers in the league
    const managersResult = await db.query(
      `SELECT ls.entry_id, m.player_name
       FROM league_standings ls
       JOIN managers m ON m.entry_id = ls.entry_id
       WHERE ls.league_id = $1
       ORDER BY ls.rank`,
      [leagueId]
    );

    const managers = managersResult.rows;
    console.log(`[Team Totals Test] Found ${managers.length} managers in league\n`);

    const results: TestResult[] = [];
    let matches = 0;
    let mismatches = 0;
    const errors: TestResult[] = [];

    // 2. Test each manager
    for (const manager of managers) {
      try {
        // Get manager picks
        const picksResult = await db.query(
          `SELECT player_id, position, multiplier, is_captain, is_vice_captain
           FROM manager_picks
           WHERE entry_id = $1 AND event = $2
           ORDER BY position`,
          [manager.entry_id, gameweek]
        );

        if (picksResult.rows.length === 0) {
          console.log(`  [SKIP] ${manager.player_name}: No picks found`);
          continue;
        }

        const picks: ManagerPick[] = picksResult.rows;

        // Get player data
        const playerIds = picks.map(p => p.player_id);
        const playersResult = await db.query(
          `SELECT
            p.id,
            p.web_name,
            p.element_type as position,
            COALESCE(pgs.calculated_points, 0) as points,
            COALESCE(pgs.minutes, 0) as minutes
           FROM players p
           LEFT JOIN player_gameweek_stats pgs
             ON pgs.player_id = p.id AND pgs.gameweek = $1
           WHERE p.id = ANY($2)`,
          [gameweek, playerIds]
        );

        const playerData = new Map<number, PlayerData>();
        for (const row of playersResult.rows) {
          playerData.set(row.id, {
            id: row.id,
            position: row.position,
            points: row.points,
            minutes: row.minutes,
            web_name: row.web_name,
          });
        }

        // Get active chip
        const chipResult = await db.query(
          `SELECT chip_name
           FROM manager_chips
           WHERE entry_id = $1 AND event = $2`,
          [manager.entry_id, gameweek]
        );

        const activeChip: ChipType = chipResult.rows[0]?.chip_name || null;

        // Get transfer cost and FPL total
        const historyResult = await db.query(
          `SELECT event_transfers_cost, points
           FROM manager_gw_history
           WHERE entry_id = $1 AND event = $2`,
          [manager.entry_id, gameweek]
        );

        if (historyResult.rows.length === 0) {
          console.log(`  [SKIP] ${manager.player_name}: No history found`);
          continue;
        }

        const transferCost = historyResult.rows[0].event_transfers_cost || 0;
        const fplTotal = historyResult.rows[0].points || 0;

        // Calculate team total
        const calculation = calculateTeamTotal(picks, playerData, activeChip, transferCost);
        const ourTotal = calculation.net_total;

        const match = ourTotal === fplTotal;
        const diff = ourTotal - fplTotal;

        if (match) {
          matches++;
        } else {
          mismatches++;
        }

        const result: TestResult = {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          our_total: ourTotal,
          fpl_total: fplTotal,
          match,
          diff,
          active_chip: activeChip,
          transfer_cost: transferCost,
          auto_subs_count: calculation.auto_subs.length,
        };

        results.push(result);

        if (!match) {
          errors.push(result);
        }

      } catch (error: any) {
        console.error(`  [ERROR] ${manager.player_name}:`, error.message);
      }
    }

    // 3. Report results
    console.log('\n📊 SUMMARY');
    console.log('-'.repeat(80));
    console.log(`Total managers tested: ${results.length}`);
    console.log(`Matches:               ${matches} (${((matches / results.length) * 100).toFixed(2)}%)`);
    console.log(`Mismatches:            ${mismatches} (${((mismatches / results.length) * 100).toFixed(2)}%)`);

    if (mismatches > 0) {
      console.log('\n❌ MISMATCHES FOUND');
      console.log('-'.repeat(80));
      console.log('Manager'.padEnd(25) + 'Our'.padEnd(8) + 'FPL'.padEnd(8) + 'Diff'.padEnd(8) + 'Chip'.padEnd(10) + 'TC'.padEnd(6) + 'Subs');
      console.log('-'.repeat(80));

      errors.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

      for (const result of errors) {
        const diffStr = result.diff > 0 ? `+${result.diff}` : `${result.diff}`;
        console.log(
          result.player_name.padEnd(25) +
          result.our_total.toString().padEnd(8) +
          result.fpl_total.toString().padEnd(8) +
          diffStr.padEnd(8) +
          (result.active_chip || '-').padEnd(10) +
          result.transfer_cost.toString().padEnd(6) +
          result.auto_subs_count.toString()
        );
      }
    } else {
      console.log('\n✅ PERFECT MATCH - All team totals match FPL official totals!');
    }

    // Show chip usage breakdown
    const chipUsage = new Map<string, number>();
    for (const result of results) {
      const chip = result.active_chip || 'none';
      chipUsage.set(chip, (chipUsage.get(chip) || 0) + 1);
    }

    console.log('\n💊 CHIP USAGE');
    console.log('-'.repeat(80));
    Array.from(chipUsage.entries()).forEach(([chip, count]) => {
      console.log(`${chip.padEnd(15)}: ${count} managers`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`[Team Totals Test] League ${leagueId}, GW${gameweek} test complete\n`);

    // Return summary
    return {
      total: results.length,
      matches,
      mismatches,
      accuracy: (matches / results.length) * 100,
    };

  } catch (error: any) {
    console.error('[Team Totals Test] Fatal error:', error);
    throw error;
  }
}

// Parse command line arguments
const leagueId = process.argv[2] ? parseInt(process.argv[2]) : 804742; // Default test league
const gw = process.argv[3] ? parseInt(process.argv[3]) : 17; // Default GW17

if (isNaN(leagueId) || isNaN(gw) || gw < 1 || gw > 38) {
  console.error('[Team Totals Test] Invalid arguments. Usage: npm run test:team-totals <leagueId> <gameweek>');
  process.exit(1);
}

testTeamTotals(leagueId, gw)
  .then((result) => {
    if (result.mismatches === 0) {
      console.log('✅ All tests passed!');
      process.exit(0);
    } else {
      console.error(`❌ ${result.mismatches} mismatches found`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('[Team Totals Test] Error:', error);
    process.exit(1);
  });
