'use client';

import { StatTileModal } from './StatTileModal';
import { useEffect, useState } from 'react';
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
  topPercent: string;
}

// Target ranks to show in Points Gap Table
const TARGET_RANKS = [1, 1000, 10000, 100000, 500000, 1000000, 5000000];
const TOTAL_PLAYERS = 11000000; // Approximate total FPL players

export function PointsAnalysisModal({ isOpen, onClose, data }: Props) {
  const [rankThresholds, setRankThresholds] = useState<RankThreshold[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real rank thresholds from FPL API
  useEffect(() => {
    async function fetchRankThresholds() {
      if (!isOpen) return;

      try {
        setLoading(true);

        // Fetch bootstrap-static to get total players
        const bootstrapRes = await fetch('/api/fpl-proxy');
        const bootstrapData = await bootstrapRes.json();
        const totalPlayers = bootstrapData.total_players || TOTAL_PLAYERS;

        // Fetch rank thresholds from overall league standings
        // Each page has 50 entries, so page = rank / 50
        const thresholds: RankThreshold[] = [];

        for (const targetRank of TARGET_RANKS) {
          const page = Math.ceil(targetRank / 50);
          const indexOnPage = (targetRank - 1) % 50;

          try {
            const leagueRes = await fetch(
              `/api/fpl-proxy?endpoint=leagues-classic/314/standings&page_standings=${page}`
            );
            const leagueData = await leagueRes.json();

            if (leagueData.standings?.results?.[indexOnPage]) {
              const entry = leagueData.standings.results[indexOnPage];
              const topPercent = ((targetRank / totalPlayers) * 100).toFixed(2);

              thresholds.push({
                rank: targetRank,
                points: entry.total || 0,
                gap: 0, // Will be calculated later
                topPercent: topPercent + '%'
              });
            }
          } catch (err) {
            console.error(`Error fetching rank ${targetRank}:`, err);
          }
        }

        setRankThresholds(thresholds);
      } catch (error) {
        console.error('Error fetching rank thresholds:', error);
        setRankThresholds([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRankThresholds();
  }, [isOpen]);

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
          <span className={styles.summaryValue}>{(totalPoints ?? 0).toLocaleString()}</span>
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
        {loading ? (
          <div className={styles.loading}>Loading rank thresholds...</div>
        ) : thresholdsWithGaps.length === 0 ? (
          <div className={styles.noData}>Failed to load rank data</div>
        ) : (
          <div className={styles.gapTableContainer}>
            <div className={styles.gapTableHeader}>
              <span className={styles.gapColRank}>Rank</span>
              <span className={styles.gapColTop}>Top %</span>
              <span className={styles.gapColPoints}>Points</span>
              <span className={styles.gapColGap}>Gap</span>
            </div>
            {thresholdsWithGaps.map(t => (
              <div key={t.rank} className={styles.gapTableRow}>
                <span className={styles.gapColRank}>{formatRank(t.rank)}</span>
                <span className={styles.gapColTop}>{t.topPercent}</span>
                <span className={styles.gapColPoints}>{(t.points ?? 0).toLocaleString()}</span>
                <span className={`${styles.gapColGap} ${t.gap > 0 ? styles.behind : t.gap < 0 ? styles.ahead : ''}`}>
                  {t.gap > 0 ? `+${t.gap}` : t.gap < 0 ? Math.abs(t.gap) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
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
