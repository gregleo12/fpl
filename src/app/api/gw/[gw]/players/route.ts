import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculatePoints, type Position } from '@/lib/pointsCalculator';

// Force dynamic rendering for fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface GWStatus {
  status: 'completed' | 'in_progress' | 'upcoming';
  finished: boolean;
  is_current: boolean;
  data_checked: boolean;
}

/**
 * K-108: Single Source of Truth - Player Gameweek Data
 *
 * Returns all player data for a specific gameweek.
 * - Completed GWs: Read from database (player_gameweek_stats)
 * - Live/Upcoming GWs: Fetch from FPL API + calculate live
 *
 * Endpoint: GET /api/gw/[gw]/players
 * Query params:
 *  - player_ids: comma-separated list to filter (optional)
 *  - team_id: filter by team (optional)
 *  - position: filter by position 1-4 (optional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { gw: string } }
) {
  try {
    const gameweek = parseInt(params.gw);

    if (isNaN(gameweek) || gameweek < 1 || gameweek > 38) {
      return NextResponse.json({ error: 'Invalid gameweek' }, { status: 400 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const playerIdsParam = searchParams.get('player_ids');
    const teamIdParam = searchParams.get('team_id');
    const positionParam = searchParams.get('position');

    const playerIds = playerIdsParam ? playerIdsParam.split(',').map(id => parseInt(id)) : null;
    const teamId = teamIdParam ? parseInt(teamIdParam) : null;
    const position = positionParam ? parseInt(positionParam) as Position : null;

    // 1. Determine gameweek status
    const gwStatus = await getGameweekStatus(gameweek);

    // 2. Fetch data based on status
    let players;
    if (gwStatus.status === 'completed') {
      // Completed GW: Read from database
      players = await fetchFromDatabase(gameweek, playerIds, teamId, position);
    } else {
      // Live or Upcoming: Fetch from FPL API
      players = await fetchFromAPI(gameweek, playerIds, teamId, position);
    }

    return NextResponse.json({
      gameweek,
      status: gwStatus.status,
      data_source: gwStatus.status === 'completed' ? 'database' : 'api',
      count: players.length,
      players,
    });

  } catch (error: any) {
    console.error('[K-108] Error fetching player data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch player data' },
      { status: 500 }
    );
  }
}

/**
 * Determine gameweek status from bootstrap-static
 */
async function getGameweekStatus(gameweek: number): Promise<GWStatus> {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!response.ok) {
      throw new Error('Failed to fetch bootstrap data');
    }

    const bootstrapData = await response.json();
    const event = bootstrapData.events.find((e: any) => e.id === gameweek);

    if (!event) {
      // GW doesn't exist, treat as upcoming
      return {
        status: 'upcoming',
        finished: false,
        is_current: false,
        data_checked: false,
      };
    }

    // Determine status
    let status: 'completed' | 'in_progress' | 'upcoming' = 'in_progress';
    if (event.finished) {
      status = 'completed';
    } else if (!event.is_current && !event.data_checked) {
      status = 'upcoming';
    }

    return {
      status,
      finished: event.finished,
      is_current: event.is_current,
      data_checked: event.data_checked,
    };

  } catch (error) {
    console.error('[K-108] Error determining GW status:', error);
    // Default to in_progress if we can't determine
    return {
      status: 'in_progress',
      finished: false,
      is_current: true,
      data_checked: true,
    };
  }
}

/**
 * Fetch player data from database (for completed GWs)
 */
