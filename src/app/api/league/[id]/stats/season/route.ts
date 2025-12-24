import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';

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

    // K-97: Get bootstrap data to check which gameweeks have FINISHED (not just started)
    // Fallback to 38 if bootstrap fetch fails (include all GWs)
    let maxStartedGW = 38;
    let completedGameweeksCount = 0;
    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const events = bootstrapData?.events || [];

        // K-97: Count only FINISHED gameweeks (exclude current/live GW)
        const finishedGameweeks = events.filter((e: any) => e.finished);
        completedGameweeksCount = finishedGameweeks.length;

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

    // Fetch league standings for form rankings trend calculation
    const standingsResult = await db.query(`
      SELECT entry_id, rank
      FROM league_standings
      WHERE league_id = $1
      ORDER BY rank ASC
    `, [leagueId]);
    const leagueStandings = standingsResult.rows;

    // Get last finished GW for value rankings (to fetch actual squad picks)
    let lastFinishedGW = maxStartedGW;
    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const events = bootstrapData?.events || [];
        // Find the last finished gameweek (not current_event which points to upcoming GW)
        const lastFinished = [...events].reverse().find((e: any) => e.finished);
        if (lastFinished) {
          lastFinishedGW = lastFinished.id;
        }
      }
    } catch (error) {
      console.log('Could not fetch last finished GW for value rankings, using maxStartedGW');
    }

    // Calculate season statistics
    const [
      captainLeaderboard,
      chipPerformance,
      streaksData,
      bestWorstGameweeks,
      trendsData,
      valueRankings,
      benchPoints,
      formRankings,
      consistency,
      luckIndex
    ] = await Promise.all([
      calculateCaptainLeaderboard(db, leagueId, completedGameweeks, managers),
      calculateChipPerformance(db, leagueId, completedGameweeks, managers),
      calculateStreaks(db, leagueId, completedGameweeks, managers),
      calculateBestWorstGameweeks(db, leagueId, completedGameweeks, managers),
      calculateTrendsData(db, leagueId, completedGameweeks, managers),
      getValueRankings(managers, lastFinishedGW),
      calculateBenchPoints(db, leagueId, managers),
      calculateFormRankings(db, leagueId, completedGameweeks, leagueStandings),
      calculateConsistency(db, leagueId),
      calculateLuckIndex(db, leagueId),
    ]);

    return NextResponse.json({
      completedGameweeks: completedGameweeksCount || completedGameweeks.length, // K-97: Use finished GWs count
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
      valueRankings,
      benchPoints,
      formRankings,
      consistency,
      luckIndex,
    });
  } catch (error: any) {
    console.error('Error fetching season stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch season stats' },
      { status: 500 }
    );
  }
}

