/**
 * K-163d: Luck Analysis Debug API
 *
 * Returns all luck calculations in JSON format for easy analysis
 * Hardcoded to league 804742
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const LEAGUE_ID = 804742;

export async function GET() {
  try {
    const db = await getDatabase();

    // Fetch all data
    const managersResult = await db.query(`
      SELECT m.entry_id, m.player_name, m.team_name
      FROM managers m
      JOIN league_standings ls ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
      ORDER BY m.player_name
    `, [LEAGUE_ID]);
    const managers = managersResult.rows;
    const managerMap: Record<number, any> = {};
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
    const matches = matchesResult.rows;

    const gwPointsResult = await db.query(`
      SELECT entry_id, event, points
      FROM manager_gw_history
      WHERE league_id = $1
      ORDER BY event, entry_id
    `, [LEAGUE_ID]);
    const allGWPoints = gwPointsResult.rows;

    const chipsResult = await db.query(`
      SELECT entry_id, event, chip_name
      FROM manager_chips
      WHERE league_id = $1
      ORDER BY event, entry_id
    `, [LEAGUE_ID]);
    const chips = chipsResult.rows;

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

    // Table 1: All H2H Matches
    const allMatches = matches.map(match => {
      const result = match.winner === match.entry_1_id ? 'W-L' :
                     match.winner === match.entry_2_id ? 'L-W' : 'D-D';
      const winner = match.winner ? managerMap[match.winner]?.player_name : 'Draw';

      return {
        gw: match.event,
        manager1: match.entry_1_name,
        pts1: match.entry_1_points,
        manager2: match.entry_2_name,
        pts2: match.entry_2_points,
        result,
        winner
      };
    });

    // Table 2: Rank Luck
    const rankLuckData: any[] = [];
    const rankLuckByManagerGW: Record<string, number> = {};

    for (const gw of allGWs) {
      const gwPoints = pointsByGW[gw];
      if (!gwPoints) continue;

      const sortedPoints = Object.entries(gwPoints)
        .map(([id, pts]) => ({ id: parseInt(id), pts }))
        .sort((a, b) => b.pts - a.pts);

      const ranks: Record<number, number> = {};
      sortedPoints.forEach((entry, idx) => {
        ranks[entry.id] = idx + 1;
      });

      for (const match of matches.filter(m => m.event === gw)) {
        for (const side of [1, 2]) {
          const entryId = side === 1 ? match.entry_1_id : match.entry_2_id;
          const points = side === 1 ? match.entry_1_points : match.entry_2_points;
          const winner = match.winner;

          const otherPoints = Object.entries(gwPoints)
            .filter(([id]) => parseInt(id) !== entryId)
            .map(([, pts]) => pts);

          const outscored = otherPoints.filter(p => points > p).length;
          const drawn = otherPoints.filter(p => points === p).length;
          const expectedWin = otherPoints.length > 0
            ? (outscored + drawn * 0.5) / otherPoints.length
            : 0;

          let actual = 0.5;
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
            expectedWin: parseFloat((expectedWin * 100).toFixed(1)),
            actual: parseFloat((actual * 100).toFixed(1)),
            rankLuck: parseFloat(rankLuck.toFixed(4))
          });

          rankLuckByManagerGW[`${entryId}-${gw}`] = rankLuck;
        }
      }
    }

    // Table 3: Variance Luck
    const varianceLuckData: any[] = [];
    const varianceLuckByManagerGW: Record<string, number> = {};

    for (const match of matches) {
      const gw = match.event;
      const avg1 = seasonAvgsByGW[gw]?.[match.entry_1_id] || match.entry_1_points;
      const avg2 = seasonAvgsByGW[gw]?.[match.entry_2_id] || match.entry_2_points;

      const swing1 = match.entry_1_points - avg1;
      const swing2 = match.entry_2_points - avg2;
      const netSwing = swing1 - swing2;

      const normalized = Math.max(-1, Math.min(1, netSwing / 30));
      const varLuck1 = normalized;
      const varLuck2 = -normalized;

      varianceLuckData.push({
        gw,
        manager1: match.entry_1_name,
        score1: match.entry_1_points,
        avg1: parseFloat(avg1.toFixed(1)),
        swing1: parseFloat(swing1.toFixed(1)),
        manager2: match.entry_2_name,
        score2: match.entry_2_points,
        avg2: parseFloat(avg2.toFixed(1)),
        swing2: parseFloat(swing2.toFixed(1)),
        netSwing: parseFloat(netSwing.toFixed(1)),
        varLuck1: parseFloat(varLuck1.toFixed(4)),
        varLuck2: parseFloat(varLuck2.toFixed(4))
      });

      varianceLuckByManagerGW[`${match.entry_1_id}-${gw}`] = varLuck1;
      varianceLuckByManagerGW[`${match.entry_2_id}-${gw}`] = varLuck2;
    }

    // Table 4: Chip Luck
    const chipLuckData: any[] = [];
    const chipLuckByManagerGW: Record<string, number> = {};

    for (const match of matches) {
      const gw = match.event;
      const chip1 = chipsByGW[gw]?.has(Number(match.entry_1_id));
      const chip2 = chipsByGW[gw]?.has(Number(match.entry_2_id));

      if (chip1) {
        const chipName = chips.find(c => c.entry_id === match.entry_1_id && c.event === gw)?.chip_name || 'chip';
        const result = match.winner === match.entry_1_id ? 'W-L' : match.winner === match.entry_2_id ? 'L-W' : 'D-D';

        const chipLuckUser = 0;
        const chipLuckOpp = match.winner === match.entry_2_id ? 1 : match.winner === match.entry_1_id ? -1 : 0;

        chipLuckData.push({
          gw,
          chipUser: match.entry_1_name,
          chipUserId: match.entry_1_id,
          chip: chipName,
          userPts: match.entry_1_points,
          opponent: match.entry_2_name,
          opponentId: match.entry_2_id,
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
          chipUserId: match.entry_2_id,
          chip: chipName,
          userPts: match.entry_2_points,
          opponent: match.entry_1_name,
          opponentId: match.entry_1_id,
          oppPts: match.entry_1_points,
          result,
          chipLuckUser,
          chipLuckOpp
        });

        chipLuckByManagerGW[`${match.entry_2_id}-${gw}`] = (chipLuckByManagerGW[`${match.entry_2_id}-${gw}`] || 0) + chipLuckUser;
        chipLuckByManagerGW[`${match.entry_1_id}-${gw}`] = (chipLuckByManagerGW[`${match.entry_1_id}-${gw}`] || 0) + chipLuckOpp;
      }
    }

    // Table 5: Combined Summary
    const combinedData: any[] = [];

    for (const manager of managers) {
      const entryId = manager.entry_id;

      const managerMatches = matches.filter(m => m.entry_1_id === entryId || m.entry_2_id === entryId);
      const wins = managerMatches.filter(m => m.winner === entryId).length;
      const draws = managerMatches.filter(m => m.winner === null).length;
      const losses = managerMatches.filter(m => m.winner && m.winner !== entryId).length;

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
        entryId,
        manager: manager.player_name,
        team: manager.team_name,
        record: `${wins}-${draws}-${losses}`,
        wins,
        draws,
        losses,
        rankLuck: parseFloat(rankLuckWeighted.toFixed(2)),
        varLuck: parseFloat(varLuckWeighted.toFixed(2)),
        chipLuck: parseFloat(chipLuckWeighted.toFixed(2)),
        total: parseFloat(total.toFixed(2))
      });
    }

    combinedData.sort((a, b) => b.total - a.total);

    // Calculate league totals
    const leagueTotals = {
      rankLuck: parseFloat(combinedData.reduce((sum, row) => sum + row.rankLuck, 0).toFixed(2)),
      varLuck: parseFloat(combinedData.reduce((sum, row) => sum + row.varLuck, 0).toFixed(2)),
      chipLuck: parseFloat(combinedData.reduce((sum, row) => sum + row.chipLuck, 0).toFixed(2)),
      total: parseFloat(combinedData.reduce((sum, row) => sum + row.total, 0).toFixed(2))
    };

    return NextResponse.json({
      leagueId: LEAGUE_ID,
      formula: '20% Rank + 60% Variance + 20% Chip',
      metadata: {
        totalManagers: managers.length,
        totalMatches: matches.length,
        gameweeks: allGWs,
        totalChipEvents: chips.length
      },
      tables: {
        allMatches,
        rankLuck: rankLuckData,
        varianceLuck: varianceLuckData,
        chipLuck: chipLuckData,
        combinedSummary: combinedData
      },
      leagueTotals
    });
  } catch (error: any) {
    console.error('Error in luck-debug API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate luck debug data' },
      { status: 500 }
    );
  }
}
