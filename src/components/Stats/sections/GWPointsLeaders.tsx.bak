'use client';

import { Trophy } from 'lucide-react';
import styles from './Section.module.css';

export interface GWRanking {
  rank: number;
  entry_id: number;
  player_name: string;
  team_name: string;
  points: number;
}

interface Props {
  data: GWRanking[];
  onViewFullRankings: () => void;
}

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

export function GWPointsLeaders({ data, onViewFullRankings }: Props) {
  console.log('[K-109 Phase 3] GWPointsLeaders received data:', {
    dataExists: !!data,
    dataLength: data?.length || 0,
    topThree: data?.slice(0, 3).map(m => ({ name: m.player_name, points: m.points })) || []
  });

  if (!data || data.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trophy size={18} color="#00ff87" /> GW Points Leaders
        </h3>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  // Show top 3
  const topThree = data.slice(0, 3);

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Trophy size={18} color="#00ff87" /> GW Points Leaders
      </h3>
      <div className={styles.subtitle}>
        Top {topThree.length} highest scorers this gameweek
      </div>

      <div className={styles.compactList}>
        {topThree.map((manager, index) => (
          <div key={manager.entry_id} className={styles.compactItem}>
            <div className={styles.compactInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{MEDAL_ICONS[index]}</span>
                <div>
                  <div className={styles.itemName}>{manager.player_name}</div>
                  <div className={styles.itemMeta}>{manager.team_name}</div>
                </div>
              </div>
            </div>
            <div className={styles.compactValue}>
              <div className={styles.statValue}>
                {manager.points} <span style={{ fontSize: '0.625rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>PTS</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        className={styles.expandButton}
        onClick={onViewFullRankings}
      >
        View Full Rankings →
      </button>
    </div>
  );
}
