import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { syncPlayerHistory } from '@/lib/sync/playerSync';

// Helper function to determine result from gameweek data
function getResult(h: any): string {
  if (h.team_goals === null || h.opponent_goals === null) return '-';
  if (h.team_goals > h.opponent_goals) return 'W';
  if (h.team_goals < h.opponent_goals) return 'L';
  return 'D';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playerId = parseInt(params.id);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get player
    const playerResult = await db.query(
      'SELECT * FROM players WHERE id = $1',
      [playerId]
    );

    if (playerResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    const player = playerResult.rows[0];

    // Get history (sync if empty)
    let historyResult = await db.query(`
      SELECT * FROM player_gameweek_stats
      WHERE player_id = $1
      ORDER BY gameweek DESC
    `, [playerId]);

    // If no history, sync it
    if (historyResult.rows.length === 0) {
      console.log(`[Player Detail] No history found for player ${playerId}, syncing...`);
      await syncPlayerHistory(playerId);
      historyResult = await db.query(`
        SELECT * FROM player_gameweek_stats
        WHERE player_id = $1
        ORDER BY gameweek DESC
      `, [playerId]);
    }

    const history = historyResult.rows;

    // Calculate per 90 stats
    const totalMinutes = player.minutes || 0;
    const per90Divisor = totalMinutes / 90;

    const per90 = per90Divisor > 0 ? {
      goals_scored: parseFloat((player.goals_scored / per90Divisor).toFixed(2)),
      assists: parseFloat((player.assists / per90Divisor).toFixed(2)),
      expected_goals: parseFloat((parseFloat(player.expected_goals) / per90Divisor).toFixed(2)),
      expected_assists: parseFloat((parseFloat(player.expected_assists) / per90Divisor).toFixed(2)),
      expected_goal_involvements: parseFloat((parseFloat(player.expected_goal_involvements) / per90Divisor).toFixed(2)),
      clean_sheets: parseFloat((player.clean_sheets / per90Divisor).toFixed(2)),
      goals_conceded: parseFloat((player.goals_conceded / per90Divisor).toFixed(2)),
      bps: parseFloat((player.bps / per90Divisor).toFixed(1))
    } : null;

    // Fetch past seasons from FPL API (server-side to avoid CORS)
    let pastSeasons = [];
    try {
      const fplResponse = await fetch(
        `https://fantasy.premierleague.com/api/element-summary/${playerId}/`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        }
      );
      if (fplResponse.ok) {
        const fplData = await fplResponse.json();
        pastSeasons = fplData.history_past || [];
      }
    } catch (error) {
      console.error('[Player Detail] Error fetching past seasons:', error);
      // Continue without past seasons
    }

    return NextResponse.json({
      player: {
        ...player,
        price: `£${(player.now_cost / 10).toFixed(1)}m`
      },
      history: history.map((h: any) => ({
        ...h,
        result: getResult(h)
      })),
      pastSeasons,
      totals: {
        points: player.total_points,
        minutes: player.minutes,
        goals_scored: player.goals_scored,
        assists: player.assists,
        clean_sheets: player.clean_sheets,
        goals_conceded: player.goals_conceded,
        expected_goals: parseFloat(player.expected_goals),
        expected_assists: parseFloat(player.expected_assists),
        expected_goal_involvements: parseFloat(player.expected_goal_involvements),
        bonus: player.bonus,
        bps: player.bps
      },
      per90
    });

  } catch (error) {
    console.error('Error fetching player detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player detail' },
      { status: 500 }
    );
  }
}