// Calculate season-long captain points from entry_captains table
async function calculateCaptainLeaderboard(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  try {
    console.log('[CAPTAIN DEBUG] Input params:', {
      leagueId,
      gameweeksCount: gameweeks.length,
      gameweeksRange: `${gameweeks[0]}-${gameweeks[gameweeks.length - 1]}`,
      managersCount: managers.length,
      managerIds: managers.map(m => m.entry_id).slice(0, 5),
      managerIdTypes: managers.slice(0, 3).map(m => ({ id: m.entry_id, type: typeof m.entry_id }))
    });

    // Get captain points from entry_captains table (already calculated!)
    console.log('[CAPTAIN] About to query entry_captains...');
    console.log('[CAPTAIN] Query params:', {
      entryIds: managers.map(m => m.entry_id),
      gameweeks
    });

    const captainPointsResult = await db.query(`
      SELECT
        ec.entry_id,
        SUM(ec.captain_points) as total_captain_points,
        COUNT(*) as gameweeks_used
      FROM entry_captains ec
      WHERE ec.entry_id = ANY($1)
        AND ec.event = ANY($2)
      GROUP BY ec.entry_id
    `, [managers.map(m => m.entry_id), gameweeks]);

    console.log('[CAPTAIN] entry_captains query result:', {
      rowCount: captainPointsResult.rows.length,
      firstFiveRows: captainPointsResult.rows.slice(0, 5),
      uniqueEntryIds: Array.from(new Set(captainPointsResult.rows.map((r: any) => r.entry_id))),
      entryIdTypes: captainPointsResult.rows.slice(0, 3).map((r: any) => ({ id: r.entry_id, type: typeof r.entry_id }))
    });

    const captainPointsMap = new Map<string, { total_captain_points: number; gameweeks_used: number }>(
      captainPointsResult.rows.map((row: any) => [
        String(row.entry_id),  // Ensure consistent string key
        {
          total_captain_points: parseInt(row.total_captain_points) || 0,
          gameweeks_used: parseInt(row.gameweeks_used) || 0
        }
      ])
    );

    console.log('[CAPTAIN] captainPointsMap after building:', {
      size: captainPointsMap.size,
      keys: Array.from(captainPointsMap.keys()).slice(0, 5),
      keyTypes: Array.from(captainPointsMap.keys()).slice(0, 3).map(k => ({ key: k, type: typeof k })),
      sampleValues: Array.from(captainPointsMap.entries()).slice(0, 3).map(([k, v]) => ({ key: k, value: v }))
    });

    // Get total season points from manager_gw_history for percentage calc
    console.log('[CAPTAIN] About to query manager_gw_history...');

    const managerIds = managers.map(m => m.entry_id);
    const seasonPointsResult = await db.query(`
      SELECT entry_id, SUM(points) as total_season_points
      FROM manager_gw_history
      WHERE entry_id = ANY($1) AND event = ANY($2)
      GROUP BY entry_id
    `, [managerIds, gameweeks]);

    console.log('[CAPTAIN] manager_gw_history query result:', {
      rowCount: seasonPointsResult.rows.length,
      firstFiveRows: seasonPointsResult.rows.slice(0, 5),
      uniqueEntryIds: Array.from(new Set(seasonPointsResult.rows.map((r: any) => r.entry_id)))
    });

    const seasonPointsMap = new Map<string, number>(
      seasonPointsResult.rows.map((row: any) => [
        String(row.entry_id),  // Consistent string key
        parseInt(row.total_season_points) || 0
      ])
    );

    console.log('[CAPTAIN] seasonPointsMap after building:', {
      size: seasonPointsMap.size,
      keys: Array.from(seasonPointsMap.keys()).slice(0, 5),
      keyTypes: Array.from(seasonPointsMap.keys()).slice(0, 3).map(k => ({ key: k, type: typeof k })),
      sampleValues: Array.from(seasonPointsMap.entries()).slice(0, 3).map(([k, v]) => ({ key: k, value: v }))
    });

    // Build leaderboard
    const leaderboard = managers.map(manager => {
      const captainData = captainPointsMap.get(String(manager.entry_id));
      const totalCaptainPoints = captainData?.total_captain_points || 0;
      const gameweeksUsed = captainData?.gameweeks_used || 0;
      const totalSeasonPoints = seasonPointsMap.get(String(manager.entry_id)) || 0;

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

    console.log('[CAPTAIN] After mapping (before sort):', {
      totalManagers: leaderboard.length,
      withPoints: leaderboard.filter(m => m.total_points > 0).length,
      withZeroPoints: leaderboard.filter(m => m.total_points === 0).length,
      sample: leaderboard.slice(0, 3).map(m => ({
        name: m.player_name,
        total_points: m.total_points,
        percentage: m.percentage,
        average_per_gw: m.average_per_gw
      }))
    });

    // Debug: Test explicit lookup for first manager
    if (managers.length > 0) {
      const testManagerId = managers[0].entry_id;
      console.log('[CAPTAIN] Test lookup for first manager:', {
        testManagerId,
        testManagerIdType: typeof testManagerId,
        lookupWithoutConversion: captainPointsMap.get(testManagerId as any),
        lookupWithNumber: (captainPointsMap as any).get(Number(testManagerId)),
        lookupWithString: captainPointsMap.get(String(testManagerId)),
        mapHasNumberKey: (captainPointsMap as any).has(Number(testManagerId)),
        mapHasStringKey: captainPointsMap.has(String(testManagerId)),
        mapHasOriginalKey: captainPointsMap.has(testManagerId as any)
      });
    }

    console.log('[CAPTAIN] Final leaderboard (after sort):', {
      count: leaderboard.length,
      topThree: leaderboard.slice(0, 3).map(m => ({
        name: m.player_name,
        total_points: m.total_points,
        percentage: m.percentage
      }))
    });

    return leaderboard;

  } catch (error) {
    console.error('[Captain] Database error:', error);
    // Fallback to FPL API if database fails
    return await calculateCaptainLeaderboardFromAPI(managers, gameweeks);
  }
}

// Fallback: Calculate captain points using FPL API (old approach)
async function calculateCaptainLeaderboardFromAPI(
  managers: any[],
  gameweeks: number[]
) {
  try {
    const leaderboard = await Promise.all(
      managers.map(async (manager) => {
        let totalCaptainPoints = 0;
        let totalSeasonPoints = 0;
        let gameweeksUsed = 0;

        for (const gw of gameweeks) {
          try {
            // Fetch picks for this gameweek
            const picksResponse = await fetch(
              `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${gw}/picks/`
            );
            if (!picksResponse.ok) continue;
            const picksData = await picksResponse.json();

            // Fetch live data for this gameweek
            const liveResponse = await fetch(
              `https://fantasy.premierleague.com/api/event/${gw}/live/`
            );
            if (!liveResponse.ok) continue;
            const liveData = await liveResponse.json();

            // Find captain
            const captain = picksData.picks.find((p: any) => p.is_captain);
            if (captain) {
              const captainStats = liveData.elements.find(
                (e: any) => e.id === captain.element
              );
              if (captainStats) {
                const captainPoints = captainStats.stats.total_points * captain.multiplier;
                totalCaptainPoints += captainPoints;
                gameweeksUsed++;
              }
            }

            // Add to season total
            totalSeasonPoints += picksData.entry_history.points;
          } catch (err) {
            // Skip this gameweek on error
          }
        }

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
      })
    );

    return leaderboard.sort((a, b) => b.total_points - a.total_points);
  } catch (error) {
    console.error('Error calculating captain leaderboard from API:', error);
    return [];
  }
}

// Calculate chip performance with two leaderboards using manager_chips table
async function calculateChipPerformance(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  try {
    console.log('[CHIPS DEBUG] Input params:', {
      leagueId,
      gameweeksCount: gameweeks.length,
      gameweeksRange: `${gameweeks[0]}-${gameweeks[gameweeks.length - 1]}`,
      managersCount: managers.length,
      managerIds: managers.map(m => m.entry_id).slice(0, 5)
    });

    const CHIP_NAMES: Record<string, string> = {
      'bboost': 'BB',
      '3xc': 'TC',
      'freehit': 'FH',
      'wildcard': 'WC',
    };

    // CHIPS PLAYED - Get from manager_chips
    console.log('[CHIPS PLAYED] About to query manager_chips...');
    console.log('[CHIPS PLAYED] SQL params:', { leagueId, gameweeksArray: gameweeks });

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
      LEFT JOIN h2h_matches hm
        ON mc.league_id = hm.league_id
        AND mc.event = hm.event
        AND (mc.entry_id = hm.entry_1_id OR mc.entry_id = hm.entry_2_id)
      WHERE mc.league_id = $1
        AND mc.event = ANY($2)
      ORDER BY mc.entry_id, mc.event
    `, [leagueId, gameweeks]);

    console.log('[CHIPS PLAYED] Raw query result:', {
      rowCount: chipsPlayedResult.rows.length,
      firstFiveRows: chipsPlayedResult.rows.slice(0, 5),
      uniqueEntryIds: Array.from(new Set(chipsPlayedResult.rows.map((r: any) => r.entry_id)))
    });

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

    const chipsPlayedBeforeFilter = managers.map(manager => {
      const chips = chipsByManager.get(Number(manager.entry_id)) || [];
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
    });

    console.log('[CHIPS PLAYED] After mapping (before filter):', {
      totalManagers: chipsPlayedBeforeFilter.length,
      withChips: chipsPlayedBeforeFilter.filter(m => m.chip_count > 0).length,
      withoutChips: chipsPlayedBeforeFilter.filter(m => m.chip_count === 0).length,
      sample: chipsPlayedBeforeFilter.slice(0, 3).map(m => ({
        name: m.player_name,
        chip_count: m.chip_count,
        chips: m.chips_detail
      }))
    });

    const chipsPlayed = chipsPlayedBeforeFilter
      .filter(m => m.chip_count > 0)
      .sort((a, b) => b.chip_count - a.chip_count);

    console.log('[CHIPS PLAYED] Final result (after filter):', {
      count: chipsPlayed.length,
      sample: chipsPlayed.slice(0, 3).map(m => ({
        name: m.player_name,
        chip_count: m.chip_count,
        chips: m.chips_detail
      }))
    });

    // CHIPS FACED - Get opponents' chips from h2h_matches
    console.log('[CHIPS FACED] About to query manager_chips (same table as Chips Played)...');
    console.log('[CHIPS FACED] SQL params:', { leagueId, gameweeksArray: gameweeks });

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
      JOIN h2h_matches hm
        ON mc.league_id = hm.league_id
        AND mc.event = hm.event
        AND (mc.entry_id = hm.entry_1_id OR mc.entry_id = hm.entry_2_id)
      WHERE mc.league_id = $1
        AND mc.event = ANY($2)
      ORDER BY opponent_entry_id, mc.event
    `, [leagueId, gameweeks]);

    console.log('[CHIPS FACED] Raw query result:', {
      rowCount: chipsFacedResult.rows.length,
      firstFiveRows: chipsFacedResult.rows.slice(0, 5),
      uniqueOpponentIds: Array.from(new Set(chipsFacedResult.rows.map((r: any) => r.opponent_entry_id)))
    });

    // Group by opponent
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

    const chipsFacedBeforeFilter = managers.map(manager => {
      const chips = chipsFacedByManager.get(manager.entry_id) || [];
      const sortedChips = [...chips].sort((a, b) => a.gw - b.gw);

      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        chips_faced_count: chips.length,
        chips_faced_detail: sortedChips.map(c => `${c.chip} (GW${c.gw})`).join(', '),
        chips_faced_data: sortedChips
      };
    });

    console.log('[CHIPS FACED] After mapping (before filter):', {
      totalManagers: chipsFacedBeforeFilter.length,
      withChips: chipsFacedBeforeFilter.filter(m => m.chips_faced_count > 0).length,
      withoutChips: chipsFacedBeforeFilter.filter(m => m.chips_faced_count === 0).length,
      sample: chipsFacedBeforeFilter.slice(0, 3).map(m => ({
        name: m.player_name,
        chips_faced_count: m.chips_faced_count,
        chips: m.chips_faced_detail
      }))
    });

    const chipsFaced = chipsFacedBeforeFilter
      .filter(m => m.chips_faced_count > 0)
      .sort((a, b) => b.chips_faced_count - a.chips_faced_count);

    console.log('[CHIPS FACED] Final result (after filter):', {
      count: chipsFaced.length,
      sample: chipsFaced.slice(0, 3).map(m => ({
        name: m.player_name,
        chips_faced_count: m.chips_faced_count,
        chips: m.chips_faced_detail
      }))
    });

    console.log('[CHIPS DEBUG] Returning results:', {
      chipsPlayedCount: chipsPlayed.length,
      chipsFacedCount: chipsFaced.length
    });

    return { chipsPlayed, chipsFaced };

  } catch (error) {
    console.error('[Chips] Database error:', error);
    return await calculateChipPerformanceFromAPI(db, leagueId, managers, gameweeks);
  }
}

