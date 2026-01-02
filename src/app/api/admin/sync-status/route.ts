/**
 * K-165b: Admin Sync Status Visibility Endpoint
 *
 * Provides visibility into sync status for all leagues/gameweeks.
 * Shows pending, in-progress, completed, and failed syncs.
 *
 * Access: /api/admin/sync-status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getFailedSyncs, getPendingSyncs, resetStuckSyncs } from '@/lib/syncManager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // reset_stuck, retry_failed

    // Handle actions
    if (action === 'reset_stuck') {
      const resetCount = await resetStuckSyncs(10);
      return NextResponse.json({
        success: true,
        message: `Reset ${resetCount} stuck syncs`,
        reset_count: resetCount
      });
    }

    // Get all sync statuses grouped by status
    const statusesResult = await db.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM league_gw_sync
      GROUP BY status
      ORDER BY status
    `);

    const statusCounts = statusesResult.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);

    // Get recent syncs (all statuses)
    const recentResult = await db.query(`
      SELECT
        league_id,
        gameweek,
        status,
        started_at,
        completed_at,
        error_message,
        retry_count,
        created_at,
        updated_at
      FROM league_gw_sync
      ORDER BY updated_at DESC
      LIMIT 50
    `);

    // Get failed syncs
    const failed = await getFailedSyncs();

    // Get pending syncs
    const pending = await getPendingSyncs();

    // Get stuck syncs (in_progress for >10 minutes)
    const stuckResult = await db.query(`
      SELECT
        league_id,
        gameweek,
        started_at,
        EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_stuck
      FROM league_gw_sync
      WHERE status = 'in_progress'
        AND started_at < NOW() - INTERVAL '10 minutes'
      ORDER BY started_at ASC
    `);

    // Get sync success rate by league
    const leagueStatsResult = await db.query(`
      SELECT
        league_id,
        COUNT(*) as total_syncs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        MAX(updated_at) as last_sync
      FROM league_gw_sync
      GROUP BY league_id
      ORDER BY league_id
    `);

    const response = {
      summary: {
        total_records: statusCounts.pending + statusCounts.in_progress + statusCounts.completed + statusCounts.failed || 0,
        by_status: {
          pending: statusCounts.pending || 0,
          in_progress: statusCounts.in_progress || 0,
          completed: statusCounts.completed || 0,
          failed: statusCounts.failed || 0
        },
        stuck_syncs: stuckResult.rows.length
      },
      stuck: stuckResult.rows,
      failed: failed,
      pending: pending,
      recent: recentResult.rows,
      league_stats: leagueStatsResult.rows.map(row => ({
        league_id: row.league_id,
        total_syncs: parseInt(row.total_syncs),
        completed: parseInt(row.completed),
        failed: parseInt(row.failed),
        in_progress: parseInt(row.in_progress),
        pending: parseInt(row.pending),
        success_rate: row.total_syncs > 0
          ? Math.round((parseInt(row.completed) / parseInt(row.total_syncs)) * 100)
          : 0,
        last_sync: row.last_sync
      }))
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[K-165b Admin] Error fetching sync status:', errorMsg);

    return NextResponse.json({
      success: false,
      error: errorMsg
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/sync-status
 * Trigger actions like resetting stuck syncs or retrying failed syncs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, league_id, gameweek } = body;

    if (action === 'reset_stuck') {
      const resetCount = await resetStuckSyncs(10);
      return NextResponse.json({
        success: true,
        message: `Reset ${resetCount} stuck syncs`,
        reset_count: resetCount
      });
    }

    if (action === 'reset_specific' && league_id && gameweek) {
      const db = await getDatabase();
      await db.query(`
        UPDATE league_gw_sync
        SET status = 'pending', updated_at = NOW()
        WHERE league_id = $1 AND gameweek = $2
      `, [league_id, gameweek]);

      return NextResponse.json({
        success: true,
        message: `Reset sync for league ${league_id} GW${gameweek} to pending`
      });
    }

    if (action === 'mark_completed' && league_id && gameweek) {
      const db = await getDatabase();
      await db.query(`
        UPDATE league_gw_sync
        SET status = 'completed', completed_at = NOW(), updated_at = NOW(), error_message = NULL
        WHERE league_id = $1 AND gameweek = $2
      `, [league_id, gameweek]);

      return NextResponse.json({
        success: true,
        message: `Marked league ${league_id} GW${gameweek} as completed`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing parameters'
    }, { status: 400 });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[K-165b Admin] Error processing action:', errorMsg);

    return NextResponse.json({
      success: false,
      error: errorMsg
    }, { status: 500 });
  }
}
