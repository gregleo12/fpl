'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import styles from './Dashboard.module.css';

interface PositionHistoryData {
  positionHistory: Array<{ gameweek: number; rank: number }>;
  currentGW: number;
  totalTeams: number;
}

interface Props {
  leagueId: string;
  entryId: string;
}

// Helper to get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) {
    return num + 'st';
  }
  if (j === 2 && k !== 12) {
    return num + 'nd';
  }
  if (j === 3 && k !== 13) {
    return num + 'rd';
  }
  return num + 'th';
}

export default function PositionHistory({ leagueId, entryId }: Props) {
  const [data, setData] = useState<PositionHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPositionHistory() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/league/${leagueId}/stats/position-history?entryId=${entryId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch position history');
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        console.error('Error fetching position history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPositionHistory();
  }, [leagueId, entryId]);

  if (loading) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>League Position Over Time</h3>
        <div className={styles.emptyState}>Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>League Position Over Time</h3>
        <div className={styles.emptyState}>
          {error || 'Failed to load position history'}
        </div>
      </div>
    );
  }

  if (data.positionHistory.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>League Position Over Time</h3>
        <div className={styles.emptyState}>
          No position history available yet
        </div>
      </div>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: 'rgba(26, 26, 46, 0.95)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 255, 135, 0.3)',
            color: '#ffffff'
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>
            GW{data.gameweek}: {getOrdinalSuffix(data.rank)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>League Position Over Time</h3>

      <div style={{ width: '100%', height: 300, marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data.positionHistory}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.1)"
            />
            <XAxis
              dataKey="gameweek"
              stroke="rgba(255, 255, 255, 0.7)"
              tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
              tickFormatter={(value) => `GW${value}`}
            />
            <YAxis
              reversed={true}
              domain={[1, data.totalTeams]}
              stroke="rgba(255, 255, 255, 0.7)"
              tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
              tickFormatter={(value) => getOrdinalSuffix(value)}
              ticks={Array.from({ length: Math.min(data.totalTeams, 10) }, (_, i) =>
                Math.ceil((i / 9) * (data.totalTeams - 1)) + 1
              )}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="rank"
              stroke="#00ff87"
              strokeWidth={3}
              dot={{
                fill: '#00ff87',
                strokeWidth: 2,
                stroke: '#1a1a2e',
                r: 5
              }}
              activeDot={{
                r: 7,
                fill: '#00ff87',
                stroke: '#ffffff',
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
