import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

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

    // Calculate chips remaining
    const allChips = ['wildcard', 'bboost', '3xc', 'freehit'];
    const opponentChipsUsed = opponentMatches
      .filter((m: any) => m.chip_used)
      .map((m: any) => m.chip_used);
    const opponentChipsRemaining = allChips.filter(chip => !opponentChipsUsed.includes(chip));

    // Get my chips used
    const myChipsResult = await db.query(`
      SELECT
        CASE
          WHEN entry_1_id = $1 THEN active_chip_1
          ELSE active_chip_2
        END as chip_used
      FROM h2h_matches
      WHERE league_id = $2
        AND (entry_1_id = $1 OR entry_2_id = $1)
        AND (
          (entry_1_id = $1 AND active_chip_1 IS NOT NULL) OR
          (entry_2_id = $1 AND active_chip_2 IS NOT NULL)
        )
    `, [myId, leagueId]);

    const myChipsUsed = myChipsResult.rows.map((r: any) => r.chip_used);
    const myChipsRemaining = allChips.filter(chip => !myChipsUsed.includes(chip));

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

    return NextResponse.json({
      opponent_id: opponent.entry_id,
      opponent_name: opponent.player_name,
      opponent_team: opponent.team_name,
      opponent_rank: opponentRank,
      recent_form: recentForm,
      your_stats: myStats,
      chips_remaining: chipsRemaining,
      momentum,
      head_to_head: headToHead
    });
  } catch (error: any) {
    console.error('Error fetching opponent insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
