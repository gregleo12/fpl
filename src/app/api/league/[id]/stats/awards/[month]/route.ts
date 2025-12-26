import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to get month name from month index
function getMonthName(monthIndex: number): string {
  const months = [
    'August',
    'September',
    'October',
    'November',
    'December',
    'January',
    'February',
    'March',
    'April/May'
  ];
  return months[monthIndex] || months[0];
}

// Helper to get calendar month and year from month index (0 = August 2025, etc.)
function getCalendarMonth(monthIndex: number): { month: number; year: number } {
  // Assuming season starts August 2025
  // Aug=8/2025, Sep=9/2025, Oct=10/2025, Nov=11/2025, Dec=12/2025,
  // Jan=1/2026, Feb=2/2026, Mar=3/2026, Apr/May=4-5/2026
  const seasonStartYear = 2025;

  if (monthIndex <= 4) {
    // August - December 2025
    return { month: monthIndex + 8, year: seasonStartYear };
  } else if (monthIndex === 8) {
    // April/May - use April
    return { month: 4, year: seasonStartYear + 1 };
  } else {
    // January - March 2026
    return { month: monthIndex - 4, year: seasonStartYear + 1 };
  }
}

// Get completed GWs for a specific calendar month from pl_fixtures
async function getCompletedGWsForMonth(
  db: any,
  month: number,
  year: number
): Promise<number[]> {
  try {
    const result = await db.query(`
      SELECT DISTINCT event
      FROM pl_fixtures
      WHERE EXTRACT(MONTH FROM kickoff_time) = $1
        AND EXTRACT(YEAR FROM kickoff_time) = $2
        AND finished = true
      ORDER BY event
    `, [month, year]);

    return result.rows.map((row: any) => row.event);
  } catch (e) {
    console.error('Error fetching GWs for month:', e);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; month: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const monthIndex = parseInt(params.month);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 8) {
      return NextResponse.json({ error: 'Invalid month index' }, { status: 400 });
    }

    const db = await getDatabase();
    const monthName = getMonthName(monthIndex);
    const { month, year } = getCalendarMonth(monthIndex);

    // Get actual completed GWs for this calendar month from pl_fixtures
    const gameweeks = await getCompletedGWsForMonth(db, month, year);

    if (gameweeks.length === 0) {
      return NextResponse.json({
        month: monthIndex,
        monthName,
        startGW: 0,
        endGW: 0,
        awards: []
      });
    }

    const startGW = gameweeks[0];
    const endGW = gameweeks[gameweeks.length - 1];

    // Fetch all managers in this league
    const managersResult = await db.query(`
      SELECT m.entry_id, m.player_name, m.team_name
      FROM managers m
      JOIN league_standings ls ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
      ORDER BY m.entry_id
    `, [leagueId]);
    const managers = managersResult.rows;

    if (managers.length === 0) {
      return NextResponse.json({
        month: monthIndex,
        monthName,
        startGW,
        endGW,
        awards: []
      });
    }

    // Calculate all awards using actual GWs from pl_fixtures
    const [
      bestGameweek,
      form,
      consistency,
      luck,
      captain,
      bench
    ] = await Promise.all([
      calculateBestGameweek(db, gameweeks, managers),
      calculateForm(db, gameweeks, managers),
      calculateConsistency(db, gameweeks, managers),
      calculateLuck(db, leagueId, gameweeks, managers),
      calculateCaptain(db, leagueId, gameweeks, managers),
      calculateBench(db, gameweeks, managers)
    ]);

    return NextResponse.json({
      month: monthIndex,
      monthName,
      startGW,
      endGW,
      awards: [
        { category: 'best_gameweek', ...bestGameweek },
        { category: 'form', ...form },
        { category: 'consistency', ...consistency },
        { category: 'luck', ...luck },
        { category: 'captain', ...captain },
        { category: 'bench', ...bench }
      ]
    });

  } catch (error: any) {
    console.error('Error fetching monthly awards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly awards' },
      { status: 500 }
    );
  }
}

