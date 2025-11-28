'use client';

import { useEffect, useState } from 'react';
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

export default function AdminPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/health/json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
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

  if (loading) {
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

  if (!healthData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>No data available</div>
      </div>
    );
  }

  const overallHealthy = healthData.healthy;
  const statusIcon = overallHealthy ? '🟢' : '🔴';
  const statusText = overallHealthy ? 'HEALTHY' : 'UNHEALTHY';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <div className={`${styles.statusBadge} ${overallHealthy ? styles.healthy : styles.unhealthy}`}>
          {statusIcon} System Status: {statusText}
        </div>

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

        <button className={styles.refreshBtn} onClick={fetchHealthData}>
          🔄 Refresh
        </button>

        <div className={styles.timestamp}>
          Last Updated: {new Date(healthData.details.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
