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

    // K-27 Database Check: Verify tables exist and have data
    try {
      const tableCheckResult = await db.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('manager_picks', 'player_gameweek_stats', 'manager_gw_history', 'manager_chips')
      `);

      const existingTables = tableCheckResult.rows.map((r: any) => r.table_name);
      const requiredTables = ['manager_picks', 'player_gameweek_stats', 'manager_gw_history', 'manager_chips'];
      const missingTables = requiredTables.filter(t => !existingTables.includes(t));

      if (missingTables.length > 0) {
        console.error('K-27 tables missing:', missingTables);
        return NextResponse.json(
          {
            error: 'Database not ready',
            message: `Missing K-27 tables: ${missingTables.join(', ')}. Please run migrations.`,
            missing_tables: missingTables
          },
          { status: 503 }
        );
      }

      // Check if tables have any data for this league
      const dataCheckResult = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM manager_picks WHERE league_id = $1) as picks_count,
          (SELECT COUNT(*) FROM manager_gw_history WHERE league_id = $1) as history_count,
          (SELECT COUNT(*) FROM player_gameweek_stats) as player_stats_count
      `, [leagueId]);

      const { picks_count, history_count, player_stats_count } = dataCheckResult.rows[0];

      if (picks_count === 0 || history_count === 0 || player_stats_count === 0) {
        console.warn('K-27 tables empty for league', leagueId, {
          picks_count,
          history_count,
          player_stats_count
        });
        return NextResponse.json(
          {
            error: 'Data not synced',
            message: 'K-27 database tables are empty. Please run sync scripts: npm run sync:manager-picks, npm run sync:manager-history',
            counts: { picks_count, history_count, player_stats_count }
          },
          { status: 503 }
        );
      }
    } catch (checkError: any) {
      console.error('Error checking K-27 tables:', checkError);
      return NextResponse.json(
        {
          error: 'Database check failed',
          message: checkError.message
        },
        { status: 503 }
      );
    }

    // Get bootstrap data to check which gameweeks have started
    // Fallback to 38 if bootstrap fetch fails (include all GWs)
    let maxStartedGW = 38;
    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const events = bootstrapData?.events || [];

        // Find the highest gameweek that has started (is_current or finished)
        const startedGameweeks = events.filter((e: any) => e.is_current || e.finished);
        if (startedGameweeks.length > 0) {
          maxStartedGW = Math.max(...startedGameweeks.map((e: any) => e.id));
        }
      }
    } catch (error) {
      console.log('Could not fetch bootstrap data, including all gameweeks');
    }

    // Fetch all matches for the league to determine completed gameweeks
    // Include matches from gameweeks that have started (even if 0-0)
    const matchesResult = await db.query(`
      SELECT DISTINCT event
      FROM h2h_matches
      WHERE league_id = $1
      AND event <= $2
      ORDER BY event
    `, [leagueId, maxStartedGW]);

    const completedGameweeks = matchesResult.rows.map(r => r.event);

    if (completedGameweeks.length === 0) {
      return NextResponse.json({
        completedGameweeks: 0,
        leaderboards: {
          captainPoints: [],
          chipPerformance: {
            chipsPlayed: [],
            chipsFaced: []
          },
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
      chipPerformance,
      streaksData,
      bestWorstGameweeks,
      trendsData
    ] = await Promise.all([
      calculateCaptainLeaderboard(db, leagueId, completedGameweeks, managers),
      calculateChipPerformance(db, leagueId, completedGameweeks, managers),
      calculateStreaks(db, leagueId, completedGameweeks, managers),
      calculateBestWorstGameweeks(db, leagueId, completedGameweeks, managers),
      calculateTrendsData(db, leagueId, completedGameweeks, managers),
    ]);

    return NextResponse.json({
      completedGameweeks: completedGameweeks.length,
      leaderboards: {
        captainPoints: captainLeaderboard,
        chipPerformance: {
          chipsPlayed: chipPerformance.chipsPlayed,
          chipsFaced: chipPerformance.chipsFaced
        },
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

// Calculate season-long captain points from database (K-27)
async function calculateCaptainLeaderboard(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  try {
    // Get captain points from manager_picks + player_gameweek_stats
    const captainPointsResult = await db.query(`
      SELECT
        mp.entry_id,
        SUM(pgs.total_points * mp.multiplier) as total_captain_points,
        COUNT(DISTINCT mp.event) as gameweeks_used
      FROM manager_picks mp
      JOIN player_gameweek_stats pgs
        ON mp.player_id = pgs.player_id
        AND mp.event = pgs.gameweek
      WHERE mp.league_id = $1
        AND mp.is_captain = true
        AND mp.event = ANY($2)
      GROUP BY mp.entry_id
    `, [leagueId, gameweeks]);

    const captainPointsMap = new Map<number, { total_captain_points: number; gameweeks_used: number }>(
      captainPointsResult.rows.map((row: any) => [
        row.entry_id,
        {
          total_captain_points: parseInt(row.total_captain_points) || 0,
          gameweeks_used: parseInt(row.gameweeks_used) || 0
        }
      ])
    );

    // Get total season points from manager_gw_history
    const seasonPointsResult = await db.query(`
      SELECT
        entry_id,
        SUM(points) as total_season_points
      FROM manager_gw_history
      WHERE league_id = $1
        AND event = ANY($2)
      GROUP BY entry_id
    `, [leagueId, gameweeks]);

    const seasonPointsMap = new Map<number, number>(
      seasonPointsResult.rows.map((row: any) => [
        row.entry_id,
        parseInt(row.total_season_points) || 0
      ])
    );

    // Build leaderboard
    const leaderboard = managers.map(manager => {
      const captainDataResult = captainPointsMap.get(manager.entry_id);
      const totalCaptainPoints = captainDataResult?.total_captain_points || 0;
      const gameweeksUsed = captainDataResult?.gameweeks_used || 0;
      const totalSeasonPoints = seasonPointsMap.get(manager.entry_id) || 0;

      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        total_points: totalCaptainPoints,
        percentage: totalSeasonPoints > 0
          ? parseFloat((totalCaptainPoints / totalSeasonPoints * 100).toFixed(1))
          : 0,
        average_per_gw: gameweeksUsed > 0
          ? parseFloat((totalCaptainPoints / gameweeksUsed).toFixed(1))
          : 0
      };
    }).sort((a, b) => b.total_points - a.total_points);

    return leaderboard;

  } catch (error) {
    console.error('Error calculating captain leaderboard:', error);
    return [];
  }
}

// Calculate chip performance with two leaderboards
async function calculateChipPerformance(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  try {
    const CHIP_NAMES: Record<string, string> = {
      'bboost': 'BB',
      '3xc': 'TC',
      'freehit': 'FH',
      'wildcard': 'WC',
    };

    // LEADERBOARD 1: Most Chips Played
    // Get chips from manager_chips table
    const chipsPlayedResult = await db.query(`
      SELECT
        mc.entry_id,
        mc.chip_name,
        mc.event,
        CASE
          WHEN hm.winner = mc.entry_id THEN 'W'
          WHEN hm.winner IS NULL THEN 'D'
          ELSE 'L'
        END as result
      FROM manager_chips mc
      LEFT JOIN h2h_matches hm ON mc.league_id = hm.league_id
        AND mc.event = hm.event
        AND (mc.entry_id = hm.entry_1_id OR mc.entry_id = hm.entry_2_id)
      WHERE mc.league_id = $1
        AND mc.event = ANY($2)
      ORDER BY mc.entry_id, mc.event
    `, [leagueId, gameweeks]);

    // Group by manager
    const chipsByManager = new Map<number, Array<{name: string, event: number, result: string}>>();
    chipsPlayedResult.rows.forEach((row: any) => {
      if (!chipsByManager.has(row.entry_id)) {
        chipsByManager.set(row.entry_id, []);
      }
      chipsByManager.get(row.entry_id)!.push({
        name: row.chip_name,
        event: row.event,
        result: row.result || 'D'
      });
    });

    const chipsPlayed = managers
      .map(manager => {
        const chips = chipsByManager.get(manager.entry_id) || [];
        // Sort chips by GW
        const sortedChips = [...chips].sort((a, b) => a.event - b.event);

        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          chip_count: chips.length,
          chips_detail: sortedChips.map(c => `${CHIP_NAMES[c.name] || c.name} (GW${c.event})`).join(', '),
          chips_played_data: sortedChips.map(c => ({
            chip: CHIP_NAMES[c.name] || c.name,
            gw: c.event,
            result: c.result
          }))
        };
      })
      .filter(m => m.chip_count > 0)
      .sort((a, b) => b.chip_count - a.chip_count);

    // LEADERBOARD 2: Most Chips Faced
    // Get chips faced by matching opponent chips with h2h matches
    const chipsFacedResult = await db.query(`
      SELECT
        CASE
          WHEN mc.entry_id = hm.entry_1_id THEN hm.entry_2_id
          ELSE hm.entry_1_id
        END as opponent_entry_id,
        mc.chip_name,
        mc.event,
        CASE
          WHEN hm.winner = (CASE WHEN mc.entry_id = hm.entry_1_id THEN hm.entry_2_id ELSE hm.entry_1_id END) THEN 'W'
          WHEN hm.winner IS NULL THEN 'D'
          ELSE 'L'
        END as result
      FROM manager_chips mc
      JOIN h2h_matches hm ON mc.league_id = hm.league_id
        AND mc.event = hm.event
        AND (mc.entry_id = hm.entry_1_id OR mc.entry_id = hm.entry_2_id)
      WHERE mc.league_id = $1
        AND mc.event = ANY($2)
      ORDER BY opponent_entry_id, mc.event
    `, [leagueId, gameweeks]);

    // Group by opponent (the manager who faced the chip)
    const chipsFacedByManager = new Map<number, Array<{chip: string, gw: number, result: string}>>();
    chipsFacedResult.rows.forEach((row: any) => {
      if (!chipsFacedByManager.has(row.opponent_entry_id)) {
        chipsFacedByManager.set(row.opponent_entry_id, []);
      }
      chipsFacedByManager.get(row.opponent_entry_id)!.push({
        chip: CHIP_NAMES[row.chip_name] || row.chip_name,
        gw: row.event,
        result: row.result || 'D'
      });
    });

    const chipsFaced = managers
      .map(manager => {
        const chips = chipsFacedByManager.get(manager.entry_id) || [];
        // Sort by GW
        const sortedChips = [...chips].sort((a, b) => a.gw - b.gw);

        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          chips_faced_count: chips.length,
          chips_faced_detail: sortedChips.map(c => `${c.chip} (GW${c.gw})`).join(', '),
          chips_faced_data: sortedChips
        };
      })
      .filter(m => m.chips_faced_count > 0)
      .sort((a, b) => b.chips_faced_count - a.chips_faced_count);

    return {
      chipsPlayed,
      chipsFaced
    };

  } catch (error) {
    console.error('Error calculating chip performance:', error);
    return {
      chipsPlayed: [],
      chipsFaced: []
    };
  }
}

// Calculate historical maximum winning and losing streaks
async function calculateStreaks(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  // Get all match results for each manager, ordered by gameweek ASC
  const matchesData = await db.query(`
    SELECT
      entry_1_id as entry_id,
      event,
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
      CASE
        WHEN entry_2_points > entry_1_points THEN 'W'
        WHEN entry_2_points < entry_1_points THEN 'L'
        ELSE 'D'
      END as result
    FROM h2h_matches
    WHERE league_id = $1 AND event = ANY($2)

    ORDER BY entry_id, event ASC
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

  // Calculate max streaks for each manager
  const streakData = managers.map((manager) => {
    const results = managerResults[manager.entry_id] || [];

    if (results.length === 0) {
      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        max_win_streak: 0,
        win_streak_range: '',
        max_loss_streak: 0,
        loss_streak_range: '',
      };
    }

    // Calculate max winning streak
    let maxWinStreak = 0;
    let currentWinStreak = 0;
    let winStreakStart = 0;
    let winStreakEnd = 0;
    let tempWinStart = 0;

    // Calculate max losing streak
    let maxLossStreak = 0;
    let currentLossStreak = 0;
    let lossStreakStart = 0;
    let lossStreakEnd = 0;
    let tempLossStart = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      // Winning streak logic
      if (result.result === 'W') {
        if (currentWinStreak === 0) {
          tempWinStart = result.event;
        }
        currentWinStreak++;

        if (currentWinStreak > maxWinStreak) {
          maxWinStreak = currentWinStreak;
          winStreakStart = tempWinStart;
          winStreakEnd = result.event;
        }
      } else {
        currentWinStreak = 0;
      }

      // Losing streak logic
      if (result.result === 'L') {
        if (currentLossStreak === 0) {
          tempLossStart = result.event;
        }
        currentLossStreak++;

        if (currentLossStreak > maxLossStreak) {
          maxLossStreak = currentLossStreak;
          lossStreakStart = tempLossStart;
          lossStreakEnd = result.event;
        }
      } else {
        currentLossStreak = 0;
      }
    }

    const streakResult = {
      entry_id: manager.entry_id,
      player_name: manager.player_name,
      team_name: manager.team_name,
      max_win_streak: maxWinStreak,
      win_streak_range: maxWinStreak > 0 ? `GW${winStreakStart} → GW${winStreakEnd}` : '',
      max_loss_streak: maxLossStreak,
      loss_streak_range: maxLossStreak > 0 ? `GW${lossStreakStart} → GW${lossStreakEnd}` : '',
    };

    return streakResult;
  });

  // Separate into winning and losing streaks
  const winningStreaks = streakData
    .filter(s => s.max_win_streak > 0)
    .sort((a, b) => b.max_win_streak - a.max_win_streak)
    .map(s => ({
      entry_id: s.entry_id,
      player_name: s.player_name,
      team_name: s.team_name,
      streak: s.max_win_streak,
      gw_range: s.win_streak_range
    }));

  const losingStreaks = streakData
    .filter(s => s.max_loss_streak > 0)
    .sort((a, b) => b.max_loss_streak - a.max_loss_streak)
    .map(s => ({
      entry_id: s.entry_id,
      player_name: s.player_name,
      team_name: s.team_name,
      streak: s.max_loss_streak,
      gw_range: s.loss_streak_range
    }));

  return {
    winning: winningStreaks,
    losing: losingStreaks,
  };
}

// Calculate best and worst gameweeks from database
async function calculateBestWorstGameweeks(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  // Get all gameweek scores from manager_gw_history
  const scoresResult = await db.query(`
    SELECT
      mgh.entry_id,
      mgh.event,
      mgh.points,
      m.player_name,
      m.team_name
    FROM manager_gw_history mgh
    JOIN managers m ON mgh.entry_id = m.entry_id AND mgh.league_id = m.league_id
    WHERE mgh.league_id = $1
      AND mgh.event = ANY($2)
    ORDER BY mgh.points DESC
  `, [leagueId, gameweeks]);

  const allScores = scoresResult.rows.map((row: any) => ({
    entry_id: row.entry_id,
    player_name: row.player_name,
    team_name: row.team_name,
    event: row.event,
    points: row.points || 0,
  }));

  return {
    best: allScores,
    worst: [...allScores].reverse(), // Create copy before reversing
  };
}

// Calculate trends data for charts from database
async function calculateTrendsData(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  // Chips usage timeline from manager_chips table
  const chipsResult = await db.query(`
    SELECT
      event,
      chip_name,
      COUNT(*) as count
    FROM manager_chips
    WHERE league_id = $1
      AND event = ANY($2)
    GROUP BY event, chip_name
    ORDER BY event
  `, [leagueId, gameweeks]);

  const chipsByGW: Record<number, any> = {};
  chipsResult.rows.forEach((row: any) => {
    if (!chipsByGW[row.event]) {
      chipsByGW[row.event] = {
        gameweek: row.event,
        bboost: 0,
        '3xc': 0,
        freehit: 0,
        wildcard: 0,
      };
    }
    chipsByGW[row.event][row.chip_name] = parseInt(row.count);
  });

  const chips = Object.values(chipsByGW).sort((a: any, b: any) => a.gameweek - b.gameweek);

  return {
    chips,
  };
}
