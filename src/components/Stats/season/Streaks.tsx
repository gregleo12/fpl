'use client';
import { useState } from 'react';
import styles from './Leaderboard.module.css';

export interface StreakData {
  entry_id: number;
  player_name: string;
  team_name: string;
  streak: number;
  gw_range: string;
}

interface StreaksProps {
  winningStreaks: StreakData[];
  losingStreaks: StreakData[];
}

export function Streaks({ winningStreaks, losingStreaks }: StreaksProps) {
  const [view, setView] = useState<'best' | 'worst'>('best');

  const currentData = view === 'best' ? winningStreaks : losingStreaks;
  const isEmpty = !currentData || currentData.length === 0;

  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>
        {view === 'best' ? '🔥' : '💀'} Streaks
      </h4>
      <div className={styles.subtitle}>
        Longest {view === 'best' ? 'winning' : 'losing'} streaks in H2H matches
      </div>

      {/* Toggle */}
      <div className={styles.toggle}>
        <button
          className={`${styles.toggleButton} ${view === 'best' ? styles.active : ''}`}
          onClick={() => setView('best')}
        >
          Best
        </button>
        <button
          className={`${styles.toggleButton} ${view === 'worst' ? styles.active : ''}`}
          onClick={() => setView('worst')}
        >
          Worst
        </button>
      </div>

      {isEmpty ? (
        <div className={styles.noData}>
          No {view === 'best' ? 'winning' : 'losing'} streaks yet
        </div>
      ) : (
        <div className={styles.list}>
          {currentData.map((manager, index) => (
            <div key={manager.entry_id} className={styles.listItem}>
              <div className={styles.rank}>{index + 1}</div>
              <div className={styles.info}>
                <div className={styles.name}>{manager.player_name}</div>
                <div className={styles.meta}>{manager.team_name}</div>
                <div className={styles.gwRange}>{manager.gw_range}</div>
              </div>
              <div className={styles.stats}>
                <div className={styles.statValue}>{manager.streak}</div>
                <div className={styles.statLabel}>
                  {view === 'best' ? 'wins' : 'losses'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