// Award calculation functions
async function calculateBestGameweek(
  db: any,
  gameweeks: number[],
  managers: any[]
) {
  try {
    const result = await db.query(`
      WITH gw_scores AS (
        SELECT
          mgh.entry_id,
          m.player_name,
          m.team_name,
          mgh.event as gameweek,
          (mgh.points - COALESCE(mgh.event_transfers_cost, 0)) as net_points
        FROM manager_gw_history mgh
        JOIN managers m ON m.entry_id = mgh.entry_id
        WHERE mgh.entry_id = ANY($1)
          AND mgh.event = ANY($2)
      )
      SELECT
        entry_id,
        player_name,
        team_name,
        gameweek,
        net_points as value,
        net_points || ' pts' as formatted_value
      FROM gw_scores
      ORDER BY net_points DESC
    `, [managers.map(m => m.entry_id), gameweeks]);

    return {
      best: result.rows[0] || null,
      worst: result.rows[result.rows.length - 1] || null
    };
  } catch (e) {
    console.error('Best Gameweek error:', e);
    return { best: null, worst: null };
  }
}

async function calculateForm(
  db: any,
  gameweeks: number[],
  managers: any[]
) {
  try {
    // Form = Last 5 GWs or all GWs in month if less than 5
    const last5GWs = gameweeks.slice(-5);

    const result = await db.query(`
      WITH form_scores AS (
        SELECT
          mgh.entry_id,
          m.player_name,
          m.team_name,
          SUM(mgh.points - COALESCE(mgh.event_transfers_cost, 0)) as form_points
        FROM manager_gw_history mgh
        JOIN managers m ON m.entry_id = mgh.entry_id
        WHERE mgh.entry_id = ANY($1)
          AND mgh.event = ANY($2)
        GROUP BY mgh.entry_id, m.player_name, m.team_name
      )
      SELECT
        entry_id,
        player_name,
        team_name,
        form_points as value,
        form_points || ' pts' as formatted_value
      FROM form_scores
      ORDER BY form_points DESC
    `, [managers.map(m => m.entry_id), last5GWs]);

    return {
      best: result.rows[0] || null,
      worst: result.rows[result.rows.length - 1] || null
    };
  } catch (e) {
    console.error('Form error:', e);
    return { best: null, worst: null };
  }
}

async function calculateConsistency(
  db: any,
  gameweeks: number[],
  managers: any[]
) {
  try {
    const result = await db.query(`
      WITH gw_points AS (
        SELECT
          entry_id,
          points - COALESCE(event_transfers_cost, 0) as net_points
        FROM manager_gw_history
        WHERE entry_id = ANY($1)
          AND event = ANY($2)
      ),
      variance_calc AS (
        SELECT
          gp.entry_id,
          m.player_name,
          m.team_name,
          ROUND(STDDEV(gp.net_points)::numeric, 0) as variance
        FROM gw_points gp
        JOIN managers m ON m.entry_id = gp.entry_id
        GROUP BY gp.entry_id, m.player_name, m.team_name
        HAVING COUNT(*) > 1
      )
      SELECT
        entry_id,
        player_name,
        team_name,
        variance as value,
        '±' || variance || ' pts' as formatted_value
      FROM variance_calc
      ORDER BY variance ASC
    `, [managers.map(m => m.entry_id), gameweeks]);

    return {
      best: result.rows[0] || null,  // Most consistent (lowest variance)
      worst: result.rows[result.rows.length - 1] || null  // Most variable (highest variance)
    };
  } catch (e) {
    console.error('Consistency error:', e);
    return { best: null, worst: null };
  }
}

