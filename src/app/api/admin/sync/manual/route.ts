import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { syncGameweekForLeague } from '@/lib/forceSyncGW';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // K-154: Increased to 10 minutes for all leagues batch sync (69 leagues × ~5s each = ~6min)

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

    console.log(`[K-146/K-154] Manual sync: ${targetLeagueIds.length} league(s), GWs: ${gameweeks.join(', ')}`);

    // Build task list
    const tasks: Array<{ leagueId: number; gw: number }> = [];
    for (const leagueId of targetLeagueIds) {
      for (const gw of gameweeks) {
        tasks.push({ leagueId, gw: parseInt(gw) });
      }
    }

    console.log(`[K-146/K-154] Total tasks: ${tasks.length}`);

    // Execute syncs
    const results: any[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const startTime = Date.now();
      const progress = `${i + 1}/${tasks.length}`;

      try {
        console.log(`[K-154] ${progress}: Starting league ${task.leagueId} GW${task.gw}...`);

        const result = await syncGameweekForLeague(task.leagueId, task.gw);

        results.push({
          leagueId: task.leagueId,
          gw: task.gw,
          status: 'success',
          managers: result.managersCount,
          players: result.playersCount,
          duration: Date.now() - startTime
        });

        successCount++;
        console.log(`[K-154] ${progress}: ✓ League ${task.leagueId} GW${task.gw} - ${result.managersCount}m, ${result.playersCount}p (${Date.now() - startTime}ms)`);

      } catch (error: any) {
        failCount++;
        console.error(`[K-154] ${progress}: ✗ League ${task.leagueId} GW${task.gw} FAILED:`, error.message);
        console.error(`[K-154] ${progress}: Error stack:`, error.stack);

        results.push({
          leagueId: task.leagueId,
          gw: task.gw,
          status: 'error',
          error: error.message,
          duration: Date.now() - startTime
        });
      }

      // K-154: Delay between syncs to avoid FPL API rate limiting
      if (i < tasks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[K-154] ═══════════════════════════════════════════════════════`);
    console.log(`[K-154] Batch sync complete: ${successCount} success, ${failCount} failed out of ${tasks.length} total`);
    console.log(`[K-154] ═══════════════════════════════════════════════════════`);

    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    return NextResponse.json({
      status: 'complete',
      results,
      summary: {
        total: tasks.length,
        success: successCount,
        failed: failCount,
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
