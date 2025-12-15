/**
 * SINGLE SOURCE OF TRUTH for all score calculations
 *
 * This module provides the authoritative score calculation
 * that ALL endpoints and views should use.
 */

import {
  createSquadFromPicks,
  calculateLivePointsWithBonus,
  applyAutoSubstitutions,
  Player,
  Squad
} from './fpl-calculations';
import { getDatabase } from './db';

// ============ TYPES ============

export interface ScoreBreakdown {
  basePoints: number;
  provisionalBonus: number;
  captainPoints: number;
  transferCost: number;
  totalScore: number;
}

export interface ManagerScoreResult {
  entryId: number;
  score: number;
  breakdown: ScoreBreakdown;
  squad: Squad;
  autoSubs: {
    substitutions: Array<{
      playerOut: Player;
      playerIn: Player;
    }>;
  } | null;
  chip: string | null;
  captain: {
    name: string;
    points: number;
  } | null;
}

// ============ HELPERS ============

/**
 * Process raw fixtures data to include status and player BPS
 */
function processFixturesData(fixturesRaw: any[], liveData: any): any[] {
  return fixturesRaw.map((fixture: any) => {
    const playerStats = liveData?.elements
      ?.filter((el: any) => {
        const explain = el.explain || [];
        return explain.some((exp: any) => exp.fixture === fixture.id);
      })
      .map((el: any) => ({
        id: el.id,
        bps: el.stats.bps || 0,
        bonus: el.stats.bonus || 0,
      })) || [];

    return {
      id: fixture.id,
      started: fixture.started ?? false,
      finished: fixture.finished ?? fixture.finished_provisional ?? false,
      player_stats: playerStats,
    };
  });
}

/**
 * Fetch manager picks - tries database first for completed GWs, falls back to FPL API
 */
