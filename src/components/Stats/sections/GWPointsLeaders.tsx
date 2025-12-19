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
                  <div className={styles.itemDetail}>{manager.team_name}</div>
                </div>
              </div>
            </div>
            <div className={styles.compactValue}>
              <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#00ff87' }}>
                {manager.points}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                pts
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
