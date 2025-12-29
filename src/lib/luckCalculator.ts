/**
 * K-163: Luck Calculation Utility
 *
 * Correct Formula:
 * GW Luck = Actual Result - Expected Result
 * - Expected = (teams_outscored + teams_drawn * 0.5) / total_opponents
 * - Actual = win=1, draw=0.5, loss=0
 * - Luck ranges from -1 to +1 per GW
 *
 * Season Luck = Sum of all GW luck values
 */

export interface GWLuckData {
  gameweek: number;
  yourPoints: number;
  opponentPoints: number;
  result: 'win' | 'draw' | 'loss';
  teamsOutscored: number;
  totalTeams: number;
  expected: number;
  actual: number;
  luck: number;
}

/**
 * Calculate luck for a single gameweek
 * @param yourPoints Your team's points for the GW
 * @param allTeamPoints All teams' points for this GW (excluding yours)
 * @param result Your H2H match result ('win', 'draw', or 'loss')
 * @returns Luck value (-1 to +1)
 */
export function calculateGWLuck(
  yourPoints: number,
  allTeamPoints: number[],
  result: 'win' | 'draw' | 'loss'
): number {
  // How many teams did you outscore?
  const teamsOutscored = allTeamPoints.filter(pts => yourPoints > pts).length;
  const teamsDrawn = allTeamPoints.filter(pts => yourPoints === pts).length;
  const totalOpponents = allTeamPoints.length;

  // Expected win rate (count draws as half)
  const expected = totalOpponents > 0
    ? (teamsOutscored + (teamsDrawn * 0.5)) / totalOpponents
    : 0;

  // Actual result
  const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

  // Luck = Actual - Expected
  return actual - expected;
}

/**
 * Calculate detailed luck data for a single gameweek
 * @param gameweek The gameweek number
 * @param yourPoints Your team's points for the GW
 * @param opponentPoints Your H2H opponent's points
 * @param allTeamPoints All teams' points for this GW (excluding yours)
 * @param result Your H2H match result
 * @returns Detailed luck data object
 */
export function calculateGWLuckDetailed(
  gameweek: number,
  yourPoints: number,
  opponentPoints: number,
  allTeamPoints: number[],
  result: 'win' | 'draw' | 'loss'
): GWLuckData {
  const teamsOutscored = allTeamPoints.filter(pts => yourPoints > pts).length;
  const teamsDrawn = allTeamPoints.filter(pts => yourPoints === pts).length;
  const totalTeams = allTeamPoints.length;

  const expected = totalTeams > 0
    ? (teamsOutscored + (teamsDrawn * 0.5)) / totalTeams
    : 0;

  const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  const luck = actual - expected;

  return {
    gameweek,
    yourPoints,
    opponentPoints,
    result,
    teamsOutscored,
    totalTeams,
    expected,
    actual,
    luck
  };
}

/**
 * Calculate season-long luck (sum of all GW luck values)
 * @param gwLuckValues Array of per-GW luck values
 * @returns Season luck (sum of all GWs)
 */
export function calculateSeasonLuck(gwLuckValues: number[]): number {
  return gwLuckValues.reduce((sum, luck) => sum + luck, 0);
}

/**
 * Format luck value for display (K-163a: ×10 format for better readability)
 * @param luck Raw luck value (-1 to +1 per GW)
 * @returns Formatted string with + or - prefix (×10 scaled)
 * @example formatLuck(0.263) // "+3" (rounded from 2.63)
 * @example formatLuck(-1.82) // "-18"
 */
export function formatLuck(luck: number): string {
  const scaled = Math.round(luck * 10);

  if (scaled > 0) return `+${scaled}`;
  if (scaled < 0) return `${scaled}`;
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
