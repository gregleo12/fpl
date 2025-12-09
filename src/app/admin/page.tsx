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
    totalRequests: {
      allTime: number;
      today: number;
      last7Days: number;
      last30Days: number;
    };
    leagueRequests: {
      allTime: number;
      today: number;
      last7Days: number;
      last30Days: number;
    };
    uniqueUsers: {
      allTime: number;
      today: number;
      last7Days: number;
      last30Days: number;
    };
    uniqueManagers: {
      allTime: number;
      today: number;
      last7Days: number;
      last30Days: number;
    };
    totalLeagues: number;
    newLeaguesToday: number;
  };
  topLeagues: Array<{
    leagueId: number;
    leagueName: string;
    teamCount: number;
    totalRequests: number;
    uniqueUsers: number;
    uniqueManagers: number;
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
  const [aggregating, setAggregating] = useState(false);
  const [aggregationResult, setAggregationResult] = useState<any>(null);
  const [metricType, setMetricType] = useState<'users' | 'requests'>('users');
  const [timePeriod, setTimePeriod] = useState<'24h' | '7days' | '30days'>('7days');

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
  }, [metricType, timePeriod]);

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

  const runAggregation = async (withCleanup: boolean = false) => {
    setAggregating(true);
    setAggregationResult(null);
    try {
      const url = `/api/admin/aggregate${withCleanup ? '?cleanup=true' : ''}`;
      const response = await fetch(url, { method: 'POST' });
      const result = await response.json();
      setAggregationResult(result);

      // Refresh analytics data after aggregation
      if (result.success) {
        setTimeout(fetchData, 1000);
      }
    } catch (err: any) {
      setAggregationResult({
        success: false,
        error: err.message || 'Failed to run aggregation'
      });
    } finally {
      setAggregating(false);
    }
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
            {/* TOTAL REQUESTS Section */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>📊 Total Requests</div>
              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>All Time</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.totalRequests.allTime.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>Total requests</div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Today</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.totalRequests.today.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.totalRequests.allTime > 0
                      ? `${((analyticsData.overview.totalRequests.today / analyticsData.overview.totalRequests.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Last 7 Days</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.totalRequests.last7Days.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.totalRequests.allTime > 0
                      ? `${((analyticsData.overview.totalRequests.last7Days / analyticsData.overview.totalRequests.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Last 30 Days</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.totalRequests.last30Days.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.totalRequests.allTime > 0
                      ? `${((analyticsData.overview.totalRequests.last30Days / analyticsData.overview.totalRequests.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* LEAGUE REQUESTS Section */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🏆 League Requests</div>
              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>All Time</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.leagueRequests.allTime.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>League-specific</div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Today</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.leagueRequests.today.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.leagueRequests.allTime > 0
                      ? `${((analyticsData.overview.leagueRequests.today / analyticsData.overview.leagueRequests.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Last 7 Days</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.leagueRequests.last7Days.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.leagueRequests.allTime > 0
                      ? `${((analyticsData.overview.leagueRequests.last7Days / analyticsData.overview.leagueRequests.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Last 30 Days</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.leagueRequests.last30Days.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.leagueRequests.allTime > 0
                      ? `${((analyticsData.overview.leagueRequests.last30Days / analyticsData.overview.leagueRequests.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* UNIQUE USERS Section */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>👥 Users</div>
              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>All Time</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.uniqueUsers.allTime.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>Total unique users</div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Today</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.uniqueUsers.today.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.uniqueUsers.allTime > 0
                      ? `${((analyticsData.overview.uniqueUsers.today / analyticsData.overview.uniqueUsers.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Last 7 Days</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.uniqueUsers.last7Days.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.uniqueUsers.allTime > 0
                      ? `${((analyticsData.overview.uniqueUsers.last7Days / analyticsData.overview.uniqueUsers.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Last 30 Days</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.uniqueUsers.last30Days.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.uniqueUsers.allTime > 0
                      ? `${((analyticsData.overview.uniqueUsers.last30Days / analyticsData.overview.uniqueUsers.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* MANAGERS Section */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>👔 Managers</div>
              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>All Time</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.uniqueManagers.allTime.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>Total unique managers</div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Today</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.uniqueManagers.today.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.uniqueManagers.allTime > 0
                      ? `${((analyticsData.overview.uniqueManagers.today / analyticsData.overview.uniqueManagers.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Last 7 Days</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.uniqueManagers.last7Days.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.uniqueManagers.allTime > 0
                      ? `${((analyticsData.overview.uniqueManagers.last7Days / analyticsData.overview.uniqueManagers.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
                <div className={styles.overviewCard}>
                  <div className={styles.overviewLabel}>Last 30 Days</div>
                  <div className={styles.overviewValue}>{analyticsData.overview.uniqueManagers.last30Days.toLocaleString()}</div>
                  <div className={styles.overviewSubtext}>
                    {analyticsData.overview.uniqueManagers.allTime > 0
                      ? `${((analyticsData.overview.uniqueManagers.last30Days / analyticsData.overview.uniqueManagers.allTime) * 100).toFixed(1)}% of total`
                      : '0% of total'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Active Leagues Summary */}
            <div className={styles.overviewGrid} style={{ marginTop: '1rem' }}>
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

            {/* Aggregation Controls */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>⚙️ Data Management</div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  onClick={() => runAggregation(false)}
                  disabled={aggregating}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(0, 255, 135, 0.15)',
                    color: '#00ff87',
                    border: '1px solid rgba(0, 255, 135, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: aggregating ? 'not-allowed' : 'pointer',
                    opacity: aggregating ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {aggregating ? '⏳ Running...' : '📊 Run Daily Aggregation'}
                </button>
                <button
                  onClick={() => runAggregation(true)}
                  disabled={aggregating}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255, 135, 0, 0.15)',
                    color: '#ff8700',
                    border: '1px solid rgba(255, 135, 0, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: aggregating ? 'not-allowed' : 'pointer',
                    opacity: aggregating ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {aggregating ? '⏳ Running...' : '🗑️ Aggregate + Cleanup'}
                </button>
              </div>

              {aggregationResult && (
                <div style={{
                  padding: '1rem',
                  background: aggregationResult.success
                    ? 'rgba(0, 255, 135, 0.1)'
                    : 'rgba(255, 71, 87, 0.1)',
                  border: `1px solid ${aggregationResult.success ? 'rgba(0, 255, 135, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                    {aggregationResult.success ? '✅ Success' : '❌ Failed'}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {aggregationResult.message || aggregationResult.error}
                  </div>
                  {aggregationResult.duration && (
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.5rem' }}>
                      Completed in {aggregationResult.duration}ms
                    </div>
                  )}
                </div>
              )}

              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <strong>ℹ️ Info:</strong> Daily aggregation consolidates raw request data into daily summaries.
                Cleanup removes requests older than 30 days (aggregated data is preserved).
              </div>
            </div>

            {/* Activity Chart */}
            <div className={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div className={styles.sectionTitle}>
                  📈 Activity {timePeriod === '24h' ? 'Last 24 Hours' : timePeriod === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Metric Type Toggle */}
                  <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.125rem', borderRadius: '8px' }}>
                    <button
                      onClick={() => setMetricType('users')}
                      style={{
                        background: metricType === 'users' ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
                        border: 'none',
                        color: metricType === 'users' ? '#00ff87' : 'rgba(255, 255, 255, 0.5)',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Users
                    </button>
                    <button
                      onClick={() => setMetricType('requests')}
                      style={{
                        background: metricType === 'requests' ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
                        border: 'none',
                        color: metricType === 'requests' ? '#00ff87' : 'rgba(255, 255, 255, 0.5)',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Requests
                    </button>
                  </div>

                  {/* Time Period Toggle */}
                  <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.125rem', borderRadius: '8px' }}>
                    <button
                      onClick={() => setTimePeriod('24h')}
                      style={{
                        background: timePeriod === '24h' ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
                        border: 'none',
                        color: timePeriod === '24h' ? '#00ff87' : 'rgba(255, 255, 255, 0.5)',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      24h
                    </button>
                    <button
                      onClick={() => setTimePeriod('7days')}
                      style={{
                        background: timePeriod === '7days' ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
                        border: 'none',
                        color: timePeriod === '7days' ? '#00ff87' : 'rgba(255, 255, 255, 0.5)',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      7 days
                    </button>
                    <button
                      onClick={() => setTimePeriod('30days')}
                      style={{
                        background: timePeriod === '30days' ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
                        border: 'none',
                        color: timePeriod === '30days' ? '#00ff87' : 'rgba(255, 255, 255, 0.5)',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      30 days
                    </button>
                  </div>
                </div>
              </div>
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
                        formatter={(value: any) => [`${value} ${metricType}`, 'Count']}
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
                <div className={styles.emptyState}>
                  No activity in the {timePeriod === '24h' ? 'last 24 hours' : timePeriod === '7days' ? 'last 7 days' : 'last 30 days'}
                </div>
              )}
            </div>

            {/* Top Leagues */}
            <div className={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className={styles.sectionTitle}>🏆 Top Leagues by Usage</div>
                <button
                  onClick={() => window.location.href = '/admin/leagues'}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(0, 255, 135, 0.15)',
                    color: '#00ff87',
                    border: '1px solid rgba(0, 255, 135, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 255, 135, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 255, 135, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  View All →
                </button>
              </div>
              {analyticsData.topLeagues.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>League</th>
                        <th>Teams</th>
                        <th>Requests</th>
                        <th>Users</th>
                        <th>Managers</th>
                        <th>Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.topLeagues.map((league) => (
                        <tr
                          key={league.leagueId}
                          onClick={() => window.location.href = '/admin/leagues'}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div className={styles.leagueName}>{league.leagueName}</div>
                            <div className={styles.leagueId}>ID: {league.leagueId}</div>
                          </td>
                          <td>{league.teamCount}</td>
                          <td>{league.totalRequests.toLocaleString()}</td>
                          <td>{league.uniqueUsers}</td>
                          <td>{league.uniqueManagers}</td>
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
