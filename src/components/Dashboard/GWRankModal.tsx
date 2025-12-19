'use client';

import { StatTileModal } from './StatTileModal';
import { useState, useEffect } from 'react';
import styles from './GWRankModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gameweek: number;
  leagueId: string;
  myTeamId: string;
}

interface GWRankData {
  currentRank: number;
  topPercent: number;
  bestRank: { rank: number; gw: number };
  worstRank: { rank: number; gw: number };
  averageRank: number;
  topMillionCount: { count: number; total: number };
}

// Helper to format large numbers (1,234,567 or 1.2M)
function formatRank(rank: number): string {
  if (rank >= 1000000) {
    return `${(rank / 1000000).toFixed(1)}M`;
  }
  return rank.toLocaleString();
}

// Helper to get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) {
    return num.toLocaleString() + 'st';
  }
  if (j === 2 && k !== 12) {
    return num.toLocaleString() + 'nd';
  }
  if (j === 3 && k !== 13) {
    return num.toLocaleString() + 'rd';
  }
  return num.toLocaleString() + 'th';
}

export function GWRankModal({ isOpen, onClose, gameweek, leagueId, myTeamId }: Props) {
  const [data, setData] = useState<GWRankData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRankData() {
      if (!isOpen) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/team/${myTeamId}/gw-rank-stats?leagueId=${leagueId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch GW rank data');
        }

        const rankData = await response.json();
        setData(rankData);
      } catch (error) {
        console.error('Error fetching GW rank data:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRankData();
  }, [isOpen, myTeamId, leagueId]);

  return (
    <StatTileModal isOpen={isOpen} onClose={onClose} title={`GW Rank`} icon="🏆">
      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : data ? (
        <div className={styles.content}>
          {/* Big Rank Number */}
          <div className={styles.rankSection}>
            <div className={styles.rank}>{getOrdinalSuffix(data.currentRank)}</div>
            <div className={styles.rankLabel}>GLOBAL RANK</div>
          </div>

          {/* Top % Badge */}
          <div className={styles.percentBadge}>
            <span className={styles.percentText}>Top {data.topPercent.toFixed(1)}%</span>
          </div>

          <div className={styles.divider}></div>

          {/* Season Stats */}
          <div className={styles.infoSection}>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Best GW Rank:</div>
              <div className={`${styles.infoValue} ${styles.positive}`}>
                {formatRank(data.bestRank.rank)} (GW{data.bestRank.gw})
              </div>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Worst GW Rank:</div>
              <div className={`${styles.infoValue} ${styles.negative}`}>
                {formatRank(data.worstRank.rank)} (GW{data.worstRank.gw})
              </div>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Average GW Rank:</div>
              <div className={styles.infoValue}>
                {formatRank(data.averageRank)}
              </div>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>GWs in Top 1M:</div>
              <div className={`${styles.infoValue} ${data.topMillionCount.count > 0 ? styles.positive : ''}`}>
                {data.topMillionCount.count} / {data.topMillionCount.total}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.error}>Failed to load rank data</div>
      )}
    </StatTileModal>
  );
}
