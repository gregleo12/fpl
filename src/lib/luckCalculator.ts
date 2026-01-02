/**
 * K-163a Part 2: 3-Component Luck Calculation
 * K-163b: Rebalanced weights to 20/60/20
 *
 * Luck = Rank Luck (20%) + Variance Luck (60%) + Chip Luck (20%)
 *
 * Scale: -10 to +10 per GW (extreme cases)
 * Season: Sum of all GW luck values (-180 to +180 theoretical max)
 */

export interface GWLuckBreakdown {
  gameweek: number;
  rankLuck: number;
  varianceLuck: number;
  chipLuck: number;
  totalLuck: number;
  result: 'win' | 'draw' | 'loss';
  yourPoints: number;
  opponentPoints: number;
}

/**
 * Component 1: Rank Luck (20% weight) [K-163b]
 * "Did your score deserve to win?"
 *
 * @param yourPoints Your team's points for the GW
 * @param allOtherPoints All other teams' points (19 opponents)
 * @param result Your H2H match result
 * @returns Rank luck (-2 to +2)
 */
export function calculateRankLuck(
  yourPoints: number,
  allOtherPoints: number[],
  result: 'win' | 'draw' | 'loss'
): number {
  const outscored = allOtherPoints.filter(p => yourPoints > p).length;
  const drawn = allOtherPoints.filter(p => yourPoints === p).length;

  const expected = allOtherPoints.length > 0
    ? (outscored + drawn * 0.5) / allOtherPoints.length
    : 0;

  const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

  // Scale: (0-1) × 10 × 0.2 = -2 to +2 [K-163b: reduced from 0.5]
  return (actual - expected) * 10 * 0.2;
}

/**
 * Component 2: Variance Luck (60% weight) [K-163b]
 * K-163c: Zero-sum calculation (your luck + opponent luck = 0)
 * "Did timing of form swings hurt/help you?"
 *
 * @param yourScore Your points this GW
 * @param yourSeasonAvg Your season average (recalculates each GW)
 * @param theirScore Opponent's points this GW
 * @param theirSeasonAvg Opponent's season average
 * @param result Match result (unused, kept for backward compatibility)
 * @returns Variance luck (-6 to +6)
 */
export function calculateVarianceLuck(
  yourScore: number,
  yourSeasonAvg: number,
  theirScore: number,
  theirSeasonAvg: number,
  result: 'win' | 'draw' | 'loss'
): number {
  const yourSwing = yourScore - yourSeasonAvg;
  const theirSwing = theirScore - theirSeasonAvg;
  const netSwing = yourSwing - theirSwing; // positive = swings favor you

  // Normalize to -1 to +1 (30 pts = extreme swing)
  const normalized = Math.max(-1, Math.min(1, netSwing / 30));

  // K-163c: Zero-sum calculation
  // Positive normalized = you outperformed relative to averages = positive luck
  // Negative normalized = they outperformed relative to averages = negative luck
  // Your luck + opponent's luck = normalized + (-normalized) = 0
  return normalized * 10 * 0.6;
}

/**
 * Component 3: Chip Luck (20% weight)
 * "Did they boost against you?"
 *
 * Note: YOUR chip usage = your decision = not luck
 *
 * @param theyPlayedChip Whether opponent played a chip this GW
 * @param result Match result
 * @returns Chip luck (-2 to +2)
 */
export function calculateChipLuck(
  theyPlayedChip: boolean,
  result: 'win' | 'draw' | 'loss'
): number {
  if (!theyPlayedChip) return 0;

  // They chipped you
  if (result === 'win') return +2;  // Lucky - beat boosted opponent
  if (result === 'loss') return -2; // Unlucky - lost to boosted opponent
  return 0; // Draw - neutral
}

/**
 * Calculate total GW luck (all 3 components)
 *
 * @param yourPoints Your points this GW
 * @param allOtherPoints All other teams' points (19 opponents)
 * @param yourSeasonAvg Your season average up to this GW
 * @param theirSeasonAvg Opponent's season average up to this GW
 * @param opponentPoints Opponent's points this GW
 * @param theyPlayedChip Whether opponent played a chip
 * @param result Match result
 * @returns Total GW luck (-10 to +10)
 */
export function calculateGWLuck(
  yourPoints: number,
  allOtherPoints: number[],
  yourSeasonAvg: number,
  theirSeasonAvg: number,
  opponentPoints: number,
  theyPlayedChip: boolean,
  result: 'win' | 'draw' | 'loss'
): number {
  const rankLuck = calculateRankLuck(yourPoints, allOtherPoints, result);
  const varianceLuck = calculateVarianceLuck(
    yourPoints, yourSeasonAvg,
    opponentPoints, theirSeasonAvg,
    result
  );
  const chipLuck = calculateChipLuck(theyPlayedChip, result);

  return rankLuck + varianceLuck + chipLuck;
}