async function fetchManagerPicks(entryId: number, gameweek: number, status: 'upcoming' | 'in_progress' | 'completed'): Promise<any> {
  // For completed gameweeks, try database first
  if (status === 'completed') {
    try {
      const db = await getDatabase();
      const result = await db.query(`
        SELECT player_id as element, position, multiplier, is_captain, is_vice_captain
        FROM manager_picks
        WHERE entry_id = $1 AND event = $2
        ORDER BY position
      `, [entryId, gameweek]);

      if (result.rows.length === 15) {
        // Found complete picks in database
        return {
          picks: result.rows,
          active_chip: null, // Chips not stored in manager_picks (available in manager_gw_history if needed)
          entry_history: {
            event_transfers_cost: 0 // Transfer cost in manager_gw_history if needed
          }
        };
      }
    } catch (error) {
      console.error(`Error fetching picks from database for entry ${entryId} GW${gameweek}:`, error);
      // Fall through to FPL API
    }
  }

  // Fall back to FPL API for live/upcoming GWs or if DB fetch failed
  const response = await fetch(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${gameweek}/picks/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch picks for entry ${entryId}`);
  }
  return await response.json();
}

/**
 * Fetch all data needed for score calculation
 */
async function fetchScoreData(entryId: number, gameweek: number, status: 'upcoming' | 'in_progress' | 'completed') {
  const [picksData, liveResponse, bootstrapResponse, fixturesResponse] = await Promise.all([
    fetchManagerPicks(entryId, gameweek, status),
    fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`),
    fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
    fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gameweek}`),
  ]);

  const [liveData, bootstrapData, fixturesRaw] = await Promise.all([
    liveResponse.json(),
    bootstrapResponse.json(),
    fixturesResponse.json(),
  ]);

  const fixturesData = processFixturesData(fixturesRaw, liveData);

  return { picksData, liveData, bootstrapData, fixturesData };
}

// ============ MAIN FUNCTIONS ============

/**
 * THE SINGLE SOURCE OF TRUTH
 *
 * Calculate a manager's live score with all factors:
 * - Auto-substitutions (with fixture timing validation)
 * - Provisional bonus (from live BPS data)
 * - Transfer cost deduction
 * - Captain multiplier
 */
export async function calculateManagerLiveScore(
  entryId: number,
  gameweek: number,
  status: 'upcoming' | 'in_progress' | 'completed'
): Promise<ManagerScoreResult> {
  const { picksData, liveData, bootstrapData, fixturesData } = await fetchScoreData(entryId, gameweek, status);

  return calculateScoreFromData(entryId, picksData, liveData, bootstrapData, fixturesData, status);
}

/**
 * Calculate score from pre-fetched data
 * Useful when data is already available (e.g., batch operations)
 */
export function calculateScoreFromData(
  entryId: number,
  picksData: any,
  liveData: any,
  bootstrapData: any,
  fixturesData: any[],
  status: 'upcoming' | 'in_progress' | 'completed'
): ManagerScoreResult {
  const transferCost = picksData.entry_history?.event_transfers_cost || 0;
  const activeChip = picksData.active_chip;
  const isBenchBoost = activeChip === 'bboost';

  // For completed gameweeks, use the official final score
  if (status === 'completed') {
    const officialPoints = picksData.entry_history?.points || 0;
    const finalScore = officialPoints - transferCost;

    const squad = createSquadFromPicks(picksData, liveData, bootstrapData, fixturesData);
    const captain = squad.starting11.find(p => p.multiplier > 1);

    return {
      entryId,
      score: finalScore,
      breakdown: {
        basePoints: officialPoints,
        provisionalBonus: 0,
        captainPoints: captain ? captain.points * captain.multiplier : 0,
        transferCost,
        totalScore: finalScore,
      },
      squad,
      autoSubs: null,
      chip: activeChip,
      captain: captain ? { name: captain.name, points: captain.points * captain.multiplier } : null,
    };
  }

  // For live/in-progress gameweeks, calculate with all factors
  const squad = createSquadFromPicks(picksData, liveData, bootstrapData, fixturesData);

  // Calculate score with auto-subs and provisional bonus
  const result = calculateLivePointsWithBonus(squad, fixturesData, activeChip);

  // Get adjusted squad after auto-subs (skip for Bench Boost)
  const { squad: adjustedSquad, substitutions } = isBenchBoost
    ? { squad, substitutions: [] }
    : applyAutoSubstitutions(squad);

  const finalScore = result.totalPoints - transferCost;

  // Get captain info from adjusted squad
  const captain = adjustedSquad.starting11.find(p => p.multiplier > 1);

  // Get auto-sub info
  const autoSubResult = isBenchBoost ? null : { substitutions };

  return {
    entryId,
    score: finalScore,
    breakdown: {
      basePoints: result.basePoints,
      provisionalBonus: result.provisionalBonus,
      captainPoints: captain ? captain.points * captain.multiplier : 0,
      transferCost,
      totalScore: finalScore,
    },
    squad: adjustedSquad,
    autoSubs: autoSubResult,
    chip: activeChip,
    captain: captain ? { name: captain.name, points: captain.points * captain.multiplier } : null,
  };
}

/**
 * Batch calculate scores for multiple managers
 * More efficient as it shares bootstrap, live, and fixtures data
 */
export async function calculateMultipleManagerScores(
  entryIds: number[],
  gameweek: number,
  status: 'upcoming' | 'in_progress' | 'completed'
): Promise<Map<number, ManagerScoreResult>> {
  // Fetch shared data once
  const [liveResponse, bootstrapResponse, fixturesResponse] = await Promise.all([
    fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`),
    fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
    fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gameweek}`),
  ]);

  const [liveData, bootstrapData, fixturesRaw] = await Promise.all([
    liveResponse.json(),
    bootstrapResponse.json(),
    fixturesResponse.json(),
  ]);

  const fixturesData = processFixturesData(fixturesRaw, liveData);

  // Fetch picks for all managers in parallel (uses DB cache for completed GWs)
  const picksPromises = entryIds.map(entryId =>
    fetchManagerPicks(entryId, gameweek, status)
      .then(data => ({ entryId, data }))
      .catch(() => ({ entryId, data: null }))
  );

  const allPicks = await Promise.all(picksPromises);

  // Calculate scores for each manager using shared data
  const results = new Map<number, ManagerScoreResult>();

  for (const { entryId, data: picksData } of allPicks) {
    if (!picksData) continue;

    const scoreResult = calculateScoreFromData(
      entryId,
      picksData,
      liveData,
      bootstrapData,
      fixturesData,
      status
    );

    results.set(entryId, scoreResult);
  }

  return results;
}
