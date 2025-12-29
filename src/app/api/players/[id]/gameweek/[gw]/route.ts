import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { syncPlayerHistory } from '@/lib/sync/playerSync';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; gw: string } }
) {
  try {
    const playerId = parseInt(params.id);
    const gameweek = parseInt(params.gw);

    if (isNaN(playerId) || isNaN(gameweek)) {
      return NextResponse.json(
        { error: 'Invalid player ID or gameweek' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Try to get stats
    const result = await db.query(`
      SELECT * FROM player_gameweek_stats
      WHERE player_id = $1 AND gameweek = $2
    `, [playerId, gameweek]);

    if (result.rows.length === 0) {

      // Try to sync this player's history
      await syncPlayerHistory(playerId);

      // Try again
      const retryResult = await db.query(`
        SELECT * FROM player_gameweek_stats
        WHERE player_id = $1 AND gameweek = $2
      `, [playerId, gameweek]);

      if (retryResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Stats not found for this gameweek' },
          { status: 404 }
        );
      }

      return NextResponse.json(retryResult.rows[0]);
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching player gameweek stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gameweek stats' },
      { status: 500 }
    );
  }
}