/**
 * Calculate GW luck with breakdown (for detailed displays)
 *
 * @param gameweek GW number
 * @param yourPoints Your points this GW
 * @param allOtherPoints All other teams' points
 * @param yourSeasonAvg Your season average
 * @param theirSeasonAvg Opponent's season average
 * @param opponentPoints Opponent's points
 * @param theyPlayedChip Whether opponent played chip
 * @param result Match result
 * @returns Detailed breakdown object
 */
export function calculateGWLuckDetailed(
  gameweek: number,
  yourPoints: number,
  allOtherPoints: number[],
  yourSeasonAvg: number,
  theirSeasonAvg: number,
  opponentPoints: number,
  theyPlayedChip: boolean,
  result: 'win' | 'draw' | 'loss'
): GWLuckBreakdown {
  const rankLuck = calculateRankLuck(yourPoints, allOtherPoints, result);
  const varianceLuck = calculateVarianceLuck(
    yourPoints, yourSeasonAvg,
    opponentPoints, theirSeasonAvg,
    result
  );
  const chipLuck = calculateChipLuck(theyPlayedChip, result);

  return {
    gameweek,
    rankLuck,
    varianceLuck,
    chipLuck,
    totalLuck: rankLuck + varianceLuck + chipLuck,
    result,
    yourPoints,
    opponentPoints
  };
}

/**
 * Calculate season-long luck (sum of all GW luck values)
 * @param gwLuckValues Array of per-GW luck values
 * @returns Season luck (sum of all GWs, -180 to +180 theoretical max)
 */
export function calculateSeasonLuck(gwLuckValues: number[]): number {
  return gwLuckValues.reduce((sum, luck) => sum + luck, 0);
}

/**
 * Format luck value for display
 * @param luck Luck value (already scaled -10 to +10)
 * @returns Formatted string with + or - prefix
 * @example formatLuck(5.3) // "+5"
 * @example formatLuck(-2.8) // "-3"
 */
export function formatLuck(luck: number): string {
  const rounded = Math.round(luck);

  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `${rounded}`;
  return '0';
}

/**
 * Get color for luck value (for UI display)
 * @param luck Luck value
 * @returns Color code (green for positive, red for negative, gray for zero)
 */
export function getLuckColor(luck: number): string {
  if (luck > 0) return '#00ff87'; // Green (lucky)
  if (luck < 0) return '#ff4444'; // Red (unlucky)
  return 'rgba(255, 255, 255, 0.5)'; // Gray (neutral)
}

/**
 * K-163N: 4-Component Season Luck Calculation
 * Shared function used by all APIs to ensure consistency
 *
 * Formula: 0.4 × (variance/10) + 0.3 × rank + 0.2 × (schedule/5) + 0.1 × (chip/3)
 */

export interface SeasonLuckResult {
  entry_id: number;
  name: string;
  team_name: string;
  season_avg_points: number;
  season_luck_index: number;  // Raw value like 0.3965, NOT scaled
  variance_luck: {
    total: number;
    per_gw: any[];
  };
  rank_luck: {
    total: number;
    per_gw: any[];
  };
  schedule_luck: {
    value: number;
    avg_opp_strength: number;
    theoretical_opp_avg: number;
    your_season_avg: number;
    opponents: any[];
  };
  chip_luck: {
    value: number;
    chips_played: number;
    chips_faced: number;
    avg_chips_faced: number;
    chips_faced_detail: any[];
  };
  gw_luck: any[];
}

/**
 * Calculate progressive average for a manager up to a specific GW
 * Used for schedule luck calculation - each opponent's average AT THE TIME you played them
 */
function getProgressiveAverage(
  entryId: number,
  upToGW: number,
  pointsByGW: Record<number, Record<number, number>>
): number {
  let total = 0;
  let count = 0;

  for (let gw = 1; gw <= upToGW; gw++) {
    if (pointsByGW[gw]?.[entryId] !== undefined) {
      total += pointsByGW[gw][entryId];
      count++;
    }
  }

  return count > 0 ? total / count : 0;
}

/**
 * Calculate 4-component season luck for all managers in a league
 * This is the single source of truth for season luck calculations
 *
 * @param leagueId League ID
 * @param db Database connection
 * @returns Map of entry_id → SeasonLuckResult
 */
