import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { detectFPLError } from '@/lib/fpl-errors';

export const dynamic = 'force-dynamic';

/**
 * K-131: Auto-Sync on New Gameweek
 *
 * Checks if league needs sync by comparing current GW from FPL API
 * with last synced GW in database.
 *
 * GET /api/league/[id]/sync-status
 */
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

    // Get current GW from FPL API
    let currentGW = 0;
    let fplError = null;
    try {
      const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (!response.ok) {
        const error = new Error('FPL API unavailable');
        (error as any).status = response.status;
        throw error;
      }
      const bootstrapData = await response.json();
      const currentEvent = bootstrapData.events.find((e: any) => e.is_current);
      currentGW = currentEvent?.id || 0;
    } catch (error: any) {
      console.error('[K-131] Error fetching current GW from FPL API:', error);
      fplError = detectFPLError(error, error.status);
      // Continue with database check even if FPL API fails
    }

    // Get last synced GW from database (from manager_gw_history)
    const gwResult = await db.query(`
      SELECT MAX(event) as last_gw
      FROM manager_gw_history mgh
      WHERE EXISTS (
        SELECT 1 FROM league_standings ls
        WHERE ls.league_id = $1 AND ls.entry_id = mgh.entry_id
      )
    `, [leagueId]);

    const lastSyncedGW = gwResult.rows[0]?.last_gw || 0;

    // Get league sync status
    const leagueResult = await db.query(`
      SELECT
        sync_status,
        last_synced,
        last_sync_error,
        EXTRACT(EPOCH FROM (NOW() - last_synced))/60 as minutes_since_sync
      FROM leagues
      WHERE id = $1
    `, [leagueId]);

    const league = leagueResult.rows[0];
    const syncStatus = league?.sync_status || 'pending';
    const lastSynced = league?.last_synced;
    const lastSyncError = league?.last_sync_error;
    const minutesSinceSync = league?.minutes_since_sync ? parseFloat(league.minutes_since_sync) : null;

    // Check if sync is stuck (> 10 minutes)
    const isStuck = syncStatus === 'syncing' && minutesSinceSync && minutesSinceSync > 10;

    // Determine if sync is needed
    // Need sync if: current GW > last synced GW AND not currently syncing (unless stuck)
    const needsSync = currentGW > 0 && currentGW > lastSyncedGW && (syncStatus !== 'syncing' || isStuck);

    return NextResponse.json({
      currentGW,
      lastSyncedGW,
      needsSync,
      syncStatus,
      lastSynced,
      lastSyncError,
      minutesSinceSync: minutesSinceSync?.toFixed(1) || null,
      isStuck,
      fplApiError: fplError, // Include FPL API error if it occurred
    });

  } catch (error: any) {
    console.error('[K-131] Error checking sync status:', error);
    const fplError = detectFPLError(error, error.response?.status || error.status);
    return NextResponse.json(
      { error: fplError },
      { status: 500 }
    );
  }
}
