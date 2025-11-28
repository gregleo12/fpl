import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDatabase();

    // Get overall stats
    const [
      totalRequestsResult,
      todayRequestsResult,
      weekRequestsResult,
      uniqueUsersResult,
      totalLeaguesResult,
      topLeaguesResult,
      recentRequestsResult
    ] = await Promise.all([
      // Total requests all time
      db.query(`SELECT COUNT(*) as count FROM analytics_requests`),

      // Requests today
      db.query(`
        SELECT COUNT(*) as count
        FROM analytics_requests
        WHERE timestamp >= CURRENT_DATE
      `),

      // Requests this week
      db.query(`
        SELECT COUNT(*) as count
        FROM analytics_requests
        WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
      `),

      // Unique users (all time)
      db.query(`SELECT COUNT(DISTINCT user_hash) as count FROM analytics_requests`),

      // Total leagues tracked
      db.query(`SELECT COUNT(*) as count FROM analytics_leagues`),

      // Top 5 leagues by requests
      db.query(`
        SELECT
          league_id,
          league_name,
          team_count,
          total_requests,
          total_unique_users,
          last_seen
        FROM analytics_leagues
        ORDER BY total_requests DESC
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

    return NextResponse.json({
      overview: {
        totalRequests: parseInt(totalRequestsResult.rows[0]?.count || '0'),
        todayRequests: parseInt(todayRequestsResult.rows[0]?.count || '0'),
        weekRequests: parseInt(weekRequestsResult.rows[0]?.count || '0'),
        uniqueUsers: parseInt(uniqueUsersResult.rows[0]?.count || '0'),
        totalLeagues: parseInt(totalLeaguesResult.rows[0]?.count || '0')
      },
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
        totalRequests: 0,
        todayRequests: 0,
        weekRequests: 0,
        uniqueUsers: 0,
        totalLeagues: 0
      },
      topLeagues: [],
      recentRequests: [],
      hourlyActivity: []
    });
  }
}
