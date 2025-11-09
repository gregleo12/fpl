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

  const statusIcon = overallHealthy ? '🟢' : '🔴';
  const statusText = overallHealthy ? 'HEALTHY' : 'UNHEALTHY';
  const statusColor = overallHealthy ? '#00ff87' : '#ff4757';

  const getStatusEmoji = (status: string) => {
    if (status === 'healthy') return '✅';
    if (status === 'error') return '❌';
    return '⚠️';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Health - FPL H2H Analytics</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #37003c 0%, #0f0f23 50%, #1a1a2e 100%);
      color: #ffffff;
      min-height: 100vh;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      max-width: 800px;
      width: 100%;
    }

    .card {
      background: linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(55, 0, 60, 0.3) 100%);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #ffffff;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: rgba(0, 255, 135, 0.1);
      border: 2px solid ${statusColor};
      border-radius: 12px;
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 2rem;
      color: ${statusColor};
    }

    .section {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .metric:last-child {
      border-bottom: none;
    }

    .metric-label {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.95rem;
    }

    .metric-value {
      color: #ffffff;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .pool-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .pool-stat {
      background: rgba(0, 255, 135, 0.05);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid rgba(0, 255, 135, 0.2);
    }

    .pool-stat-label {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.25rem;
    }

    .pool-stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #00ff87;
    }

    .error-message {
      color: #ff4757;
      font-size: 0.85rem;
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(255, 71, 87, 0.1);
      border-radius: 6px;
      border: 1px solid rgba(255, 71, 87, 0.3);
    }

    .timestamp {
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.85rem;
      margin-top: 2rem;
    }

    .refresh-btn {
      width: 100%;
      padding: 1rem;
      margin-top: 1.5rem;
      background: rgba(0, 255, 135, 0.15);
      color: #00ff87;
      border: 1px solid rgba(0, 255, 135, 0.3);
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .refresh-btn:hover {
      background: rgba(0, 255, 135, 0.25);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 255, 135, 0.3);
    }

    .json-link {
      text-align: center;
      margin-top: 1rem;
    }

    .json-link a {
      color: #00ff87;
      text-decoration: none;
      font-size: 0.9rem;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .json-link a:hover {
      opacity: 1;
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      .card {
        padding: 1.5rem;
      }

      h1 {
        font-size: 1.5rem;
      }

      .pool-stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>FPL H2H Analytics</h1>
      <div class="status-badge">
        ${statusIcon} System Status: ${statusText}
      </div>

      <div class="section">
        <div class="section-title">
          ${getStatusEmoji(results.fplApi.status)} FPL API
        </div>
        <div class="metric">
          <span class="metric-label">Status</span>
          <span class="metric-value">${results.fplApi.status.charAt(0).toUpperCase() + results.fplApi.status.slice(1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Response Time</span>
          <span class="metric-value">${formatTime(results.fplApi.responseTime)}</span>
        </div>
        ${results.fplApi.error ? `<div class="error-message">Error: ${results.fplApi.error}</div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">
          ${getStatusEmoji(results.database.status)} Database
        </div>
        <div class="metric">
          <span class="metric-label">Status</span>
          <span class="metric-value">${results.database.status.charAt(0).toUpperCase() + results.database.status.slice(1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Response Time</span>
          <span class="metric-value">${formatTime(results.database.responseTime)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Connection</span>
          <span class="metric-value">${results.database.connectionString}</span>
        </div>

        <div class="pool-stats">
          <div class="pool-stat">
            <div class="pool-stat-label">Total Connections</div>
            <div class="pool-stat-value">${results.database.poolStats.total}</div>
          </div>
          <div class="pool-stat">
            <div class="pool-stat-label">Idle</div>
            <div class="pool-stat-value">${results.database.poolStats.idle}</div>
          </div>
          <div class="pool-stat">
            <div class="pool-stat-label">Waiting</div>
            <div class="pool-stat-value">${results.database.poolStats.waiting}</div>
          </div>
        </div>
        ${results.database.error ? `<div class="error-message">Error: ${results.database.error}</div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">⚙️ Environment</div>
        <div class="metric">
          <span class="metric-label">Node Environment</span>
          <span class="metric-value">${results.environment.nodeEnv}</span>
        </div>
        <div class="metric">
          <span class="metric-label">FPL API Base</span>
          <span class="metric-value">${results.environment.fplApiBase}</span>
        </div>
      </div>

      <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh</button>

      <div class="json-link">
        <a href="/api/health/json" target="_blank">View JSON Response →</a>
      </div>

      <div class="timestamp">
        Last Updated: ${new Date(results.timestamp).toLocaleString()}
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    status: overallHealthy ? 200 : 503,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
