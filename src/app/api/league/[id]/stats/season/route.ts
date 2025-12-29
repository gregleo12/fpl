import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateGWLuck } from '@/lib/luckCalculator'; // K-163: Correct luck formula

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

    // K-133: Get bootstrap data to get ONLY FINISHED gameweeks
    let finishedGWs: number[] = [];
    let completedGameweeksCount = 0;
    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const events = bootstrapData?.events || [];

        // K-133: Only include FINISHED gameweeks (exclude live/in-progress GWs)
        const finishedGameweeks = events.filter((e: any) => e.finished);
        finishedGWs = finishedGameweeks.map((e: any) => e.id);
        completedGameweeksCount = finishedGWs.length;

        console.log('[K-133] Finished GWs only:', finishedGWs);
      }
    } catch (error) {
      console.log('[K-133] Could not fetch bootstrap data, returning empty stats');
    }

    // K-133: If no finished GWs, return empty data
    if (finishedGWs.length === 0) {
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

    // K-133: Get last finished GW for value rankings (from finishedGWs array)
    const lastFinishedGW = finishedGWs.length > 0 ? finishedGWs[finishedGWs.length - 1] : 1;

    // K-133 + K-143: Calculate season statistics using ONLY finished GWs
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
      luckIndex,
      classicPts
    ] = await Promise.all([
      calculateCaptainLeaderboard(db, leagueId, finishedGWs, managers),
      calculateChipPerformance(db, leagueId, finishedGWs, managers),
      calculateStreaks(db, leagueId, finishedGWs, managers),
      calculateBestWorstGameweeks(db, leagueId, finishedGWs, managers),
      calculateTrendsData(db, leagueId, finishedGWs, managers),
      getValueRankings(managers, lastFinishedGW),
      calculateBenchPoints(db, leagueId, finishedGWs, managers),
      calculateFormRankings(db, leagueId, finishedGWs, leagueStandings),
      calculateConsistency(db, leagueId, finishedGWs),
      calculateLuckIndex(db, leagueId, finishedGWs),
      calculateClassicPts(db, leagueId, finishedGWs, leagueStandings),
    ]);

    return NextResponse.json({
      completedGameweeks: completedGameweeksCount, // K-133: Use finished GWs count only
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
      classicPts, // K-143: Classic Pts leaderboard
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

      // Calculate Won/Drew/Lost counts
      const chips_won = chips.filter((c: any) => c.result === 'W').length;
      const chips_drew = chips.filter((c: any) => c.result === 'D').length;
      const chips_lost = chips.filter((c: any) => c.result === 'L').length;

      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        chip_count: chips.length,
        chips_won,
        chips_drew,
        chips_lost,
        chips_detail: sortedChips.map((c: any) => `${CHIP_NAMES[c.name] || c.name} (GW${c.event})`).join(', '),
        chips_played_data: sortedChips.map((c: any) => ({
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

      // Calculate Won/Drew/Lost counts
      const chips_faced_won = chips.filter((c: any) => c.result === 'W').length;
      const chips_faced_drew = chips.filter((c: any) => c.result === 'D').length;
      const chips_faced_lost = chips.filter((c: any) => c.result === 'L').length;

      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        team_name: manager.team_name,
        chips_faced_count: chips.length,
        chips_faced_won,
        chips_faced_drew,
        chips_faced_lost,
        chips_faced_detail: sortedChips.map((c: any) => `${c.chip} (GW${c.gw})`).join(', '),
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

        // Calculate Won/Drew/Lost counts
        const chips_won = chips.filter((c: any) => c.result === 'W').length;
        const chips_drew = chips.filter((c: any) => c.result === 'D').length;
        const chips_lost = chips.filter((c: any) => c.result === 'L').length;

        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          chip_count: chips.length,
          chips_won,
          chips_drew,
          chips_lost,
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

        // Calculate Won/Drew/Lost counts
        const chips_faced_won = chips.filter((c: any) => c.result === 'W').length;
        const chips_faced_drew = chips.filter((c: any) => c.result === 'D').length;
        const chips_faced_lost = chips.filter((c: any) => c.result === 'L').length;

        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          chips_faced_count: chips.length,
          chips_faced_won,
          chips_faced_drew,
          chips_faced_lost,
          chips_faced_detail: sortedChips.map((c: any) => `${c.chip} (GW${c.gw})`).join(', '),
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

// K-133: Calculate best and worst gameweeks from COMPLETED GWs only
async function calculateBestWorstGameweeks(
  db: any,
  leagueId: number,
  gameweeks: number[],
  managers: any[]
) {
  console.log('[K-133] Calculating Best/Worst Gameweeks for finished GWs:', gameweeks);

  // K-133: Get scores ONLY from finished GWs (no live GW scores)
  if (gameweeks.length === 0) {
    console.log('[K-133] No finished GWs available');
    return {
      best: [],
      worst: []
    };
  }

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
  `, [leagueId, gameweeks]);

  const allScores = scoresResult.rows.map((row: any) => ({
    entry_id: row.entry_id,
    player_name: row.player_name,
    team_name: row.team_name,
    event: row.event,
    points: row.points || 0,
  }));

  console.log(`[K-133] Fetched ${allScores.length} scores from DB for finished GWs`);

  if (allScores.length === 0) {
    return {
      best: [],
      worst: []
    };
  }

  // K-143: Filter to show only ONE entry per unique player (their best/worst performance)
  // Group by entry_id and take max for best, min for worst
  type ScoreData = {
    entry_id: number;
    player_name: string;
    team_name: string;
    event: number;
    points: number;
  };

  const bestByPlayer = new Map<number, ScoreData>();
  const worstByPlayer = new Map<number, ScoreData>();

  allScores.forEach((score: ScoreData) => {
    // For best: keep score if player not in map OR this score is higher
    const existingBest = bestByPlayer.get(score.entry_id);
    if (!existingBest || score.points > existingBest.points) {
      bestByPlayer.set(score.entry_id, score);
    }

    // For worst: keep score if player not in map OR this score is lower
    const existingWorst = worstByPlayer.get(score.entry_id);
    if (!existingWorst || score.points < existingWorst.points) {
      worstByPlayer.set(score.entry_id, score);
    }
  });

  // Convert maps to arrays and sort
  const sortedBest = Array.from(bestByPlayer.values()).sort((a, b) => b.points - a.points);
  const sortedWorst = Array.from(worstByPlayer.values()).sort((a, b) => a.points - b.points);

  console.log('[K-143] Best/Worst calculated (unique players only):', {
    bestTopThree: sortedBest.slice(0, 3).map(s => ({ name: s.player_name, gw: s.event, pts: s.points })),
    worstTopThree: sortedWorst.slice(0, 3).map(s => ({ name: s.player_name, gw: s.event, pts: s.points })),
    uniquePlayersInBest: bestByPlayer.size,
    uniquePlayersInWorst: worstByPlayer.size
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

        // FPL Picks API (/event/{gw}/picks/) returns entry_history with:
        // - entry_history.value = TOTAL value (team + bank) in TENTHS
        // - entry_history.bank = In The Bank in TENTHS
        // Note: Different from History API (/history/) which returns values in pounds
        // Example: value=1053 means £105.3m total, bank=20 means £2.0m ITB
        const totalValue = (picksData.entry_history?.value || 1000) / 10;
        const bank = (picksData.entry_history?.bank || 0) / 10;
        const teamValue = totalValue - bank;  // £105.3m - £2.0m = £103.3m

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
  gameweeks: number[],
  managers: any[]
) {
  try {
    console.log('[BENCH POINTS] Calculating bench points for league:', leagueId, 'GWs:', gameweeks);

    const result = await db.query(`
      SELECT
        mgh.entry_id,
        m.player_name,
        m.team_name,
        SUM(mgh.points_on_bench) as total_bench_points,
        SUM(mgh.points) as total_points
      FROM manager_gw_history mgh
      JOIN managers m ON m.entry_id = mgh.entry_id
      WHERE mgh.league_id = $1
        AND mgh.event = ANY($2)
      GROUP BY mgh.entry_id, m.player_name, m.team_name
      ORDER BY total_bench_points DESC
    `, [leagueId, gameweeks]);

    const benchPoints = result.rows.map((row: any) => {
      const benchPts = parseInt(row.total_bench_points) || 0;
      const totalPts = parseInt(row.total_points) || 0;
      const percentage = totalPts > 0 ? (benchPts / totalPts) * 100 : 0;

      return {
        entry_id: row.entry_id,
        player_name: row.player_name,
        team_name: row.team_name,
        total_bench_points: benchPts,
        total_points: totalPts,
        bench_percentage: Math.round(percentage * 10) / 10 // Round to 1 decimal
      };
    });

    console.log('[BENCH POINTS] Calculated bench points:', {
      count: benchPoints.length,
      topThree: benchPoints.slice(0, 3).map((b: any) => ({
        name: b.player_name,
        benchPts: b.total_bench_points,
        totalPts: b.total_points,
        pct: b.bench_percentage
      }))
    });

    return benchPoints;
  } catch (error) {
    console.error('[BENCH POINTS] Database error:', error);
    return [];
  }
}

// K-119a: Calculate form rankings (last 5 and last 10 GWs performance)
async function calculateFormRankings(
  db: any,
  leagueId: number,
  completedGameweeks: number[],
  leagueStandings: any[]
) {
  try {
    console.log('[FORM RANKINGS] Calculating form rankings for league:', leagueId);

    // Need at least 6 GWs for last 5 trend, 11 for last 10 trend
    if (completedGameweeks.length < 6) {
      console.log('[FORM RANKINGS] Not enough gameweeks for trend calculation (need 6+), have:', completedGameweeks.length);

      // Just calculate current form without trend
      const last5GWs = completedGameweeks.slice(-Math.min(5, completedGameweeks.length));
      const result = await db.query(`
        SELECT
          mgh.entry_id,
          m.player_name,
          m.team_name,
          SUM(mgh.points) as form_points
        FROM manager_gw_history mgh
        JOIN managers m ON m.entry_id = mgh.entry_id
        WHERE mgh.league_id = $1
          AND mgh.event = ANY($2)
        GROUP BY mgh.entry_id, m.player_name, m.team_name
        ORDER BY form_points DESC
      `, [leagueId, last5GWs]);

      return result.rows.map((row: any, index: number) => ({
        entry_id: row.entry_id,
        player_name: row.player_name,
        team_name: row.team_name,
        form_points_5: parseInt(row.form_points) || 0,
        form_points_10: 0,
        trend_5: 0,
        trend_10: 0
      }));
    }

    // Calculate Last 5 GWs with trend
    const last5GWs = completedGameweeks.slice(-5);
    const previous5GWs = completedGameweeks.slice(-10, -5);

    const [current5Result, previous5Result] = await Promise.all([
      db.query(`
        SELECT
          mgh.entry_id,
          m.player_name,
          m.team_name,
          SUM(mgh.points) as form_points
        FROM manager_gw_history mgh
        JOIN managers m ON m.entry_id = mgh.entry_id
        WHERE mgh.league_id = $1
          AND mgh.event = ANY($2)
        GROUP BY mgh.entry_id, m.player_name, m.team_name
        ORDER BY form_points DESC
      `, [leagueId, last5GWs]),
      db.query(`
        SELECT
          mgh.entry_id,
          SUM(mgh.points) as form_points
        FROM manager_gw_history mgh
        WHERE mgh.league_id = $1
          AND mgh.event = ANY($2)
        GROUP BY mgh.entry_id
        ORDER BY form_points DESC
      `, [leagueId, previous5GWs])
    ]);

    // Create map of previous 5 GW ranks
    const previous5Ranks: Record<number, number> = {};
    previous5Result.rows.forEach((row: any, index: number) => {
      previous5Ranks[row.entry_id] = index + 1;
    });

    // Calculate Last 10 GWs with trend (if enough GWs)
    let current10Data: Record<number, { points: number; rank: number }> = {};
    let previous10Ranks: Record<number, number> = {};

    if (completedGameweeks.length >= 11) {
      const last10GWs = completedGameweeks.slice(-10);
      const previous10GWs = completedGameweeks.slice(-20, -10);

      const [current10Result, previous10Result] = await Promise.all([
        db.query(`
          SELECT
            mgh.entry_id,
            SUM(mgh.points) as form_points
          FROM manager_gw_history mgh
          WHERE mgh.league_id = $1
            AND mgh.event = ANY($2)
          GROUP BY mgh.entry_id
          ORDER BY form_points DESC
        `, [leagueId, last10GWs]),
        db.query(`
          SELECT
            mgh.entry_id,
            SUM(mgh.points) as form_points
          FROM manager_gw_history mgh
          WHERE mgh.league_id = $1
            AND mgh.event = ANY($2)
          GROUP BY mgh.entry_id
          ORDER BY form_points DESC
        `, [leagueId, previous10GWs])
      ]);

      current10Result.rows.forEach((row: any, index: number) => {
        current10Data[row.entry_id] = {
          points: parseInt(row.form_points) || 0,
          rank: index + 1
        };
      });

      previous10Result.rows.forEach((row: any, index: number) => {
        previous10Ranks[row.entry_id] = index + 1;
      });
    }

    // Build combined form rankings
    const formRankings = current5Result.rows.map((row: any, index: number) => {
      const current5Rank = index + 1;
      const previous5Rank = previous5Ranks[row.entry_id] || 0;
      const trend5 = previous5Rank > 0 ? previous5Rank - current5Rank : 0;

      const form10 = current10Data[row.entry_id];
      const trend10 = form10 && previous10Ranks[row.entry_id]
        ? previous10Ranks[row.entry_id] - form10.rank
        : 0;

      return {
        entry_id: row.entry_id,
        player_name: row.player_name,
        team_name: row.team_name,
        form_points_5: parseInt(row.form_points) || 0,
        form_points_10: form10?.points || 0,
        trend_5: trend5,
        trend_10: trend10
      };
    });

    console.log('[FORM RANKINGS] Calculated form rankings:', {
      count: formRankings.length,
      last5GWs,
      last10Available: completedGameweeks.length >= 11,
      topThree: formRankings.slice(0, 3).map((f: any) => ({
        name: f.player_name,
        pts5: f.form_points_5,
        pts10: f.form_points_10,
        trend5: f.trend_5,
        trend10: f.trend_10
      }))
    });

    return formRankings;
  } catch (error) {
    console.error('[FORM RANKINGS] Database error:', error);
    return [];
  }
}

// K-119c: Calculate consistency (weekly score variance)
async function calculateConsistency(db: any, leagueId: number, gameweeks: number[]) {
  try {
    console.log('[CONSISTENCY] Calculating consistency for league:', leagueId, 'GWs:', gameweeks);

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
        AND mgh.event = ANY($2)
      GROUP BY mgh.entry_id, m.player_name, m.team_name
      ORDER BY std_dev ASC
    `, [leagueId, gameweeks]);

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

// K-163: Calculate luck index using CORRECT formula (Actual - Expected)
async function calculateLuckIndex(db: any, leagueId: number, completedGameweeks: number[]) {
  try {
    console.log('[K-163 LUCK INDEX] Calculating luck index for league:', leagueId, 'GWs:', completedGameweeks);

    // Step 1: Get all manager points for each GW
    const pointsResult = await db.query(`
      SELECT
        entry_id,
        event,
        points
      FROM manager_gw_history
      WHERE league_id = $1
        AND event = ANY($2)
      ORDER BY event, entry_id
    `, [leagueId, completedGameweeks]);

    // Group points by gameweek
    const pointsByGW: Record<number, Record<number, number>> = {}; // gw -> { entryId -> points }
    const managerIds = new Set<number>();

    pointsResult.rows.forEach((row: any) => {
      const gw = row.event;
      const entryId = row.entry_id;
      const points = row.points;

      if (!pointsByGW[gw]) pointsByGW[gw] = {};
      pointsByGW[gw][entryId] = points;
      managerIds.add(entryId);
    });

    console.log('[K-163 LUCK INDEX] Manager points:', {
      managerCount: managerIds.size,
      gwCount: Object.keys(pointsByGW).length,
      sampleGW: completedGameweeks[0] ? {
        gw: completedGameweeks[0],
        pointsCount: Object.keys(pointsByGW[completedGameweeks[0]] || {}).length
      } : null
    });

    // Step 2: Get all H2H matches with results
    const matchesResult = await db.query(`
      SELECT
        entry_1_id,
        entry_2_id,
        entry_1_points,
        entry_2_points,
        winner,
        event
      FROM h2h_matches
      WHERE league_id = $1
        AND event = ANY($2)
        AND entry_1_points IS NOT NULL
        AND entry_2_points IS NOT NULL
      ORDER BY event
    `, [leagueId, completedGameweeks]);

    console.log('[K-163 LUCK INDEX] H2H matches:', {
      count: matchesResult.rows.length
    });

    // Step 3: Calculate luck for each manager
    const luck: Record<number, number> = {};

    // Initialize all managers with 0 luck
    managerIds.forEach(entryId => {
      luck[entryId] = 0;
    });

    // Process each match
    matchesResult.rows.forEach((match: any) => {
      const gw = match.event;
      const entry1 = match.entry_1_id;
      const entry2 = match.entry_2_id;
      const entry1Points = match.entry_1_points;
      const entry2Points = match.entry_2_points;
      const winner = match.winner;

      // Get all teams' points for this GW
      const allGWPoints = pointsByGW[gw];
      if (!allGWPoints) return;

      // For entry1: get all OTHER teams' points
      const otherTeamsPointsForEntry1 = Object.entries(allGWPoints)
        .filter(([id]) => Number(id) !== entry1)
        .map(([, pts]) => Number(pts));

      // For entry2: get all OTHER teams' points
      const otherTeamsPointsForEntry2 = Object.entries(allGWPoints)
        .filter(([id]) => Number(id) !== entry2)
        .map(([, pts]) => Number(pts));

      // Determine match result from each manager's perspective
      const entry1Result: 'win' | 'draw' | 'loss' =
        winner === entry1 ? 'win' : winner === null ? 'draw' : 'loss';
      const entry2Result: 'win' | 'draw' | 'loss' =
        winner === entry2 ? 'win' : winner === null ? 'draw' : 'loss';

      // K-163: Calculate luck using correct formula (Actual - Expected)
      const entry1Luck = calculateGWLuck(entry1Points, otherTeamsPointsForEntry1, entry1Result);
      const entry2Luck = calculateGWLuck(entry2Points, otherTeamsPointsForEntry2, entry2Result);

      luck[entry1] = (luck[entry1] || 0) + entry1Luck;
      luck[entry2] = (luck[entry2] || 0) + entry2Luck;
    });

    // Step 4: Get manager names and format response
    const managersResult = await db.query(`
      SELECT entry_id, player_name, team_name
      FROM managers
      WHERE entry_id = ANY($1)
    `, [Array.from(managerIds)]);

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

    // Validation: Calculate sum and range
    const luckValues = luckIndex.map((l: any) => l.luck_index);
    const sumOfLuck = luckValues.reduce((sum: number, val: number) => sum + val, 0);
    const minLuck = Math.min(...luckValues);
    const maxLuck = Math.max(...luckValues);

    console.log('[K-163 LUCK INDEX] Calculated luck index:', {
      count: luckIndex.length,
      sumOfLuck: Math.round(sumOfLuck * 10) / 10,
      range: `${minLuck.toFixed(1)} to ${maxLuck.toFixed(1)}`,
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
    console.error('[K-163 LUCK INDEX] Database error:', error);
    return [];
  }
}

// K-143: Calculate Classic Pts leaderboard (points-based rankings vs H2H rank)
async function calculateClassicPts(
  db: any,
  leagueId: number,
  completedGameweeks: number[],
  leagueStandings: any[]
) {
  try {
    console.log('[K-143 CLASSIC PTS] Calculating Classic Pts for league:', leagueId);

    // Get total NET points for each manager from completed GWs (after deducting hits)
    // K-65: Database 'points' may be GROSS, so we calculate NET points here
    const pointsResult = await db.query(`
      SELECT
        entry_id,
        SUM(points - COALESCE(event_transfers_cost, 0)) as total_points
      FROM manager_gw_history
      WHERE league_id = $1
        AND event = ANY($2)
      GROUP BY entry_id
      ORDER BY total_points DESC
    `, [leagueId, completedGameweeks]);

    // Get manager names
    const managersResult = await db.query(`
      SELECT m.entry_id, m.player_name, m.team_name
      FROM managers m
      JOIN league_standings ls ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
    `, [leagueId]);

    const managerMap = new Map();
    managersResult.rows.forEach((row: any) => {
      managerMap.set(Number(row.entry_id), {
        player_name: row.player_name,
        team_name: row.team_name
      });
    });

    // Create H2H rank map
    const h2hRankMap = new Map();
    leagueStandings.forEach((standing: any) => {
      h2hRankMap.set(Number(standing.entry_id), Number(standing.rank));
    });

    // Build Classic Pts data with variance calculation
    const classicPts = pointsResult.rows.map((row: any, index: number) => {
      const entryId = Number(row.entry_id);
      const manager = managerMap.get(entryId);
      const ptsRank = index + 1; // Points-based rank (1st = highest points)
      const h2hRank = h2hRankMap.get(entryId) || 0;
      const variance = h2hRank - ptsRank; // Negative = better in H2H, Positive = worse in H2H

      return {
        entry_id: entryId,
        player_name: manager?.player_name || 'Unknown',
        team_name: manager?.team_name || 'Unknown',
        total_points: parseInt(row.total_points) || 0,
        pts_rank: ptsRank,
        h2h_rank: h2hRank,
        variance
      };
    });

    console.log('[K-143 CLASSIC PTS] Calculated:', {
      count: classicPts.length,
      sample: classicPts.slice(0, 3).map((p: any) => ({
        name: p.player_name,
        pts: p.total_points,
        ptsRank: p.pts_rank,
        h2hRank: p.h2h_rank,
        variance: p.variance
      }))
    });

    return classicPts;
  } catch (error) {
    console.error('[K-143 CLASSIC PTS] Database error:', error);
    return [];
  }
}
