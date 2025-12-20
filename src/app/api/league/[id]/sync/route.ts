import { NextRequest, NextResponse } from 'next/server';
import { syncLeagueData } from '@/lib/leagueSync';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    // Check for force parameter in query string
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    console.log(`[API] Manual sync requested for league ${leagueId}${force ? ' (force clear)' : ''}`);

    // Get current sync status
    const db = await getDatabase();
    const result = await db.query(`
      SELECT
        sync_status,
        last_synced,
        EXTRACT(EPOCH FROM (NOW() - last_synced))/60 as minutes_since_sync
      FROM leagues WHERE id = $1
    `, [leagueId]);

    const league = result.rows[0];
    const currentStatus = league?.sync_status;
    const minutesSinceSync = league?.minutes_since_sync || 0;

    // Auto-reset stuck syncs (> 10 minutes = likely crashed)
    const SYNC_TIMEOUT_MINUTES = 10;

    if (currentStatus === 'syncing' && minutesSinceSync > SYNC_TIMEOUT_MINUTES) {
      console.log(`[API] League ${leagueId} was stuck in 'syncing' for ${minutesSinceSync.toFixed(1)} minutes. Auto-resetting.`);

      await db.query(`
        UPDATE leagues
        SET sync_status = 'failed',
            last_sync_error = $2
        WHERE id = $1
      `, [leagueId, `Auto-reset: sync stuck for ${minutesSinceSync.toFixed(1)} minutes`]);
    } else if (currentStatus === 'syncing') {
      // Sync is running and recent - don't interfere
      return NextResponse.json({
        status: 'syncing',
        message: 'Sync already in progress',
        minutesSinceSync: minutesSinceSync.toFixed(1)
      });
    }

    // Trigger sync in background (with force clear if requested)
    syncLeagueData(leagueId, force).catch(err => {
      console.error(`[API] Sync failed for league ${leagueId}:`, err);
    });

    return NextResponse.json({
      status: 'started',
      message: force
        ? 'Force sync started. Clearing old data and re-syncing. This will take 30-60 seconds.'
        : 'Sync started. This will take 30-60 seconds.'
    });

  } catch (error) {
    console.error('[API] Sync endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to start sync' },
      { status: 500 }
    );
  }
}

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
    const result = await db.query(`
      SELECT
        sync_status,
        last_synced,
        last_sync_error,
        EXTRACT(EPOCH FROM (NOW() - last_synced))/60 as minutes_since_sync
      FROM leagues WHERE id = $1
    `, [leagueId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        status: 'pending',
        lastSynced: null
      });
    }

    const { sync_status, last_synced, last_sync_error, minutes_since_sync } = result.rows[0];

    return NextResponse.json({
      status: sync_status || 'pending',
      lastSynced: last_synced,
      lastSyncError: last_sync_error,
      minutesSinceSync: minutes_since_sync ? parseFloat(minutes_since_sync).toFixed(1) : null
    });

  } catch (error) {
    console.error('[API] Sync status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    );
  }
}
