import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    const db = await getDatabase();

    // Fetch all matches for the league to determine completed gameweeks
    // Only count gameweeks where matches were actually played (points > 0)
    const matchesResult = await db.query(`
      SELECT DISTINCT event
      FROM h2h_matches
      WHERE league_id = $1
      AND entry_1_points IS NOT NULL
      AND entry_2_points IS NOT NULL
      AND (entry_1_points > 0 OR entry_2_points > 0)
      ORDER BY event
    `, [leagueId]);

    const completedGameweeks = matchesResult.rows.map(r => r.event);

    if (completedGameweeks.length === 0) {
      return NextResponse.json({
        completedGameweeks: 0,
        leaderboards: {
          captainPoints: [],
          chipPerformance: [],
          hitEfficiency: [],
          streaks: { winning: [], losing: [] },
          bestGameweeks: [],
          worstGameweeks: [],
        },
        trends: {
          chips: [],
        },
      });
    }

    // Fetch all managers in this league
    const managersResult = await db.query(`
      SELECT m.entry_id, m.player_name, m.team_name
      FROM managers m
      JOIN league_standings ls ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
      ORDER BY m.entry_id
    `, [leagueId]);
    const managers = managersResult.rows;

    // Calculate season statistics
    const [
      captainLeaderboard,
      chipLeaderboard,
      hitEfficiencyData,
      streaksData,
      bestWorstGameweeks,
      trendsData
    ] = await Promise.all([
      calculateCaptainLeaderboard(db, leagueId, completedGameweeks, managers),
      calculateChipLeaderboard(db, leagueId, completedGameweeks, managers),
      calculateHitEfficiency(db, leagueId, completedGameweeks, managers),
      calculateStreaks(db, leagueId, completedGameweeks, managers),
      calculateBestWorstGameweeks(db, leagueId, completedGameweeks, managers),
      calculateTrendsData(db, leagueId, completedGameweeks, managers),
    ]);

    return NextResponse.json({
      completedGameweeks: completedGameweeks.length,
      leaderboards: {
        captainPoints: captainLeaderboard,
        chipPerformance: chipLeaderboard,
        hitEfficiency: hitEfficiencyData,
        streaks: streaksData,
        bestGameweeks: bestWorstGameweeks.best,
        worstGameweeks: bestWorstGameweeks.worst,
      },
      trends: trendsData,
    });
  } catch (error: any) {
    console.error('Error fetching season stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch season stats' },
      { status: 500 }
    );
  }
}

// Calculate captain points leaderboard
async function calculateCaptainLeaderboard(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  const captainData = await db.query(`
    SELECT
      ec.entry_id,
      SUM(ec.captain_points) as total_captain_points,
      COUNT(*) as gameweeks_used
    FROM entry_captains ec
    WHERE ec.event = ANY($1)
    GROUP BY ec.entry_id
    ORDER BY total_captain_points DESC
    LIMIT 10
  `, [gameweeks]);

  return captainData.rows.map((row: any) => {
    const manager = managers.find(m => m.entry_id === row.entry_id);
    return {
      entry_id: row.entry_id,
      player_name: manager?.player_name || 'Unknown',
      team_name: manager?.team_name || '',
      total_points: parseInt(row.total_captain_points),
      average_per_gw: parseFloat((parseInt(row.total_captain_points) / parseInt(row.gameweeks_used)).toFixed(1)),
    };
  });
}

// Calculate chip performance leaderboard
async function calculateChipLeaderboard(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  // Get chip usage with scores
  const chipData = await db.query(`
    SELECT
      m.entry_id,
      COALESCE(hm1.active_chip_1, hm2.active_chip_2) as chip,
      COALESCE(hm1.entry_1_points, hm2.entry_2_points) as points
    FROM managers m
    LEFT JOIN h2h_matches hm1 ON m.entry_id = hm1.entry_1_id
      AND hm1.league_id = $1
      AND hm1.event = ANY($2)
      AND hm1.active_chip_1 IS NOT NULL
    LEFT JOIN h2h_matches hm2 ON m.entry_id = hm2.entry_2_id
      AND hm2.league_id = $1
      AND hm2.event = ANY($2)
      AND hm2.active_chip_2 IS NOT NULL
    WHERE hm1.entry_1_id IS NOT NULL OR hm2.entry_2_id IS NOT NULL
  `, [leagueId, gameweeks]);

  // Aggregate chip points by manager
  const managerChipPoints: Record<number, number> = {};
  chipData.rows.forEach((row: any) => {
    const entryId = row.entry_id;
    const points = row.points || 0;
    managerChipPoints[entryId] = (managerChipPoints[entryId] || 0) + points;
  });

  // Convert to leaderboard
  const leaderboard = Object.entries(managerChipPoints)
    .map(([entryId, points]) => {
      const manager = managers.find(m => m.entry_id === parseInt(entryId));
      return {
        entry_id: parseInt(entryId),
        player_name: manager?.player_name || 'Unknown',
        team_name: manager?.team_name || '',
        total_chip_points: points,
      };
    })
    .sort((a, b) => b.total_chip_points - a.total_chip_points)
    .slice(0, 10);

  return leaderboard;
}

