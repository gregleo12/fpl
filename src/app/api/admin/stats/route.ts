import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDatabase();

    console.log('[Stats] Fetching enhanced analytics stats...');

    // Get comprehensive stats in parallel
    const [
      // TOTAL REQUESTS (all requests including non-league)
      totalRequestsAllTime,
      totalRequestsToday,
      totalRequests7Days,
      totalRequests30Days,

      // LEAGUE REQUESTS (only requests with league_id)
      leagueRequestsAllTime,
      leagueRequestsToday,
      leagueRequests7Days,
      leagueRequests30Days,

      // UNIQUE USERS
      uniqueUsersAllTime,
      uniqueUsersToday,
      uniqueUsers7Days,
      uniqueUsers30Days,

      // UNIQUE MANAGERS
      uniqueManagersAllTime,
      uniqueManagersToday,
      uniqueManagers7Days,
      uniqueManagers30Days,

      // LEAGUE METADATA
      totalLeaguesResult,
      newLeaguesTodayResult,
      topLeaguesResult,
      recentRequestsResult
    ] = await Promise.all([
      // === TOTAL REQUESTS ===
      db.query(`SELECT COUNT(*) as count FROM analytics_requests`),
      db.query(`SELECT COUNT(*) as count FROM analytics_requests WHERE timestamp >= CURRENT_DATE`),
      db.query(`SELECT COUNT(*) as count FROM analytics_requests WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(*) as count FROM analytics_requests WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'`),

      // === LEAGUE REQUESTS (only where league_id IS NOT NULL) ===
      db.query(`SELECT COUNT(*) as count FROM analytics_requests WHERE league_id IS NOT NULL`),
      db.query(`SELECT COUNT(*) as count FROM analytics_requests WHERE league_id IS NOT NULL AND timestamp >= CURRENT_DATE`),
      db.query(`SELECT COUNT(*) as count FROM analytics_requests WHERE league_id IS NOT NULL AND timestamp >= CURRENT_DATE - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(*) as count FROM analytics_requests WHERE league_id IS NOT NULL AND timestamp >= CURRENT_DATE - INTERVAL '30 days'`),

      // === UNIQUE USERS ===
      db.query(`SELECT COUNT(DISTINCT user_hash) as count FROM analytics_requests`),
      db.query(`SELECT COUNT(DISTINCT user_hash) as count FROM analytics_requests WHERE timestamp >= CURRENT_DATE`),
      db.query(`SELECT COUNT(DISTINCT user_hash) as count FROM analytics_requests WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(DISTINCT user_hash) as count FROM analytics_requests WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'`),

      // === UNIQUE MANAGERS ===
      db.query(`SELECT COUNT(DISTINCT selected_team_id) as count FROM analytics_requests WHERE selected_team_id IS NOT NULL`),
      db.query(`SELECT COUNT(DISTINCT selected_team_id) as count FROM analytics_requests WHERE selected_team_id IS NOT NULL AND timestamp >= CURRENT_DATE`),
      db.query(`SELECT COUNT(DISTINCT selected_team_id) as count FROM analytics_requests WHERE selected_team_id IS NOT NULL AND timestamp >= CURRENT_DATE - INTERVAL '7 days'`),
      db.query(`SELECT COUNT(DISTINCT selected_team_id) as count FROM analytics_requests WHERE selected_team_id IS NOT NULL AND timestamp >= CURRENT_DATE - INTERVAL '30 days'`),

      // === LEAGUE METADATA ===
      db.query(`SELECT COUNT(DISTINCT league_id) as count FROM analytics_requests WHERE league_id IS NOT NULL`),
      db.query(`
        SELECT COUNT(*) as count FROM (
          SELECT DISTINCT league_id
          FROM analytics_requests
          WHERE league_id IS NOT NULL
          AND timestamp >= CURRENT_DATE
          GROUP BY league_id
        ) as new_leagues
      `),

      // Top 5 leagues by requests (with real-time unique users and managers)
      db.query(`
        SELECT
          league_id,
          'League ' || league_id as league_name,
          COUNT(*) as total_requests,
          COUNT(DISTINCT user_hash) as total_unique_users,
          COUNT(DISTINCT selected_team_id) FILTER (WHERE selected_team_id IS NOT NULL) as total_unique_managers,
          MAX(timestamp) as last_seen,
          0 as team_count
        FROM analytics_requests
        WHERE league_id IS NOT NULL
        GROUP BY league_id
        ORDER BY total_requests DESC
        LIMIT 5
      `),

      // Recent 10 requests
      db.query(`
        SELECT
          endpoint,
          method,
          timestamp,
          response_time_ms,
          'League ' || league_id as league_name
        FROM analytics_requests
        ORDER BY timestamp DESC
        LIMIT 10
      `)
    ]);

    // Activity by hour (last 24 hours) - both users and requests
    const activityLast24hResult = await db.query(`
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as request_count,
        COUNT(DISTINCT user_hash) as unique_users
      FROM analytics_requests
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY EXTRACT(HOUR FROM timestamp)
      ORDER BY hour
    `);

    // Activity by day (last 7 days) - both users and requests
    const activityLast7DaysResult = await db.query(`
      SELECT
        TO_CHAR(DATE(timestamp), 'Mon DD') as day,
        COUNT(*) as request_count,
        COUNT(DISTINCT user_hash) as unique_users
      FROM analytics_requests
      WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp)
    `);

    // Activity by day (last 30 days) - both users and requests
    const activityLast30DaysResult = await db.query(`
      SELECT
        TO_CHAR(DATE(timestamp), 'Mon DD') as day,
        COUNT(*) as request_count,
        COUNT(DISTINCT user_hash) as unique_users
      FROM analytics_requests
      WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp)
    `);

    // Parse results
    const stats = {
      totalRequests: {
        allTime: parseInt(totalRequestsAllTime.rows[0]?.count || '0'),
        today: parseInt(totalRequestsToday.rows[0]?.count || '0'),
        last7Days: parseInt(totalRequests7Days.rows[0]?.count || '0'),
        last30Days: parseInt(totalRequests30Days.rows[0]?.count || '0')
      },
      leagueRequests: {
        allTime: parseInt(leagueRequestsAllTime.rows[0]?.count || '0'),
        today: parseInt(leagueRequestsToday.rows[0]?.count || '0'),
        last7Days: parseInt(leagueRequests7Days.rows[0]?.count || '0'),
        last30Days: parseInt(leagueRequests30Days.rows[0]?.count || '0')
      },
      uniqueUsers: {
        allTime: parseInt(uniqueUsersAllTime.rows[0]?.count || '0'),
        today: parseInt(uniqueUsersToday.rows[0]?.count || '0'),
        last7Days: parseInt(uniqueUsers7Days.rows[0]?.count || '0'),
        last30Days: parseInt(uniqueUsers30Days.rows[0]?.count || '0')
      },
      uniqueManagers: {
        allTime: parseInt(uniqueManagersAllTime.rows[0]?.count || '0'),
        today: parseInt(uniqueManagersToday.rows[0]?.count || '0'),
        last7Days: parseInt(uniqueManagers7Days.rows[0]?.count || '0'),
        last30Days: parseInt(uniqueManagers30Days.rows[0]?.count || '0')
      },
      totalLeagues: parseInt(totalLeaguesResult.rows[0]?.count || '0'),
      newLeaguesToday: parseInt(newLeaguesTodayResult.rows[0]?.count || '0')
    };

    console.log('[Stats] Enhanced query results:', stats);

    return NextResponse.json({
      overview: stats,
      topLeagues: topLeaguesResult.rows.map((row: any) => ({
        leagueId: parseInt(row.league_id),
        leagueName: row.league_name || `League ${row.league_id}`,
        teamCount: parseInt(row.team_count || '0'),
        totalRequests: parseInt(row.total_requests),
        uniqueUsers: parseInt(row.total_unique_users),
        uniqueManagers: parseInt(row.total_unique_managers || '0'),
        lastSeen: row.last_seen
      })),
      recentRequests: recentRequestsResult.rows.map((row: any) => ({
        endpoint: row.endpoint,
        method: row.method,
        timestamp: row.timestamp,
        responseTime: row.response_time_ms,
        leagueName: row.league_name
      })),
      activityLast24h: activityLast24hResult.rows.map((row: any) => ({
        hour: parseInt(row.hour),
        request_count: parseInt(row.request_count),
        unique_users: parseInt(row.unique_users)
      })),
      activityLast7Days: activityLast7DaysResult.rows.map((row: any) => ({
        day: row.day,
        request_count: parseInt(row.request_count),
        unique_users: parseInt(row.unique_users)
      })),
      activityLast30Days: activityLast30DaysResult.rows.map((row: any) => ({
        day: row.day,
        request_count: parseInt(row.request_count),
        unique_users: parseInt(row.unique_users)
      }))
    });
  } catch (error: any) {
    console.error('Analytics stats error:', error);
    return NextResponse.json({
      overview: {
        totalRequests: { allTime: 0, today: 0, last7Days: 0, last30Days: 0 },
        leagueRequests: { allTime: 0, today: 0, last7Days: 0, last30Days: 0 },
        uniqueUsers: { allTime: 0, today: 0, last7Days: 0, last30Days: 0 },
        uniqueManagers: { allTime: 0, today: 0, last7Days: 0, last30Days: 0 },
        totalLeagues: 0,
        newLeaguesToday: 0
      },
      topLeagues: [],
      recentRequests: [],
      activityLast24h: [],
      activityLast7Days: [],
      activityLast30Days: []
    });
  }
}
