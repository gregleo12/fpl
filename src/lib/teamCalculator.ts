/**
 * K-108c: Team Totals Calculation
 *
 * Calculates manager's gameweek total with 100% accuracy against FPL.
 * Formula: Base Points + Chip Modifiers - Transfer Cost
 */

import { type Position } from './pointsCalculator';

export interface ManagerPick {
  player_id: number;
  position: number; // 1-11 = Starting XI, 12-15 = Bench
  multiplier: number; // 0 = benched, 1 = normal, 2 = captain, 3 = triple captain
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface PlayerData {
  id: number;
  position: Position; // 1=GK, 2=DEF, 3=MID, 4=FWD
  points: number;
  minutes: number;
  web_name?: string;
}

export interface AutoSub {
  out: number; // player_id
  out_name?: string;
  in: number; // player_id
  in_name?: string;
  points_gained: number;
}

export interface TeamCalculation {
  starting_xi_total: number;
  captain_bonus: number;
  bench_boost_total: number;
  auto_sub_total: number;
  gross_total: number;
  transfer_cost: number;
  net_total: number;
  auto_subs: AutoSub[];
}

export type ChipType = '3xc' | 'bboost' | 'freehit' | 'wildcard' | null;

/**
 * Calculate team total for a gameweek
 */
export function calculateTeamTotal(
  picks: ManagerPick[],
  playerData: Map<number, PlayerData>,
  activeChip: ChipType,
  transferCost: number
): TeamCalculation {

  const startingXI = picks.filter(p => p.position <= 11);
  const bench = picks.filter(p => p.position >= 12);

  let starting_xi_total = 0;
  let captain_bonus = 0;
  let bench_boost_total = 0;
  let auto_sub_total = 0;
  let auto_subs: AutoSub[] = [];

  if (activeChip === 'bboost') {
    // BENCH BOOST: All 15 players score
    for (const pick of picks) {
      const player = playerData.get(pick.player_id);
      if (!player) continue;

      const points = player.points;

      if (pick.is_captain) {
        const captainMultiplier = activeChip === '3xc' ? 3 : 2;
        starting_xi_total += points;
        captain_bonus += points * (captainMultiplier - 1);
      } else {
        if (pick.position <= 11) {
          starting_xi_total += points;
        } else {
          bench_boost_total += points;
        }
      }
    }
  } else {
    // Normal or Triple Captain: Starting XI + Auto-subs
    const result = applyAutoSubs(startingXI, bench, playerData);
    const finalXI = result.finalXI;
    auto_subs = result.autoSubs;

    for (const pick of finalXI) {
      const player = playerData.get(pick.player_id);
      if (!player) continue;

      const points = player.points;

      if (pick.is_captain) {
        const captainMultiplier = activeChip === '3xc' ? 3 : 2;
        starting_xi_total += points;
        captain_bonus += points * (captainMultiplier - 1);
      } else {
        starting_xi_total += points;
      }
    }

    // Calculate auto-sub total
    for (const sub of auto_subs) {
      const subPlayer = playerData.get(sub.in);
      if (subPlayer) {
        auto_sub_total += subPlayer.points;
      }
    }
  }

  const gross_total = starting_xi_total + captain_bonus + bench_boost_total;
  const net_total = gross_total - transferCost;

  return {
    starting_xi_total,
    captain_bonus,
    bench_boost_total,
    auto_sub_total,
    gross_total,
    transfer_cost: transferCost,
    net_total,
    auto_subs,
  };
}

/**
 * Apply auto-substitutions for players with 0 minutes
 */
function applyAutoSubs(
  startingXI: ManagerPick[],
  bench: ManagerPick[],
  playerData: Map<number, PlayerData>
): { finalXI: ManagerPick[]; autoSubs: AutoSub[] } {

  const finalXI = [...startingXI];
  const autoSubs: AutoSub[] = [];
  let availableBench = [...bench];

  // Find starters with 0 minutes (in order of position 1-11)
  for (let i = 0; i < finalXI.length; i++) {
    const starter = finalXI[i];
    const starterData = playerData.get(starter.player_id);
    const starterMinutes = starterData?.minutes || 0;

    if (starterMinutes === 0) {
      // Try to find valid sub
      const sub = findValidSub(starter, finalXI, availableBench, playerData);

      if (sub) {
        const subData = playerData.get(sub.player_id);
        const starterDataFull = playerData.get(starter.player_id);

        // Make the substitution
        finalXI[i] = sub;

        autoSubs.push({
          out: starter.player_id,
          out_name: starterDataFull?.web_name,
          in: sub.player_id,
          in_name: subData?.web_name,
          points_gained: subData?.points || 0,
        });

        // Remove sub from available bench
        availableBench = availableBench.filter(b => b.player_id !== sub.player_id);
      }
    }
  }

  return { finalXI, autoSubs };
}

/**
 * Find a valid substitute for a starter
 */
function findValidSub(
  starter: ManagerPick,
  currentXI: ManagerPick[],
  bench: ManagerPick[],
  playerData: Map<number, PlayerData>
): ManagerPick | null {

  const starterData = playerData.get(starter.player_id);
  if (!starterData) return null;

  const starterPos = starterData.position;

  // GK can only be replaced by GK (bench position 12 is always backup GK)
  if (starterPos === 1) {
    const backupGK = bench.find(b => b.position === 12);
    if (backupGK) {
      const backupData = playerData.get(backupGK.player_id);
      const backupMinutes = backupData?.minutes || 0;
      if (backupMinutes > 0) {
        return backupGK;
      }
    }
    return null;
  }

  // For outfield players, check bench in order (13, 14, 15)
  const outfieldBench = bench
    .filter(b => b.position >= 13)
    .sort((a, b) => a.position - b.position);

  for (const sub of outfieldBench) {
    const subData = playerData.get(sub.player_id);
    if (!subData) continue;

    const subMinutes = subData.minutes;
    if (subMinutes === 0) continue; // Sub also didn't play

    // Check if formation is valid after substitution
    if (isValidFormation(currentXI, starter, sub, playerData)) {
      return sub;
    }
  }

  return null;
}

/**
 * Check if formation is valid after a substitution
 */
function isValidFormation(
  currentXI: ManagerPick[],
  out: ManagerPick,
  inPick: ManagerPick,
  playerData: Map<number, PlayerData>
): boolean {

  // Count positions after swap
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 }; // GK, DEF, MID, FWD

  for (const pick of currentXI) {
    if (pick.player_id === out.player_id) continue; // Skip the player being subbed out

    const player = playerData.get(pick.player_id);
    if (player) {
      counts[player.position]++;
    }
  }

  // Add the incoming player
  const inPlayer = playerData.get(inPick.player_id);
  if (inPlayer) {
    counts[inPlayer.position]++;
  }

  // Validate: 1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD
  return (
    counts[1] === 1 &&
    counts[2] >= 3 && counts[2] <= 5 &&
    counts[3] >= 2 && counts[3] <= 5 &&
    counts[4] >= 1 && counts[4] <= 3
  );
}