// Calculate hit efficiency (points gained vs hits taken)
async function calculateHitEfficiency(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  // This would require picks data from FPL API
  // For now, return placeholder
  // TODO: Implement with picks data
  return [];
}

// Calculate winning and losing streaks
async function calculateStreaks(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  // Get all match results for each manager
  const matchesData = await db.query(`
    SELECT
      entry_1_id as entry_id,
      event,
      entry_1_points as own_points,
      entry_2_points as opp_points,
      CASE
        WHEN entry_1_points > entry_2_points THEN 'W'
        WHEN entry_1_points < entry_2_points THEN 'L'
        ELSE 'D'
      END as result
    FROM h2h_matches
    WHERE league_id = $1 AND event = ANY($2)
    UNION ALL
    SELECT
      entry_2_id as entry_id,
      event,
      entry_2_points as own_points,
      entry_1_points as opp_points,
      CASE
        WHEN entry_2_points > entry_1_points THEN 'W'
        WHEN entry_2_points < entry_1_points THEN 'L'
        ELSE 'D'
      END as result
    FROM h2h_matches
    WHERE league_id = $1 AND event = ANY($2)
    ORDER BY entry_id, event DESC
  `, [leagueId, gameweeks]);

  // Group results by manager
  const managerResults: Record<number, Array<{ event: number; result: string }>> = {};
  matchesData.rows.forEach((row: any) => {
    if (!managerResults[row.entry_id]) {
      managerResults[row.entry_id] = [];
    }
    managerResults[row.entry_id].push({
      event: row.event,
      result: row.result,
    });
  });

  // Calculate streaks for each manager
  const streakData = managers.map((manager) => {
    const results = managerResults[manager.entry_id] || [];

    if (results.length === 0) {
      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        current_streak: 0,
        streak_type: 'N/A',
        form: '',
      };
    }

    // Results are already sorted DESC by event
    const recentResults = results.slice(0, 5);
    const form = recentResults.map(r => r.result).join('');

    // Calculate current streak
    let streak = 0;
    let streakType = results[0].result;

    for (const match of results) {
      if (match.result === streakType && streakType !== 'D') {
        streak++;
      } else {
        break;
      }
    }

    return {
      entry_id: manager.entry_id,
      player_name: manager.player_name,
      team_name: manager.team_name,
      current_streak: streak,
      streak_type: streakType,
      form: form,
    };
  });

  // Separate into winning and losing streaks
  const winningStreaks = streakData
    .filter(s => s.streak_type === 'W' && s.current_streak > 0)
    .sort((a, b) => b.current_streak - a.current_streak)
    .slice(0, 10);

  const losingStreaks = streakData
    .filter(s => s.streak_type === 'L' && s.current_streak > 0)
    .sort((a, b) => b.current_streak - a.current_streak)
    .slice(0, 10);

  return {
    winning: winningStreaks,
    losing: losingStreaks,
  };
}

// Calculate best and worst gameweeks
async function calculateBestWorstGameweeks(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  const scoresData = await db.query(`
    SELECT
      entry_id,
      event,
      points
    FROM (
      SELECT entry_1_id as entry_id, event, entry_1_points as points
      FROM h2h_matches
      WHERE league_id = $1 AND event = ANY($2)
      UNION ALL
      SELECT entry_2_id as entry_id, event, entry_2_points as points
      FROM h2h_matches
      WHERE league_id = $1 AND event = ANY($2)
    ) all_scores
    ORDER BY points DESC
  `, [leagueId, gameweeks]);

  const allScores = scoresData.rows.map((row: any) => {
    const manager = managers.find(m => m.entry_id === row.entry_id);
    return {
      entry_id: row.entry_id,
      player_name: manager?.player_name || 'Unknown',
      team_name: manager?.team_name || '',
      event: row.event,
      points: row.points || 0,
    };
  });

  return {
    best: allScores.slice(0, 10),
    worst: allScores.reverse().slice(0, 10),
  };
}

// Calculate trends data for charts
async function calculateTrendsData(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  // Chips usage timeline
  const chipsData = await db.query(`
    SELECT
      event,
      chip,
      COUNT(*) as count
    FROM (
      SELECT event, active_chip_1 as chip
      FROM h2h_matches
      WHERE league_id = $1 AND event = ANY($2) AND active_chip_1 IS NOT NULL
      UNION ALL
      SELECT event, active_chip_2 as chip
      FROM h2h_matches
      WHERE league_id = $1 AND event = ANY($2) AND active_chip_2 IS NOT NULL
    ) all_chips
    GROUP BY event, chip
    ORDER BY event
  `, [leagueId, gameweeks]);

  const chipsByGW: Record<number, any> = {};
  chipsData.rows.forEach((row: any) => {
    if (!chipsByGW[row.event]) {
      chipsByGW[row.event] = {
        gameweek: row.event,
        bboost: 0,
        '3xc': 0,
        freehit: 0,
        wildcard: 0,
      };
    }
    chipsByGW[row.event][row.chip] = parseInt(row.count);
  });

  const chips = Object.values(chipsByGW).sort((a: any, b: any) => a.gameweek - b.gameweek);

  return {
    chips,
  };
}
