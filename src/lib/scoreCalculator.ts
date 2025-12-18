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

      // Fetch picks, GW history (points & transfers), and active chip in parallel
      const [picksResult, historyResult, chipResult] = await Promise.all([
        db.query(`
          SELECT player_id as element, position, multiplier, is_captain, is_vice_captain
          FROM manager_picks
          WHERE entry_id = $1 AND event = $2
          ORDER BY position
        `, [entryId, gameweek]),
        db.query(`
          SELECT points, event_transfers_cost
          FROM manager_gw_history
          WHERE entry_id = $1 AND event = $2
        `, [entryId, gameweek]),
        db.query(`
          SELECT chip_name
          FROM manager_chips
          WHERE entry_id = $1 AND event = $2
        `, [entryId, gameweek])
      ]);

      if (picksResult.rows.length === 15 && historyResult.rows.length > 0) {
        // Found complete data in database
        const history = historyResult.rows[0];
        const chip = chipResult.rows.length > 0 ? chipResult.rows[0].chip_name : null;

        return {
          picks: picksResult.rows,
          active_chip: chip,
          entry_history: {
            points: history.points,
            event_transfers_cost: history.event_transfers_cost
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
 * Fetch player stats from database for completed GWs
 */
async function fetchPlayerStatsFromDB(gameweek: number): Promise<any> {
  try {
    const db = await getDatabase();
    const result = await db.query(`
      SELECT
        element_id as id,
        total_points,
        minutes,
        goals_scored,
        assists,
        clean_sheets,
        goals_conceded,
        own_goals,
        penalties_saved,
        penalties_missed,
        yellow_cards,
        red_cards,
        saves,
        bonus,
        bps,
        influence,
        creativity,
        threat,
        ict_index,
        starts,
        expected_goals,
        expected_assists,
        expected_goal_involvements,
        expected_goals_conceded
      FROM player_gameweek_stats
      WHERE event = $1
    `, [gameweek]);

    if (result.rows.length === 0) {
      return null; // No data found, will fall back to API
    }

    // Transform to match FPL API format
    const elements = result.rows.map(row => ({
      id: row.id,
      stats: {
        total_points: row.total_points || 0,
        minutes: row.minutes || 0,
        goals_scored: row.goals_scored || 0,
        assists: row.assists || 0,
        clean_sheets: row.clean_sheets || 0,
        goals_conceded: row.goals_conceded || 0,
        own_goals: row.own_goals || 0,
        penalties_saved: row.penalties_saved || 0,
        penalties_missed: row.penalties_missed || 0,
        yellow_cards: row.yellow_cards || 0,
        red_cards: row.red_cards || 0,
        saves: row.saves || 0,
        bonus: row.bonus || 0,
        bps: row.bps || 0,
        influence: row.influence || '0.0',
        creativity: row.creativity || '0.0',
        threat: row.threat || '0.0',
        ict_index: row.ict_index || '0.0',
        starts: row.starts || 0,
        expected_goals: row.expected_goals || '0.0',
        expected_assists: row.expected_assists || '0.0',
        expected_goal_involvements: row.expected_goal_involvements || '0.0',
        expected_goals_conceded: row.expected_goals_conceded || '0.0'
      },
      explain: [] // Not needed for completed GWs
    }));

    return { elements };
  } catch (error) {
    console.error(`Error fetching player stats from database for GW${gameweek}:`, error);
    return null;
  }
}

/**
 * Fetch fixtures from database for completed GWs
 */
async function fetchFixturesFromDB(gameweek: number): Promise<any[] | null> {
  try {
    const db = await getDatabase();
    const result = await db.query(`
      SELECT
        id,
        event,
        team_h,
        team_a,
        team_h_score,
        team_a_score,
        team_h_difficulty,
        team_a_difficulty,
        kickoff_time,
        started,
        finished,
        finished_provisional,
        minutes,
        pulse_id
      FROM pl_fixtures
      WHERE event = $1 AND finished = true
      ORDER BY id
    `, [gameweek]);

    if (result.rows.length === 0) {
      return null; // No data found, will fall back to API
    }

    // Transform to match FPL API format
    return result.rows.map(row => ({
      id: row.id,
      event: row.event,
      team_h: row.team_h,
      team_a: row.team_a,
      team_h_score: row.team_h_score,
      team_a_score: row.team_a_score,
      team_h_difficulty: row.team_h_difficulty,
      team_a_difficulty: row.team_a_difficulty,
      kickoff_time: row.kickoff_time,
      started: row.started,
      finished: row.finished,
      finished_provisional: row.finished_provisional,
      minutes: row.minutes,
      pulse_id: row.pulse_id
    }));
  } catch (error) {
    console.error(`Error fetching fixtures from database for GW${gameweek}:`, error);
    return null;
  }
}

/**
 * Fetch all data needed for score calculation
 */
async function fetchScoreData(entryId: number, gameweek: number, status: 'upcoming' | 'in_progress' | 'completed') {
  // For completed GWs, try database first for player stats and fixtures
  if (status === 'completed') {
    const [picksData, dbLiveData, dbFixtures, bootstrapResponse] = await Promise.all([
      fetchManagerPicks(entryId, gameweek, status),
      fetchPlayerStatsFromDB(gameweek),
      fetchFixturesFromDB(gameweek),
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/')
    ]);

    const bootstrapData = await bootstrapResponse.json();

    // If we have complete DB data, use it
    if (dbLiveData && dbFixtures) {
      console.log(`[ScoreCalculator] Using database for GW${gameweek} (completed)`);
      const fixturesData = processFixturesData(dbFixtures, dbLiveData);
      return { picksData, liveData: dbLiveData, bootstrapData, fixturesData };
    }

    // Otherwise fall back to API
    console.log(`[ScoreCalculator] DB data incomplete for GW${gameweek}, falling back to API`);
  }

  // For live/upcoming GWs or if DB fetch failed, use FPL API
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
