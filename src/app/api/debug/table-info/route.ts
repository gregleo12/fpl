import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDatabase();

    // Check if analytics_requests table exists and get its structure
    const tableCheck = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'analytics_requests'
      ORDER BY ordinal_position
    `);

    // Try a simple count query
    let countResult;
    let countError = null;
    try {
      countResult = await db.query('SELECT COUNT(*) as count FROM analytics_requests');
    } catch (err: any) {
      countError = err.message;
    }

    // Get sample row
    let sampleResult;
    let sampleError = null;
    try {
      sampleResult = await db.query('SELECT * FROM analytics_requests LIMIT 1');
    } catch (err: any) {
      sampleError = err.message;
    }

    return NextResponse.json({
      table_exists: tableCheck.rows.length > 0,
      columns: tableCheck.rows,
      count_query: {
        success: !countError,
        error: countError,
        result: countResult?.rows[0]
      },
      sample_query: {
        success: !sampleError,
        error: sampleError,
        result: sampleResult?.rows[0]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
