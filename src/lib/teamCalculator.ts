/**
 * K-108c: Team Totals Calculation
 *
 * Calculates manager's gameweek total with 100% accuracy against FPL.
 * Formula: Base Points + Chip Modifiers - Transfer Cost
 */

import { type Position } from './pointsCalculator';
import { getDatabase } from './db';

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
    // BENCH BOOST: All 15 players score (captain gets 2x)
    for (const pick of picks) {
      const player = playerData.get(pick.player_id);
      if (!player) continue;

      const points = player.points;

      if (pick.is_captain) {
        // Bench boost only: captain multiplier is always 2
        starting_xi_total += points;
        captain_bonus += points;
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

/**
 * K-109 Phase 2: Shared function for calculating team gameweek score
 *
 * This is the SINGLE SOURCE OF TRUTH used by:
 * - /api/gw/[gw]/team/[teamId] (K-108c endpoint)
 * - /api/league/[id]/fixtures/[gw] (Rivals tab)
 * - Any other endpoint that needs accurate team scores
 */

export interface TeamGameweekScore {
  entry_id: number;
  gameweek: number;
  points: {
    starting_xi_total: number;
    captain_bonus: number;
    bench_boost_total: number;
    auto_sub_total: number;
    gross_total: number;
    transfer_cost: number;
    net_total: number;
  };
  active_chip: ChipType;
  auto_subs: AutoSub[];
  captain_name: string | null;
  status: 'completed' | 'in_progress';
}

export async function calculateTeamGameweekScore(
  entry_id: number,
  gameweek: number
): Promise<TeamGameweekScore> {
  const db = await getDatabase();

  // 1. Get manager picks
  const picksResult = await db.query(
    `SELECT player_id, position, multiplier, is_captain, is_vice_captain
     FROM manager_picks
     WHERE entry_id = $1 AND event = $2
     ORDER BY position`,
    [entry_id, gameweek]
  );

  if (picksResult.rows.length === 0) {
    throw new Error(`No picks found for entry ${entry_id} in GW${gameweek}`);
  }

  const picks: ManagerPick[] = picksResult.rows;

  // 2. Get player data from player_gameweek_stats (K-108)
  const playerIds = picks.map(p => p.player_id);

  const playersResult = await db.query(
    `SELECT
      p.id,
      p.web_name,
      p.element_type as position,
      COALESCE(pgs.calculated_points, 0) as points,
      COALESCE(pgs.minutes, 0) as minutes
     FROM players p
     LEFT JOIN player_gameweek_stats pgs
       ON pgs.player_id = p.id AND pgs.gameweek = $1
     WHERE p.id = ANY($2)`,
    [gameweek, playerIds]
  );

  const playerData = new Map<number, PlayerData>();
  for (const row of playersResult.rows) {
    playerData.set(row.id, {
      id: row.id,
      position: row.position,
      points: row.points,
      minutes: row.minutes,
      web_name: row.web_name,
    });
  }

  // 3. Get active chip
  const chipResult = await db.query(
    `SELECT chip_name
     FROM manager_chips
     WHERE entry_id = $1 AND event = $2`,
    [entry_id, gameweek]
  );

  const activeChip: ChipType = chipResult.rows[0]?.chip_name || null;

  // 4. Get transfer cost and check completion status
  const historyResult = await db.query(
    `SELECT event_transfers_cost, points
     FROM manager_gw_history
     WHERE entry_id = $1 AND event = $2`,
    [entry_id, gameweek]
  );

  const transferCost = historyResult.rows[0]?.event_transfers_cost || 0;
  const fplTotal = historyResult.rows[0]?.points || null;
  const status: 'completed' | 'in_progress' = fplTotal !== null ? 'completed' : 'in_progress';

  // 5. Calculate team total
  const calculation = calculateTeamTotal(picks, playerData, activeChip, transferCost);

  // 6. Get captain name
  const captain = picks.find(p => p.is_captain);
  const captainPlayer = captain ? playerData.get(captain.player_id) : null;
  const captain_name = captainPlayer?.web_name || null;

  return {
    entry_id,
    gameweek,
    points: {
      starting_xi_total: calculation.starting_xi_total,
      captain_bonus: calculation.captain_bonus,
      bench_boost_total: calculation.bench_boost_total,
      auto_sub_total: calculation.auto_sub_total,
      gross_total: calculation.gross_total,
      transfer_cost: calculation.transfer_cost,
      net_total: calculation.net_total,
    },
    active_chip: activeChip,
    auto_subs: calculation.auto_subs,
    captain_name,
    status,
  };
}
