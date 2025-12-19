'use client';

import { StatTileModal } from './StatTileModal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './RankModals.module.css';

interface RankData {
  event: number;
  overall_rank: number;
  gw_rank: number;
  points: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: RankData[];
}

export function RankProgressModal({ isOpen, onClose, data }: Props) {
  if (!data || data.length === 0) {
    return (
      <StatTileModal isOpen={isOpen} onClose={onClose} title="Overall Rank Progress" icon="📊">
        <div className={styles.noData}>No rank data available</div>
      </StatTileModal>
    );
  }

  const best = data.reduce((min, d) => d.overall_rank < min.overall_rank ? d : min, data[0]);
  const worst = data.reduce((max, d) => d.overall_rank > max.overall_rank ? d : max, data[0]);
  const current = data[data.length - 1];

  // Calculate Top % (total FPL players ~12.66M)
  const TOTAL_PLAYERS = 12660000;
  const getTopPercent = (rank: number): string => {
    const percent = (rank / TOTAL_PLAYERS) * 100;
    if (percent < 0.01) return '0.01';
    if (percent < 0.1) return percent.toFixed(2);
    if (percent < 1) return percent.toFixed(1);
    return percent.toFixed(0);
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const gw = payload[0].payload;
      return (
        <div className={styles.chartTooltip}>
          <div className={styles.tooltipLabel}>GW{gw.event}</div>
          <div className={styles.tooltipValue}>Rank: {gw.overall_rank.toLocaleString()}</div>
          <div className={styles.tooltipValue}>{gw.points} pts</div>
        </div>
      );
    }
    return null;
  };

  return (
    <StatTileModal isOpen={isOpen} onClose={onClose} title="Overall Rank Progress" icon="📊">
      {/* Summary Stats */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{current.overall_rank.toLocaleString()}</span>
          <span className={styles.topPercent}>TOP {getTopPercent(current.overall_rank)}%</span>
          <span className={styles.summaryLabel}>Current</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryValue} ${styles.best}`}>{best.overall_rank.toLocaleString()}</span>
          <span className={styles.topPercent}>TOP {getTopPercent(best.overall_rank)}%</span>
          <span className={styles.summaryLabel}>Best (GW{best.event})</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryValue} ${styles.worst}`}>{worst.overall_rank.toLocaleString()}</span>
          <span className={styles.topPercent}>TOP {getTopPercent(worst.overall_rank)}%</span>
          <span className={styles.summaryLabel}>Worst (GW{worst.event})</span>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis
              dataKey="event"
              tick={{ fill: '#fff', fontSize: 12 }}
              stroke="rgba(255, 255, 255, 0.2)"
            />
            <YAxis
              reversed
              tick={{ fill: '#fff', fontSize: 12 }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              stroke="rgba(255, 255, 255, 0.2)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="overall_rank"
              stroke="#00ff87"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#00ff87' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* GW Breakdown Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <span className={styles.colGW}>GW</span>
          <span className={styles.colRank}>Rank</span>
          <span className={styles.colChange}>Change</span>
          <span className={styles.colPts}>Pts</span>
        </div>
        {data.slice().reverse().map((gw, i, arr) => {
          const prev = arr[i + 1];
          const change = prev ? prev.overall_rank - gw.overall_rank : 0;
          return (
            <div key={gw.event} className={styles.tableRow}>
              <span className={styles.colGW}>GW{gw.event}</span>
              <span className={styles.colRank}>{gw.overall_rank.toLocaleString()}</span>
              <span className={`${styles.colChange} ${change > 0 ? styles.up : change < 0 ? styles.down : ''}`}>
                {change > 0 ? `↑ ${change.toLocaleString()}` : change < 0 ? `↓ ${Math.abs(change).toLocaleString()}` : '—'}
              </span>
              <span className={styles.colPts}>{gw.points}</span>
            </div>
          );
        })}
      </div>
    </StatTileModal>
  );
}