async function calculateLuck(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  try {
    const result = await db.query(`
      WITH manager_avg AS (
        SELECT
          entry_id,
          AVG(points - COALESCE(event_transfers_cost, 0)) as avg_points
        FROM manager_gw_history
        WHERE entry_id = ANY($1)
          AND event = ANY($2)
        GROUP BY entry_id
      ),
      luck_calc AS (
        SELECT
          h.entry_1 as entry_id,
          m.player_name,
          m.team_name,
          ROUND(SUM(
            (h.entry_1_points - ma1.avg_points) -
            (h.entry_2_points - ma2.avg_points)
          )::numeric, 0) as luck_index
        FROM h2h_matches h
        JOIN managers m ON m.entry_id = h.entry_1
        JOIN manager_avg ma1 ON ma1.entry_id = h.entry_1
        JOIN manager_avg ma2 ON ma2.entry_id = h.entry_2
        WHERE h.league_id = $3
          AND h.event = ANY($2)
        GROUP BY h.entry_1, m.player_name, m.team_name
      )
      SELECT
        entry_id,
        player_name,
        team_name,
        luck_index as value,
        CASE
          WHEN luck_index > 0 THEN '+' || luck_index || ' pts'
          ELSE luck_index || ' pts'
        END as formatted_value
      FROM luck_calc
      ORDER BY luck_index DESC
    `, [managers.map(m => m.entry_id), gameweeks, leagueId]);

    return {
      best: result.rows[0] || null,  // Luckiest (highest luck)
      worst: result.rows[result.rows.length - 1] || null  // Unluckiest (lowest luck)
    };
  } catch (e) {
    console.error('Luck error:', e);
    return { best: null, worst: null };
  }
}

async function calculateCaptain(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  try {
    const result = await db.query(`
      WITH captain_points AS (
        SELECT
          mp.entry_id,
          m.player_name,
          m.team_name,
          SUM(pgs.total_points) as total_captain_points
        FROM manager_picks mp
        JOIN player_gameweek_stats pgs ON pgs.player_id = mp.player_id AND pgs.gameweek = mp.event
        JOIN managers m ON m.entry_id = mp.entry_id
        WHERE mp.league_id = $3
          AND mp.entry_id = ANY($1)
          AND mp.event = ANY($2)
          AND mp.is_captain = true
        GROUP BY mp.entry_id, m.player_name, m.team_name
      )
      SELECT
        entry_id,
        player_name,
        team_name,
        total_captain_points as value,
        total_captain_points || ' pts' as formatted_value
      FROM captain_points
      ORDER BY total_captain_points DESC
    `, [managers.map(m => m.entry_id), gameweeks, leagueId]);

    return {
      best: result.rows[0] || null,
      worst: result.rows[result.rows.length - 1] || null
    };
  } catch (e) {
    console.error('Captain error:', e);
    return { best: null, worst: null };
  }
}

async function calculateBench(
  db: any,
  gameweeks: number[],
  managers: any[]
) {
  try {
    const result = await db.query(`
      WITH bench_stats AS (
        SELECT
          mgh.entry_id,
          m.player_name,
          m.team_name,
          SUM(mgh.points_on_bench) as total_bench_points,
          SUM(mgh.points - COALESCE(mgh.event_transfers_cost, 0)) as total_points
        FROM manager_gw_history mgh
        JOIN managers m ON m.entry_id = mgh.entry_id
        WHERE mgh.entry_id = ANY($1)
          AND mgh.event = ANY($2)
        GROUP BY mgh.entry_id, m.player_name, m.team_name
        HAVING SUM(mgh.points - COALESCE(mgh.event_transfers_cost, 0)) > 0
      )
      SELECT
        entry_id,
        player_name,
        team_name,
        ROUND((total_bench_points::numeric / (total_points + total_bench_points) * 100), 1) as value,
        ROUND((total_bench_points::numeric / (total_points + total_bench_points) * 100), 1) || '%' as formatted_value
      FROM bench_stats
      ORDER BY value ASC
    `, [managers.map(m => m.entry_id), gameweeks]);

    return {
      best: result.rows[0] || null,  // Best bench (lowest %)
      worst: result.rows[result.rows.length - 1] || null  // Worst bench (highest %)
    };
  } catch (e) {
    console.error('Bench error:', e);
    return { best: null, worst: null };
  }
}
