import crypto from 'crypto';
import { getDatabase } from './db';

// Create anonymous user hash from IP + User Agent
export function createUserHash(ip: string, userAgent: string): string {
  const data = `${ip}:${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// Extract league ID from URL path
export function extractLeagueId(pathname: string): number | null {
  const match = pathname.match(/\/league\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Track a request (fire and forget - don't block response)
export async function trackRequest({
  leagueId,
  endpoint,
  method,
  userHash,
  responseTimeMs,
  statusCode,
  selectedTeamId
}: {
  leagueId: number | null;
  endpoint: string;
  method: string;
  userHash: string;
  responseTimeMs?: number;
  statusCode?: number;
  selectedTeamId?: number | null;
}): Promise<void> {
  try {
    const db = await getDatabase();

    console.log('[Analytics] Tracking request:', { leagueId, endpoint, method, userHash, selectedTeamId });

    const result = await db.query(`
      INSERT INTO analytics_requests
        (league_id, endpoint, method, user_hash, response_time_ms, status_code, selected_team_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [leagueId, endpoint, method, userHash, responseTimeMs || null, statusCode || 200, selectedTeamId || null]);

    console.log('[Analytics] Request tracked successfully, ID:', result.rows[0]?.id);

    // Update league metadata if we have a league ID
    if (leagueId) {
      await db.query(`
        INSERT INTO analytics_leagues (league_id, last_seen, total_requests)
        VALUES ($1, NOW(), 1)
        ON CONFLICT (league_id)
        DO UPDATE SET
          last_seen = NOW(),
          total_requests = analytics_leagues.total_requests + 1
      `, [leagueId]);

      console.log('[Analytics] League metadata updated for league:', leagueId);
    }
  } catch (error) {
    // Silent fail - don't break the app for analytics
    console.error('[Analytics] Tracking error:', error);
  }
}

// Update league metadata (name, team count)
export async function updateLeagueMetadata(
  leagueId: number,
  leagueName: string,
  teamCount: number
): Promise<void> {
  try {
    const db = await getDatabase();
    await db.query(`
      INSERT INTO analytics_leagues (league_id, league_name, team_count, first_seen, last_seen)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (league_id)
      DO UPDATE SET
        league_name = $2,
        team_count = $3,
        last_seen = NOW()
    `, [leagueId, leagueName, teamCount]);
  } catch (error) {
    console.error('League metadata update error:', error);
  }
}

/**
 * Aggregate yesterday's data into analytics_daily table
 * Should be run daily via cron or manual trigger
 */
export async function aggregateDailyStats(targetDate?: string): Promise<{ success: boolean; date: string; stats: any }> {
  try {
    const db = await getDatabase();

    // Default to yesterday if no date provided
    const dateToAggregate = targetDate || 'CURRENT_DATE - INTERVAL \'1 day\'';
    const dateString = targetDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Aggregate global stats (no league filter)
    const globalStats = await db.query(`
      INSERT INTO analytics_daily (date, league_id, unique_users, total_requests, avg_response_time_ms, error_count)
      SELECT
        ${targetDate ? `'${targetDate}'::DATE` : 'CURRENT_DATE - INTERVAL \'1 day\''},
        NULL,
        COUNT(DISTINCT user_hash),
        COUNT(*),
        AVG(response_time_ms)::INTEGER,
        COUNT(*) FILTER (WHERE status_code >= 400)
      FROM analytics_requests
      WHERE DATE(timestamp) = ${targetDate ? `'${targetDate}'::DATE` : 'CURRENT_DATE - INTERVAL \'1 day\''}
      ON CONFLICT (date, league_id) DO UPDATE SET
        unique_users = EXCLUDED.unique_users,
        total_requests = EXCLUDED.total_requests,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        error_count = EXCLUDED.error_count
      RETURNING *
    `);

    // Aggregate per-league stats
    const leagueStats = await db.query(`
      INSERT INTO analytics_daily (date, league_id, unique_users, total_requests, avg_response_time_ms, error_count)
      SELECT
        ${targetDate ? `'${targetDate}'::DATE` : 'CURRENT_DATE - INTERVAL \'1 day\''},
        league_id,
        COUNT(DISTINCT user_hash),
        COUNT(*),
        AVG(response_time_ms)::INTEGER,
        COUNT(*) FILTER (WHERE status_code >= 400)
      FROM analytics_requests
      WHERE DATE(timestamp) = ${targetDate ? `'${targetDate}'::DATE` : 'CURRENT_DATE - INTERVAL \'1 day\''}
        AND league_id IS NOT NULL
      GROUP BY league_id
      ON CONFLICT (date, league_id) DO UPDATE SET
        unique_users = EXCLUDED.unique_users,
        total_requests = EXCLUDED.total_requests,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        error_count = EXCLUDED.error_count
      RETURNING *
    `);

    // Update total unique users per league (lifetime)
    await db.query(`
      UPDATE analytics_leagues al
      SET total_unique_users = (
        SELECT COUNT(DISTINCT user_hash)
        FROM analytics_requests ar
        WHERE ar.league_id = al.league_id
      )
    `);

    return {
      success: true,
      date: dateString,
      stats: {
        global: globalStats.rows[0] || null,
        leagues: leagueStats.rows
      }
    };
  } catch (error: any) {
    console.error('Daily aggregation error:', error);
    return {
      success: false,
      date: targetDate || 'yesterday',
      stats: { error: error.message }
    };
  }
}

/**
 * Clean up old request data (keep last 30 days)
 * Should be run daily or weekly
 */
export async function cleanupOldRequests(daysToKeep: number = 30): Promise<{ success: boolean; deleted: number }> {
  try {
    const db = await getDatabase();

    const result = await db.query(`
      DELETE FROM analytics_requests
      WHERE timestamp < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      RETURNING id
    `);

    return {
      success: true,
      deleted: result.rowCount || 0
    };
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return {
      success: false,
      deleted: 0
    };
  }
}
