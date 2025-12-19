'use client';

import { StatTileModal } from './StatTileModal';
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

interface RankThreshold {
  rank: number;
  points: number;
  gap: number;
}

// Target ranks to show in Points Gap Table
const TARGET_RANKS = [1, 100, 1000, 5000, 10000, 50000, 100000, 200000, 500000, 1000000];

export function PointsAnalysisModal({ isOpen, onClose, data }: Props) {
  // Use estimated thresholds based on typical FPL distributions (GW16 2024/25)
  // TODO: Fetch actual rank data from FPL API or calculate from user's overall_rank
  const rankThresholds: RankThreshold[] = [
    { rank: 1, points: 1200, gap: 0 },
    { rank: 100, points: 1050, gap: 0 },
    { rank: 1000, points: 950, gap: 0 },
    { rank: 5000, points: 850, gap: 0 },
    { rank: 10000, points: 800, gap: 0 },
    { rank: 50000, points: 700, gap: 0 },
    { rank: 100000, points: 650, gap: 0 },
    { rank: 200000, points: 600, gap: 0 },
    { rank: 500000, points: 500, gap: 0 },
    { rank: 1000000, points: 400, gap: 0 },
  ];

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
  const worstGW = data.reduce((min, d) => d.points < min.points ? d : min, data[0]);

  // Calculate cumulative for GW breakdown table
  let cumulative = 0;
  const chartData = data.map(d => {
    cumulative += d.points;
    return { event: d.event, points: d.points, cumulative };
  });

  // Calculate gaps for rank thresholds
  const thresholdsWithGaps = rankThresholds.map(t => ({
    ...t,
    gap: t.points - totalPoints
  }));

  // Format rank for display (1M, 100K, etc.)
  const formatRank = (rank: number): string => {
    if (rank >= 1000000) return (rank / 1000000).toFixed(0) + 'M';
    if (rank >= 1000) return (rank / 1000).toFixed(0) + 'K';
    return rank.toString();
  };

  return (
    <StatTileModal isOpen={isOpen} onClose={onClose} title="Total Points Analysis" icon="⭐">
      {/* Summary Stats - 4 columns */}
      <div className={styles.summaryRowFour}>
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
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{worstGW.points}</span>
          <span className={styles.summaryLabel}>Worst (GW{worstGW.event})</span>
        </div>
      </div>

      {/* Points Gap Table */}
      <div className={styles.gapTableSection}>
        <h4 className={styles.sectionTitle}>Points Gap to Ranks</h4>
        <div className={styles.gapTableContainer}>
          <div className={styles.gapTableHeader}>
            <span className={styles.gapColRank}>Rank</span>
            <span className={styles.gapColPoints}>Points</span>
            <span className={styles.gapColGap}>Gap</span>
          </div>
          {thresholdsWithGaps.map(t => (
            <div key={t.rank} className={styles.gapTableRow}>
              <span className={styles.gapColRank}>{formatRank(t.rank)}</span>
              <span className={styles.gapColPoints}>{t.points.toLocaleString()}</span>
              <span className={`${styles.gapColGap} ${t.gap > 0 ? styles.behind : t.gap < 0 ? styles.ahead : ''}`}>
                {t.gap > 0 ? `+${t.gap}` : t.gap < 0 ? Math.abs(t.gap) : '—'}
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
