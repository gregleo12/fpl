import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDatabase();

    // Get masked DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@'); // Mask password

    // Test query to check analytics_requests
    const countResult = await db.query('SELECT COUNT(*) as count FROM analytics_requests');
    const count = parseInt(countResult.rows[0]?.count || '0');

    // Get a sample record
    const sampleResult = await db.query('SELECT * FROM analytics_requests ORDER BY timestamp DESC LIMIT 1');
    const lastRecord = sampleResult.rows[0];

    return NextResponse.json({
      database_url: maskedUrl,
      analytics_requests: {
        total_count: count,
        last_record: lastRecord ? {
          timestamp: lastRecord.timestamp,
          path: lastRecord.path,
          league_id: lastRecord.league_id
        } : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      database_url: (process.env.DATABASE_URL || 'NOT_SET').replace(/:([^:@]+)@/, ':****@'),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
