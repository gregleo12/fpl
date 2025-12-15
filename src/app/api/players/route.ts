import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse params
    const position = searchParams.get('position');
    const team = searchParams.get('team');
    const maxPrice = parseInt(searchParams.get('maxPrice') || '150');
    const minPrice = parseInt(searchParams.get('minPrice') || '0');
    const sort = searchParams.get('sort') || 'total_points';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const search = searchParams.get('search');

    // Validate sort field (whitelist to prevent SQL injection)
    const allowedSorts = [
      'total_points', 'form', 'now_cost', 'goals_scored', 'assists',
      'clean_sheets', 'bonus', 'bps', 'minutes', 'ict_index',
      'expected_goals', 'expected_assists', 'selected_by_percent',
      'points_per_game', 'web_name'
    ];
    const sortField = allowedSorts.includes(sort) ? sort : 'total_points';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const db = await getDatabase();

    // Build query
    const whereConditions: string[] = ['now_cost <= $1', 'now_cost >= $2'];
    const params: any[] = [maxPrice, minPrice];
    let paramIndex = 3;

    if (position && position !== 'all') {
      whereConditions.push(`position = $${paramIndex}`);
      params.push(position);
      paramIndex++;
    }

    if (team && team !== 'all') {
      whereConditions.push(`team_id = $${paramIndex}`);
      params.push(parseInt(team));
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(web_name ILIKE $${paramIndex} OR second_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM players WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get players
    const playersResult = await db.query(`
      SELECT
        id, web_name, first_name, second_name,
        team_id, team_name, team_short, team_code, position,
        now_cost, selected_by_percent,
        total_points, points_per_game, form,
        event_points,
        minutes, starts, goals_scored, assists,
        clean_sheets, goals_conceded,
        bonus, bps,
        expected_goals, expected_assists, expected_goal_involvements,
        ict_index, influence, creativity, threat,
        saves, penalties_saved,
        yellow_cards, red_cards, penalties_missed,
        own_goals,
        cost_change_start,
        status, news, chance_of_playing_next_round
      FROM players
      WHERE ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    // Get teams for filter
    const teamsResult = await db.query(
      'SELECT id, name, short_name FROM teams ORDER BY name'
    );

    // Format players
    const players = playersResult.rows.map((p: any) => ({
      ...p,
      price: `£${(p.now_cost / 10).toFixed(1)}m`
    }));

    return NextResponse.json({
      players,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        positions: ['GKP', 'DEF', 'MID', 'FWD'],
        teams: teamsResult.rows.map((t: any) => ({
          id: t.id,
          name: t.name,
          short: t.short_name
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}
