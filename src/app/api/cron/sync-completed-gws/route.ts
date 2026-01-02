/**
 * K-165b: Cron Endpoint for Auto-Syncing Completed Gameweeks
 *
 * This endpoint is called by Railway cron every 2 hours to:
 * 1. Scan all tracked leagues
 * 2. Identify completed GWs that need syncing
 * 3. Trigger sync with retry logic
 *
 * Railway cron configuration:
 * Schedule: 0 star-slash-2 star star star (every 2 hours)
 * Command: curl https://rivalfpl.com/api/cron/sync-completed-gws
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { syncLeagueGWWithRetry, resetStuckSyncs, getSyncStatus } from '@/lib/syncManager';
import { checkDatabaseHasGWData } from '@/lib/k142-auto-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

const SYNC_BUFFER_HOURS = 10;

/**
 * Get finish time of a gameweek (last fixture kickoff + 2.5 hours)
 */
async function getGWFinishTime(gw: number): Promise<number> {
  try {
    const fixturesResponse = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`);
    if (!fixturesResponse.ok) {
      return Date.now();
    }

    const fixtures = await fixturesResponse.json();
    const allFinished = fixtures.every((f: any) => f.finished);
    if (!allFinished) {
      return Date.now();
    }

    const kickoffTimes = fixtures
      .map((f: any) => new Date(f.kickoff_time).getTime())
      .filter((time: number) => !isNaN(time));

    if (kickoffTimes.length === 0) {
      return Date.now();
    }

    const lastKickoff = Math.max(...kickoffTimes);
    return lastKickoff + (2.5 * 60 * 60 * 1000);
  } catch (error) {
    console.error(`[K-165b] Error getting GW${gw} finish time:`, error);
    return Date.now();
  }
}

/**
 * Check if safety buffer has passed for a GW
 */
async function checkSafetyBuffer(gw: number): Promise<boolean> {
  const gwFinishTime = await getGWFinishTime(gw);
  const hoursSinceFinished = (Date.now() - gwFinishTime) / (1000 * 60 * 60);
  return hoursSinceFinished >= SYNC_BUFFER_HOURS;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[K-165b] Cron job started:', new Date().toISOString());

  try {
    // 1. Reset any stuck syncs first
    console.log('[K-165b] Checking for stuck syncs...');
    const resetCount = await resetStuckSyncs(10); // Reset syncs stuck >10 minutes
    if (resetCount > 0) {
      console.log(`[K-165b] Reset ${resetCount} stuck syncs`);
    }

    // 2. Get all tracked leagues
    const db = await getDatabase();
    const leaguesResult = await db.query(`
      SELECT DISTINCT league_id
      FROM league_standings
      ORDER BY league_id
    `);

    const leagues = leaguesResult.rows.map(row => row.league_id);
    console.log(`[K-165b] Found ${leagues.length} tracked leagues`);

    // 3. Get current gameweek status from FPL API
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!bootstrapResponse.ok) {
      throw new Error('Failed to fetch FPL bootstrap data');
    }

    const bootstrap = await bootstrapResponse.json();
    const finishedGWs = bootstrap.events
      .filter((e: any) => e.finished)
      .map((e: any) => e.id);

    console.log(`[K-165b] Found ${finishedGWs.length} finished gameweeks: ${finishedGWs.join(', ')}`);

    // 4. For each league, check which GWs need syncing
    const syncResults: Array<{
      league_id: number;
      gameweek: number;
      status: 'skipped' | 'synced' | 'failed';
      reason?: string;
      error?: string;
    }> = [];

    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const leagueId of leagues) {
      for (const gw of finishedGWs) {
        try {
          // Check if buffer has passed
          const bufferPassed = await checkSafetyBuffer(gw);
          if (!bufferPassed) {
            console.log(`[K-165b] Skipping league ${leagueId} GW${gw} - safety buffer not passed`);
            syncResults.push({
              league_id: leagueId,
              gameweek: gw,
              status: 'skipped',
              reason: 'Safety buffer not passed'
            });
            skipped++;
            continue;
          }

          // Check current sync status
          const syncStatus = await getSyncStatus(leagueId, gw);

          // Skip if already completed
          if (syncStatus.status === 'completed') {
            console.log(`[K-165b] Skipping league ${leagueId} GW${gw} - already completed`);
            syncResults.push({
              league_id: leagueId,
              gameweek: gw,
              status: 'skipped',
              reason: 'Already synced'
            });
            skipped++;
            continue;
          }

          // Skip if currently in progress (another process might be syncing)
          if (syncStatus.status === 'in_progress') {
            console.log(`[K-165b] Skipping league ${leagueId} GW${gw} - sync in progress`);
            syncResults.push({
              league_id: leagueId,
              gameweek: gw,
              status: 'skipped',
              reason: 'Sync in progress'
            });
            skipped++;
            continue;
          }

          // Check if database already has valid data (might have been synced outside K-165b)
          const hasValidData = await checkDatabaseHasGWData(leagueId, gw);
          if (hasValidData) {
            console.log(`[K-165b] Skipping league ${leagueId} GW${gw} - database already has valid data`);
            // Mark as completed in tracking table
            await db.query(`
              INSERT INTO league_gw_sync (league_id, gameweek, status, completed_at, updated_at)
              VALUES ($1, $2, 'completed', NOW(), NOW())
              ON CONFLICT (league_id, gameweek) DO UPDATE SET
                status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            `, [leagueId, gw]);
            syncResults.push({
              league_id: leagueId,
              gameweek: gw,
              status: 'skipped',
              reason: 'Valid data already exists'
            });
            skipped++;
            continue;
          }

          // Needs syncing!
          console.log(`[K-165b] 🔄 Syncing league ${leagueId} GW${gw}...`);
          const result = await syncLeagueGWWithRetry(leagueId, gw);

          if (result.success) {
            console.log(`[K-165b] ✅ Successfully synced league ${leagueId} GW${gw}`);
            syncResults.push({
              league_id: leagueId,
              gameweek: gw,
              status: 'synced'
            });
            synced++;
          } else {
            console.error(`[K-165b] ❌ Failed to sync league ${leagueId} GW${gw}: ${result.error}`);
            syncResults.push({
              league_id: leagueId,
              gameweek: gw,
              status: 'failed',
              error: result.error
            });
            failed++;
          }

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[K-165b] ❌ Error processing league ${leagueId} GW${gw}:`, errorMsg);
          syncResults.push({
            league_id: leagueId,
            gameweek: gw,
            status: 'failed',
            error: errorMsg
          });
          failed++;
        }
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      stats: {
        leagues_checked: leagues.length,
        gameweeks_checked: finishedGWs.length,
        synced,
        skipped,
        failed,
        stuck_syncs_reset: resetCount
      },
      results: syncResults
    };

    console.log('[K-165b] Cron job completed:', summary.stats);

    return NextResponse.json(summary, { status: 200 });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[K-165b] ❌ Cron job failed:', errorMsg);

    return NextResponse.json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime
    }, { status: 500 });
  }
}
