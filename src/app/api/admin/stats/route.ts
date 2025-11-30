import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

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

      // === LEAGUE METADATA ===
      db.query(`SELECT COUNT(*) as count FROM analytics_leagues`),
      db.query(`SELECT COUNT(*) as count FROM analytics_leagues WHERE first_seen >= CURRENT_DATE`),

      // Top 5 leagues by requests (with real-time unique users)
      db.query(`
        SELECT
          al.league_id,
          al.league_name,
          al.team_count,
          al.total_requests,
          al.last_seen,
          COUNT(DISTINCT ar.user_hash) as total_unique_users
        FROM analytics_leagues al
        LEFT JOIN analytics_requests ar ON al.league_id = ar.league_id
        GROUP BY al.league_id, al.league_name, al.team_count, al.total_requests, al.last_seen
        ORDER BY al.total_requests DESC
        LIMIT 5
      `),

      // Recent 10 requests
      db.query(`
        SELECT
          ar.endpoint,
          ar.method,
          ar.timestamp,
          ar.response_time_ms,
          al.league_name
        FROM analytics_requests ar
        LEFT JOIN analytics_leagues al ON ar.league_id = al.league_id
        ORDER BY ar.timestamp DESC
        LIMIT 10
      `)
    ]);

    // Requests by hour (last 24 hours)
    const hourlyResult = await db.query(`
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as count
      FROM analytics_requests
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY EXTRACT(HOUR FROM timestamp)
      ORDER BY hour
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
      totalLeagues: parseInt(totalLeaguesResult.rows[0]?.count || '0'),
      newLeaguesToday: parseInt(newLeaguesTodayResult.rows[0]?.count || '0')
    };

    console.log('[Stats] Enhanced query results:', stats);

    return NextResponse.json({
      overview: stats,
      topLeagues: topLeaguesResult.rows.map((row: any) => ({
        leagueId: row.league_id,
        leagueName: row.league_name || `League ${row.league_id}`,
        teamCount: row.team_count,
        totalRequests: row.total_requests,
        uniqueUsers: row.total_unique_users,
        lastSeen: row.last_seen
      })),
      recentRequests: recentRequestsResult.rows.map((row: any) => ({
        endpoint: row.endpoint,
        method: row.method,
        timestamp: row.timestamp,
        responseTime: row.response_time_ms,
        leagueName: row.league_name
      })),
      hourlyActivity: hourlyResult.rows.map((row: any) => ({
        hour: parseInt(row.hour),
        count: parseInt(row.count)
      }))
    });
  } catch (error: any) {
    console.error('Analytics stats error:', error);
    return NextResponse.json({
      overview: {
        totalRequests: { allTime: 0, today: 0, last7Days: 0, last30Days: 0 },
        leagueRequests: { allTime: 0, today: 0, last7Days: 0, last30Days: 0 },
        uniqueUsers: { allTime: 0, today: 0, last7Days: 0, last30Days: 0 },
        totalLeagues: 0,
        newLeaguesToday: 0
      },
      topLeagues: [],
      recentRequests: [],
      hourlyActivity: []
    });
  }
}