async function fetchFromDatabase(
  gameweek: number,
  playerIds: number[] | null,
  teamId: number | null,
  position: Position | null
) {
  const db = await getDatabase();

  // Build WHERE clause based on filters
  const whereClauses = ['pgw.gameweek = $1'];
  const params: any[] = [gameweek];
  let paramIndex = 2;

  if (playerIds && playerIds.length > 0) {
    whereClauses.push(`pgw.player_id = ANY($${paramIndex})`);
    params.push(playerIds);
    paramIndex++;
  }

  if (teamId) {
    whereClauses.push(`p.team_id = $${paramIndex}`);
    params.push(teamId);
    paramIndex++;
  }

  if (position) {
    whereClauses.push(`p.element_type = $${paramIndex}`);
    params.push(position);
    paramIndex++;
  }

  const whereClause = whereClauses.join(' AND ');

  const query = `
    SELECT
      p.id,
      p.web_name,
      p.first_name,
      p.second_name,
      p.team_id,
      t.short_name as team_short_name,
      p.element_type as position,
      p.photo,
      p.team_code,

      pgw.fixture_id,
      pgw.opponent_team_id,
      pgw.opponent_short,
      pgw.was_home as is_home,
      pgw.fixture_started as started,
      pgw.fixture_finished as finished,

      pgw.minutes,
      pgw.goals_scored,
      pgw.assists,
      pgw.clean_sheets,
      pgw.goals_conceded,
      pgw.own_goals,
      pgw.penalties_saved,
      pgw.penalties_missed,
      pgw.yellow_cards,
      pgw.red_cards,
      pgw.saves,
      pgw.bonus,
      pgw.bps,
      pgw.defensive_contribution,
      pgw.influence,
      pgw.creativity,
      pgw.threat,
      pgw.ict_index,
      pgw.expected_goals,
      pgw.expected_assists,
      pgw.expected_goal_involvements,

      pgw.calculated_points,
      pgw.total_points as fpl_total_points,
      pgw.points_breakdown

    FROM player_gameweek_stats pgw
    JOIN players p ON p.id = pgw.player_id
    LEFT JOIN teams t ON t.id = p.team_id
    WHERE ${whereClause}
    ORDER BY p.element_type, p.web_name
  `;

  const result = await db.query(query, params);

  return result.rows.map((row: any) => ({
    id: row.id,
    web_name: row.web_name,
    first_name: row.first_name,
    second_name: row.second_name,
    team_id: row.team_id,
    team_short_name: row.team_short_name,
    position: row.position,
    photo: row.photo,
    team_code: row.team_code,

    fixture: row.fixture_id ? {
      id: row.fixture_id,
      opponent_team_id: row.opponent_team_id,
      opponent_short_name: row.opponent_short,
      is_home: row.is_home,
      started: row.started,
      finished: row.finished,
    } : null,

    stats: {
      minutes: row.minutes,
      goals_scored: row.goals_scored,
      assists: row.assists,
      clean_sheets: row.clean_sheets,
      goals_conceded: row.goals_conceded,
      own_goals: row.own_goals,
      penalties_saved: row.penalties_saved,
      penalties_missed: row.penalties_missed,
      yellow_cards: row.yellow_cards,
      red_cards: row.red_cards,
      saves: row.saves,
      bonus: row.bonus,
      bps: row.bps,
      defensive_contribution: row.defensive_contribution,
      influence: row.influence,
      creativity: row.creativity,
      threat: row.threat,
      ict_index: row.ict_index,
      expected_goals: row.expected_goals,
      expected_assists: row.expected_assists,
      expected_goal_involvements: row.expected_goal_involvements,
    },

    points: {
      total: row.calculated_points,
      fpl_total: row.fpl_total_points,
      match: row.calculated_points === row.fpl_total_points,
      breakdown: row.points_breakdown,
    },
  }));
}

/**
 * Fetch player data from FPL API (for live/upcoming GWs)
 */
