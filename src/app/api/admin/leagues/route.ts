import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDatabase();

    // Fetch all leagues with their metadata from analytics_requests and h2h_matches
    const result = await db.query(`
      WITH league_stats AS (
        SELECT
          league_id,
          COUNT(*) as total_requests,
          COUNT(DISTINCT user_hash) as unique_users,
          COUNT(DISTINCT selected_team_id) FILTER (WHERE selected_team_id IS NOT NULL) as unique_managers,
          MAX(timestamp) as last_seen,
          MIN(timestamp) as first_seen
        FROM analytics_requests
        WHERE league_id IS NOT NULL
        GROUP BY league_id
      ),
      league_teams AS (
        SELECT
          league_id,
          COUNT(DISTINCT entry_1_id) + COUNT(DISTINCT entry_2_id) as team_count
        FROM h2h_matches
        GROUP BY league_id
      )
      SELECT
        ls.league_id,
        'League ' || ls.league_id as league_name,
        COALESCE(lt.team_count, 0) as team_count,
        ls.total_requests,
        ls.unique_users,
        ls.unique_managers,
        ls.last_seen,
        ls.first_seen,
        ls.first_seen as created_at
      FROM league_stats ls
      LEFT JOIN league_teams lt ON ls.league_id = lt.league_id
      ORDER BY ls.total_requests DESC
    `);

    return NextResponse.json({
      leagues: result.rows,
      total: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leagues data' },
      { status: 500 }
    );
  }
}
