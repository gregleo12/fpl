import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateAllPlayerSeasonStats, getCurrentGameweek } from '@/lib/playerCalculator';

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000);
    const search = searchParams.get('search');
    const includeElite = searchParams.get('includeElite') === 'true';

    // Validate sort field (whitelist to prevent SQL injection)
    const allowedSorts = [
      'total_points', 'form', 'now_cost', 'goals_scored', 'assists',
      'clean_sheets', 'bonus', 'bps', 'minutes', 'ict_index',
      'expected_goals', 'expected_assists', 'selected_by_percent',
      'points_per_game', 'web_name', 'elite_ownership', 'elite_delta'
    ];
    const sortField = allowedSorts.includes(sort) ? sort : 'total_points';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const db = await getDatabase();

    // Debug: Check tables exist
    try {
      const tableCheck = await db.query(`
        SELECT table_name,
               (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as col_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        AND table_name IN ('players', 'teams', 'player_gameweek_stats')
      `);
    } catch (dbErr: any) {
      console.error('[Players API] DB connection error:', dbErr.message);
    }

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

    // K-110: Calculate accurate season stats from K-108 data
    const currentGW = await getCurrentGameweek();
    const seasonStats = await calculateAllPlayerSeasonStats(currentGW);

    // Format players
    const players = playersResult.rows.map((p: any) => {
      // K-110: Replace stale FPL stats with calculated stats from K-108
      const calculated = seasonStats.get(p.id);

      if (calculated) {
        // Log discrepancies for verification
        const diffs = [];
        if (calculated.total_points !== p.total_points) diffs.push(`pts: ${p.total_points}→${calculated.total_points}`);
        if (calculated.goals !== p.goals_scored) diffs.push(`goals: ${p.goals_scored}→${calculated.goals}`);
        if (calculated.assists !== p.assists) diffs.push(`assists: ${p.assists}→${calculated.assists}`);
        if (calculated.minutes !== p.minutes) diffs.push(`mins: ${p.minutes}→${calculated.minutes}`);
        if (calculated.bonus !== p.bonus) diffs.push(`bonus: ${p.bonus}→${calculated.bonus}`);

        if (diffs.length > 0) {
        }

        return {
          ...p,
          // Override with K-110 calculated stats
          total_points: calculated.total_points,
          goals_scored: calculated.goals,
          assists: calculated.assists,
          minutes: calculated.minutes,
          bonus: calculated.bonus,
          bps: calculated.bps,
          clean_sheets: calculated.clean_sheets,
          goals_conceded: calculated.goals_conceded,
          saves: calculated.saves,
          yellow_cards: calculated.yellow_cards,
          red_cards: calculated.red_cards,
          own_goals: calculated.own_goals,
          penalties_missed: calculated.penalties_missed,
          starts: calculated.starts,
          // Keep original FPL values for comparison/debugging
          fpl_total_points: p.total_points,
          fpl_goals: p.goals_scored,
          fpl_assists: p.assists,
          fpl_minutes: p.minutes,
          fpl_bonus: p.bonus,
          price: `£${(p.now_cost / 10).toFixed(1)}m`
        };
      }

      // No calculated stats available (shouldn't happen, but fallback to FPL)
      return {
        ...p,
        price: `£${(p.now_cost / 10).toFixed(1)}m`
      };
    });

    // K-200c: Add elite ownership data if requested
    let playersWithElite = players;
    if (includeElite) {
      try {
        // Get current gameweek for elite data
        const currentGW = await getCurrentGameweek();

        // Fetch elite ownership from elite_picks table
        const eliteResult = await db.query(`
          SELECT
            player_id,
            COUNT(DISTINCT entry_id) as owner_count
          FROM elite_picks
          WHERE gameweek = $1 AND sample_tier = 'top10k'
          GROUP BY player_id
        `, [currentGW]);

        // Build elite ownership map
        const sampleSize = 10000; // Top 10K sample
        const eliteMap = new Map<number, number>();
        eliteResult.rows.forEach(row => {
          const elitePercent = (parseInt(row.owner_count) / sampleSize) * 100;
          eliteMap.set(row.player_id, elitePercent);
        });

        // Merge elite data into players
        playersWithElite = players.map(p => {
          const eliteOwnership = eliteMap.get(p.id) || 0;
          const overallOwnership = parseFloat(p.selected_by_percent || '0');
          const delta = eliteOwnership - overallOwnership;

          return {
            ...p,
            elite_ownership: eliteOwnership,
            elite_delta: delta
          };
        });
      } catch (eliteErr) {
        console.error('[Players API] Elite data fetch error:', eliteErr);
        // Continue without elite data - graceful degradation
      }
    }

    return NextResponse.json({
      players: playersWithElite,
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

  } catch (error: any) {
    console.error('[Players API] Full error:', error);
    console.error('[Players API] Error message:', error?.message);
    console.error('[Players API] Error code:', error?.code);

    return NextResponse.json(
      {
        error: 'Failed to fetch players',
        details: error?.message || 'Unknown error',
        code: error?.code
      },
      { status: 500 }
    );
  }
}
