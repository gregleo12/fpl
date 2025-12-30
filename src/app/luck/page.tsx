/**
 * K-163d: Luck Analysis Debug Page
 *
 * Hardcoded to league 804742 for formula analysis
 * Shows all luck calculations with raw values
 */

import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const LEAGUE_ID = 804742;

interface Match {
  event: number;
  entry_1_id: number;
  entry_1_points: number;
  entry_2_id: number;
  entry_2_points: number;
  winner: number | null;
  entry_1_name: string;
  entry_2_name: string;
}

interface ManagerGWPoints {
  entry_id: number;
  event: number;
  points: number;
}

interface ChipUsage {
  entry_id: number;
  event: number;
  chip_name: string;
}

interface Manager {
  entry_id: number;
  player_name: string;
  team_name: string;
}

export default async function LuckDebugPage() {
  const db = await getDatabase();

  // Fetch all data
  const managersResult = await db.query(`
    SELECT m.entry_id, m.player_name, m.team_name
    FROM managers m
    JOIN league_standings ls ON ls.entry_id = m.entry_id
    WHERE ls.league_id = $1
    ORDER BY m.player_name
  `, [LEAGUE_ID]);
  const managers: Manager[] = managersResult.rows;
  const managerMap: Record<number, Manager> = {};
  managers.forEach(m => managerMap[m.entry_id] = m);

  const matchesResult = await db.query(`
    SELECT
      hm.event,
      hm.entry_1_id,
      hm.entry_1_points,
      hm.entry_2_id,
      hm.entry_2_points,
      hm.winner,
      m1.player_name as entry_1_name,
      m2.player_name as entry_2_name
    FROM h2h_matches hm
    LEFT JOIN managers m1 ON m1.entry_id = hm.entry_1_id
    LEFT JOIN managers m2 ON m2.entry_id = hm.entry_2_id
    WHERE hm.league_id = $1
      AND (hm.entry_1_points > 0 OR hm.entry_2_points > 0)
    ORDER BY hm.event, hm.entry_1_id
  `, [LEAGUE_ID]);
  const matches: Match[] = matchesResult.rows;

  const gwPointsResult = await db.query(`
    SELECT entry_id, event, points
    FROM manager_gw_history
    WHERE league_id = $1
    ORDER BY event, entry_id
  `, [LEAGUE_ID]);
  const allGWPoints: ManagerGWPoints[] = gwPointsResult.rows;

  const chipsResult = await db.query(`
    SELECT entry_id, event, chip_name
    FROM manager_chips
    WHERE league_id = $1
    ORDER BY event, entry_id
  `, [LEAGUE_ID]);
  const chips: ChipUsage[] = chipsResult.rows;

  // Build data structures
  const pointsByGW: Record<number, Record<number, number>> = {};
  allGWPoints.forEach(row => {
    if (!pointsByGW[row.event]) pointsByGW[row.event] = {};
    pointsByGW[row.event][row.entry_id] = row.points;
  });

  const chipsByGW: Record<number, Set<number>> = {};
  chips.forEach(chip => {
    if (!chipsByGW[chip.event]) chipsByGW[chip.event] = new Set();
    chipsByGW[chip.event].add(Number(chip.entry_id)); // Ensure number type
  });

  // Calculate progressive season averages
  const allGWs = Object.keys(pointsByGW).map(Number).sort((a, b) => a - b);
  const seasonAvgsByGW: Record<number, Record<number, number>> = {};

  for (const gw of allGWs) {
    seasonAvgsByGW[gw] = {};
    const allEntryIds = new Set<number>();
    allGWPoints.forEach(row => allEntryIds.add(row.entry_id));

    for (const entryId of Array.from(allEntryIds)) {
      const pointsUpToGW: number[] = [];
      for (let g = allGWs[0]; g <= gw; g++) {
        if (pointsByGW[g]?.[entryId] !== undefined) {
          pointsUpToGW.push(pointsByGW[g][entryId]);
        }
      }
      if (pointsUpToGW.length > 0) {
        seasonAvgsByGW[gw][entryId] = pointsUpToGW.reduce((a, b) => a + b, 0) / pointsUpToGW.length;
      }
    }
  }

  // Calculate rank luck for each manager in each GW
  interface RankLuckRow {
    gw: number;
    manager: string;
    points: number;
    rank: number;
    outscored: number;
    total: number;
    expectedWin: number;
    actual: number;
    rankLuck: number;
  }

  const rankLuckData: RankLuckRow[] = [];
  const rankLuckByManagerGW: Record<string, number> = {}; // key: "entryId-gw"

  for (const gw of allGWs) {
    const gwPoints = pointsByGW[gw];
    if (!gwPoints) continue;

    // Calculate ranks for this GW
    const sortedPoints = Object.entries(gwPoints)
      .map(([id, pts]) => ({ id: parseInt(id), pts }))
      .sort((a, b) => b.pts - a.pts);

    const ranks: Record<number, number> = {};
    sortedPoints.forEach((entry, idx) => {
      ranks[entry.id] = idx + 1;
    });

    // For each manager, calculate their rank luck
    for (const match of matches.filter(m => m.event === gw)) {
      for (const side of [1, 2]) {
        const entryId = side === 1 ? match.entry_1_id : match.entry_2_id;
        const points = side === 1 ? match.entry_1_points : match.entry_2_points;
        const winner = match.winner;

        // Get all other teams' points
        const otherPoints = Object.entries(gwPoints)
          .filter(([id]) => parseInt(id) !== entryId)
          .map(([, pts]) => pts);

        const outscored = otherPoints.filter(p => points > p).length;
        const drawn = otherPoints.filter(p => points === p).length;
        const expectedWin = otherPoints.length > 0
          ? (outscored + drawn * 0.5) / otherPoints.length
          : 0;

        let actual = 0.5; // draw
        if (winner === null) {
          actual = 0.5;
        } else if (winner === entryId) {
          actual = 1;
        } else {
          actual = 0;
        }

        const rankLuck = actual - expectedWin;

        rankLuckData.push({
          gw,
          manager: managerMap[entryId]?.player_name || 'Unknown',
          points,
          rank: ranks[entryId] || 0,
          outscored,
          total: otherPoints.length,
          expectedWin,
          actual,
          rankLuck
        });

        rankLuckByManagerGW[`${entryId}-${gw}`] = rankLuck;
      }
    }
  }

  // Calculate variance luck for each match
  interface VarianceLuckRow {
    gw: number;
    manager1: string;
    score1: number;
    avg1: number;
    swing1: number;
    manager2: string;
    score2: number;
    avg2: number;
    swing2: number;
    netSwing: number;
    varLuck1: number;
    varLuck2: number;
  }

  const varianceLuckData: VarianceLuckRow[] = [];
  const varianceLuckByManagerGW: Record<string, number> = {}; // key: "entryId-gw"

  for (const match of matches) {
    const gw = match.event;
    const avg1 = seasonAvgsByGW[gw]?.[match.entry_1_id] || match.entry_1_points;
    const avg2 = seasonAvgsByGW[gw]?.[match.entry_2_id] || match.entry_2_points;

    const swing1 = match.entry_1_points - avg1;
    const swing2 = match.entry_2_points - avg2;
    const netSwing = swing1 - swing2;

    // Raw variance luck (before weight)
    const normalized = Math.max(-1, Math.min(1, netSwing / 30));
    const varLuck1 = normalized; // raw, not scaled
    const varLuck2 = -normalized; // zero-sum

    varianceLuckData.push({
      gw,
      manager1: match.entry_1_name,
      score1: match.entry_1_points,
      avg1,
      swing1,
      manager2: match.entry_2_name,
      score2: match.entry_2_points,
      avg2,
      swing2,
      netSwing,
      varLuck1,
      varLuck2
    });

    varianceLuckByManagerGW[`${match.entry_1_id}-${gw}`] = varLuck1;
    varianceLuckByManagerGW[`${match.entry_2_id}-${gw}`] = varLuck2;
  }

  // Calculate chip luck
  interface ChipLuckRow {
    gw: number;
    chipUser: string;
    chip: string;
    userPts: number;
    opponent: string;
    oppPts: number;
    result: string;
    chipLuckUser: number;
    chipLuckOpp: number;
  }

  const chipLuckData: ChipLuckRow[] = [];
  const chipLuckByManagerGW: Record<string, number> = {}; // key: "entryId-gw"

  for (const match of matches) {
    const gw = match.event;
    const chip1 = chipsByGW[gw]?.has(Number(match.entry_1_id));
    const chip2 = chipsByGW[gw]?.has(Number(match.entry_2_id));

    if (chip1) {
      const chipName = chips.find(c => c.entry_id === match.entry_1_id && c.event === gw)?.chip_name || 'chip';
      const result = match.winner === match.entry_1_id ? 'W-L' : match.winner === match.entry_2_id ? 'L-W' : 'D-D';

      // User: no luck from own chip
      const chipLuckUser = 0;
      // Opponent: +1 if beat chip, -1 if lost to chip
      const chipLuckOpp = match.winner === match.entry_2_id ? 1 : match.winner === match.entry_1_id ? -1 : 0;

      chipLuckData.push({
        gw,
        chipUser: match.entry_1_name,
        chip: chipName,
        userPts: match.entry_1_points,
        opponent: match.entry_2_name,
        oppPts: match.entry_2_points,
        result,
        chipLuckUser,
        chipLuckOpp
      });

      chipLuckByManagerGW[`${match.entry_1_id}-${gw}`] = chipLuckUser;
      chipLuckByManagerGW[`${match.entry_2_id}-${gw}`] = (chipLuckByManagerGW[`${match.entry_2_id}-${gw}`] || 0) + chipLuckOpp;
    }

    if (chip2) {
      const chipName = chips.find(c => c.entry_id === match.entry_2_id && c.event === gw)?.chip_name || 'chip';
      const result = match.winner === match.entry_2_id ? 'W-L' : match.winner === match.entry_1_id ? 'L-W' : 'D-D';

      const chipLuckUser = 0;
      const chipLuckOpp = match.winner === match.entry_1_id ? 1 : match.winner === match.entry_2_id ? -1 : 0;

      chipLuckData.push({
        gw,
        chipUser: match.entry_2_name,
        chip: chipName,
        userPts: match.entry_2_points,
        opponent: match.entry_1_name,
        oppPts: match.entry_1_points,
        result,
        chipLuckUser,
        chipLuckOpp
      });

      chipLuckByManagerGW[`${match.entry_2_id}-${gw}`] = (chipLuckByManagerGW[`${match.entry_2_id}-${gw}`] || 0) + chipLuckUser;
      chipLuckByManagerGW[`${match.entry_1_id}-${gw}`] = (chipLuckByManagerGW[`${match.entry_1_id}-${gw}`] || 0) + chipLuckOpp;
    }
  }

  // Calculate combined summary
  interface CombinedRow {
    manager: string;
    record: string;
    rankLuck: number;
    varLuck: number;
    chipLuck: number;
    total: number;
  }

  const combinedData: CombinedRow[] = [];

  for (const manager of managers) {
    const entryId = manager.entry_id;

    // Calculate W-D-L
    const managerMatches = matches.filter(m => m.entry_1_id === entryId || m.entry_2_id === entryId);
    const wins = managerMatches.filter(m => m.winner === entryId).length;
    const draws = managerMatches.filter(m => m.winner === null).length;
    const losses = managerMatches.filter(m => m.winner && m.winner !== entryId).length;

    // Sum up raw luck components
    let totalRankLuck = 0;
    let totalVarLuck = 0;
    let totalChipLuck = 0;

    for (const gw of allGWs) {
      const key = `${entryId}-${gw}`;
      totalRankLuck += rankLuckByManagerGW[key] || 0;
      totalVarLuck += varianceLuckByManagerGW[key] || 0;
      totalChipLuck += chipLuckByManagerGW[key] || 0;
    }

    // Apply weights and scaling (20/60/20)
    const rankLuckWeighted = totalRankLuck * 10 * 0.2;
    const varLuckWeighted = totalVarLuck * 10 * 0.6;
    const chipLuckWeighted = totalChipLuck * 10 * 0.2;
    const total = rankLuckWeighted + varLuckWeighted + chipLuckWeighted;

    combinedData.push({
      manager: manager.player_name,
      record: `${wins}-${draws}-${losses}`,
      rankLuck: rankLuckWeighted,
      varLuck: varLuckWeighted,
      chipLuck: chipLuckWeighted,
      total
    });
  }

  // Sort by total luck descending
  combinedData.sort((a, b) => b.total - a.total);

  // Calculate league totals
  const leagueTotals = {
    rankLuck: combinedData.reduce((sum, row) => sum + row.rankLuck, 0),
    varLuck: combinedData.reduce((sum, row) => sum + row.varLuck, 0),
    chipLuck: combinedData.reduce((sum, row) => sum + row.chipLuck, 0),
    total: combinedData.reduce((sum, row) => sum + row.total, 0)
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-[1600px] mx-auto">
        <h1 className="text-3xl font-bold mb-2">K-163d: Luck Analysis Debug Page</h1>
        <p className="text-gray-400 mb-8">League 804742 • Formula: 20% Rank + 60% Variance + 20% Chip</p>

        {/* Table 1: All H2H Matches */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">1. All H2H Matches (Raw Data)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="border border-gray-700 px-3 py-2">GW</th>
                  <th className="border border-gray-700 px-3 py-2">Manager 1</th>
                  <th className="border border-gray-700 px-3 py-2">Pts</th>
                  <th className="border border-gray-700 px-3 py-2">vs</th>
                  <th className="border border-gray-700 px-3 py-2">Pts</th>
                  <th className="border border-gray-700 px-3 py-2">Manager 2</th>
                  <th className="border border-gray-700 px-3 py-2">Result</th>
                  <th className="border border-gray-700 px-3 py-2">Winner</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match, idx) => {
                  const result = match.winner === match.entry_1_id ? 'W-L' :
                                 match.winner === match.entry_2_id ? 'L-W' : 'D-D';
                  const winner = match.winner ? managerMap[match.winner]?.player_name : 'Draw';

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}>
                      <td className="border border-gray-700 px-3 py-2 text-center">{match.event}</td>
                      <td className="border border-gray-700 px-3 py-2">{match.entry_1_name}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{match.entry_1_points}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center text-gray-500">vs</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{match.entry_2_points}</td>
                      <td className="border border-gray-700 px-3 py-2">{match.entry_2_name}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{result}</td>
                      <td className="border border-gray-700 px-3 py-2">{winner}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Table 2: Rank Luck */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">2. Rank Luck (per GW per manager)</h2>
          <p className="text-sm text-gray-400 mb-2">Raw values before 0.2 weight applied</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="border border-gray-700 px-3 py-2">GW</th>
                  <th className="border border-gray-700 px-3 py-2">Manager</th>
                  <th className="border border-gray-700 px-3 py-2">Points</th>
                  <th className="border border-gray-700 px-3 py-2">League Rank</th>
                  <th className="border border-gray-700 px-3 py-2">Outscored</th>
                  <th className="border border-gray-700 px-3 py-2">Expected Win%</th>
                  <th className="border border-gray-700 px-3 py-2">Actual</th>
                  <th className="border border-gray-700 px-3 py-2">Rank Luck</th>
                </tr>
              </thead>
              <tbody>
                {rankLuckData.map((row, idx) => {
                  const luckColor = row.rankLuck > 0 ? 'text-green-400' : row.rankLuck < 0 ? 'text-red-400' : 'text-white';

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}>
                      <td className="border border-gray-700 px-3 py-2 text-center">{row.gw}</td>
                      <td className="border border-gray-700 px-3 py-2">{row.manager}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{row.points}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center">{row.rank}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center">{row.outscored}/{row.total}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{(row.expectedWin * 100).toFixed(0)}%</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{(row.actual * 100).toFixed(0)}%</td>
                      <td className={`border border-gray-700 px-3 py-2 text-center font-mono ${luckColor}`}>
                        {row.rankLuck >= 0 ? '+' : ''}{row.rankLuck.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Table 3: Variance Luck */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">3. Variance Luck (per match)</h2>
          <p className="text-sm text-gray-400 mb-2">Raw values before 0.6 weight applied • Zero-sum: M1 + M2 = 0</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="border border-gray-700 px-2 py-2">GW</th>
                  <th className="border border-gray-700 px-2 py-2">Manager 1</th>
                  <th className="border border-gray-700 px-2 py-2">Score</th>
                  <th className="border border-gray-700 px-2 py-2">Avg</th>
                  <th className="border border-gray-700 px-2 py-2">Swing</th>
                  <th className="border border-gray-700 px-2 py-2">Manager 2</th>
                  <th className="border border-gray-700 px-2 py-2">Score</th>
                  <th className="border border-gray-700 px-2 py-2">Avg</th>
                  <th className="border border-gray-700 px-2 py-2">Swing</th>
                  <th className="border border-gray-700 px-2 py-2">Net Swing</th>
                  <th className="border border-gray-700 px-2 py-2">M1 Var Luck</th>
                  <th className="border border-gray-700 px-2 py-2">M2 Var Luck</th>
                </tr>
              </thead>
              <tbody>
                {varianceLuckData.map((row, idx) => {
                  const swing1Color = row.swing1 > 0 ? 'text-green-400' : row.swing1 < 0 ? 'text-red-400' : 'text-white';
                  const swing2Color = row.swing2 > 0 ? 'text-green-400' : row.swing2 < 0 ? 'text-red-400' : 'text-white';
                  const netColor = row.netSwing > 0 ? 'text-green-400' : row.netSwing < 0 ? 'text-red-400' : 'text-white';
                  const luck1Color = row.varLuck1 > 0 ? 'text-green-400' : row.varLuck1 < 0 ? 'text-red-400' : 'text-white';
                  const luck2Color = row.varLuck2 > 0 ? 'text-green-400' : row.varLuck2 < 0 ? 'text-red-400' : 'text-white';

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}>
                      <td className="border border-gray-700 px-2 py-2 text-center">{row.gw}</td>
                      <td className="border border-gray-700 px-2 py-2">{row.manager1}</td>
                      <td className="border border-gray-700 px-2 py-2 text-center font-mono">{row.score1}</td>
                      <td className="border border-gray-700 px-2 py-2 text-center font-mono text-gray-400">{row.avg1.toFixed(1)}</td>
                      <td className={`border border-gray-700 px-2 py-2 text-center font-mono ${swing1Color}`}>
                        {row.swing1 >= 0 ? '+' : ''}{row.swing1.toFixed(1)}
                      </td>
                      <td className="border border-gray-700 px-2 py-2">{row.manager2}</td>
                      <td className="border border-gray-700 px-2 py-2 text-center font-mono">{row.score2}</td>
                      <td className="border border-gray-700 px-2 py-2 text-center font-mono text-gray-400">{row.avg2.toFixed(1)}</td>
                      <td className={`border border-gray-700 px-2 py-2 text-center font-mono ${swing2Color}`}>
                        {row.swing2 >= 0 ? '+' : ''}{row.swing2.toFixed(1)}
                      </td>
                      <td className={`border border-gray-700 px-2 py-2 text-center font-mono ${netColor}`}>
                        {row.netSwing >= 0 ? '+' : ''}{row.netSwing.toFixed(1)}
                      </td>
                      <td className={`border border-gray-700 px-2 py-2 text-center font-mono ${luck1Color}`}>
                        {row.varLuck1 >= 0 ? '+' : ''}{row.varLuck1.toFixed(2)}
                      </td>
                      <td className={`border border-gray-700 px-2 py-2 text-center font-mono ${luck2Color}`}>
                        {row.varLuck2 >= 0 ? '+' : ''}{row.varLuck2.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Table 4: Chip Luck */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">4. Chip Luck (matches with chips)</h2>
          <p className="text-sm text-gray-400 mb-2">Raw values before 0.2 weight applied • User gets 0 (own decision)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="border border-gray-700 px-3 py-2">GW</th>
                  <th className="border border-gray-700 px-3 py-2">Chip User</th>
                  <th className="border border-gray-700 px-3 py-2">Chip</th>
                  <th className="border border-gray-700 px-3 py-2">Pts</th>
                  <th className="border border-gray-700 px-3 py-2">vs</th>
                  <th className="border border-gray-700 px-3 py-2">Opponent</th>
                  <th className="border border-gray-700 px-3 py-2">Pts</th>
                  <th className="border border-gray-700 px-3 py-2">Result</th>
                  <th className="border border-gray-700 px-3 py-2">Chip Luck (User)</th>
                  <th className="border border-gray-700 px-3 py-2">Chip Luck (Opp)</th>
                </tr>
              </thead>
              <tbody>
                {chipLuckData.map((row, idx) => {
                  const oppLuckColor = row.chipLuckOpp > 0 ? 'text-green-400' : row.chipLuckOpp < 0 ? 'text-red-400' : 'text-white';

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}>
                      <td className="border border-gray-700 px-3 py-2 text-center">{row.gw}</td>
                      <td className="border border-gray-700 px-3 py-2">{row.chipUser}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono text-purple-400">{row.chip}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{row.userPts}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center text-gray-500">vs</td>
                      <td className="border border-gray-700 px-3 py-2">{row.opponent}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{row.oppPts}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{row.result}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono text-gray-500">
                        {row.chipLuckUser.toFixed(2)}
                      </td>
                      <td className={`border border-gray-700 px-3 py-2 text-center font-mono ${oppLuckColor}`}>
                        {row.chipLuckOpp >= 0 ? '+' : ''}{row.chipLuckOpp.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Table 5: Combined Summary */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">5. Combined Luck Summary (Season Totals)</h2>
          <p className="text-sm text-gray-400 mb-2">Weighted and scaled (×10): Rank ×0.2, Variance ×0.6, Chip ×0.2</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="border border-gray-700 px-3 py-2">Rank</th>
                  <th className="border border-gray-700 px-3 py-2">Manager</th>
                  <th className="border border-gray-700 px-3 py-2">W-D-L</th>
                  <th className="border border-gray-700 px-3 py-2">Rank Luck</th>
                  <th className="border border-gray-700 px-3 py-2">Var Luck</th>
                  <th className="border border-gray-700 px-3 py-2">Chip Luck</th>
                  <th className="border border-gray-700 px-3 py-2 bg-gray-700">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {combinedData.map((row, idx) => {
                  const rankColor = row.rankLuck > 0 ? 'text-green-400' : row.rankLuck < 0 ? 'text-red-400' : 'text-white';
                  const varColor = row.varLuck > 0 ? 'text-green-400' : row.varLuck < 0 ? 'text-red-400' : 'text-white';
                  const chipColor = row.chipLuck > 0 ? 'text-green-400' : row.chipLuck < 0 ? 'text-red-400' : 'text-white';
                  const totalColor = row.total > 0 ? 'text-green-400' : row.total < 0 ? 'text-red-400' : 'text-white';

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}>
                      <td className="border border-gray-700 px-3 py-2 text-center">{idx + 1}</td>
                      <td className="border border-gray-700 px-3 py-2">{row.manager}</td>
                      <td className="border border-gray-700 px-3 py-2 text-center font-mono">{row.record}</td>
                      <td className={`border border-gray-700 px-3 py-2 text-center font-mono ${rankColor}`}>
                        {row.rankLuck >= 0 ? '+' : ''}{row.rankLuck.toFixed(2)}
                      </td>
                      <td className={`border border-gray-700 px-3 py-2 text-center font-mono ${varColor}`}>
                        {row.varLuck >= 0 ? '+' : ''}{row.varLuck.toFixed(2)}
                      </td>
                      <td className={`border border-gray-700 px-3 py-2 text-center font-mono ${chipColor}`}>
                        {row.chipLuck >= 0 ? '+' : ''}{row.chipLuck.toFixed(2)}
                      </td>
                      <td className={`border border-gray-700 px-3 py-2 text-center font-mono font-bold ${totalColor} bg-gray-700`}>
                        {row.total >= 0 ? '+' : ''}{row.total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-700 font-bold">
                  <td className="border border-gray-700 px-3 py-2" colSpan={2}>LEAGUE TOTALS (should be ~0)</td>
                  <td className="border border-gray-700 px-3 py-2"></td>
                  <td className="border border-gray-700 px-3 py-2 text-center font-mono">
                    {leagueTotals.rankLuck >= 0 ? '+' : ''}{leagueTotals.rankLuck.toFixed(2)}
                  </td>
                  <td className="border border-gray-700 px-3 py-2 text-center font-mono">
                    {leagueTotals.varLuck >= 0 ? '+' : ''}{leagueTotals.varLuck.toFixed(2)}
                  </td>
                  <td className="border border-gray-700 px-3 py-2 text-center font-mono">
                    {leagueTotals.chipLuck >= 0 ? '+' : ''}{leagueTotals.chipLuck.toFixed(2)}
                  </td>
                  <td className="border border-gray-700 px-3 py-2 text-center font-mono bg-gray-600">
                    {leagueTotals.total >= 0 ? '+' : ''}{leagueTotals.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-center text-gray-500 text-sm mt-12">
          <p>K-163d Debug Page • Formula: 20% Rank + 60% Variance + 20% Chip</p>
          <p>Variance is zero-sum • Chip luck: user = 0 (own decision), opponent = ±1</p>
        </footer>
      </div>
    </div>
  );
}
