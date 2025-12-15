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

    // DEBUG: Log what gameweeks we found
    console.log(`[Season Stats Debug] League ${leagueId}:`);
    console.log(`  maxStartedGW from bootstrap: ${maxStartedGW}`);
    console.log(`  completedGameweeks in DB: ${completedGameweeks.join(', ')}`);
    console.log(`  Missing GW15? ${!completedGameweeks.includes(15)}`);
    console.log(`  Missing GW16? ${!completedGameweeks.includes(16)}`);

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

// Calculate season-long captain points from FPL API
async function calculateCaptainLeaderboard(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Calculating captain points for ${managers.length} managers across ${gameweeks.length} gameweeks...`);
    }

    // Fetch captain points AND total season points for all managers from FPL API
    const captainDataPromises = managers.map(async (manager) => {
      let totalCaptainPoints = 0;
      let gameweeksUsed = 0;
      let totalSeasonPoints = 0;

      // Fetch this manager's history to get accurate total season points
      try {
        const historyResponse = await fetch(
          `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/history/`
        );

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          // Sum up points from all completed gameweeks in current season
          totalSeasonPoints = historyData.current.reduce(
            (sum: number, gw: any) => sum + (gw.points || 0),
            0
          );
        }
      } catch (error) {
        console.error(`Error fetching history for entry ${manager.entry_id}:`, error);
      }

      // Fetch picks for each gameweek to calculate captain points
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

      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        total_captain_points: totalCaptainPoints,
        total_season_points: totalSeasonPoints,
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
      .sort((a, b) => b.total_points - a.total_points);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Captain leaderboard calculated. Top: ${leaderboard[0]?.total_points || 0} pts (${leaderboard[0]?.percentage || 0}% of ${captainData[0]?.total_season_points || 0} total)`);
    }

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

        // Get match results for this manager to determine win/loss for each chip
        const matchesResult = await db.query(`
          SELECT event, winner
          FROM h2h_matches
          WHERE league_id = $1
          AND event = ANY($2)
          AND (entry_1_id = $3 OR entry_2_id = $3)
        `, [leagueId, gameweeks, manager.entry_id]);

        const matchResults = new Map(
          matchesResult.rows.map((m: any) => [m.event, m.winner === manager.entry_id ? 'W' : m.winner ? 'L' : 'D'])
        );

        return {
          manager,
          chips: chips.map((c: any) => ({
            name: c.name,
            event: c.event,
            result: matchResults.get(c.event) || 'D'
          }))
        };
      } catch (error) {
        return { manager, chips: [] };
      }
    });

    const allChipData = await Promise.all(chipsPromises);

    // LEADERBOARD 1: Most Chips Played
    const chipsPlayed = allChipData
      .map(({ manager, chips }) => {
        // Sort chips by GW
        const sortedChips = [...chips].sort((a: any, b: any) => a.event - b.event);

        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          chip_count: chips.length,
          chips_detail: sortedChips.map((c: any) => `${CHIP_NAMES[c.name] || c.name} (GW${c.event})`).join(', '),
          chips_played_data: sortedChips.map((c: any) => ({
            chip: CHIP_NAMES[c.name] || c.name,
            gw: c.event,
            result: c.result
          }))
        };
      })
      .filter(m => m.chip_count > 0)
      .sort((a, b) => b.chip_count - a.chip_count);

    // LEADERBOARD 2: Most Chips Faced
    // Changed to use FPL API (like Chips Played) instead of database active_chip columns
    const chipsFaced = await Promise.all(
      managers.map(async (manager) => {
        // Get all matches where this manager played (including winner info)
        const matchesResult = await db.query(`
          SELECT
            entry_1_id, entry_2_id, entry_1_points, entry_2_points,
            winner, event
          FROM h2h_matches
          WHERE league_id = $1
          AND event = ANY($2)
          AND (entry_1_id = $3 OR entry_2_id = $3)
        `, [leagueId, gameweeks, manager.entry_id]);

        const matches = matchesResult.rows;
        let opponentChipsData: Array<{chip: string, gw: number, result: string}> = [];

        // For each match, get opponent's entry ID and fetch their chip history from FPL API
        for (const match of matches) {
          const opponentId = match.entry_1_id === manager.entry_id ? match.entry_2_id : match.entry_1_id;

          // Skip AVERAGE opponent (-1)
          if (opponentId === -1) continue;

          // Determine result for this manager
          let result = 'D';
          if (match.winner === manager.entry_id) {
            result = 'W';
          } else if (match.winner && match.winner !== manager.entry_id) {
            result = 'L';
          }

          try {
            // Fetch opponent's chip history from FPL API
            const response = await fetch(
              `https://fantasy.premierleague.com/api/entry/${opponentId}/history/`
            );
            if (!response.ok) continue;

            const data = await response.json();
            const chips = data.chips || [];

            // Check if opponent used a chip in this gameweek
            const chipUsed = chips.find((c: any) => c.event === match.event);
            if (chipUsed) {
              opponentChipsData.push({
                chip: CHIP_NAMES[chipUsed.name] || chipUsed.name,
                gw: match.event,
                result: result
              });
            }
          } catch (error) {
            // Skip if can't fetch opponent data
            continue;
          }
        }

        // Sort by GW (oldest to newest)
        opponentChipsData.sort((a, b) => a.gw - b.gw);

        // Create display string
        const chipsDetail = opponentChipsData.map(c => `${c.chip} (GW${c.gw})`).join(', ');

        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          chips_faced_count: opponentChipsData.length,
          chips_faced_detail: chipsDetail,
          chips_faced_data: opponentChipsData // Include structured data for frontend
        };
      })
    );

    const chipsFacedLeaderboard = chipsFaced
      .filter(m => m.chips_faced_count > 0)
      .sort((a, b) => b.chips_faced_count - a.chips_faced_count);

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
    best: allScores,
    worst: [...allScores].reverse(), // Create copy before reversing
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
