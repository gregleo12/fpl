import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const teamId = params.teamId;
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get GW history (for rank and points modals)
    const historyResult = await db.query(`
      SELECT
        event,
        points,
        overall_rank,
        rank as gw_rank,
        event_transfers_cost
      FROM manager_gw_history
      WHERE entry_id = $1 AND league_id = $2
      ORDER BY event ASC
    `, [teamId, leagueId]);

    // Get transfers (for transfers modal)
    const transfersResult = await db.query(`
      SELECT
        event,
        element_in,
        element_out,
        element_in_cost,
        element_out_cost,
        time
      FROM manager_transfers
      WHERE entry_id = $1
      ORDER BY event DESC, time DESC
    `, [teamId]);

    return NextResponse.json({
      history: historyResult.rows,
      transfers: transfersResult.rows,
    });
  } catch (error: any) {
    console.error('[Team History API] Error:', error);
    // Return empty arrays instead of error to allow UI to function
    return NextResponse.json({
      history: [],
      transfers: [],
    });
  }
}
