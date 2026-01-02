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

    // K-163k Debug: Log data counts
    console.log('[K-163k API Debug]', {
      leagueId,
      managersCount: managers.length,
      matchesCount: matches.length,
      gwPointsCount: allGWPoints.length,
      sampleMatch: matches[0],
      sampleGWPoints: allGWPoints[0]
    });

    // Get chip data
    const chipsResult = await db.query(`
      SELECT entry_id, event, chip_name
      FROM manager_chips
      WHERE league_id = $1
      ORDER BY event, entry_id
    `, [leagueId]);
    const chips = chipsResult.rows;

    // Build data structures (convert entry_id to number for consistent typing)
    const pointsByGW: Record<number, Record<number, number>> = {};
    allGWPoints.forEach(row => {
      if (!pointsByGW[row.event]) pointsByGW[row.event] = {};
      const entryIdNum = parseInt(String(row.entry_id));
      pointsByGW[row.event][entryIdNum] = row.points;
    });

    const allGWs = Object.keys(pointsByGW).map(Number).sort((a, b) => a - b);
    const currentGW = Math.max(...allGWs);

    // Calculate progressive season averages
    const seasonAvgsByGW: Record<number, Record<number, number>> = {};
    for (const gw of allGWs) {
      seasonAvgsByGW[gw] = {};
      const allEntryIds = new Set<number>();
      allGWPoints.forEach(row => allEntryIds.add(parseInt(String(row.entry_id))));

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

    // K-163L: Helper function to calculate progressive average up to a specific GW
    // This fixes the schedule luck calculation to use each opponent's average AT THE TIME you played them
    const getProgressiveAverage = (
      entryId: number,
      upToGW: number,
      pointsByGW: Record<number, Record<number, number>>
    ): number => {
      let total = 0;
      let count = 0;

      for (let gw = 1; gw <= upToGW; gw++) {
        if (pointsByGW[gw]?.[entryId] !== undefined) {
          total += pointsByGW[gw][entryId];
          count++;
        }
      }

      return count > 0 ? total / count : 0;
    };

    const matchGWs = Array.from(new Set(matches.map(m => m.event))).sort((a, b) => a - b);

    // Still calculate final season averages for other luck components (variance, rank)
    const finalSeasonAvgs: Record<number, number> = {};
    for (const manager of managers) {
      const mEntryId = parseInt(String(manager.entry_id));
      const points: number[] = [];
      for (const gw of matchGWs) {
        if (pointsByGW[gw]?.[mEntryId] !== undefined) {
          points.push(pointsByGW[gw][mEntryId]);
        }
      }
      if (points.length > 0) {
        finalSeasonAvgs[mEntryId] = points.reduce((a, b) => a + b, 0) / points.length;
      }
    }

    // K-163k Debug: Verify finalSeasonAvgs is populated correctly
    console.log('[K-163k Season Avgs Debug]', {
      allGWsCount: allGWs.length,
      allGWs: allGWs,
      matchGWsCount: matchGWs.length,
      matchGWs: matchGWs,
      pointsByGWKeys: Object.keys(pointsByGW),
      sampleGW1Data: pointsByGW[1],
      sampleGW19Data: pointsByGW[19],
      managersCount: managers.length,
      finalSeasonAvgsCount: Object.keys(finalSeasonAvgs).length,
      sampleSeasonAvgs: Object.entries(finalSeasonAvgs).slice(0, 3).map(([id, avg]) => ({
        entry_id: id,
        avg: avg.toFixed(2)
      })),
      allSeasonAvgsZero: Object.values(finalSeasonAvgs).every(v => v === 0),
      totalAllAvgs: Object.values(finalSeasonAvgs).reduce((sum, avg) => sum + avg, 0)
    });

    // Process chips
    const chipsByGW: Record<number, Set<number>> = {};
    chips.forEach(chip => {
      if (!chipsByGW[chip.event]) chipsByGW[chip.event] = new Set();
      chipsByGW[chip.event].add(Number(chip.entry_id));
    });

    const chipsByManager: Record<number, number> = {}; // count of chips played by each manager
    chips.forEach(chip => {
      const chipEntryId = parseInt(String(chip.entry_id));
      chipsByManager[chipEntryId] = (chipsByManager[chipEntryId] || 0) + 1;
    });

    // Pre-calculate chips faced by each manager for correct zero-sum average
    const chipsFacedByManager: Record<number, number> = {};
    for (const match of matches) {
      const gw = match.event;
      const entry1Id = parseInt(String(match.entry_1_id));
      const entry2Id = parseInt(String(match.entry_2_id));

      // Check if entry1 faced a chip from entry2
      if (chipsByGW[gw]?.has(entry2Id)) {
        chipsFacedByManager[entry1Id] = (chipsFacedByManager[entry1Id] || 0) + 1;
      }

      // Check if entry2 faced a chip from entry1
      if (chipsByGW[gw]?.has(entry1Id)) {
        chipsFacedByManager[entry2Id] = (chipsFacedByManager[entry2Id] || 0) + 1;
      }
    }

    // Calculate correct average chips faced (for zero-sum)
    const totalChipsFaced = Object.values(chipsFacedByManager).reduce((sum, count) => sum + count, 0);
    const avgChipsFaced = managers.length > 0 ? totalChipsFaced / managers.length : 0;

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
        // Create a copy to avoid mutating pointsByGW
        const gwPoints = { ...(pointsByGW[gw] || {}) };

        // If this manager's points aren't in pointsByGW (missing from manager_gw_history),
        // add them using their match points as fallback
        if (gwPoints[entryId] === undefined && yourPoints > 0) {
          gwPoints[entryId] = yourPoints;
        }

        const sortedPoints = Object.entries(gwPoints)
          .map(([id, pts]) => ({ id: Number(id), pts: Number(pts) }))
          .sort((a, b) => b.pts - a.pts);

        const yourRank = sortedPoints.findIndex(p => p.id === Number(entryId)) + 1;
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
      // K-163L: Use PROGRESSIVE averages - each opponent's average UP TO the GW you played them
      const opponentsStrengths: any[] = [];
      let totalOppStrength = 0;

      // Get this manager's final season average for display purposes
      const yourSeasonAvg = finalSeasonAvgs[entryId] || 0;

      for (const match of managerMatches) {
        const gw = match.event;
        const isEntry1 = parseInt(String(match.entry_1_id)) === entryId;
        const oppId = parseInt(String(isEntry1 ? match.entry_2_id : match.entry_1_id));
        const oppName = isEntry1 ? match.entry_2_name : match.entry_1_name;

        // K-163L FIX: Use opponent's progressive average up to this GW, not final average
        const oppAvgAtTimeOfMatch = getProgressiveAverage(oppId, gw, pointsByGW);

        totalOppStrength += oppAvgAtTimeOfMatch;
        opponentsStrengths.push({
          gw,
          opponent: oppName,
          opp_season_avg: parseFloat(oppAvgAtTimeOfMatch.toFixed(2))
        });
      }

      const avgOppStrength = managerMatches.length > 0
        ? totalOppStrength / managerMatches.length
        : 0;

      // K-163L: Calculate theoretical opponent average using progressive averages
      // For each GW, calculate what the "fair" opponent average should have been
      let theoreticalTotal = 0;

      for (const match of managerMatches) {
        const gw = match.event;

        // For this GW, calculate the average of all OTHER managers' progressive averages
        let sumOfOtherAvgs = 0;
        let countOthers = 0;

        for (const otherManager of managers) {
          const otherEntryId = parseInt(String(otherManager.entry_id));
          if (otherEntryId !== entryId) {
            sumOfOtherAvgs += getProgressiveAverage(otherEntryId, gw, pointsByGW);
            countOthers++;
          }
        }

        const theoreticalForThisGW = countOthers > 0 ? sumOfOtherAvgs / countOthers : 0;
        theoreticalTotal += theoreticalForThisGW;
      }

      const theoreticalOppAvg = managerMatches.length > 0
        ? theoreticalTotal / managerMatches.length
        : 0;

      // Schedule luck = (theoretical - actual) × games played
      // Positive = faced weaker opponents than expected (lucky)
      // Negative = faced stronger opponents than expected (unlucky)
      const scheduleLuck = (theoreticalOppAvg - avgOppStrength) * managerMatches.length;

      // K-163L Debug: Log first manager's schedule calculation with progressive averages
      if (manager === managers[0]) {
        console.log('[K-163L Schedule Debug]', {
          managerName: manager.player_name,
          entryId,
          matchesCount: managerMatches.length,
          totalOppStrength: parseFloat(totalOppStrength.toFixed(2)),
          avgOppStrength: parseFloat(avgOppStrength.toFixed(2)),
          theoreticalOppAvg: parseFloat(theoreticalOppAvg.toFixed(2)),
          scheduleLuck: parseFloat(scheduleLuck.toFixed(2)),
          sampleOpponents: opponentsStrengths.slice(0, 3),
          note: 'Now using PROGRESSIVE averages - each opponent avg UP TO the GW played'
        });
      }

      // 4. CHIP LUCK (seasonal only, zero-sum)
      const yourChipsPlayed = chipsByManager[entryId] || 0;
      const chipsFaced = chipsFacedByManager[entryId] || 0;

      // Get chip faced details for display
      const chipsFacedDetail: any[] = [];
      for (const match of managerMatches) {
        const gw = match.event;
        const isEntry1 = parseInt(String(match.entry_1_id)) === entryId;
        const oppId = parseInt(String(isEntry1 ? match.entry_2_id : match.entry_1_id));
        const oppName = isEntry1 ? match.entry_2_name : match.entry_1_name;

        if (chipsByGW[gw]?.has(oppId)) {
          const chipName = chips.find(c => parseInt(String(c.entry_id)) === oppId && c.event === gw)?.chip_name || 'chip';
          chipsFacedDetail.push({
            gw,
            opponent: oppName,
            chip: chipName
          });
        }
      }

      // Chip luck = (average - your_faced) × scale factor
      // Positive = faced fewer chips than average (lucky)
      // Negative = faced more chips than average (unlucky)
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
          theoretical_opp_avg: parseFloat(theoreticalOppAvg.toFixed(2)),
          your_season_avg: parseFloat(yourSeasonAvg.toFixed(2)),
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

    // K-163L: Validate zero-sum property for schedule luck
    const totalScheduleLuck = managersData.reduce((sum, m) => sum + m.schedule_luck.value, 0);
    const scheduleLuckIsZeroSum = Math.abs(totalScheduleLuck) < 0.01;

    console.log('[K-163L Zero-Sum Validation]', {
      totalScheduleLuck: parseFloat(totalScheduleLuck.toFixed(4)),
      isZeroSum: scheduleLuckIsZeroSum,
      expectedSum: 0,
      tolerance: 0.01
    });

    if (!scheduleLuckIsZeroSum) {
      console.warn('[K-163L] WARNING: Schedule luck does not sum to zero!', {
        totalScheduleLuck,
        expected: 0
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
