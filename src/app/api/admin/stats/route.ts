import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDatabase();

    console.log('[Stats] Fetching analytics stats...');

    // Get overall stats
    const [
      totalRequestsResult,
      todayRequestsResult,
      yesterdayRequestsResult,
      weekRequestsResult,
      previousWeekRequestsResult,
      uniqueUsersResult,
      totalLeaguesResult,
      newLeaguesTodayResult,
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

      // Requests yesterday (for trend comparison)
      db.query(`
        SELECT COUNT(*) as count
        FROM analytics_requests
        WHERE timestamp >= CURRENT_DATE - INTERVAL '1 day'
          AND timestamp < CURRENT_DATE
      `),

      // Requests this week
      db.query(`
        SELECT COUNT(*) as count
        FROM analytics_requests
        WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
      `),

      // Requests previous week (for trend comparison)
      db.query(`
        SELECT COUNT(*) as count
        FROM analytics_requests
        WHERE timestamp >= CURRENT_DATE - INTERVAL '14 days'
          AND timestamp < CURRENT_DATE - INTERVAL '7 days'
      `),

      // Unique users (all time)
      db.query(`SELECT COUNT(DISTINCT user_hash) as count FROM analytics_requests`),

      // Total leagues tracked
      db.query(`SELECT COUNT(*) as count FROM analytics_leagues`),

      // New leagues today
      db.query(`
        SELECT COUNT(*) as count
        FROM analytics_leagues
        WHERE first_seen >= CURRENT_DATE
      `),

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

    const todayCount = parseInt(todayRequestsResult.rows[0]?.count || '0');
    const yesterdayCount = parseInt(yesterdayRequestsResult.rows[0]?.count || '0');
    const weekCount = parseInt(weekRequestsResult.rows[0]?.count || '0');
    const previousWeekCount = parseInt(previousWeekRequestsResult.rows[0]?.count || '0');
    const totalLeagues = parseInt(totalLeaguesResult.rows[0]?.count || '0');
    const newLeaguesToday = parseInt(newLeaguesTodayResult.rows[0]?.count || '0');

    console.log('[Stats] Query results:', {
      totalRequests: totalRequestsResult.rows[0]?.count,
      today: todayCount,
      week: weekCount,
      uniqueUsers: uniqueUsersResult.rows[0]?.count,
      totalLeagues,
      topLeaguesCount: topLeaguesResult.rows.length,
      recentRequestsCount: recentRequestsResult.rows.length
    });

    // Calculate trends
    const todayTrend = yesterdayCount > 0
      ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
      : 0;
    const weekTrend = previousWeekCount > 0
      ? Math.round(((weekCount - previousWeekCount) / previousWeekCount) * 100)
      : 0;

    return NextResponse.json({
      overview: {
        totalRequests: parseInt(totalRequestsResult.rows[0]?.count || '0'),
        todayRequests: todayCount,
        todayTrend,
        weekRequests: weekCount,
        weekTrend,
        uniqueUsers: parseInt(uniqueUsersResult.rows[0]?.count || '0'),
        totalLeagues,
        newLeaguesToday
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
        todayTrend: 0,
        weekRequests: 0,
        weekTrend: 0,
        uniqueUsers: 0,
        totalLeagues: 0,
        newLeaguesToday: 0
      },
      topLeagues: [],
      recentRequests: [],
      hourlyActivity: []
    });
  }
}
