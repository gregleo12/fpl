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
          chipPerformance: {
            chipsPlayed: [],
            chipsFaced: []
          },
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
      chipPerformance,
      hitEfficiencyData,
      streaksData,
      bestWorstGameweeks,
      trendsData
    ] = await Promise.all([
      calculateCaptainLeaderboard(db, leagueId, completedGameweeks, managers),
      calculateChipPerformance(db, leagueId, completedGameweeks, managers),
      calculateHitEfficiency(db, leagueId, completedGameweeks, managers),
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

// Calculate season-long captain points from FPL API
async function calculateCaptainLeaderboard(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  try {
    console.log(`Calculating captain points for ${managers.length} managers across ${gameweeks.length} gameweeks...`);

    // First, get total season points for each manager from league standings
    const standingsResult = await db.query(`
      SELECT entry_id, total
      FROM league_standings
      WHERE league_id = $1
    `, [leagueId]);

    const totalPointsMap = new Map(
      standingsResult.rows.map((row: any) => [row.entry_id, row.total || 0])
    );

    // Fetch captain points for all managers across all gameweeks
    const captainDataPromises = managers.map(async (manager) => {
      let totalCaptainPoints = 0;
      let gameweeksUsed = 0;

      // Fetch picks for each gameweek
      for (const gw of gameweeks) {
        try {
          // Fetch picks and live data for this gameweek
          const [picksResponse, liveResponse] = await Promise.all([
            fetch(`https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${gw}/picks/`),
            fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`)
          ]);

          if (!picksResponse.ok || !liveResponse.ok) continue;

          const [picksData, liveData] = await Promise.all([
            picksResponse.json(),
            liveResponse.json()
          ]);

          // Find captain (multiplier >= 2: normal captain = 2, triple captain = 3)
          const captain = picksData.picks?.find((p: any) => p.multiplier >= 2);

          if (captain) {
            // Find player points from live data
            const livePlayer = liveData.elements?.find((e: any) => e.id === captain.element);
            const basePoints = livePlayer?.stats?.total_points || 0;

            // Captain points = player points × multiplier
            const captainPoints = basePoints * captain.multiplier;
            totalCaptainPoints += captainPoints;
            gameweeksUsed++;
          }
        } catch (error) {
          console.error(`Error fetching GW${gw} for entry ${manager.entry_id}:`, error);
        }
      }

      const totalSeasonPoints = totalPointsMap.get(manager.entry_id) || 0;

      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        total_captain_points: totalCaptainPoints,
        total_season_points: totalSeasonPoints as number,
        gameweeks_used: gameweeksUsed
      };
    });

    const captainData = await Promise.all(captainDataPromises);

    // Sort by total captain points
    const leaderboard = captainData
      .map(manager => ({
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        total_points: manager.total_captain_points,
        percentage: manager.total_season_points > 0
          ? parseFloat((manager.total_captain_points / manager.total_season_points * 100).toFixed(1))
          : 0,
        average_per_gw: manager.gameweeks_used > 0
          ? parseFloat((manager.total_captain_points / manager.gameweeks_used).toFixed(1))
          : 0
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 10);

    console.log(`Captain leaderboard calculated. Top score: ${leaderboard[0]?.total_points || 0} pts (${leaderboard[0]?.percentage || 0}%)`);

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

    // Fetch chip history from FPL API for each manager
    const chipsPromises = managers.map(async (manager) => {
      try {
        const response = await fetch(
          `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/history/`
        );
        if (!response.ok) return { manager, chips: [] };

        const data = await response.json();
        const chips = (data.chips || []).filter(
          (chip: any) => gameweeks.includes(chip.event)
        );

        return {
          manager,
          chips: chips.map((c: any) => ({
            name: c.name,
            event: c.event
          }))
        };
      } catch (error) {
        return { manager, chips: [] };
      }
    });

    const allChipData = await Promise.all(chipsPromises);

    // LEADERBOARD 1: Most Chips Played
    const chipsPlayed = allChipData
      .map(({ manager, chips }) => ({
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        chip_count: chips.length,
        chips_detail: chips.map((c: any) => `${CHIP_NAMES[c.name] || c.name} (GW${c.event})`).join(', ')
      }))
      .filter(m => m.chip_count > 0)
      .sort((a, b) => b.chip_count - a.chip_count)
      .slice(0, 10);

    // LEADERBOARD 2: Most Chips Faced
    const chipsFaced = await Promise.all(
      managers.map(async (manager) => {
        // Get all matches where this manager played
        const matchesResult = await db.query(`
          SELECT
            entry_1_id, entry_2_id,
            active_chip_1, active_chip_2,
            event
          FROM h2h_matches
          WHERE league_id = $1
          AND event = ANY($2)
          AND (entry_1_id = $3 OR entry_2_id = $3)
        `, [leagueId, gameweeks, manager.entry_id]);

        const matches = matchesResult.rows;
        let opponentChips: string[] = [];

        for (const match of matches) {
          // If manager is entry_1, count entry_2's chip
          if (match.entry_1_id === manager.entry_id && match.active_chip_2) {
            opponentChips.push(`${CHIP_NAMES[match.active_chip_2] || match.active_chip_2} (GW${match.event})`);
          }
          // If manager is entry_2, count entry_1's chip
          if (match.entry_2_id === manager.entry_id && match.active_chip_1) {
            opponentChips.push(`${CHIP_NAMES[match.active_chip_1] || match.active_chip_1} (GW${match.event})`);
          }
        }

        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          chips_faced_count: opponentChips.length,
          chips_faced_detail: opponentChips.join(', ')
        };
      })
    );

    const chipsFacedLeaderboard = chipsFaced
      .filter(m => m.chips_faced_count > 0)
      .sort((a, b) => b.chips_faced_count - a.chips_faced_count)
      .slice(0, 10);

    return {
      chipsPlayed,
      chipsFaced: chipsFacedLeaderboard
    };

  } catch (error) {
    console.error('Error calculating chip performance:', error);
    return {
      chipsPlayed: [],
      chipsFaced: []
    };
  }
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

    return {
      entry_id: manager.entry_id,
      player_name: manager.player_name,
      team_name: manager.team_name,
      max_win_streak: maxWinStreak,
      win_streak_range: maxWinStreak > 0 ? `GW${winStreakStart} → GW${winStreakEnd}` : '',
      max_loss_streak: maxLossStreak,
      loss_streak_range: maxLossStreak > 0 ? `GW${lossStreakStart} → GW${lossStreakEnd}` : '',
    };
  });

  // Separate into winning and losing streaks
  const winningStreaks = streakData
    .filter(s => s.max_win_streak > 0)
    .sort((a, b) => b.max_win_streak - a.max_win_streak)
    .slice(0, 10)
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
    .slice(0, 10)
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