// Fallback: Calculate chip performance using FPL API (old approach)
async function calculateChipPerformanceFromAPI(
  db: any,
  leagueId: number,
  managers: any[],
  gameweeks: number[]
) {
  try {
    const CHIP_NAMES: Record<string, string> = {
      'bboost': 'BB',
      '3xc': 'TC',
      'freehit': 'FH',
      'wildcard': 'WC',
    };

    // Get match results for determining W/D/L
    const matchesData = await db.query(`
      SELECT
        entry_1_id,
        entry_2_id,
        event,
        CASE
          WHEN entry_1_points > entry_2_points THEN entry_1_id
          WHEN entry_2_points > entry_1_points THEN entry_2_id
          ELSE NULL
        END as winner
      FROM h2h_matches
      WHERE league_id = $1 AND event = ANY($2)
    `, [leagueId, gameweeks]);

    const matchResultsMap = new Map<string, string | null>();
    matchesData.rows.forEach((row: any) => {
      const key1 = `${row.entry_1_id}-${row.event}`;
      const key2 = `${row.entry_2_id}-${row.event}`;
      matchResultsMap.set(key1, row.winner);
      matchResultsMap.set(key2, row.winner);
    });

    // Fetch chips from FPL API
    const managerChips = await Promise.all(
      managers.map(async (manager) => {
        try {
          const response = await fetch(
            `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/history/`
          );
          if (!response.ok) return { manager, chips: [] };
          const data = await response.json();

          const chips = (data.chips || [])
            .filter((chip: any) => gameweeks.includes(chip.event))
            .map((chip: any) => {
              const matchKey = `${manager.entry_id}-${chip.event}`;
              const winner = matchResultsMap.get(matchKey);
              const result = winner === null ? 'D' : (winner === manager.entry_id ? 'W' : 'L');

              return {
                name: chip.name,
                event: chip.event,
                result
              };
            });

          return { manager, chips };
        } catch (err) {
          return { manager, chips: [] };
        }
      })
    );

    // Build chips played leaderboard
    const chipsPlayed = managerChips
      .map(({ manager, chips }) => {
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

    // Build chips faced leaderboard
    const chipsFacedByManager = new Map<number, Array<{chip: string, gw: number, result: string}>>();

    // For each chip played, find the opponent
    for (const { manager, chips } of managerChips) {
      for (const chip of chips) {
        const match = matchesData.rows.find(
          (m: any) => m.event === chip.event &&
            (m.entry_1_id === manager.entry_id || m.entry_2_id === manager.entry_id)
        );

        if (match) {
          const opponentId = match.entry_1_id === manager.entry_id ? match.entry_2_id : match.entry_1_id;
          if (!chipsFacedByManager.has(opponentId)) {
            chipsFacedByManager.set(opponentId, []);
          }

          const opponentWon = match.winner === opponentId;
          const result = match.winner === null ? 'D' : (opponentWon ? 'W' : 'L');

          chipsFacedByManager.get(opponentId)!.push({
            chip: CHIP_NAMES[chip.name] || chip.name,
            gw: chip.event,
            result
          });
        }
      }
    }

    const chipsFaced = managers
      .map(manager => {
        const chips = chipsFacedByManager.get(manager.entry_id) || [];
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
    console.error('Error calculating chip performance from API:', error);
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

// Calculate best and worst gameweeks from database (K-109 Phase 4: Hybrid approach)
async function calculateBestWorstGameweeks(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  console.log('[K-109 Phase 4] Calculating Best/Worst Gameweeks');

  // K-67 + K-109: Determine completed vs live gameweeks
  let completedGameweeks = gameweeks;
  let currentGW: number | null = null;
  let currentGWStatus: 'completed' | 'in_progress' | 'upcoming' = 'completed';

  try {
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (bootstrapResponse.ok) {
      const bootstrapData = await bootstrapResponse.json();
      const events = bootstrapData?.events || [];

      // Find current gameweek
      const currentEvent = events.find((e: any) => e.is_current);
      if (currentEvent) {
        currentGW = currentEvent.id;
        currentGWStatus = currentEvent.finished ? 'completed' :
                         currentEvent.is_current ? 'in_progress' : 'upcoming';
        console.log(`[K-109 Phase 4] Current GW: ${currentGW}, Status: ${currentGWStatus}`);
      }

      // Only include finished gameweeks in DB query
      const finishedGWs = events
        .filter((e: any) => e.finished)
        .map((e: any) => e.id);

      // Filter gameweeks to only include finished ones
      completedGameweeks = gameweeks.filter(gw => finishedGWs.includes(gw));

      console.log(`[K-109 Phase 4] Gameweeks: ${gameweeks.length} total, ${completedGameweeks.length} completed`);
    }
  } catch (error) {
    console.error('[K-109 Phase 4] Error fetching bootstrap:', error);
  }

  // Get completed GW scores from database
  let allScores: any[] = [];

  if (completedGameweeks.length > 0) {
    const scoresResult = await db.query(`
      SELECT
        mgh.entry_id,
        mgh.event,
        mgh.points,
        m.player_name,
        m.team_name
      FROM manager_gw_history mgh
      JOIN managers m ON mgh.entry_id = m.entry_id
      WHERE mgh.league_id = $1
        AND mgh.event = ANY($2)
      ORDER BY mgh.points DESC
    `, [leagueId, completedGameweeks]);

    allScores = scoresResult.rows.map((row: any) => ({
      entry_id: row.entry_id,
      player_name: row.player_name,
      team_name: row.team_name,
      event: row.event,
      points: row.points || 0,
    }));

    console.log(`[K-109 Phase 4] Fetched ${allScores.length} scores from DB for completed GWs`);
  }

  // K-109 Phase 4: If current GW is live, add K-108c scores
  if (currentGW && currentGWStatus !== 'completed') {
    console.log(`[K-109 Phase 4] Adding live GW${currentGW} scores via K-108c...`);

    const liveScoresPromises = managers.map(async (manager) => {
      try {
        const result = await calculateTeamGameweekScore(manager.entry_id, currentGW);
        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          event: currentGW,
          points: result.points.net_total
        };
      } catch (error: any) {
        console.error(`[K-109 Phase 4] Error calculating score for ${manager.entry_id}:`, error.message);
        return null;
      }
    });

    const liveScores = (await Promise.all(liveScoresPromises)).filter(Boolean);
    console.log(`[K-109 Phase 4] Calculated ${liveScores.length} live scores for GW${currentGW}`);

    // Merge with completed scores
    allScores = [...allScores, ...liveScores];
    console.log(`[K-109 Phase 4] Total scores (DB + live): ${allScores.length}`);
  }

  // If no scores at all, return empty
  if (allScores.length === 0) {
    console.log('[K-109 Phase 4] No scores available');
    return {
      best: [],
      worst: []
    };
  }

  // Sort for best and worst
  const sortedBest = [...allScores].sort((a, b) => b.points - a.points);
  const sortedWorst = [...allScores].sort((a, b) => a.points - b.points);

  console.log('[K-109 Phase 4] Best/Worst calculated:', {
    bestTopThree: sortedBest.slice(0, 3).map(s => ({ name: s.player_name, gw: s.event, pts: s.points })),
    worstTopThree: sortedWorst.slice(0, 3).map(s => ({ name: s.player_name, gw: s.event, pts: s.points }))
  });

  return {
    best: sortedBest,
    worst: sortedWorst,
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

// Calculate team value rankings from FPL API (fresh data, not cached)
async function getValueRankings(managers: any[], lastFinishedGW: number) {
  try {
    const valueData = await Promise.all(managers.map(async (manager) => {
      try {
        const picksRes = await fetch(
          `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${lastFinishedGW}/picks/`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          }
        );

        if (!picksRes.ok) {
          console.log(`[Value Rankings] Failed to fetch picks for ${manager.entry_id}`);
          return null;
        }

        const picksData = await picksRes.json();

        // Team value from entry_history (actual squad value)
        const teamValue = (picksData.entry_history?.value || 1000) / 10;
        // In The Bank (ITB)
        const bank = (picksData.entry_history?.bank || 0) / 10;
        // Total budget = squad value + ITB
        const totalValue = teamValue + bank;

        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          team_value: teamValue,
          bank: bank,
          total_value: totalValue,
          value_gain: totalValue - 100.0, // Gain from starting £100m
        };
      } catch (error) {
        console.error(`[Value Rankings] Error for ${manager.entry_id}:`, error);
        return null;
      }
    }));

    // Filter out nulls and sort by total value (team value + ITB)
    const validData = valueData.filter(d => d !== null);
    const sorted = [...validData].sort((a, b) => b.total_value - a.total_value);

    return sorted;
  } catch (error) {
    console.error('Error calculating value rankings:', error);
    return [];
  }
}

// K-119d: Calculate total bench points from manager_gw_history
async function calculateBenchPoints(
  db: any,
  leagueId: number,
  managers: any[]
) {
  try {
    console.log('[BENCH POINTS] Calculating bench points for league:', leagueId);

    const result = await db.query(`
      SELECT
        mgh.entry_id,
        m.player_name,
        m.team_name,
        SUM(mgh.points_on_bench) as total_bench_points
      FROM manager_gw_history mgh
      JOIN managers m ON m.entry_id = mgh.entry_id
      WHERE mgh.league_id = $1
      GROUP BY mgh.entry_id, m.player_name, m.team_name
      ORDER BY total_bench_points DESC
    `, [leagueId]);

    const benchPoints = result.rows.map((row: any) => ({
      entry_id: row.entry_id,
      player_name: row.player_name,
      team_name: row.team_name,
      total_bench_points: parseInt(row.total_bench_points) || 0
    }));

    console.log('[BENCH POINTS] Calculated bench points:', {
      count: benchPoints.length,
      topThree: benchPoints.slice(0, 3).map((b: any) => ({
        name: b.player_name,
        points: b.total_bench_points
      }))
    });

    return benchPoints;
  } catch (error) {
    console.error('[BENCH POINTS] Database error:', error);
    return [];
  }
}

// K-119a: Calculate form rankings (last 5 GWs performance)
async function calculateFormRankings(
  db: any,
  leagueId: number,
  completedGameweeks: number[],
  leagueStandings: any[]
) {
  try {
    console.log('[FORM RANKINGS] Calculating form rankings for league:', leagueId);

    // Need at least 6 GWs to calculate trend (5 current + 1 previous minimum)
    if (completedGameweeks.length < 6) {
      console.log('[FORM RANKINGS] Not enough gameweeks for trend calculation (need 6+), have:', completedGameweeks.length);

      // Just calculate current form without trend
      const last5GWs = completedGameweeks.slice(-Math.min(5, completedGameweeks.length));
      const result = await db.query(`
        SELECT
          mgh.entry_id,
          m.player_name,
          m.team_name,
          SUM(mgh.points) as last5_points
        FROM manager_gw_history mgh
        JOIN managers m ON m.entry_id = mgh.entry_id
        WHERE mgh.league_id = $1
          AND mgh.event = ANY($2)
        GROUP BY mgh.entry_id, m.player_name, m.team_name
        ORDER BY last5_points DESC
      `, [leagueId, last5GWs]);

      return result.rows.map((row: any, index: number) => ({
        entry_id: row.entry_id,
        player_name: row.player_name,
        team_name: row.team_name,
        last5_points: parseInt(row.last5_points) || 0,
        form_rank: index + 1,
        season_rank: 0,
        trend: 0 // No trend available yet
      }));
    }

    // Get last 5 completed gameweeks (current form period)
    const last5GWs = completedGameweeks.slice(-5);

    // Get previous 5 gameweeks (past form period for comparison)
    const previous5GWs = completedGameweeks.slice(-10, -5);

    console.log('[FORM RANKINGS] Current form GWs:', last5GWs);
    console.log('[FORM RANKINGS] Previous form GWs:', previous5GWs);

    // Calculate current form rankings (last 5 GWs)
    const currentResult = await db.query(`
      SELECT
        mgh.entry_id,
        m.player_name,
        m.team_name,
        SUM(mgh.points) as last5_points
      FROM manager_gw_history mgh
      JOIN managers m ON m.entry_id = mgh.entry_id
      WHERE mgh.league_id = $1
        AND mgh.event = ANY($2)
      GROUP BY mgh.entry_id, m.player_name, m.team_name
      ORDER BY last5_points DESC
    `, [leagueId, last5GWs]);

    // Calculate previous form rankings (5 GWs before that)
    const previousResult = await db.query(`
      SELECT
        mgh.entry_id,
        SUM(mgh.points) as prev5_points
      FROM manager_gw_history mgh
      WHERE mgh.league_id = $1
        AND mgh.event = ANY($2)
      GROUP BY mgh.entry_id
      ORDER BY prev5_points DESC
    `, [leagueId, previous5GWs]);

    // Create a map of previous form ranks
    const previousFormRanks: Record<number, number> = {};
    previousResult.rows.forEach((row: any, index: number) => {
      previousFormRanks[row.entry_id] = index + 1;
    });

    // Build form rankings with trend comparison
    const formRankings = currentResult.rows.map((row: any, index: number) => {
      const currentFormRank = index + 1;
      const previousFormRank = previousFormRanks[row.entry_id] || 0;

      // Trend = previous rank - current rank
      // Positive = improved (was 5th, now 2nd = +3)
      // Negative = declined (was 2nd, now 5th = -3)
      const trend = previousFormRank > 0 ? previousFormRank - currentFormRank : 0;

      if (index < 3) {
        console.log(`[FORM RANKINGS] Manager ${row.player_name}:`, {
          entry_id: row.entry_id,
          currentFormRank,
          previousFormRank,
          trend
        });
      }

      return {
        entry_id: row.entry_id,
        player_name: row.player_name,
        team_name: row.team_name,
        last5_points: parseInt(row.last5_points) || 0,
        form_rank: currentFormRank,
        season_rank: previousFormRank, // Store previous rank here for reference
        trend: trend
      };
    });

    console.log('[FORM RANKINGS] Calculated form rankings:', {
      count: formRankings.length,
      currentGWs: last5GWs,
      previousGWs: previous5GWs,
      topThree: formRankings.slice(0, 3).map((f: any) => ({
        name: f.player_name,
        points: f.last5_points,
        currentRank: f.form_rank,
        previousRank: f.season_rank,
        trend: f.trend
      }))
    });

    return formRankings;
  } catch (error) {
    console.error('[FORM RANKINGS] Database error:', error);
    return [];
  }
}

// K-119c: Calculate consistency (weekly score variance)
async function calculateConsistency(db: any, leagueId: number) {
  try {
    console.log('[CONSISTENCY] Calculating consistency for league:', leagueId);

    const result = await db.query(`
      SELECT
        mgh.entry_id,
        m.player_name,
        m.team_name,
        ROUND(AVG(mgh.points)::numeric, 1) as avg_points,
        ROUND(STDDEV_POP(mgh.points)::numeric, 1) as std_dev
      FROM manager_gw_history mgh
      JOIN managers m ON m.entry_id = mgh.entry_id
      WHERE mgh.league_id = $1
      GROUP BY mgh.entry_id, m.player_name, m.team_name
      ORDER BY std_dev ASC
    `, [leagueId]);

    const consistency = result.rows.map((row: any) => ({
      entry_id: row.entry_id,
      player_name: row.player_name,
      team_name: row.team_name,
      avg_points: parseFloat(row.avg_points) || 0,
      std_dev: parseFloat(row.std_dev) || 0
    }));

    console.log('[CONSISTENCY] Calculated consistency:', {
      count: consistency.length,
      topThree: consistency.slice(0, 3).map((c: any) => ({
        name: c.player_name,
        avg: c.avg_points,
        stdDev: c.std_dev
      }))
    });

    return consistency;
  } catch (error) {
    console.error('[CONSISTENCY] Database error:', error);
    return [];
  }
}

// K-119b: Calculate luck index (opponent performance vs their average)
async function calculateLuckIndex(db: any, leagueId: number) {
  try {
    console.log('[LUCK INDEX] Calculating luck index for league:', leagueId);

    // Step 1: Get each manager's average points
    const avgResult = await db.query(`
      SELECT
        entry_id,
        AVG(points) as avg_points
      FROM manager_gw_history
      WHERE league_id = $1
      GROUP BY entry_id
    `, [leagueId]);

    const averages: Record<number, number> = {};
    avgResult.rows.forEach((row: any) => {
      averages[row.entry_id] = parseFloat(row.avg_points) || 0;
    });

    console.log('[LUCK INDEX] Manager averages:', {
      count: Object.keys(averages).length,
      sample: Object.entries(averages).slice(0, 3).map(([id, avg]) => ({ id, avg }))
    });

    // Step 2: Get all H2H matches
    const matchesResult = await db.query(`
      SELECT
        entry_1_id,
        entry_2_id,
        entry_1_points,
        entry_2_points,
        event
      FROM h2h_matches
      WHERE league_id = $1
        AND entry_1_points IS NOT NULL
        AND entry_2_points IS NOT NULL
    `, [leagueId]);

    console.log('[LUCK INDEX] H2H matches:', {
      count: matchesResult.rows.length,
      sampleMatches: matchesResult.rows.slice(0, 3).map((m: any) => ({
        gw: m.event,
        entry1: m.entry_1_id,
        entry2: m.entry_2_id,
        pts1: m.entry_1_points,
        pts2: m.entry_2_points
      }))
    });

    // Step 3: Calculate luck for each manager
    const luck: Record<number, number> = {};

    // Initialize all managers with 0 luck
    Object.keys(averages).forEach(entryId => {
      luck[parseInt(entryId)] = 0;
    });

    // Process each match
    matchesResult.rows.forEach((match: any, index: number) => {
      const entry1 = match.entry_1_id;
      const entry2 = match.entry_2_id;

      // How much did opponent deviate from their average?
      // Positive deviation = opponent underperformed
      const opp_deviation_for_entry1 = (averages[entry2] || 0) - match.entry_2_points;
      const opp_deviation_for_entry2 = (averages[entry1] || 0) - match.entry_1_points;

      if (index < 3) {
        console.log(`[LUCK INDEX] Match ${index + 1} (GW${match.event}):`, {
          entry1,
          entry2,
          entry1_pts: match.entry_1_points,
          entry2_pts: match.entry_2_points,
          entry1_avg: averages[entry1],
          entry2_avg: averages[entry2],
          opp_dev_for_entry1: opp_deviation_for_entry1,
          opp_dev_for_entry2: opp_deviation_for_entry2
        });
      }

      luck[entry1] = (luck[entry1] || 0) + opp_deviation_for_entry1;
      luck[entry2] = (luck[entry2] || 0) + opp_deviation_for_entry2;
    });

    // Step 4: Get manager names and format response
    const managersResult = await db.query(`
      SELECT entry_id, player_name, team_name
      FROM managers
      WHERE entry_id = ANY($1)
    `, [Object.keys(luck).map(Number)]);

    const managerMap: Record<number, { player_name: string; team_name: string }> = {};
    managersResult.rows.forEach((row: any) => {
      managerMap[row.entry_id] = {
        player_name: row.player_name,
        team_name: row.team_name
      };
    });

    const luckIndex = Object.entries(luck)
      .map(([entryId, luckValue]) => ({
        entry_id: parseInt(entryId),
        player_name: managerMap[parseInt(entryId)]?.player_name || 'Unknown',
        team_name: managerMap[parseInt(entryId)]?.team_name || 'Unknown',
        luck_index: Math.round(luckValue * 10) / 10 // Round to 1 decimal
      }))
      .sort((a, b) => b.luck_index - a.luck_index);

    console.log('[LUCK INDEX] Calculated luck index:', {
      count: luckIndex.length,
      luckiest: luckIndex.slice(0, 3).map((l: any) => ({
        name: l.player_name,
        luck: l.luck_index
      })),
      unluckiest: luckIndex.slice(-3).map((l: any) => ({
        name: l.player_name,
        luck: l.luck_index
      }))
    });

    return luckIndex;
  } catch (error) {
    console.error('[LUCK INDEX] Database error:', error);
    return [];
  }
}