async function fetchFromAPI(
  gameweek: number,
  playerIds: number[] | null,
  teamId: number | null,
  position: Position | null
) {
  // Fetch bootstrap-static for player info and teams
  const [bootstrapResponse, liveResponse, fixturesResponse] = await Promise.all([
    fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
    fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`),
    fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gameweek}`),
  ]);

  if (!bootstrapResponse.ok || !liveResponse.ok || !fixturesResponse.ok) {
    throw new Error('Failed to fetch FPL API data');
  }

  const bootstrapData = await bootstrapResponse.json();
  const liveData = await liveResponse.json();
  const fixturesData = await fixturesResponse.json();

  // Build team lookup
  const teamLookup: { [key: number]: any } = {};
  bootstrapData.teams.forEach((team: any) => {
    teamLookup[team.id] = team;
  });

  // Build fixture lookup
  const fixturesByTeam: { [key: number]: any } = {};
  fixturesData.forEach((fixture: any) => {
    fixturesByTeam[fixture.team_h] = {
      id: fixture.id,
      opponent_team_id: fixture.team_a,
      opponent_short_name: teamLookup[fixture.team_a]?.short_name || 'UNK',
      is_home: true,
      started: fixture.started || false,
      finished: fixture.finished || false,
    };
    fixturesByTeam[fixture.team_a] = {
      id: fixture.id,
      opponent_team_id: fixture.team_h,
      opponent_short_name: teamLookup[fixture.team_h]?.short_name || 'UNK',
      is_home: false,
      started: fixture.started || false,
      finished: fixture.finished || false,
    };
  });

  // Process each player
  let players = bootstrapData.elements.map((element: any) => {
    const liveElement = liveData.elements.find((e: any) => e.id === element.id);
    const stats = liveElement?.stats || {};
    const fixture = fixturesByTeam[element.team];

    // Calculate points using our calculator
    const calculated = calculatePoints({
      minutes: stats.minutes || 0,
      goals_scored: stats.goals_scored || 0,
      assists: stats.assists || 0,
      clean_sheets: stats.clean_sheets || 0,
      goals_conceded: stats.goals_conceded || 0,
      own_goals: stats.own_goals || 0,
      penalties_saved: stats.penalties_saved || 0,
      penalties_missed: stats.penalties_missed || 0,
      yellow_cards: stats.yellow_cards || 0,
      red_cards: stats.red_cards || 0,
      saves: stats.saves || 0,
      bonus: stats.bonus || 0,
      defensive_contribution: 0, // Not available in live API
    }, element.element_type as Position);

    return {
      id: element.id,
      web_name: element.web_name,
      first_name: element.first_name,
      second_name: element.second_name,
      team_id: element.team,
      team_short_name: teamLookup[element.team]?.short_name || 'UNK',
      position: element.element_type,
      photo: element.photo,
      team_code: element.team_code,

      fixture: fixture || null,

      stats: {
        minutes: stats.minutes || 0,
        goals_scored: stats.goals_scored || 0,
        assists: stats.assists || 0,
        clean_sheets: stats.clean_sheets || 0,
        goals_conceded: stats.goals_conceded || 0,
        own_goals: stats.own_goals || 0,
        penalties_saved: stats.penalties_saved || 0,
        penalties_missed: stats.penalties_missed || 0,
        yellow_cards: stats.yellow_cards || 0,
        red_cards: stats.red_cards || 0,
        saves: stats.saves || 0,
        bonus: stats.bonus || 0,
        bps: stats.bps || 0,
        defensive_contribution: 0,
        influence: stats.influence || '0.0',
        creativity: stats.creativity || '0.0',
        threat: stats.threat || '0.0',
        ict_index: stats.ict_index || '0.0',
        expected_goals: stats.expected_goals || '0.00',
        expected_assists: stats.expected_assists || '0.00',
        expected_goal_involvements: stats.expected_goal_involvements || '0.00',
      },

      points: {
        total: calculated.total,
        fpl_total: stats.total_points || 0,
        match: calculated.total === (stats.total_points || 0),
        breakdown: calculated.breakdown,
      },
    };
  });

  // Apply filters
  if (playerIds && playerIds.length > 0) {
    players = players.filter((p: any) => playerIds.includes(p.id));
  }

  if (teamId) {
    players = players.filter((p: any) => p.team_id === teamId);
  }

  if (position) {
    players = players.filter((p: any) => p.position === position);
  }

  return players;
}
