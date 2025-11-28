'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import styles from './admin.module.css';

interface HealthData {
  healthy: boolean;
  details: {
    timestamp: string;
    fplApi: {
      status: string;
      responseTime: number;
      error: string | null;
    };
    database: {
      status: string;
      responseTime: number;
      error: string | null;
      connectionString: string;
      poolStats: {
        total: number;
        idle: number;
        waiting: number;
      };
    };
    environment: {
      nodeEnv: string;
      fplApiBase: string;
    };
  };
}

interface AnalyticsData {
  overview: {
    totalRequests: number;
    todayRequests: number;
    todayTrend: number;
    weekRequests: number;
    weekTrend: number;
    uniqueUsers: number;
    totalLeagues: number;
    newLeaguesToday: number;
  };
  topLeagues: Array<{
    leagueId: number;
    leagueName: string;
    teamCount: number;
    totalRequests: number;
    uniqueUsers: number;
    lastSeen: string;
  }>;
  recentRequests: Array<{
    endpoint: string;
    method: string;
    timestamp: string;
    responseTime: number | null;
    leagueName: string | null;
  }>;
  hourlyActivity: Array<{
    hour: number;
    count: number;
  }>;
}

export default function AdminPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'health' | 'analytics'>('analytics');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthResponse, analyticsResponse] = await Promise.all([
        fetch('/api/health/json'),
        fetch('/api/admin/stats')
      ]);

      if (!healthResponse.ok || !analyticsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const health = await healthResponse.json();
      const analytics = await analyticsResponse.json();

      setHealthData(health);
      setAnalyticsData(analytics);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusEmoji = (status: string) => {
    if (status === 'healthy') return '✅';
    if (status === 'error') return '❌';
    return '⚠️';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const renderTrend = (trend: number) => {
    if (trend === 0) return null;
    const isPositive = trend > 0;
    const arrow = isPositive ? '↗' : '↘';
    const color = isPositive ? '#00ff87' : '#ff4757';
    return (
      <span style={{ color, fontSize: '0.85rem', marginLeft: '0.5rem' }}>
        {arrow} {Math.abs(trend)}%
      </span>
    );
  };

  if (loading && !healthData && !analyticsData) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  const overallHealthy = healthData?.healthy || false;
  const statusIcon = overallHealthy ? '🟢' : '🔴';
  const statusText = overallHealthy ? 'HEALTHY' : 'UNHEALTHY';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <div className={`${styles.statusBadge} ${overallHealthy ? styles.healthy : styles.unhealthy}`}>
          {statusIcon} System Status: {statusText}
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tabButton} ${activeTab === 'analytics' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'health' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('health')}
          >
            💊 Health
          </button>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analyticsData && (
          <>
            {/* Overview Cards */}
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <div className={styles.overviewLabel}>Total Requests</div>
                <div className={styles.overviewValue}>{analyticsData.overview.totalRequests.toLocaleString()}</div>
                <div className={styles.overviewSubtext}>All time</div>
              </div>
              <div className={styles.overviewCard}>
                <div className={styles.overviewLabel}>Today</div>
                <div className={styles.overviewValue}>
                  {analyticsData.overview.todayRequests.toLocaleString()}
                  {renderTrend(analyticsData.overview.todayTrend)}
                </div>
                <div className={styles.overviewSubtext}>
                  {analyticsData.overview.totalRequests > 0
                    ? `${((analyticsData.overview.todayRequests / analyticsData.overview.totalRequests) * 100).toFixed(1)}% of total`
                    : 'vs yesterday'
                  }
                </div>
              </div>
              <div className={styles.overviewCard}>
                <div className={styles.overviewLabel}>This Week</div>
                <div className={styles.overviewValue}>
                  {analyticsData.overview.weekRequests.toLocaleString()}
                  {renderTrend(analyticsData.overview.weekTrend)}
                </div>
                <div className={styles.overviewSubtext}>vs previous week</div>
              </div>
              <div className={styles.overviewCard}>
                <div className={styles.overviewLabel}>Unique Users</div>
                <div className={styles.overviewValue}>{analyticsData.overview.uniqueUsers.toLocaleString()}</div>
                <div className={styles.overviewSubtext}>Anonymous hashes</div>
              </div>
              <div className={styles.overviewCard}>
                <div className={styles.overviewLabel}>Active Leagues</div>
                <div className={styles.overviewValue}>{analyticsData.overview.totalLeagues.toLocaleString()}</div>
                <div className={styles.overviewSubtext}>
                  {analyticsData.overview.newLeaguesToday > 0
                    ? `+${analyticsData.overview.newLeaguesToday} new today`
                    : 'Tracked leagues'
                  }
                </div>
              </div>
            </div>

            {/* Activity Chart */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>📈 Activity Last 24 Hours</div>
              {analyticsData.hourlyActivity.length > 0 ? (
                <div className={styles.chartWrapper}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.hourlyActivity}>
                      <XAxis
                        dataKey="hour"
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                        tickFormatter={(hour) => `${hour}:00`}
                      />
                      <YAxis
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(26, 26, 46, 0.95)',
                          border: '1px solid rgba(0, 255, 135, 0.3)',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        labelFormatter={(hour) => `Hour: ${hour}:00`}
                        formatter={(value: any) => [`${value} requests`, 'Count']}
                      />
                      <Bar
                        dataKey="count"
                        fill="#00ff87"
                        radius={[8, 8, 0, 0]}
                        opacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={styles.emptyState}>No activity in the last 24 hours</div>
              )}
            </div>

            {/* Top Leagues */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🏆 Top Leagues by Usage</div>
              {analyticsData.topLeagues.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>League</th>
                        <th>Teams</th>
                        <th>Requests</th>
                        <th>Users</th>
                        <th>Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.topLeagues.map((league) => (
                        <tr key={league.leagueId}>
                          <td>
                            <div className={styles.leagueName}>{league.leagueName}</div>
                            <div className={styles.leagueId}>ID: {league.leagueId}</div>
                          </td>
                          <td>{league.teamCount}</td>
                          <td>{league.totalRequests.toLocaleString()}</td>
                          <td>{league.uniqueUsers}</td>
                          <td>{formatTimestamp(league.lastSeen)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>No leagues tracked yet</div>
              )}
            </div>

            {/* Recent Requests */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🕐 Recent Requests</div>
              {analyticsData.recentRequests.length > 0 ? (
                <div className={styles.requestsList}>
                  {analyticsData.recentRequests.map((req, idx) => (
                    <div key={idx} className={styles.requestItem}>
                      <div className={styles.requestEndpoint}>
                        <span className={styles.requestMethod}>{req.method}</span>
                        {req.endpoint}
                      </div>
                      <div className={styles.requestMeta}>
                        <span>{formatTimestamp(req.timestamp)}</span>
                        {req.responseTime && <span> • {formatTime(req.responseTime)}</span>}
                        {req.leagueName && <span> • {req.leagueName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>No recent requests</div>
              )}
            </div>
          </>
        )}

        {/* Health Tab */}
        {activeTab === 'health' && healthData && (
          <>
            {/* FPL API Section */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                {getStatusEmoji(healthData.details.fplApi.status)} FPL API
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Status</span>
                <span className={styles.metricValue}>
                  {healthData.details.fplApi.status.charAt(0).toUpperCase() + healthData.details.fplApi.status.slice(1)}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Response Time</span>
                <span className={styles.metricValue}>{formatTime(healthData.details.fplApi.responseTime)}</span>
              </div>
              {healthData.details.fplApi.error && (
                <div className={styles.errorMessage}>Error: {healthData.details.fplApi.error}</div>
              )}
            </div>

            {/* Database Section */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                {getStatusEmoji(healthData.details.database.status)} Database
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Status</span>
                <span className={styles.metricValue}>
                  {healthData.details.database.status.charAt(0).toUpperCase() + healthData.details.database.status.slice(1)}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Response Time</span>
                <span className={styles.metricValue}>{formatTime(healthData.details.database.responseTime)}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Connection</span>
                <span className={styles.metricValue}>{healthData.details.database.connectionString}</span>
              </div>

              <div className={styles.poolStats}>
                <div className={styles.poolStat}>
                  <div className={styles.poolStatLabel}>Total Connections</div>
                  <div className={styles.poolStatValue}>{healthData.details.database.poolStats.total}</div>
                </div>
                <div className={styles.poolStat}>
                  <div className={styles.poolStatLabel}>Idle</div>
                  <div className={styles.poolStatValue}>{healthData.details.database.poolStats.idle}</div>
                </div>
                <div className={styles.poolStat}>
                  <div className={styles.poolStatLabel}>Waiting</div>
                  <div className={styles.poolStatValue}>{healthData.details.database.poolStats.waiting}</div>
                </div>
              </div>
              {healthData.details.database.error && (
                <div className={styles.errorMessage}>Error: {healthData.details.database.error}</div>
              )}
            </div>

            {/* Environment Section */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>⚙️ Environment</div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Node Environment</span>
                <span className={styles.metricValue}>{healthData.details.environment.nodeEnv}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>FPL API Base</span>
                <span className={styles.metricValue}>{healthData.details.environment.fplApiBase}</span>
              </div>
            </div>
          </>
        )}

        <button className={styles.refreshBtn} onClick={fetchData}>
          🔄 Refresh Now
        </button>

        <div className={styles.timestamp}>
          Last Updated: {new Date().toLocaleString()} • Auto-refresh: 30s
        </div>
      </div>
    </div>
  );
}
