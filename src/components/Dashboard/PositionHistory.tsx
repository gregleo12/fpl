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

interface StandingEntry {
  entry_id: number;
  player_name: string;
  entry_name: string;
  rank: number;
}

interface Props {
  leagueId: string;
  entryId: string;
  standings: StandingEntry[];
  myManagerName: string;
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

export default function PositionHistory({ leagueId, entryId, standings, myManagerName }: Props) {
  const [data, setData] = useState<PositionHistoryData | null>(null);
  const [opponentData, setOpponentData] = useState<PositionHistoryData | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's position history
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

  // Fetch opponent's position history
  useEffect(() => {
    if (!selectedOpponentId) {
      setOpponentData(null);
      return;
    }

    async function fetchOpponentHistory() {
      try {
        const response = await fetch(
          `/api/league/${leagueId}/stats/position-history?entryId=${selectedOpponentId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch opponent history');
        }

        const result = await response.json();
        setOpponentData(result);
      } catch (err: any) {
        console.error('Error fetching opponent history:', err);
        setOpponentData(null);
      }
    }

    fetchOpponentHistory();
  }, [leagueId, selectedOpponentId]);

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

  // Get opponents list (excluding current user)
  const opponents = standings.filter(s => s.entry_id.toString() !== entryId);
  const selectedOpponent = opponents.find(s => s.entry_id.toString() === selectedOpponentId);

  // Merge user and opponent data for chart
  const chartData = data.positionHistory.map(userGW => {
    const oppGW = opponentData?.positionHistory.find(o => o.gameweek === userGW.gameweek);
    return {
      gameweek: userGW.gameweek,
      myRank: userGW.rank,
      opponentRank: oppGW?.rank || null
    };
  });

  /**
   * Generate Y-axis ticks for position history graph
   * - Small leagues (≤20 teams): show all ranks
   * - Large leagues (>20 teams): show ~20 evenly distributed ticks
   */
  const generateYAxisTicks = (totalTeams: number) => {
    // For small leagues, show all ranks
    if (totalTeams <= 20) {
      return Array.from({ length: totalTeams }, (_, i) => i + 1);
    }

    // For large leagues, show exactly 20 ticks spread across the range
    const maxTicks = 20;
    const ticks: number[] = [1]; // Always include rank 1 (top)

    // Calculate step size for middle ticks
    const step = (totalTeams - 1) / (maxTicks - 1);

    for (let i = 1; i < maxTicks - 1; i++) {
      const tick = Math.round(1 + (step * i));
      // Avoid duplicates
      if (tick !== ticks[ticks.length - 1] && tick !== totalTeams) {
        ticks.push(tick);
      }
    }

    // Always include last rank (bottom)
    ticks.push(totalTeams);

    return ticks;
  };

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
          <p style={{ margin: 0, marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>
            GW{data.gameweek}
          </p>
          {data.myRank && (
            <p style={{ margin: 0, color: '#00ff87', fontSize: '0.85rem' }}>
              You: {getOrdinalSuffix(data.myRank)}
            </p>
          )}
          {data.opponentRank && selectedOpponent && (
            <p style={{ margin: 0, color: '#ff4757', fontSize: '0.85rem' }}>
              {selectedOpponent.player_name}: {getOrdinalSuffix(data.opponentRank)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.section}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>League Position Over Time</h3>

        <select
          value={selectedOpponentId}
          onChange={(e) => setSelectedOpponentId(e.target.value)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            color: '#ffffff',
            fontSize: '0.85rem',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="">Compare with...</option>
          {opponents.map(opp => (
            <option key={opp.entry_id} value={opp.entry_id.toString()}>
              {opp.player_name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
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
              ticks={generateYAxisTicks(data.totalTeams)}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* User's line (green) */}
            <Line
              type="monotone"
              dataKey="myRank"
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
              connectNulls={false}
            />

            {/* Opponent's line (red) */}
            {selectedOpponentId && (
              <Line
                type="monotone"
                dataKey="opponentRank"
                stroke="#ff4757"
                strokeWidth={3}
                dot={{
                  fill: '#ff4757',
                  strokeWidth: 2,
                  stroke: '#1a1a2e',
                  r: 5
                }}
                activeDot={{
                  r: 7,
                  fill: '#ff4757',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
