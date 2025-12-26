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

    // Calculate all awards sequentially to catch specific errors
    let topScorer = null, bestForm = null, mostConsistent = null, luckiest = null;
    let bestBench = null, chipMaster = null, captainKing = null, longestStreak = null;

    try {
      topScorer = await calculateTopScorer(db, leagueId, startGW, endGW, managers);
    } catch (e: any) {
      console.error('Top Scorer error:', e);
    }

    try {
      bestForm = await calculateBestForm(db, leagueId, startGW, endGW, managers);
    } catch (e) {
      console.error('Best Form error:', e);
    }

    try {
      mostConsistent = await calculateMostConsistent(db, leagueId, startGW, endGW, managers);
    } catch (e) {
      console.error('Most Consistent error:', e);
    }

    try {
      luckiest = await calculateLuckiest(db, leagueId, startGW, endGW, managers);
    } catch (e) {
      console.error('Luckiest error:', e);
    }

    try {
      bestBench = await calculateBestBench(db, leagueId, startGW, endGW, managers);
    } catch (e) {
      console.error('Best Bench error:', e);
    }

    try {
      chipMaster = await calculateChipMaster(db, leagueId, startGW, endGW, managers);
    } catch (e) {
      console.error('Chip Master error:', e);
    }

    try {
      captainKing = await calculateCaptainKing(db, leagueId, startGW, endGW, managers);
    } catch (e) {
      console.error('Captain King error:', e);
    }

    try {
      longestStreak = await calculateLongestStreak(db, leagueId, startGW, endGW, managers);
    } catch (e) {
      console.error('Longest Streak error:', e);
    }

    return NextResponse.json({
      month: monthIndex,
      monthName,
      startGW,
      endGW,
      awards: [
        { category: 'top_scorer', winner: topScorer },
        { category: 'best_form', winner: bestForm },
        { category: 'most_consistent', winner: mostConsistent },
        { category: 'luckiest', winner: luckiest },
        { category: 'best_bench', winner: bestBench },
        { category: 'chip_master', winner: chipMaster },
        { category: 'captain_king', winner: captainKing },
        { category: 'longest_streak', winner: longestStreak }
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
  leagueId: number,
  startGW: number,
  endGW: number,
  managers: any[]
) {
  const result = await db.query(`
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
    ORDER BY total_points DESC
    LIMIT 1
  `, [managers.map(m => m.entry_id), startGW, endGW]);

  if (result.rows.length === 0) return null;

  const winner = result.rows[0];
  return {
    entry_id: winner.entry_id,
    player_name: winner.player_name,
    team_name: winner.team_name,
    value: parseInt(winner.total_points)
  };
}

async function calculateBestForm(
  db: any,
  leagueId: number,
  startGW: number,
  endGW: number,
  managers: any[]
) {
  // Best Form = Highest points in last 5 GWs of the month
  const last5Start = Math.max(startGW, endGW - 4);

  const result = await db.query(`
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
    ORDER BY form_points DESC
    LIMIT 1
  `, [managers.map(m => m.entry_id), last5Start, endGW]);

  if (result.rows.length === 0) return null;

  const winner = result.rows[0];
  return {
    entry_id: winner.entry_id,
    player_name: winner.player_name,
    team_name: winner.team_name,
    value: parseInt(winner.form_points)
  };
}

async function calculateMostConsistent(
  db: any,
  leagueId: number,
  startGW: number,
  endGW: number,
  managers: any[]
) {
  // Most Consistent = Lowest variance in points
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
    SELECT * FROM variance_calc
    ORDER BY variance ASC
    LIMIT 1
  `, [managers.map(m => m.entry_id), startGW, endGW]);

  if (result.rows.length === 0) return null;

  const winner = result.rows[0];
  return {
    entry_id: winner.entry_id,
    player_name: winner.player_name,
    team_name: winner.team_name,
    value: parseInt(winner.variance)
  };
}

async function calculateLuckiest(
  db: any,
  leagueId: number,
  startGW: number,
  endGW: number,
  managers: any[]
) {
  // Luckiest = Highest luck index (sum of points - opponent_points for H2H matches)
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
        SUM(
          (h.entry_1_points - ma1.avg_points) -
          (h.entry_2_points - ma2.avg_points)
        ) as luck_index
      FROM h2h_matches h
      JOIN managers m ON m.entry_id = h.entry_1
      JOIN manager_avg ma1 ON ma1.entry_id = h.entry_1
      JOIN manager_avg ma2 ON ma2.entry_id = h.entry_2
      WHERE h.league_id = $4
        AND h.event >= $2
        AND h.event <= $3
      GROUP BY h.entry_1, m.player_name, m.team_name
    )
    SELECT * FROM luck_calc
    ORDER BY luck_index DESC
    LIMIT 1
  `, [managers.map(m => m.entry_id), startGW, endGW, leagueId]);

  if (result.rows.length === 0) return null;

  const winner = result.rows[0];
  return {
    entry_id: winner.entry_id,
    player_name: winner.player_name,
    team_name: winner.team_name,
    value: Math.round(parseFloat(winner.luck_index))
  };
}

async function calculateBestBench(
  db: any,
  leagueId: number,
  startGW: number,
  endGW: number,
  managers: any[]
) {
  // Best Bench Manager = Lowest bench points percentage
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
      ROUND((total_bench_points::numeric / (total_points + total_bench_points) * 100), 1) as bench_percentage
    FROM bench_stats
    ORDER BY bench_percentage ASC
    LIMIT 1
  `, [managers.map(m => m.entry_id), startGW, endGW]);

  if (result.rows.length === 0) return null;

  const winner = result.rows[0];
  return {
    entry_id: winner.entry_id,
    player_name: winner.player_name,
    team_name: winner.team_name,
    value: parseFloat(winner.bench_percentage)
  };
}

async function calculateChipMaster(
  db: any,
  leagueId: number,
  startGW: number,
  endGW: number,
  managers: any[]
) {
  // Chip Master = Best chip win/loss record (highest win percentage)
  const result = await db.query(`
    WITH chip_matches AS (
      SELECT
        h.entry_1 as entry_id,
        CASE
          WHEN h.entry_1_points > h.entry_2_points THEN 1
          ELSE 0
        END as won
      FROM h2h_matches h
      JOIN manager_chips mc ON mc.entry_id = h.entry_1 AND mc.event = h.event
      WHERE h.league_id = $4
        AND h.event >= $2
        AND h.event <= $3
        AND h.entry_1 = ANY($1)
    ),
    chip_stats AS (
      SELECT
        cm.entry_id,
        m.player_name,
        m.team_name,
        COUNT(*) as total_chips,
        SUM(cm.won) as wins
      FROM chip_matches cm
      JOIN managers m ON m.entry_id = cm.entry_id
      GROUP BY cm.entry_id, m.player_name, m.team_name
      HAVING COUNT(*) > 0
    )
    SELECT
      entry_id,
      player_name,
      team_name,
      wins::text || '-' || (total_chips - wins)::text as value
    FROM chip_stats
    ORDER BY (wins::float / total_chips) DESC, wins DESC
    LIMIT 1
  `, [managers.map(m => m.entry_id), startGW, endGW, leagueId]);

  if (result.rows.length === 0) return null;

  const winner = result.rows[0];
  return {
    entry_id: winner.entry_id,
    player_name: winner.player_name,
    team_name: winner.team_name,
    value: winner.value
  };
}

async function calculateCaptainKing(
  db: any,
  leagueId: number,
  startGW: number,
  endGW: number,
  managers: any[]
) {
  // Captain King = Most captain points
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
    SELECT * FROM captain_points
    ORDER BY total_captain_points DESC
    LIMIT 1
  `, [managers.map(m => m.entry_id), startGW, endGW, leagueId]);

  if (result.rows.length === 0) return null;

  const winner = result.rows[0];
  return {
    entry_id: winner.entry_id,
    player_name: winner.player_name,
    team_name: winner.team_name,
    value: parseInt(winner.total_captain_points)
  };
}

