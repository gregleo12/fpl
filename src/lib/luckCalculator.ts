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
