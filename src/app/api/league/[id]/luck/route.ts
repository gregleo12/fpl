/**
 * K-163f: Luck System V2 - Four Components
 *
 * Per-GW Components (apply every match):
 * 1. Variance Luck (zero-sum per match)
 * 2. Rank Luck (not zero-sum)
 *
 * Seasonal Components (calculated once per season):
 * 3. Schedule Luck (zero-sum)
 * 4. Chip Luck (zero-sum)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get all managers in league
    const managersResult = await db.query(`
      SELECT m.entry_id, m.player_name, m.team_name
      FROM managers m
      JOIN league_standings ls ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
      ORDER BY m.player_name
    `, [leagueId]);
    const managers = managersResult.rows;

    // Get all matches
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
    `, [leagueId]);
    const matches = matchesResult.rows;

    // Get all GW points for season averages
    const gwPointsResult = await db.query(`
      SELECT entry_id, event, points
      FROM manager_gw_history
      WHERE league_id = $1
      ORDER BY event, entry_id
    `, [leagueId]);
    const allGWPoints = gwPointsResult.rows;

    // Get chip data
    const chipsResult = await db.query(`
      SELECT entry_id, event, chip_name
      FROM manager_chips
      WHERE league_id = $1
      ORDER BY event, entry_id
    `, [leagueId]);
    const chips = chipsResult.rows;

    // Build data structures
    const pointsByGW: Record<number, Record<number, number>> = {};
    allGWPoints.forEach(row => {
      if (!pointsByGW[row.event]) pointsByGW[row.event] = {};
      pointsByGW[row.event][row.entry_id] = row.points;
    });

    const allGWs = Object.keys(pointsByGW).map(Number).sort((a, b) => a - b);
    const currentGW = Math.max(...allGWs);

    // Calculate progressive season averages
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

    // Calculate final season averages (for schedule luck)
    const finalSeasonAvgs: Record<number, number> = {};
    for (const manager of managers) {
      const mEntryId = parseInt(String(manager.entry_id));
      const points: number[] = [];
      for (const gw of allGWs) {
        if (pointsByGW[gw]?.[manager.entry_id] !== undefined) {
          points.push(pointsByGW[gw][manager.entry_id]);
        }
      }
      if (points.length > 0) {
        finalSeasonAvgs[mEntryId] = points.reduce((a, b) => a + b, 0) / points.length;
      }
    }

    // Process chips
    const chipsByGW: Record<number, Set<number>> = {};
    chips.forEach(chip => {
      if (!chipsByGW[chip.event]) chipsByGW[chip.event] = new Set();
      chipsByGW[chip.event].add(Number(chip.entry_id));
    });

    const chipsByManager: Record<number, number> = {}; // count of chips played by each manager
    const chipsFacedByManager: Record<number, number> = {}; // count of chips faced
    chips.forEach(chip => {
      const chipEntryId = parseInt(String(chip.entry_id));
      chipsByManager[chipEntryId] = (chipsByManager[chipEntryId] || 0) + 1;
    });

    // Calculate managers' luck components
    const managersData: any[] = [];

    for (const manager of managers) {
      const entryId = parseInt(String(manager.entry_id)); // Convert BIGINT string to number

      // Get this manager's matches (convert BIGINT strings to numbers for comparison)
      const managerMatches = matches.filter(m =>
        parseInt(String(m.entry_1_id)) === entryId || parseInt(String(m.entry_2_id)) === entryId
      );

      // 1. VARIANCE LUCK (per-GW, zero-sum per match)
      const variancePerGW: any[] = [];
      let totalVariance = 0;

      for (const match of managerMatches) {
        const gw = match.event;
        const isEntry1 = parseInt(String(match.entry_1_id)) === entryId;
        const yourPoints = isEntry1 ? match.entry_1_points : match.entry_2_points;
        const oppPoints = isEntry1 ? match.entry_2_points : match.entry_1_points;
        const oppId = parseInt(String(isEntry1 ? match.entry_2_id : match.entry_1_id));

        const yourAvg = seasonAvgsByGW[gw]?.[entryId] || yourPoints;
        const oppAvg = seasonAvgsByGW[gw]?.[oppId] || oppPoints;

        const yourVariance = yourPoints - yourAvg;
        const oppVariance = oppPoints - oppAvg;
        const varianceLuck = yourVariance - oppVariance;

        totalVariance += varianceLuck;

        variancePerGW.push({
          gw,
          value: parseFloat(varianceLuck.toFixed(2)),
          your_var: parseFloat(yourVariance.toFixed(2)),
          opp_var: parseFloat(oppVariance.toFixed(2)),
          opponent: isEntry1 ? match.entry_2_name : match.entry_1_name
        });
      }

      // 2. RANK LUCK (per-GW, NOT zero-sum)
      const rankPerGW: any[] = [];
      let totalRank = 0;

      for (const match of managerMatches) {
        const gw = match.event;
        const isEntry1 = parseInt(String(match.entry_1_id)) === entryId;
        const yourPoints = isEntry1 ? match.entry_1_points : match.entry_2_points;
        const winner = match.winner ? parseInt(String(match.winner)) : null;

        // Calculate GW rank
        const gwPoints = pointsByGW[gw];
        const sortedPoints = Object.entries(gwPoints || {})
          .map(([id, pts]) => ({ id: parseInt(id), pts }))
          .sort((a, b) => b.pts - a.pts);

        const yourRank = sortedPoints.findIndex(p => p.id === entryId) + 1;
        const totalManagers = sortedPoints.length;

        // Expected win probability based on rank
        const opponentsWouldBeat = totalManagers - yourRank;
        const expectedWin = opponentsWouldBeat / (totalManagers - 1);

        // Actual result
        let actualResult = 0.5; // draw
        if (winner === entryId) actualResult = 1;
        else if (winner && winner !== entryId) actualResult = 0;

        const rankLuck = actualResult - expectedWin;
        totalRank += rankLuck;

        rankPerGW.push({
          gw,
          value: parseFloat(rankLuck.toFixed(4)),
          your_rank: yourRank,
          your_points: yourPoints,
          total_managers: totalManagers,
          expected: parseFloat(expectedWin.toFixed(4)),
          result: actualResult,
          opponent: isEntry1 ? match.entry_2_name : match.entry_1_name
        });
      }

      // 3. SCHEDULE LUCK (seasonal only, zero-sum)
      const opponentsStrengths: any[] = [];
      let totalOppStrength = 0;

      for (const match of managerMatches) {
        const gw = match.event;
        const isEntry1 = parseInt(String(match.entry_1_id)) === entryId;
        const oppId = parseInt(String(isEntry1 ? match.entry_2_id : match.entry_1_id));
        const oppName = isEntry1 ? match.entry_2_name : match.entry_1_name;
        const oppSeasonAvg = finalSeasonAvgs[oppId] || 0;

        totalOppStrength += oppSeasonAvg;
        opponentsStrengths.push({
          gw,
          opponent: oppName,
          opp_season_avg: parseFloat(oppSeasonAvg.toFixed(2))
        });
      }

      const avgOppStrength = managerMatches.length > 0
        ? totalOppStrength / managerMatches.length
        : 0;

      // Calculate league average opponent strength
      let leagueAvgOppStrength = 0;
      for (const m of managers) {
        const mEntryId = parseInt(String(m.entry_id));
        const mMatches = matches.filter(match =>
          parseInt(String(match.entry_1_id)) === mEntryId || parseInt(String(match.entry_2_id)) === mEntryId
        );
        let mOppTotal = 0;
        for (const match of mMatches) {
          const isE1 = parseInt(String(match.entry_1_id)) === mEntryId;
          const oppId = parseInt(String(isE1 ? match.entry_2_id : match.entry_1_id));
          mOppTotal += finalSeasonAvgs[oppId] || 0;
        }
        leagueAvgOppStrength += mMatches.length > 0 ? mOppTotal / mMatches.length : 0;
      }
      leagueAvgOppStrength /= managers.length;

      const scheduleLuck = (leagueAvgOppStrength - avgOppStrength) * managerMatches.length;

      // 4. CHIP LUCK (seasonal only, zero-sum)
      const totalChipsPlayed = chips.length;
      const yourChipsPlayed = chipsByManager[entryId] || 0;
      const othersChipsPlayed = totalChipsPlayed - yourChipsPlayed;
      const avgChipsFaced = managers.length > 1 ? othersChipsPlayed / (managers.length - 1) : 0;

      // Count chips actually faced
      let chipsFaced = 0;
      const chipsFacedDetail: any[] = [];

      for (const match of managerMatches) {
        const gw = match.event;
        const isEntry1 = parseInt(String(match.entry_1_id)) === entryId;
        const oppId = parseInt(String(isEntry1 ? match.entry_2_id : match.entry_1_id));
        const oppName = isEntry1 ? match.entry_2_name : match.entry_1_name;

        if (chipsByGW[gw]?.has(oppId)) {
          chipsFaced++;
          const chipName = chips.find(c => parseInt(String(c.entry_id)) === oppId && c.event === gw)?.chip_name || 'chip';
          chipsFacedDetail.push({
            gw,
            opponent: oppName,
            chip: chipName
          });
        }
      }

      const chipLuck = (avgChipsFaced - chipsFaced) * 7; // Scale factor: 7 points per chip

      // Calculate indexes
      const gwLuck = variancePerGW.map((v, idx) => ({
        gw: v.gw,
        variance: v.value,
        rank: rankPerGW[idx].value,
        total: parseFloat((0.6 * (v.value / 10) + 0.4 * rankPerGW[idx].value).toFixed(4))
      }));

      const seasonLuckIndex =
        0.4 * (totalVariance / 10) +
        0.3 * totalRank +
        0.2 * (scheduleLuck / 5) +
        0.1 * (chipLuck / 3);

      managersData.push({
        entry_id: entryId,
        name: manager.player_name,
        team_name: manager.team_name,
        season_avg_points: parseFloat((finalSeasonAvgs[entryId] || 0).toFixed(2)),

        variance_luck: {
          total: parseFloat(totalVariance.toFixed(2)),
          per_gw: variancePerGW
        },

        rank_luck: {
          total: parseFloat(totalRank.toFixed(4)),
          per_gw: rankPerGW
        },

        schedule_luck: {
          value: parseFloat(scheduleLuck.toFixed(2)),
          avg_opp_strength: parseFloat(avgOppStrength.toFixed(2)),
          league_avg_opp_strength: parseFloat(leagueAvgOppStrength.toFixed(2)),
          opponents: opponentsStrengths
        },

        chip_luck: {
          value: parseFloat(chipLuck.toFixed(2)),
          chips_played: yourChipsPlayed,
          chips_faced: chipsFaced,
          avg_chips_faced: parseFloat(avgChipsFaced.toFixed(2)),
          chips_faced_detail: chipsFacedDetail
        },

        gw_luck: gwLuck,
        season_luck_index: parseFloat(seasonLuckIndex.toFixed(4))
      });
    }

    // Sort by season luck index descending
    managersData.sort((a, b) => b.season_luck_index - a.season_luck_index);

    // Calculate league totals for validation
    const leagueTotals = {
      variance_sum: parseFloat(managersData.reduce((sum, m) => sum + m.variance_luck.total, 0).toFixed(2)),
      rank_sum: parseFloat(managersData.reduce((sum, m) => sum + m.rank_luck.total, 0).toFixed(4)),
      schedule_sum: parseFloat(managersData.reduce((sum, m) => sum + m.schedule_luck.value, 0).toFixed(2)),
      chip_sum: parseFloat(managersData.reduce((sum, m) => sum + m.chip_luck.value, 0).toFixed(2))
    };

    // Calculate per-GW sums
    const perGWSums: any[] = [];
    for (const gw of allGWs) {
      const gwVarianceSum = managersData.reduce((sum, m) => {
        const gwData = m.variance_luck.per_gw.find((g: any) => g.gw === gw);
        return sum + (gwData?.value || 0);
      }, 0);

      const gwRankSum = managersData.reduce((sum, m) => {
        const gwData = m.rank_luck.per_gw.find((g: any) => g.gw === gw);
        return sum + (gwData?.value || 0);
      }, 0);

      perGWSums.push({
        gw,
        variance_sum: parseFloat(gwVarianceSum.toFixed(2)),
        rank_sum: parseFloat(gwRankSum.toFixed(4))
      });
    }

    return NextResponse.json({
      leagueId,
      currentGW,
      managers: managersData,
      league_totals: leagueTotals,
      per_gw_sums: perGWSums,
      weights: {
        gw_luck: { variance: 0.6, rank: 0.4 },
        season_luck: { variance: 0.4, rank: 0.3, schedule: 0.2, chip: 0.1 }
      },
      normalization: {
        variance: '÷ 10',
        rank: '× 1',
        schedule: '÷ 5',
        chip: '÷ 3'
      }
    });

  } catch (error: any) {
    console.error('Error calculating luck:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate luck' },
      { status: 500 }
    );
  }
}