export async function calculateSeasonLuckIndex(
  leagueId: number,
  db: any
): Promise<Map<number, SeasonLuckResult>> {
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
  allGWPoints.forEach((row: any) => {
    if (!pointsByGW[row.event]) pointsByGW[row.event] = {};
    const entryIdNum = parseInt(String(row.entry_id));
    pointsByGW[row.event][entryIdNum] = row.points;
  });

  const allGWs = Object.keys(pointsByGW).map(Number).sort((a, b) => a - b);

  // Calculate progressive season averages
  const seasonAvgsByGW: Record<number, Record<number, number>> = {};
  for (const gw of allGWs) {
    seasonAvgsByGW[gw] = {};
    const allEntryIds = new Set<number>();
    allGWPoints.forEach((row: any) => allEntryIds.add(parseInt(String(row.entry_id))));

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

  const matchGWs = Array.from(new Set<number>(matches.map((m: any) => m.event))).sort((a, b) => a - b);

  // Calculate final season averages for variance and rank calculations
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

  // Process chips
  const chipsByGW: Record<number, Set<number>> = {};
  chips.forEach((chip: any) => {
    if (!chipsByGW[chip.event]) chipsByGW[chip.event] = new Set();
    chipsByGW[chip.event].add(Number(chip.entry_id));
  });

  const chipsByManager: Record<number, number> = {};
  chips.forEach((chip: any) => {
    const chipEntryId = parseInt(String(chip.entry_id));
    chipsByManager[chipEntryId] = (chipsByManager[chipEntryId] || 0) + 1;
  });

  // Pre-calculate chips faced by each manager
  const chipsFacedByManager: Record<number, number> = {};
  for (const match of matches) {
    const gw = match.event;
    const entry1Id = parseInt(String(match.entry_1_id));
    const entry2Id = parseInt(String(match.entry_2_id));

    if (chipsByGW[gw]?.has(entry2Id)) {
      chipsFacedByManager[entry1Id] = (chipsFacedByManager[entry1Id] || 0) + 1;
    }
    if (chipsByGW[gw]?.has(entry1Id)) {
      chipsFacedByManager[entry2Id] = (chipsFacedByManager[entry2Id] || 0) + 1;
    }
  }

  // Calculate average chips faced (for zero-sum)
  const totalChipsFaced = Object.values(chipsFacedByManager).reduce((sum, count) => sum + count, 0);
  const avgChipsFaced = managers.length > 0 ? totalChipsFaced / managers.length : 0;

  // Calculate luck for each manager
  const resultsMap = new Map<number, SeasonLuckResult>();

  for (const manager of managers) {
    const entryId = parseInt(String(manager.entry_id));

    // Get this manager's matches
    const managerMatches = matches.filter((m: any) =>
      parseInt(String(m.entry_1_id)) === entryId || parseInt(String(m.entry_2_id)) === entryId
    );

    // 1. VARIANCE LUCK
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

    // 2. RANK LUCK
    const rankPerGW: any[] = [];
    let totalRank = 0;

    for (const match of managerMatches) {
      const gw = match.event;
      const isEntry1 = parseInt(String(match.entry_1_id)) === entryId;
      const yourPoints = isEntry1 ? match.entry_1_points : match.entry_2_points;
      const winner = match.winner ? parseInt(String(match.winner)) : null;

      // Calculate GW rank
      const gwPoints = { ...(pointsByGW[gw] || {}) };
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

    // 3. SCHEDULE LUCK
    const opponentsStrengths: any[] = [];
    let totalOppStrength = 0;

    const yourSeasonAvg = finalSeasonAvgs[entryId] || 0;

    for (const match of managerMatches) {
      const gw = match.event;
      const isEntry1 = parseInt(String(match.entry_1_id)) === entryId;
      const oppId = parseInt(String(isEntry1 ? match.entry_2_id : match.entry_1_id));
      const oppName = isEntry1 ? match.entry_2_name : match.entry_1_name;

      // Use opponent's progressive average up to this GW
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

    // Calculate theoretical opponent average using progressive averages
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
    const scheduleLuck = (theoreticalOppAvg - avgOppStrength) * managerMatches.length;

    // 4. CHIP LUCK
    const yourChipsPlayed = chipsByManager[entryId] || 0;
    const chipsFaced = chipsFacedByManager[entryId] || 0;

    const chipsFacedDetail: any[] = [];
    for (const match of managerMatches) {
      const gw = match.event;
      const isEntry1 = parseInt(String(match.entry_1_id)) === entryId;
      const oppId = parseInt(String(isEntry1 ? match.entry_2_id : match.entry_1_id));
      const oppName = isEntry1 ? match.entry_2_name : match.entry_1_name;

      if (chipsByGW[gw]?.has(oppId)) {
        const chipName = chips.find((c: any) => parseInt(String(c.entry_id)) === oppId && c.event === gw)?.chip_name || 'chip';
        chipsFacedDetail.push({
          gw,
          opponent: oppName,
          chip: chipName
        });
      }
    }

    // Chip luck = (average - your_faced) × scale factor
    const chipLuck = (avgChipsFaced - chipsFaced) * 7;

    // Calculate GW luck breakdown
    const gwLuck = variancePerGW.map((v, idx) => ({
      gw: v.gw,
      variance: v.value,
      rank: rankPerGW[idx].value,
      total: parseFloat((0.6 * (v.value / 10) + 0.4 * rankPerGW[idx].value).toFixed(4))
    }));

    // Calculate season luck index (4-component weighted formula)
    const seasonLuckIndex =
      0.4 * (totalVariance / 10) +
      0.3 * totalRank +
      0.2 * (scheduleLuck / 5) +
      0.1 * (chipLuck / 3);

    resultsMap.set(entryId, {
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

  return resultsMap;
}
