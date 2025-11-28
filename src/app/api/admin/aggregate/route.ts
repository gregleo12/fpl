import { NextResponse } from 'next/server';
import { aggregateDailyStats, cleanupOldRequests } from '@/lib/analytics';

/**
 * POST /api/admin/aggregate
 *
 * Runs daily aggregation and cleanup jobs
 * Can be triggered manually or via cron
 *
 * Query params:
 * - date: Optional specific date to aggregate (YYYY-MM-DD)
 * - cleanup: Set to 'true' to also run cleanup job
 * - daysToKeep: Number of days to keep in raw requests (default 30)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date') || undefined;
    const shouldCleanup = searchParams.get('cleanup') === 'true';
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '30', 10);

    const startTime = Date.now();

    // Run daily aggregation
    const aggregationResult = await aggregateDailyStats(targetDate);

    // Optionally run cleanup
    let cleanupResult = null;
    if (shouldCleanup) {
      cleanupResult = await cleanupOldRequests(daysToKeep);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: aggregationResult.success && (cleanupResult ? cleanupResult.success : true),
      duration,
      aggregation: aggregationResult,
      cleanup: cleanupResult,
      message: aggregationResult.success
        ? `Aggregated data for ${aggregationResult.date}${cleanupResult ? `, cleaned up ${cleanupResult.deleted} old requests` : ''}`
        : 'Aggregation failed'
    });
  } catch (error: any) {
    console.error('Aggregation endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/aggregate
 *
 * Returns info about the aggregation endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/aggregate',
    method: 'POST',
    description: 'Runs daily analytics aggregation and cleanup jobs',
    usage: {
      default: 'POST /api/admin/aggregate',
      withDate: 'POST /api/admin/aggregate?date=2025-11-27',
      withCleanup: 'POST /api/admin/aggregate?cleanup=true',
      customRetention: 'POST /api/admin/aggregate?cleanup=true&daysToKeep=60'
    },
    schedule: 'Should be called daily via cron (e.g., cron-job.org or Vercel Cron)',
    recommendedTime: '00:05 UTC (5 minutes after midnight)'
  });
}
