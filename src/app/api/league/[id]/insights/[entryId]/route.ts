import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { fplApi } from '@/lib/fpl-api';
import { calculateGWLuck, formatLuck } from '@/lib/luckCalculator'; // K-163: Add luck to H2H preview

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const targetEntryId = parseInt(params.entryId);
    const { searchParams } = new URL(request.url);
    const myEntryId = searchParams.get('myId');

    if (isNaN(leagueId) || isNaN(targetEntryId) || !myEntryId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const myId = parseInt(myEntryId);
    const db = await getDatabase();

    // Get opponent details
    const opponentResult = await db.query(`
      SELECT entry_id, player_name, team_name
      FROM managers
      WHERE entry_id = $1
      LIMIT 1
    `, [targetEntryId]);

    if (opponentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Opponent not found' }, { status: 404 });
    }

    const opponent = opponentResult.rows[0];

    // Get opponent's matches
    const opponentMatchesResult = await db.query(`
      SELECT
        event,
        CASE
          WHEN entry_1_id = $1 THEN entry_1_points
          ELSE entry_2_points
        END as points,
        CASE
          WHEN winner IS NULL THEN 'D'
          WHEN winner = $1 THEN 'W'
          ELSE 'L'
        END as result,
        CASE
          WHEN entry_1_id = $1 THEN active_chip_1
          ELSE active_chip_2
        END as chip_used
      FROM h2h_matches
      WHERE league_id = $2
        AND (entry_1_id = $1 OR entry_2_id = $1)
        AND (entry_1_points > 0 OR entry_2_points > 0)
      ORDER BY event DESC
    `, [targetEntryId, leagueId]);

    const opponentMatches = opponentMatchesResult.rows;

    // Get my matches for comparison
    const myMatchesResult = await db.query(`
      SELECT
        event,
        CASE
          WHEN entry_1_id = $1 THEN entry_1_points
          ELSE entry_2_points
        END as points
      FROM h2h_matches
      WHERE league_id = $2
        AND (entry_1_id = $1 OR entry_2_id = $1)
        AND (entry_1_points > 0 OR entry_2_points > 0)
      ORDER BY event DESC
    `, [myId, leagueId]);

    const myMatches = myMatchesResult.rows;

    // Calculate recent form (last 5)
    const last5 = opponentMatches.slice(0, 5);
    const recentForm = {
      last_5_results: last5.map((m: any) => ({ result: m.result, event: m.event })),
      avg_points_last_5: last5.length > 0
        ? (last5.reduce((sum: number, m: any) => sum + (m.points || 0), 0) / last5.length).toFixed(1)
        : '0.0'
    };

    // Calculate my stats
    const myLast5 = myMatches.slice(0, 5);
    const myStats = {
      avg_points_last_5: myLast5.length > 0
        ? (myLast5.reduce((sum: number, m: any) => sum + (m.points || 0), 0) / myLast5.length).toFixed(1)
        : '0.0'
    };

    // Get current gameweek to determine chip renewals
    const bootstrapData = await fplApi.getBootstrapData();
    const currentEvent = bootstrapData.events.find(e => e.is_current || e.is_next);
    const currentGW = currentEvent?.id || 1;

    // Calculate chips remaining from FPL API
    // Chips renew in GW19 if used before GW19, but don't stack (max 1 of each)
    const calculateRemainingChips = (chipsUsed: any[], currentGW: number): string[] => {
      const remaining: string[] = [];
      const allChipTypes = ['wildcard', 'bboost', '3xc', 'freehit'];

      allChipTypes.forEach(chipType => {
        // Find all uses of this chip
        const uses = chipsUsed.filter((chip: any) => chip.name === chipType);

        if (uses.length === 0) {
          // Never used - still available
          remaining.push(chipType);
        } else {
          // Check if any use was after GW19
          const usedAfterGW19 = uses.some((use: any) => use.event >= 19);

          if (!usedAfterGW19 && currentGW >= 19) {
            // Only used before GW19 and we're past GW19 - chip has renewed
            remaining.push(chipType);
          }
          // If used after GW19, chip is not available (already used this half)
        }
      });

      return remaining;
    };

    // Get opponent's chip usage from FPL API
    let opponentChipsRemaining: string[] = ['wildcard', 'bboost', '3xc', 'freehit']; // Default: all chips
    try {
      const opponentHistoryData = await fplApi.getEntryHistory(targetEntryId);
      if (opponentHistoryData && opponentHistoryData.chips && Array.isArray(opponentHistoryData.chips)) {
        opponentChipsRemaining = calculateRemainingChips(opponentHistoryData.chips, currentGW);
      }
    } catch (error) {
      // If API fails, show all chips as available
    }

    // Get my chip usage from FPL API
    let myChipsRemaining: string[] = ['wildcard', 'bboost', '3xc', 'freehit']; // Default: all chips
    try {
      const myHistoryData = await fplApi.getEntryHistory(myId);
      if (myHistoryData && myHistoryData.chips && Array.isArray(myHistoryData.chips)) {
        myChipsRemaining = calculateRemainingChips(myHistoryData.chips, currentGW);
      }
    } catch (error) {
      // If API fails, show all chips as available
    }

    const chipsRemaining = {
      yours: myChipsRemaining,
      theirs: opponentChipsRemaining
    };

    // Calculate momentum/streak
    let currentStreak = 0;
    let streakType = opponentMatches.length > 0 ? opponentMatches[0].result : 'N';

    for (const match of opponentMatches) {
      if (match.result === streakType) {
        currentStreak++;
      } else {
        break;
      }
    }

    const momentum = {
      current_streak: currentStreak,
      streak_type: streakType.toLowerCase() as 'win' | 'draw' | 'loss',
      trend: currentStreak >= 3 ? 'hot' : currentStreak >= 2 ? 'improving' : 'neutral'
    };

    // Calculate head-to-head record
    const h2hResult = await db.query(`
      SELECT
        event,
        CASE
          WHEN entry_1_id = $1 THEN entry_1_points
          ELSE entry_2_points
        END as my_score,
        CASE
          WHEN entry_1_id = $2 THEN entry_1_points
          ELSE entry_2_points
        END as their_score,
        winner
      FROM h2h_matches
      WHERE league_id = $3
        AND (
          (entry_1_id = $1 AND entry_2_id = $2) OR
          (entry_1_id = $2 AND entry_2_id = $1)
        )
        AND (entry_1_points > 0 OR entry_2_points > 0)
      ORDER BY event DESC
    `, [myId, targetEntryId, leagueId]);

    const h2hMatches = h2hResult.rows;
    const yourWins = h2hMatches.filter((m: any) => m.winner && parseInt(m.winner) === myId).length;
    const theirWins = h2hMatches.filter((m: any) => m.winner && parseInt(m.winner) === targetEntryId).length;

    const lastMeeting = h2hMatches.length > 0 ? {
      event: h2hMatches[0].event,
      your_score: h2hMatches[0].my_score,
      their_score: h2hMatches[0].their_score,
      margin: h2hMatches[0].my_score - h2hMatches[0].their_score
    } : null;

    const headToHead = {
      total_meetings: h2hMatches.length,
      your_wins: yourWins,
      their_wins: theirWins,
      last_meeting: lastMeeting
    };

    // Get opponent's rank
    const rankResult = await db.query(`
      SELECT
        entry_id,
        ROW_NUMBER() OVER (ORDER BY total DESC, points_for DESC) as rank
      FROM league_standings
      WHERE league_id = $1
    `, [leagueId]);

    const opponentRank = rankResult.rows.find((r: any) => parseInt(r.entry_id) === targetEntryId)?.rank || 0;

    // K-162: Fetch Free Transfers data from FPL API + Database
    // FPL API has transfer counts, but chip data must come from database
    let freeTransfers: number | undefined = undefined;
    try {
      const historyData = await fplApi.getEntryHistory(targetEntryId);
      if (historyData && historyData.current && historyData.current.length > 0) {
        const currentGWs = historyData.current;

        // K-162: Query database for chip usage (FPL API doesn't include this)
        const chipsResult = await db.query(`
          SELECT event, chip_name
          FROM manager_chips
          WHERE entry_id = $1
          ORDER BY event ASC
        `, [targetEntryId]);

        // Create map of gameweek -> chip_name for quick lookup
        const chipsByGW = new Map<number, string>();
        for (const chip of chipsResult.rows) {
          chipsByGW.set(chip.event, chip.chip_name);
        }

        // Calculate free transfers by tracking through the season
        // IMPORTANT: This calculates FT available FOR the current/upcoming GW
        let ftBalance = 0;

        // Calculate upcomingGW from completed GWs
        // currentGWs only contains completed GWs, so upcomingGW = last completed + 1
        const maxCompletedGW = Math.max(...currentGWs.map((gw: any) => gw.event));
        const upcomingGW = maxCompletedGW + 1;

        for (const gw of currentGWs) {
          if (gw.event >= upcomingGW) {
            break;
          }

          if (gw.event === 1) {
            ftBalance = 1;
            continue;
          }

          // AFCON special rule: Everyone STARTS GW16 with 5 FT
          // This sets the balance before processing GW16 transfers
          if (gw.event === 16) {
            ftBalance = 5;
          }

          const transfers = gw.event_transfers || 0;
          const chipUsed = chipsByGW.get(gw.event); // K-162: Get from database

          if (chipUsed === 'wildcard' || chipUsed === 'freehit') {
            // K-162: FH/WC chips CONSUME 1 FT to activate
            // Net effect: -1 (chip cost) + 1 (rollover) = 0 change to FT balance
            ftBalance = Math.max(0, ftBalance - 1);

            // Add +1 FT for the NEXT gameweek (same logic as regular weeks)
            const nextGWIndex = currentGWs.findIndex((g: any) => g.event === gw.event) + 1;
            const nextGW = currentGWs[nextGWIndex];

            if (nextGW && nextGW.event < upcomingGW) {
              ftBalance = Math.min(5, ftBalance + 1);
            }
          } else {
            // First consume transfers
            ftBalance = Math.max(0, ftBalance - transfers);

            // Then add +1 FT for the NEXT gameweek (but NOT if this is the last completed GW)
            const nextGWIndex = currentGWs.findIndex((g: any) => g.event === gw.event) + 1;
            const nextGW = currentGWs[nextGWIndex];

            if (nextGW && nextGW.event < upcomingGW) {
              // There's another completed GW after this one, so add the +1 FT
              ftBalance = Math.min(5, ftBalance + 1);
            }
          }
        }

        // Add +1 FT rollover for the upcoming gameweek
        ftBalance = Math.min(5, ftBalance + 1);

        freeTransfers = ftBalance;
      }
    } catch (error) {
      // FT data not critical, continue without it
    }

    // K-163a Part 2: Calculate luck for last H2H meeting using 3-component formula
    let lastMeetingLuck: { your_luck: number; their_luck: number; gw: number } | null = null;
    if (lastMeeting) {
      try {
        const lastGW = lastMeeting.event;

        // Get all managers' points for that GW
        const allPointsResult = await db.query(`
          SELECT entry_id, points
          FROM manager_gw_history
          WHERE league_id = $1 AND event = $2
        `, [leagueId, lastGW]);

        const allGWPoints = allPointsResult.rows.reduce((acc: Record<number, number>, row: any) => {
          acc[row.entry_id] = row.points;
          return acc;
        }, {});

        // Get season averages up to that GW
        const seasonAvgsResult = await db.query(`
          SELECT entry_id, AVG(points) as avg_points
          FROM manager_gw_history
          WHERE league_id = $1 AND event <= $2
          GROUP BY entry_id
        `, [leagueId, lastGW]);

        const seasonAvgs: Record<number, number> = {};
        seasonAvgsResult.rows.forEach((row: any) => {
          seasonAvgs[row.entry_id] = parseFloat(row.avg_points);
        });

        // Get chip usage for that GW
        const chipsResult = await db.query(`
          SELECT entry_id
          FROM manager_chips
          WHERE league_id = $1 AND event = $2
        `, [leagueId, lastGW]);

        const chipsPlayed = new Set<number>();
        chipsResult.rows.forEach((row: any) => {
          chipsPlayed.add(row.entry_id);
        });

        // Get other teams' points (excluding you and opponent)
        const otherTeamsPointsForYou = Object.entries(allGWPoints)
          .filter(([id]) => parseInt(id) !== myId)
          .map(([, pts]) => Number(pts));

        const otherTeamsPointsForThem = Object.entries(allGWPoints)
          .filter(([id]) => parseInt(id) !== targetEntryId)
          .map(([, pts]) => Number(pts));

        // Determine results
        const yourResult: 'win' | 'draw' | 'loss' =
          lastMeeting.margin > 0 ? 'win' : lastMeeting.margin < 0 ? 'loss' : 'draw';
        const theirResult: 'win' | 'draw' | 'loss' =
          lastMeeting.margin < 0 ? 'win' : lastMeeting.margin > 0 ? 'loss' : 'draw';

        // Get season averages
        const yourSeasonAvg = seasonAvgs[myId] || lastMeeting.your_score;
        const theirSeasonAvg = seasonAvgs[targetEntryId] || lastMeeting.their_score;

        // Check chip usage
        const yourPlayedChip = chipsPlayed.has(myId);
        const theirPlayedChip = chipsPlayed.has(targetEntryId);

        // K-163a Part 2: Calculate luck using 3-component formula
        const yourLuck = calculateGWLuck(
          lastMeeting.your_score, otherTeamsPointsForYou,
          yourSeasonAvg, theirSeasonAvg, lastMeeting.their_score, theirPlayedChip,
          yourResult
        );
        const theirLuck = calculateGWLuck(
          lastMeeting.their_score, otherTeamsPointsForThem,
          theirSeasonAvg, yourSeasonAvg, lastMeeting.your_score, yourPlayedChip,
          theirResult
        );

        lastMeetingLuck = {
          your_luck: Math.round(yourLuck),
          their_luck: Math.round(theirLuck),
          gw: lastGW
        };
      } catch (error) {
        console.error('[K-163a] Error calculating H2H luck:', error);
        // Non-critical, continue without luck data
      }
    }

    return NextResponse.json({
      opponent_id: opponent.entry_id,
      opponent_name: opponent.player_name,
      opponent_team: opponent.team_name,
      opponent_rank: opponentRank,
      recent_form: recentForm,
      your_stats: myStats,
      chips_remaining: chipsRemaining,
      momentum,
      head_to_head: headToHead,
      last_meeting_luck: lastMeetingLuck, // K-163: Add luck data
      free_transfers: freeTransfers
    });
  } catch (error: any) {
    console.error('Error fetching opponent insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
