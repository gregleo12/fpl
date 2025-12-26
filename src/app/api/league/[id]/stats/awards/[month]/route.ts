import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to get month info from month index
function getMonthInfo(monthIndex: number): {
  monthName: string;
  startGW: number;
  endGW: number;
} {
  const monthData = [
    { monthName: 'August', startGW: 1, endGW: 4 },
    { monthName: 'September', startGW: 5, endGW: 8 },
    { monthName: 'October', startGW: 9, endGW: 12 },
    { monthName: 'November', startGW: 13, endGW: 16 },
    { monthName: 'December', startGW: 17, endGW: 21 },
    { monthName: 'January', startGW: 22, endGW: 25 },
    { monthName: 'February', startGW: 26, endGW: 29 },
    { monthName: 'March', startGW: 30, endGW: 33 },
    { monthName: 'April/May', startGW: 34, endGW: 38 },
  ];

  return monthData[monthIndex] || monthData[0];
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
    const { monthName, startGW, endGW } = getMonthInfo(monthIndex);

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

    // Calculate all awards
    const [
      topScorer,
      bestGameweek,
      form,
      consistency,
      luck,
      captain,
      bench
    ] = await Promise.all([
      calculateTopScorer(db, startGW, endGW, managers),
      calculateBestGameweek(db, startGW, endGW, managers),
      calculateForm(db, startGW, endGW, managers),
      calculateConsistency(db, startGW, endGW, managers),
      calculateLuck(db, leagueId, startGW, endGW, managers),
      calculateCaptain(db, leagueId, startGW, endGW, managers),
      calculateBench(db, startGW, endGW, managers)
    ]);

    return NextResponse.json({
      month: monthIndex,
      monthName,
      startGW,
      endGW,
      awards: [
        { category: 'top_scorer', ...topScorer },
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
async function calculateTopScorer(
  db: any,
  startGW: number,
  endGW: number,
  managers: any[]
) {
  try {
    const result = await db.query(`
      WITH scores AS (
        SELECT
          mgh.entry_id,
          m.player_name,
          m.team_name,
          SUM(mgh.points - COALESCE(mgh.event_transfers_cost, 0)) as total_points
        FROM manager_gw_history mgh
        JOIN managers m ON m.entry_id = mgh.entry_id
        WHERE mgh.entry_id = ANY($1)
          AND mgh.event >= $2
          AND mgh.event <= $3
        GROUP BY mgh.entry_id, m.player_name, m.team_name
      )
      SELECT
        entry_id,
        player_name,
        team_name,
        total_points,
        total_points || ' pts' as formatted_value
      FROM scores
      ORDER BY total_points DESC
    `, [managers.map(m => m.entry_id), startGW, endGW]);

    return {
      best: result.rows[0] || null,
      worst: result.rows[result.rows.length - 1] || null
    };
  } catch (e) {
    console.error('Top Scorer error:', e);
    return { best: null, worst: null };
  }
}

async function calculateBestGameweek(
  db: any,
  startGW: number,
  endGW: number,
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
          AND mgh.event >= $2
          AND mgh.event <= $3
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
    `, [managers.map(m => m.entry_id), startGW, endGW]);

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
  startGW: number,
  endGW: number,
  managers: any[]
) {
  try {
    // Form = Last 5 GWs or all GWs in month if less than 5
    const last5Start = Math.max(startGW, endGW - 4);

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
          AND mgh.event >= $2
          AND mgh.event <= $3
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
    `, [managers.map(m => m.entry_id), last5Start, endGW]);

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
  startGW: number,
  endGW: number,
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
          AND event >= $2
          AND event <= $3
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
    `, [managers.map(m => m.entry_id), startGW, endGW]);

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
  startGW: number,
  endGW: number,
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
          AND event >= $2
          AND event <= $3
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
        WHERE h.league_id = $4
          AND h.event >= $2
          AND h.event <= $3
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
    `, [managers.map(m => m.entry_id), startGW, endGW, leagueId]);

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
  startGW: number,
  endGW: number,
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
        WHERE mp.league_id = $4
          AND mp.entry_id = ANY($1)
          AND mp.event >= $2
          AND mp.event <= $3
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
    `, [managers.map(m => m.entry_id), startGW, endGW, leagueId]);

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
  startGW: number,
  endGW: number,
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
          AND mgh.event >= $2
          AND mgh.event <= $3
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
    `, [managers.map(m => m.entry_id), startGW, endGW]);

    return {
      best: result.rows[0] || null,  // Best bench (lowest %)
      worst: result.rows[result.rows.length - 1] || null  // Worst bench (highest %)
    };
  } catch (e) {
    console.error('Bench error:', e);
    return { best: null, worst: null };
  }
}
