/**
 * FPL Auto-Substitution Logic
 *
 * Implements official Fantasy Premier League automatic substitution rules:
 * 1. Process bench in order (1st → 2nd → 3rd)
 * 2. Skip bench players who didn't play (0 minutes)
 * 3. Only substitute for starting players who didn't play
 * 4. Maintain valid formation constraints
 */

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Player {
  id: number;
  name: string;
  position: Position;
  minutes: number;
  points: number;
  multiplier: number; // 1=normal, 2=captain, 3=triple captain
}

export interface Squad {
  starting11: Player[];
  bench: Player[]; // Ordered: [1st, 2nd, 3rd]
}

export interface Substitution {
  playerOut: Player;
  playerIn: Player;
  reason: string;
}

export interface AutoSubResult {
  squad: Squad;
  substitutions: Substitution[];
  pointsGained: number;
}

/**
 * Check if a player didn't play (0 minutes)
 */
function didNotPlay(player: Player): boolean {
  return player.minutes === 0;
}

/**
 * Count positions in a squad
 */
function countPositions(players: Player[]): Record<Position, number> {
  return {
    GK: players.filter(p => p.position === 'GK').length,
    DEF: players.filter(p => p.position === 'DEF').length,
    MID: players.filter(p => p.position === 'MID').length,
    FWD: players.filter(p => p.position === 'FWD').length,
  };
}

/**
 * Check if a formation is valid according to FPL rules
 */
function isValidFormation(counts: Record<Position, number>): boolean {
  return (
    counts.GK === 1 &&
    counts.DEF >= 3 &&
    counts.MID >= 2 &&
    counts.FWD >= 1
  );
}

/**
 * Check if substitution maintains valid formation
 */
function isValidSubstitution(
  starting11: Player[],
  playerOut: Player,
  playerIn: Player
): boolean {
  // Cannot substitute goalkeeper
  if (playerOut.position === 'GK' || playerIn.position === 'GK') {
    return false;
  }

  // Create temporary squad with substitution applied
  const tempSquad = starting11.map(p =>
    p.id === playerOut.id ? playerIn : p
  );

  // Count positions and validate
  const counts = countPositions(tempSquad);
  return isValidFormation(counts);
}

/**
 * Apply automatic substitutions according to FPL rules
 */
export function applyAutoSubstitutions(squad: Squad): AutoSubResult {
  const result: AutoSubResult = {
    squad: {
      starting11: [...squad.starting11],
      bench: [...squad.bench],
    },
    substitutions: [],
    pointsGained: 0,
  };

  // Get non-playing starters (excluding GK)
  const nonPlayingStarters = result.squad.starting11
    .filter(p => p.position !== 'GK' && didNotPlay(p));

  // Get playing bench players (in order)
  const playingBench = result.squad.bench
    .filter(p => !didNotPlay(p))
    .map((p, idx) => ({ player: p, originalIndex: idx }));

  // Try to substitute each non-playing starter
  for (const starter of nonPlayingStarters) {
    let substituted = false;

    // Try each playing bench player in order
    for (let i = 0; i < playingBench.length; i++) {
      const { player: benchPlayer } = playingBench[i];

      // Check if substitution maintains valid formation
      if (isValidSubstitution(result.squad.starting11, starter, benchPlayer)) {
        // Perform substitution
        const starterIndex = result.squad.starting11.findIndex(p => p.id === starter.id);
        result.squad.starting11[starterIndex] = benchPlayer;

        // Calculate points gained
        const pointsGained = benchPlayer.points * benchPlayer.multiplier;
        result.pointsGained += pointsGained;

        // Record substitution
        result.substitutions.push({
          playerOut: starter,
          playerIn: benchPlayer,
          reason: `${starter.name} did not play (0 min)`,
        });

        // Remove from available bench
        playingBench.splice(i, 1);
        substituted = true;
        break;
      }
    }

    // Log if substitution wasn't possible
    if (!substituted && playingBench.length > 0) {
      console.log(
        `Could not substitute ${starter.name} - no valid formation-preserving substitution available`
      );
    }
  }

  return result;
}

/**
 * Calculate total points for a squad (with auto-substitutions)
 */
export function calculateLivePoints(squad: Squad): number {
  // Apply auto-substitutions first
  const { squad: adjustedSquad } = applyAutoSubstitutions(squad);

  // Sum points from starting 11 (with multipliers)
  const totalPoints = adjustedSquad.starting11.reduce((sum, player) => {
    return sum + (player.points * player.multiplier);
  }, 0);

  return totalPoints;
}

/**
 * Get detailed breakdown of points with auto-substitutions
 */
export interface PointsBreakdown {
  totalPoints: number;
  pointsBeforeSubs: number;
  pointsFromSubs: number;
  substitutions: Substitution[];
}

export function getPointsBreakdown(squad: Squad): PointsBreakdown {
  // Calculate points before subs
  const pointsBeforeSubs = squad.starting11.reduce((sum, player) => {
    if (didNotPlay(player)) return sum; // Don't count non-playing starters
    return sum + (player.points * player.multiplier);
  }, 0);

  // Apply auto-subs and get result
  const autoSubResult = applyAutoSubstitutions(squad);

  // Calculate total points after subs
  const totalPoints = autoSubResult.squad.starting11.reduce((sum, player) => {
    return sum + (player.points * player.multiplier);
  }, 0);

  return {
    totalPoints,
    pointsBeforeSubs,
    pointsFromSubs: autoSubResult.pointsGained,
    substitutions: autoSubResult.substitutions,
  };
}

/**
 * Check if a player was auto-substituted in
 */
export function wasAutoSubbedIn(player: Player, squad: Squad): boolean {
  const result = applyAutoSubstitutions(squad);
  return result.substitutions.some(sub => sub.playerIn.id === player.id);
}

/**
 * Check if a player was auto-substituted out
 */
export function wasAutoSubbedOut(player: Player, squad: Squad): boolean {
  const result = applyAutoSubstitutions(squad);
  return result.substitutions.some(sub => sub.playerOut.id === player.id);
}

/**
 * Get the replacement player for a substituted-out player
 */
export function getReplacementPlayer(player: Player, squad: Squad): Player | null {
  const result = applyAutoSubstitutions(squad);
  const sub = result.substitutions.find(s => s.playerOut.id === player.id);
  return sub ? sub.playerIn : null;
}
