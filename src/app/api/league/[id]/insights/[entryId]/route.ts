import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { fplApi } from '@/lib/fpl-api';

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
      last_5_results: last5.map((m: any) => m.result),
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
      console.log('Could not fetch opponent chip data:', error);
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
      console.log('Could not fetch my chip data:', error);
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

    // Fetch Free Transfers data from FPL API
    let freeTransfers: number | undefined = undefined;
    try {
      const historyData = await fplApi.getEntryHistory(targetEntryId);
      if (historyData && historyData.current && historyData.current.length > 0) {
        // Get the most recent completed gameweek
        const lastGW = historyData.current[historyData.current.length - 1];

        // Calculate FT for next gameweek
        // Logic:
        // - Start each GW with 1 FT
        // - If previous GW had 0 transfers and 1+ FT available, bank it (max 2 FT)
        // - If chip was used (wildcard, freehit), FT resets based on chip type

        const lastGWTransfers = lastGW.event_transfers || 0;
        const lastGWTransferCost = lastGW.event_transfers_cost || 0;

        // Calculate how many FT they had last week
        // If transfer_cost is 0, they used their FT(s)
        // If transfer_cost > 0, they took hits (4 points per extra transfer)
        let lastWeekFT = 1; // Default assumption
        if (lastGWTransferCost === 0 && lastGWTransfers === 0) {
          lastWeekFT = 1; // Had 1 FT, didn't use it
        }

        // Calculate current FT
        // If they made 0 transfers last week, they bank the FT (max 2)
        if (lastGWTransfers === 0) {
          freeTransfers = Math.min(2, lastWeekFT + 1);
        } else {
          // They made transfers, so they start fresh with 1 FT
          freeTransfers = 1;
        }

        // Note: This is a simplified calculation and may not account for all edge cases
        // like wildcards or free hits which reset the FT count
      }
    } catch (error) {
      console.log('Could not fetch free transfers data:', error);
      // FT data not critical, continue without it
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
