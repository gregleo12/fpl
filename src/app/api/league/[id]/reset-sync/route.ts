import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Manual Reset Sync Status Endpoint
 * POST /api/league/[id]/reset-sync
 *
 * Allows users to manually reset a stuck sync status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get current sync status
    const result = await db.query(`
      SELECT
        sync_status,
        last_synced,
        EXTRACT(EPOCH FROM (NOW() - last_synced))/60 as minutes_since_sync
      FROM leagues WHERE id = $1
    `, [leagueId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    const league = result.rows[0];
    const minutesSinceSync = league.minutes_since_sync || 0;

    // Only allow reset if sync is stuck (>5 minutes)
    if (league.sync_status === 'syncing' && minutesSinceSync < 5) {
      return NextResponse.json({
        error: 'Sync is currently active. Wait at least 5 minutes before forcing reset.',
        minutesSinceSync: minutesSinceSync.toFixed(1)
      }, { status: 400 });
    }

    // Reset sync status
    await db.query(`
      UPDATE leagues
      SET sync_status = 'failed',
          last_sync_error = $2
      WHERE id = $1
    `, [leagueId, `Manual reset by user at ${new Date().toISOString()}`]);

    console.log(`[Reset] League ${leagueId} sync status manually reset by user`);

    return NextResponse.json({
      success: true,
      message: 'Sync status reset successfully. You can now trigger a new sync.',
      previousStatus: league.sync_status
    });

  } catch (error: any) {
    console.error('[Reset] Error resetting sync status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset sync status' },
      { status: 500 }
    );
  }
}