async function calculateLongestStreak(
  db: any,
  leagueId: number,
  startGW: number,
  endGW: number,
  managers: any[]
) {
  // Longest Streak = Longest consecutive H2H win streak
  const matchesResult = await db.query(`
    SELECT
      entry_1 as entry_id,
      event,
      CASE
        WHEN entry_1_points > entry_2_points THEN 1
        ELSE 0
      END as won
    FROM h2h_matches
    WHERE league_id = $1
      AND event >= $2
      AND event <= $3
      AND entry_1 = ANY($4)
    ORDER BY entry_1, event
  `, [leagueId, startGW, endGW, managers.map(m => m.entry_id)]);

  const matches = matchesResult.rows;
  let maxStreak = 0;
  let winnerId: number | null = null;

  // Calculate streaks for each manager
  const managerStreaks: { [key: number]: number } = {};

  managers.forEach(manager => {
    const managerMatches = matches.filter((m: any) => m.entry_id === manager.entry_id);
    let currentStreak = 0;
    let maxManagerStreak = 0;

    managerMatches.forEach((match: any) => {
      if (match.won === 1) {
        currentStreak++;
        maxManagerStreak = Math.max(maxManagerStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    managerStreaks[manager.entry_id] = maxManagerStreak;

    if (maxManagerStreak > maxStreak) {
      maxStreak = maxManagerStreak;
      winnerId = manager.entry_id;
    }
  });

  if (!winnerId || maxStreak === 0) return null;

  const winner = managers.find(m => m.entry_id === winnerId);
  return {
    entry_id: winner.entry_id,
    player_name: winner.player_name,
    team_name: winner.team_name,
    value: maxStreak
  };
}
