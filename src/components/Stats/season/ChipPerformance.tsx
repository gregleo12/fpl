'use client';
import { useState } from 'react';
import styles from './Leaderboard.module.css';

export interface ChipPerformanceData {
  chipsPlayed: Array<{
    entry_id: number;
    player_name: string;
    team_name: string;
    chip_count: number;
    chips_detail: string;
  }>;
  chipsFaced: Array<{
    entry_id: number;
    player_name: string;
    team_name: string;
    chips_faced_count: number;
    chips_faced_detail: string;
  }>;
}

interface Props {
  data: ChipPerformanceData;
}

export function ChipPerformance({ data }: Props) {
  const [view, setView] = useState<'played' | 'faced'>('played');

  const currentData = view === 'played' ? data.chipsPlayed : data.chipsFaced;
  const isEmpty = !currentData || currentData.length === 0;

  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>🎮 Chip Performance</h4>

      {/* Toggle */}
      <div className={styles.toggle}>
        <button
          className={`${styles.toggleButton} ${view === 'played' ? styles.active : ''}`}
          onClick={() => setView('played')}
        >
          Chips Played
        </button>
        <button
          className={`${styles.toggleButton} ${view === 'faced' ? styles.active : ''}`}
          onClick={() => setView('faced')}
        >
          Chips Faced
        </button>
      </div>

      {isEmpty ? (
        <div className={styles.noData}>
          No chips {view === 'played' ? 'played' : 'faced'} yet
        </div>
      ) : (
        <div className={styles.list}>
          {view === 'played' && currentData.map((manager: any, index) => (
            <div key={manager.entry_id} className={styles.listItem}>
              <div className={styles.rank}>{index + 1}</div>
              <div className={styles.info}>
                <div className={styles.name}>{manager.player_name}</div>
                <div className={styles.meta}>{manager.team_name}</div>
                <div className={styles.chips}>{manager.chips_detail}</div>
              </div>
              <div className={styles.stats}>
                <div className={styles.statValue}>{manager.chip_count}</div>
                <div className={styles.statLabel}>chips</div>
              </div>
            </div>
          ))}

          {view === 'faced' && currentData.map((manager: any, index) => (
            <div key={manager.entry_id} className={styles.listItem}>
              <div className={styles.rank}>{index + 1}</div>
              <div className={styles.info}>
                <div className={styles.name}>{manager.player_name}</div>
                <div className={styles.meta}>{manager.team_name}</div>
                <div className={styles.chips}>{manager.chips_faced_detail}</div>
              </div>
              <div className={styles.stats}>
                <div className={styles.statValue}>{manager.chips_faced_count}</div>
                <div className={styles.statLabel}>faced</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
