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
      SELECT sync_status FROM leagues WHERE id = $1
    `, [leagueId]);

    const currentStatus = result.rows[0]?.sync_status;

    // Don't start new sync if already syncing
    if (currentStatus === 'syncing') {
      return NextResponse.json({
        status: 'syncing',
        message: 'Sync already in progress'
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
      SELECT sync_status, last_synced FROM leagues WHERE id = $1
    `, [leagueId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        status: 'pending',
        lastSynced: null
      });
    }

    const { sync_status, last_synced } = result.rows[0];

    return NextResponse.json({
      status: sync_status || 'pending',
      lastSynced: last_synced
    });

  } catch (error) {
    console.error('[API] Sync status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    );
  }
}
