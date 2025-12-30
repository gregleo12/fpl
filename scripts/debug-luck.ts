/**
 * Debug script to trace luck calculation for a specific manager
 * Usage: npx tsx scripts/debug-luck.ts <leagueId> <entryId>
 */

import { getDatabase } from '../src/lib/db';
import { calculateGWLuck } from '../src/lib/luckCalculator';

async function debugLuck(leagueId: number, entryId: number) {
  const db = await getDatabase();

  // Get manager name
  const managerResult = await db.query(
    'SELECT player_name, team_name FROM managers WHERE entry_id = $1',
    [entryId]
  );
  const manager = managerResult.rows[0];
  console.log(`\n📊 Luck Analysis for: ${manager.player_name} (${manager.team_name})`);
  console.log('='.repeat(80));

  // Get all matches for this manager
  const matchesResult = await db.query(`
    SELECT
      hm.*,
      m1.player_name as opponent_name,
      m1.team_name as opponent_team
    FROM h2h_matches hm
    LEFT JOIN managers m1 ON (
      CASE
        WHEN hm.entry_1_id = $1 THEN hm.entry_2_id
        ELSE hm.entry_1_id
      END = m1.entry_id
    )
    WHERE (hm.entry_1_id = $1 OR hm.entry_2_id = $1)
      AND hm.league_id = $2
      AND (hm.entry_1_points > 0 OR hm.entry_2_points > 0)
    ORDER BY hm.event ASC
  `, [entryId, leagueId]);

  const matches = matchesResult.rows;

  // Get all points for all managers in all GWs
  const allPointsResult = await db.query(`
    SELECT entry_id, event, points
    FROM manager_gw_history
    WHERE league_id = $1
    ORDER BY event, entry_id
  `, [leagueId]);

  // Group points by GW
  const pointsByGW: Record<number, Record<number, number>> = {};
  allPointsResult.rows.forEach((row: any) => {
    const gw = row.event;
    if (!pointsByGW[gw]) pointsByGW[gw] = {};
    pointsByGW[gw][row.entry_id] = row.points;
  });

  // Calculate progressive season averages
  const allGWs = Object.keys(pointsByGW).map(Number).sort((a, b) => a - b);
  const seasonAvgsByGW: Record<number, Record<number, number>> = {};

  for (const gw of allGWs) {
    seasonAvgsByGW[gw] = {};
    const allEntryIds = new Set<number>();
    allPointsResult.rows.forEach(row => allEntryIds.add(row.entry_id));

    for (const entryIdNum of Array.from(allEntryIds)) {
      const pointsUpToGW: number[] = [];
      for (let g = allGWs[0]; g <= gw; g++) {
        if (pointsByGW[g]?.[entryIdNum] !== undefined) {
          pointsUpToGW.push(pointsByGW[g][entryIdNum]);
        }
      }
      if (pointsUpToGW.length > 0) {
        seasonAvgsByGW[gw][entryIdNum] = pointsUpToGW.reduce((a, b) => a + b, 0) / pointsUpToGW.length;
      }
    }
  }

  // Get chip usage
  const chipsResult = await db.query(`
    SELECT entry_id, event, chip_name
    FROM manager_chips
    WHERE league_id = $1
  `, [leagueId]);

  const chipsByGW: Record<number, Set<number>> = {};
  chipsResult.rows.forEach((row: any) => {
    const gw = row.event;
    if (!chipsByGW[gw]) chipsByGW[gw] = new Set();
    chipsByGW[gw].add(row.entry_id);
  });

  // Calculate luck for each match
  let totalLuck = 0;
  console.log('\nGameweek-by-Gameweek Breakdown:\n');

  for (const match of matches) {
    const isEntry1 = Number(match.entry_1_id) === entryId;
    const yourPoints = isEntry1 ? Number(match.entry_1_points) : Number(match.entry_2_points);
    const opponentPoints = isEntry1 ? Number(match.entry_2_points) : Number(match.entry_1_points);
    const opponentId = isEntry1 ? Number(match.entry_2_id) : Number(match.entry_1_id);
    const winner = match.winner ? Number(match.winner) : null;
    const gw = Number(match.event);

    let result: 'win' | 'draw' | 'loss';
    if (winner === null) {
      result = 'draw';
    } else if (winner === entryId) {
      result = 'win';
    } else {
      result = 'loss';
    }

    // Get other teams' points
    const allGWPoints = pointsByGW[gw];
    if (!allGWPoints) continue;

    const otherTeamsPoints = Object.entries(allGWPoints)
      .filter(([id]) => parseInt(id) !== entryId)
      .map(([, pts]) => Number(pts));

    // Get season averages
    const yourAvg = seasonAvgsByGW[gw]?.[entryId] || yourPoints;
    const opponentAvg = seasonAvgsByGW[gw]?.[opponentId] || opponentPoints;

    // Check if opponent played chip
    const opponentPlayedChip = chipsByGW[gw]?.has(opponentId) || false;

    // Calculate luck with detailed breakdown
    const gwLuck = calculateGWLuck(
      yourPoints, otherTeamsPoints,
      yourAvg, opponentAvg, opponentPoints, opponentPlayedChip,
      result
    );

    totalLuck += gwLuck;

    // Manual calculation for breakdown (K-163b: 20/60/20 weights, K-163c: zero-sum variance)
    const outscored = otherTeamsPoints.filter(p => yourPoints > p).length;
    const drawn = otherTeamsPoints.filter(p => yourPoints === p).length;
    const expected = otherTeamsPoints.length > 0
      ? (outscored + drawn * 0.5) / otherTeamsPoints.length
      : 0;
    const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const rankLuck = (actual - expected) * 10 * 0.2; // K-163b: 0.2 weight

    const yourSwing = yourPoints - yourAvg;
    const theirSwing = opponentPoints - opponentAvg;
    const netSwing = yourSwing - theirSwing;
    const normalized = Math.max(-1, Math.min(1, netSwing / 30));
    const varianceLuck = normalized * 10 * 0.6; // K-163c: zero-sum (no result checking)

    const chipLuck = !opponentPlayedChip ? 0 : result === 'win' ? 2 : result === 'loss' ? -2 : 0;

    console.log(`GW${gw}: ${yourPoints} vs ${opponentPoints} (${match.opponent_name}) - ${result.toUpperCase()}`);
    console.log(`  Your avg: ${yourAvg.toFixed(1)} | Opponent avg: ${opponentAvg.toFixed(1)}`);
    console.log(`  Rank: ${rankLuck.toFixed(2)} (outscored ${outscored}/${otherTeamsPoints.length}, expected ${(expected*100).toFixed(0)}%, actual ${(actual*100).toFixed(0)}%)`);
    console.log(`  Variance: ${varianceLuck.toFixed(2)} (your swing: ${yourSwing.toFixed(1)}, their swing: ${theirSwing.toFixed(1)}, net: ${netSwing.toFixed(1)})`);
    console.log(`  Chip: ${chipLuck.toFixed(2)} (opponent chip: ${opponentPlayedChip ? 'YES' : 'NO'})`);
    console.log(`  TOTAL: ${gwLuck.toFixed(2)}`);
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`SEASON TOTAL LUCK: ${Math.round(totalLuck)}`);
  console.log('');

  await db.end();
}

// Parse command line arguments
const leagueId = parseInt(process.argv[2]);
const entryId = parseInt(process.argv[3]);

if (isNaN(leagueId) || isNaN(entryId)) {
  console.error('Usage: npx tsx scripts/debug-luck.ts <leagueId> <entryId>');
  console.error('Example: npx tsx scripts/debug-luck.ts 804742 129136');
  process.exit(1);
}

debugLuck(leagueId, entryId).catch(console.error);
