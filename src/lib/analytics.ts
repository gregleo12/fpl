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
  statusCode
}: {
  leagueId: number | null;
  endpoint: string;
  method: string;
  userHash: string;
  responseTimeMs?: number;
  statusCode?: number;
}): Promise<void> {
  try {
    const db = await getDatabase();
    await db.query(`
      INSERT INTO analytics_requests
        (league_id, endpoint, method, user_hash, response_time_ms, status_code)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [leagueId, endpoint, method, userHash, responseTimeMs || null, statusCode || 200]);

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
    }
  } catch (error) {
    // Silent fail - don't break the app for analytics
    console.error('Analytics tracking error:', error);
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
