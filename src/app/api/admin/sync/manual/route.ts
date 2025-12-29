import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { syncGameweekForLeague } from '@/lib/forceSyncGW';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for sync operations

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leagueIds, gameweeks, force } = body;

    // Validation
    if (!force) {
      return NextResponse.json(
        { error: 'force: true is required to confirm sync operation' },
        { status: 400 }
      );
    }

    if (!gameweeks || !Array.isArray(gameweeks) || gameweeks.length === 0) {
      return NextResponse.json(
        { error: 'gameweeks array is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Resolve league IDs
    let targetLeagueIds: number[] = [];

    if (leagueIds === 'all') {
      const result = await db.query('SELECT id FROM leagues ORDER BY id');
      targetLeagueIds = result.rows.map((r: any) => r.id);
    } else if (Array.isArray(leagueIds)) {
      targetLeagueIds = leagueIds.map((id: any) => parseInt(id));
    } else {
      return NextResponse.json(
        { error: 'leagueIds must be an array or "all"' },
        { status: 400 }
      );
    }

    console.log(`[K-146] Manual sync: ${targetLeagueIds.length} league(s), GWs: ${gameweeks.join(', ')}`);

    // Build task list
    const tasks: Array<{ leagueId: number; gw: number }> = [];
    for (const leagueId of targetLeagueIds) {
      for (const gw of gameweeks) {
        tasks.push({ leagueId, gw: parseInt(gw) });
      }
    }

    console.log(`[K-146] Total tasks: ${tasks.length}`);

    // Execute syncs
    const results: any[] = [];

    for (const task of tasks) {
      const startTime = Date.now();

      try {
        console.log(`[K-146] Syncing league ${task.leagueId} GW${task.gw}...`);

        const result = await syncGameweekForLeague(task.leagueId, task.gw);

        results.push({
          leagueId: task.leagueId,
          gw: task.gw,
          status: 'success',
          managers: result.managersCount,
          players: result.playersCount,
          duration: Date.now() - startTime
        });

        console.log(`[K-146] ✓ League ${task.leagueId} GW${task.gw} complete (${Date.now() - startTime}ms)`);

      } catch (error: any) {
        console.error(`[K-146] ✗ League ${task.leagueId} GW${task.gw} failed:`, error);

        results.push({
          leagueId: task.leagueId,
          gw: task.gw,
          status: 'error',
          error: error.message,
          duration: Date.now() - startTime
        });
      }

      // Delay between syncs to avoid hammering FPL API
      if (tasks.indexOf(task) < tasks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const successCount = results.filter(r => r.status === 'success').length;

    console.log(`[K-146] Manual sync complete: ${successCount}/${tasks.length} successful (${totalDuration}ms total)`);

    return NextResponse.json({
      status: 'complete',
      results,
      summary: {
        total: tasks.length,
        success: successCount,
        failed: tasks.length - successCount,
        totalDuration
      }
    });

  } catch (error: any) {
    console.error('[K-146] Manual sync error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
