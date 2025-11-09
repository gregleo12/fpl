import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getDatabase, getPoolStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    fplApi: {
      status: 'unknown',
      responseTime: 0,
      error: null as string | null,
    },
    database: {
      status: 'unknown',
      responseTime: 0,
      error: null as string | null,
      connectionString: process.env.DATABASE_URL
        ? `postgresql://${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown'}`
        : 'not configured',
      poolStats: {
        total: 0,
        idle: 0,
        waiting: 0,
      },
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      fplApiBase: process.env.FPL_API_BASE_URL || 'https://fantasy.premierleague.com/api',
    },
  };

  // Test 1: FPL API Connectivity
  try {
    const fplStart = Date.now();
    const response = await axios.get(
      'https://fantasy.premierleague.com/api/bootstrap-static/',
      { timeout: 10000 }
    );
    results.fplApi.responseTime = Date.now() - fplStart;

    if (response.status === 200 && response.data.events) {
      results.fplApi.status = 'healthy';
    } else {
      results.fplApi.status = 'unhealthy';
      results.fplApi.error = `Unexpected response: ${response.status}`;
    }
  } catch (error: any) {
    results.fplApi.status = 'error';
    results.fplApi.error = error.code || error.message;
    results.fplApi.responseTime = Date.now();
  }

  // Test 2: Database Connectivity
  try {
    const dbStart = Date.now();
    const db = await getDatabase();
    const result = await db.query('SELECT 1 as health_check, NOW() as current_time');
    results.database.responseTime = Date.now() - dbStart;

    // Get pool statistics
    const poolStats = getPoolStats();
    results.database.poolStats = {
      total: poolStats.totalCount,
      idle: poolStats.idleCount,
      waiting: poolStats.waitingCount,
    };

    if (result.rows.length > 0) {
      results.database.status = 'healthy';
    } else {
      results.database.status = 'unhealthy';
      results.database.error = 'Query returned no rows';
    }
  } catch (error: any) {
    results.database.status = 'error';
    results.database.error = error.code || error.message;
    results.database.responseTime = Date.now();
  }

  // Determine overall health
  const overallHealthy =
    results.fplApi.status === 'healthy' &&
    results.database.status === 'healthy';

  return NextResponse.json({
    healthy: overallHealthy,
    details: results,
  }, {
    status: overallHealthy ? 200 : 503,
  });
}
