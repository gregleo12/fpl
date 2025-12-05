import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDatabase();

    // Fetch all leagues with their metadata
    const result = await db.query(`
      SELECT
        lm.league_id,
        lm.league_name,
        lm.team_count,
        lm.total_requests,
        lm.unique_users,
        lm.unique_managers,
        lm.last_seen,
        lm.first_seen,
        lm.created_at
      FROM league_metadata lm
      ORDER BY lm.total_requests DESC
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
