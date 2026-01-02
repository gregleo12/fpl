/**
 * K-165b: Sync Manager with Retry Logic
 *
 * Wraps K-142 sync functions with:
 * - Retry logic (max 3 attempts with exponential backoff)
 * - Status tracking in league_gw_sync table
 * - Error recording for observability
 */

import { getDatabase } from '@/lib/db';
import { syncCompletedGW } from '@/lib/k142-auto-sync';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2 seconds

/**
 * Sleep helper for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Update sync status in league_gw_sync table
 */
async function updateSyncStatus(
  leagueId: number,
  gameweek: number,
  status: 'pending' | 'in_progress' | 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const db = await getDatabase();

  const now = new Date();

  if (status === 'in_progress') {
    // Starting sync
    await db.query(`
      INSERT INTO league_gw_sync (league_id, gameweek, status, started_at, updated_at)
      VALUES ($1, $2, $3, $4, $4)
      ON CONFLICT (league_id, gameweek) DO UPDATE SET
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        updated_at = EXCLUDED.updated_at
    `, [leagueId, gameweek, status, now]);
  } else if (status === 'completed') {
    // Sync succeeded
    await db.query(`
      UPDATE league_gw_sync
      SET status = $3, completed_at = $4, updated_at = $4, error_message = NULL
      WHERE league_id = $1 AND gameweek = $2
    `, [leagueId, gameweek, status, now]);
  } else if (status === 'failed') {
    // Sync failed after all retries
    await db.query(`
      UPDATE league_gw_sync
      SET status = $3, error_message = $4, updated_at = $5
      WHERE league_id = $1 AND gameweek = $2
    `, [leagueId, gameweek, status, errorMessage, now]);
  }
}

/**
 * Increment retry count for a sync attempt
 */
async function incrementRetryCount(leagueId: number, gameweek: number): Promise<number> {
  const db = await getDatabase();

  const result = await db.query(`
    UPDATE league_gw_sync
    SET retry_count = retry_count + 1, updated_at = NOW()
    WHERE league_id = $1 AND gameweek = $2
    RETURNING retry_count
  `, [leagueId, gameweek]);

  return result.rows[0]?.retry_count || 0;
}

/**
 * Get current sync status for a league/gameweek
 */
export async function getSyncStatus(leagueId: number, gameweek: number): Promise<{
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'not_started';
  retry_count: number;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
}> {
  const db = await getDatabase();

  const result = await db.query(`
    SELECT status, retry_count, started_at, completed_at, error_message
    FROM league_gw_sync
    WHERE league_id = $1 AND gameweek = $2
  `, [leagueId, gameweek]);

  if (result.rows.length === 0) {
    return {
      status: 'not_started',
      retry_count: 0,
      started_at: null,
      completed_at: null,
      error_message: null
    };
  }

  return result.rows[0];
}

/**
 * Sync a league/gameweek with retry logic
 *
 * @param leagueId - League to sync
 * @param gameweek - Gameweek to sync
 * @returns Promise that resolves when sync completes or fails after all retries
 */
export async function syncLeagueGWWithRetry(
  leagueId: number,
  gameweek: number
): Promise<{ success: boolean; error?: string }> {
  console.log(`[K-165b] Starting sync for league ${leagueId} GW${gameweek}`);

  try {
    // Mark as in_progress
    await updateSyncStatus(leagueId, gameweek, 'in_progress');

    // Attempt sync with retries
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[K-165b] Sync attempt ${attempt}/${MAX_RETRIES} for league ${leagueId} GW${gameweek}`);

        // Call existing K-142 sync function
        await syncCompletedGW(leagueId, gameweek);

        // Success! Mark as completed
        console.log(`[K-165b] ✅ Sync completed for league ${leagueId} GW${gameweek}`);
        await updateSyncStatus(leagueId, gameweek, 'completed');

        return { success: true };

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[K-165b] ❌ Sync attempt ${attempt} failed for league ${leagueId} GW${gameweek}:`, errorMsg);

        // Increment retry count
        const retryCount = await incrementRetryCount(leagueId, gameweek);

        // If not last attempt, wait with exponential backoff
        if (attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 2s, 4s, 8s
          console.log(`[K-165b] Retrying in ${delayMs}ms...`);
          await sleep(delayMs);
        } else {
          // Final attempt failed, mark as failed
          console.error(`[K-165b] ❌ All ${MAX_RETRIES} attempts failed for league ${leagueId} GW${gameweek}`);
          await updateSyncStatus(leagueId, gameweek, 'failed', errorMsg);
          return { success: false, error: errorMsg };
        }
      }
    }

    // Should not reach here, but just in case
    return { success: false, error: 'Max retries reached' };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[K-165b] ❌ Sync manager error for league ${leagueId} GW${gameweek}:`, errorMsg);

    try {
      await updateSyncStatus(leagueId, gameweek, 'failed', errorMsg);
    } catch (updateError) {
      console.error('[K-165b] Failed to update status to failed:', updateError);
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Reset stuck syncs that have been "in_progress" for too long
 * This prevents syncs from getting stuck forever if a process crashes
 *
 * @param maxMinutes - Reset syncs stuck longer than this (default: 10 minutes)
 */
export async function resetStuckSyncs(maxMinutes: number = 10): Promise<number> {
  const db = await getDatabase();

  const result = await db.query(`
    UPDATE league_gw_sync
    SET status = 'pending', updated_at = NOW()
    WHERE status = 'in_progress'
      AND started_at < NOW() - INTERVAL '${maxMinutes} minutes'
    RETURNING league_id, gameweek
  `);

  if (result.rows.length > 0) {
    console.log(`[K-165b] Reset ${result.rows.length} stuck syncs:`);
    result.rows.forEach(row => {
      console.log(`  - League ${row.league_id} GW${row.gameweek}`);
    });
  }

  return result.rows.length;
}

/**
 * Get all failed syncs that need attention
 */
export async function getFailedSyncs(): Promise<Array<{
  league_id: number;
  gameweek: number;
  retry_count: number;
  error_message: string;
  updated_at: Date;
}>> {
  const db = await getDatabase();

  const result = await db.query(`
    SELECT league_id, gameweek, retry_count, error_message, updated_at
    FROM league_gw_sync
    WHERE status = 'failed'
    ORDER BY updated_at DESC
  `);

  return result.rows;
}

/**
 * Get all pending syncs (not started or reset from stuck)
 */
export async function getPendingSyncs(): Promise<Array<{
  league_id: number;
  gameweek: number;
  retry_count: number;
  created_at: Date;
}>> {
  const db = await getDatabase();

  const result = await db.query(`
    SELECT league_id, gameweek, retry_count, created_at
    FROM league_gw_sync
    WHERE status = 'pending'
    ORDER BY created_at ASC
  `);

  return result.rows;
}
