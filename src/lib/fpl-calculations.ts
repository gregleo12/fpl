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
  bps?: number; // Bonus Point System score
  bonus?: number; // Official bonus points (0 if not awarded yet)
  fixtureId?: number; // Which match they're in
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

/**
 * Calculate provisional bonus points based on BPS (Bonus Point System)
 *
 * Top 3 BPS earners in each match get bonus points:
 * - 1st place: 3 bonus points
 * - 2nd place: 2 bonus points
 * - 3rd place: 1 bonus point
 *
 * Ties: All tied players get the same bonus
 */
export interface ProvisionalBonus {
  provisional: number; // Calculated from BPS
  isOfficial: boolean; // Whether official bonus has been awarded
  bps: number; // BPS score
}

export function calculateProvisionalBonus(
  players: Player[]
): Map<number, ProvisionalBonus> {
  const bonusMap = new Map<number, ProvisionalBonus>();

  // Group players by fixture (bonus awarded per match)
  const byFixture = new Map<number, Player[]>();

  for (const player of players) {
    if (!player.fixtureId) continue; // Skip players without fixture info

    if (!byFixture.has(player.fixtureId)) {
      byFixture.set(player.fixtureId, []);
    }
    byFixture.get(player.fixtureId)!.push(player);
  }

  // Calculate bonus for each fixture
  Array.from(byFixture.entries()).forEach(([fixtureId, fixturePlayers]) => {
    // Sort by BPS descending
    const sorted = fixturePlayers
      .filter(p => p.bps !== undefined)
      .sort((a, b) => (b.bps || 0) - (a.bps || 0));

    if (sorted.length === 0) return;

    // Get unique BPS values for top 3
    const uniqueBPS = Array.from(new Set(sorted.map(p => p.bps || 0))).slice(0, 3);

    // Award bonus based on BPS rank
    for (const player of sorted) {
      const rank = uniqueBPS.indexOf(player.bps || 0);
      let provisionalBonus = 0;

      if (rank === 0) {
        provisionalBonus = 3;
      } else if (rank === 1) {
        provisionalBonus = 2;
      } else if (rank === 2) {
        provisionalBonus = 1;
      }

      const isOfficial = (player.bonus || 0) > 0;

      bonusMap.set(player.id, {
        provisional: provisionalBonus,
        isOfficial: isOfficial,
        bps: player.bps || 0,
      });
    }
  });

  // Add entries for players not in the bonus map (no fixture or BPS data)
  for (const player of players) {
    if (!bonusMap.has(player.id)) {
      bonusMap.set(player.id, {
        provisional: 0,
        isOfficial: (player.bonus || 0) > 0,
        bps: player.bps || 0,
      });
    }
  }

  return bonusMap;
}

/**
 * Calculate provisional bonus using complete fixtures data (all 22 players per match)
 * This is MORE accurate than calculateProvisionalBonus() which only uses squad players
 */
export function calculateProvisionalBonusFromFixtures(
  players: Player[],
  fixturesData: any[]
): Map<number, ProvisionalBonus> {
  const bonusMap = new Map<number, ProvisionalBonus>();

  // For each player in the squad, find their fixture and check top 3 BPS
  for (const player of players) {
    if (!player.fixtureId || !player.bps) {
      bonusMap.set(player.id, {
        provisional: 0,
        isOfficial: (player.bonus || 0) > 0,
        bps: player.bps || 0,
      });
      continue;
    }

    // Find the fixture this player is in
    const fixture = fixturesData.find((f: any) => f.id === player.fixtureId);
    if (!fixture || !fixture.player_stats) {
      bonusMap.set(player.id, {
        provisional: 0,
        isOfficial: (player.bonus || 0) > 0,
        bps: player.bps || 0,
      });
      continue;
    }

    // Get ALL players in this fixture sorted by BPS
    const allPlayersInFixture = fixture.player_stats
      .filter((p: any) => p.bps > 0)
      .sort((a: any, b: any) => b.bps - a.bps);

    // Get unique BPS values for top 3
    const uniqueBPS = Array.from(
      new Set(allPlayersInFixture.map((p: any) => p.bps))
    ).slice(0, 3);

    // Check if this player is in top 3 BPS for this fixture
    const rank = uniqueBPS.indexOf(player.bps);
    let provisionalBonus = 0;

    if (rank === 0) {
      provisionalBonus = 3;
    } else if (rank === 1) {
      provisionalBonus = 2;
    } else if (rank === 2) {
      provisionalBonus = 1;
    }

    const isOfficial = (player.bonus || 0) > 0;

    bonusMap.set(player.id, {
      provisional: provisionalBonus,
      isOfficial: isOfficial,
      bps: player.bps,
    });
  }

  return bonusMap;
}

/**
 * Calculate live points with provisional bonus included
 */
export interface LivePointsWithBonus {
  totalPoints: number;
  basePoints: number; // Points without bonus
  provisionalBonus: number; // Total provisional bonus
  officialBonus: number; // Total official bonus
  bonusBreakdown: Array<{
    playerId: number;
    playerName: string;
    bps: number;
    bonus: number;
    isOfficial: boolean;
  }>;
}

export function calculateLivePointsWithBonus(
  squad: Squad,
  fixturesData?: any[]
): LivePointsWithBonus {
  // Apply auto-substitutions first
  const { squad: adjustedSquad, substitutions } = applyAutoSubstitutions(squad);

  // Calculate provisional bonus for starting 11 (after auto-subs)
  // Use fixtures data if available (more accurate), otherwise fall back to squad-only calculation
  const bonusMap = fixturesData
    ? calculateProvisionalBonusFromFixtures(adjustedSquad.starting11, fixturesData)
    : calculateProvisionalBonus(adjustedSquad.starting11);

  let basePoints = 0;
  let provisionalBonus = 0;
  let officialBonus = 0;
  const bonusBreakdown: Array<{
    playerId: number;
    playerName: string;
    bps: number;
    bonus: number;
    isOfficial: boolean;
  }> = [];

  for (const player of adjustedSquad.starting11) {
    const bonusInfo = bonusMap.get(player.id);

    if (bonusInfo) {
      const bonusPoints = bonusInfo.isOfficial
        ? (player.bonus || 0)
        : bonusInfo.provisional;

      const bonusWithMultiplier = bonusPoints * player.multiplier;

      if (bonusInfo.isOfficial) {
        officialBonus += bonusWithMultiplier;
      } else {
        provisionalBonus += bonusWithMultiplier;
      }

      // Base points (without bonus)
      basePoints += (player.points - (player.bonus || 0)) * player.multiplier;

      // Track bonus breakdown for display
      if (bonusPoints > 0) {
        bonusBreakdown.push({
          playerId: player.id,
          playerName: player.name,
          bps: bonusInfo.bps,
          bonus: bonusWithMultiplier,
          isOfficial: bonusInfo.isOfficial,
        });
      }
    } else {
      // No bonus info, just add base points
      basePoints += player.points * player.multiplier;
    }
  }

  const totalPoints = basePoints + provisionalBonus + officialBonus;

  return {
    totalPoints,
    basePoints,
    provisionalBonus,
    officialBonus,
    bonusBreakdown: bonusBreakdown.sort((a, b) => b.bonus - a.bonus),
  };
}
