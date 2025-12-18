'use client';

import { StatTileModal } from './StatTileModal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './RankModals.module.css';

interface PointsData {
  event: number;
  points: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: PointsData[];
}

const MILESTONES = [500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500];

export function PointsAnalysisModal({ isOpen, onClose, data }: Props) {
  if (!data || data.length === 0) {
    return (
      <StatTileModal isOpen={isOpen} onClose={onClose} title="Total Points Analysis" icon="⭐">
        <div className={styles.noData}>No points data available</div>
      </StatTileModal>
    );
  }

  const totalPoints = data.reduce((sum, d) => sum + d.points, 0);
  const avgPerGW = (totalPoints / data.length).toFixed(1);
  const bestGW = data.reduce((max, d) => d.points > max.points ? d : max, data[0]);

  // Calculate cumulative points for chart
  let cumulative = 0;
  const chartData = data.map(d => {
    cumulative += d.points;
    return { event: d.event, points: d.points, cumulative };
  });

  // Calculate milestones
  const milestones = MILESTONES.map(m => ({
    target: m,
    reached: totalPoints >= m,
    reachedGW: chartData.find(d => d.cumulative >= m)?.event,
    remaining: m - totalPoints
  })).filter(m => m.reached || m.remaining < 500); // Show reached + next few upcoming

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const gw = payload[0].payload;
      return (
        <div className={styles.chartTooltip}>
          <div className={styles.tooltipLabel}>GW{gw.event}</div>
          <div className={styles.tooltipValue}>GW: {gw.points} pts</div>
          <div className={styles.tooltipValue}>Total: {gw.cumulative} pts</div>
        </div>
      );
    }
    return null;
  };

  return (
    <StatTileModal isOpen={isOpen} onClose={onClose} title="Total Points Analysis" icon="⭐">
      {/* Summary Stats */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{totalPoints.toLocaleString()}</span>
          <span className={styles.summaryLabel}>Total</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{avgPerGW}</span>
          <span className={styles.summaryLabel}>Avg/GW</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{bestGW.points}</span>
          <span className={styles.summaryLabel}>Best (GW{bestGW.event})</span>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="event"
              tick={{ fill: '#fff', fontSize: 12 }}
              stroke="rgba(255, 255, 255, 0.2)"
            />
            <YAxis
              tick={{ fill: '#fff', fontSize: 12 }}
              stroke="rgba(255, 255, 255, 0.2)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#00ff87"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#00ff87' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Milestones */}
      <div className={styles.milestonesSection}>
        <h4 className={styles.sectionTitle}>Milestones</h4>
        <div className={styles.milestonesList}>
          {milestones.map(m => (
            <div key={m.target} className={`${styles.milestone} ${m.reached ? styles.reached : ''}`}>
              <span className={styles.milestoneIcon}>{m.reached ? '✓' : '○'}</span>
              <span className={styles.milestoneTarget}>{m.target} pts</span>
              <span className={styles.milestoneStatus}>
                {m.reached ? `Reached GW${m.reachedGW}` : `${m.remaining} pts away`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* GW Breakdown Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <span className={styles.colGW}>GW</span>
          <span className={styles.colPts}>Pts</span>
          <span className={styles.colRank}>Total</span>
          <span className={styles.colChange}>vs Avg</span>
        </div>
        {data.slice().reverse().map((gw) => {
          const diff = gw.points - parseFloat(avgPerGW);
          return (
            <div key={gw.event} className={styles.tableRow}>
              <span className={styles.colGW}>GW{gw.event}</span>
              <span className={styles.colPts}>{gw.points}</span>
              <span className={styles.colRank}>
                {chartData.find(d => d.event === gw.event)?.cumulative}
              </span>
              <span className={`${styles.colChange} ${diff > 0 ? styles.up : diff < 0 ? styles.down : ''}`}>
                {diff > 0 ? `+${Math.round(diff)}` : diff < 0 ? Math.round(diff) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </StatTileModal>
  );
}
