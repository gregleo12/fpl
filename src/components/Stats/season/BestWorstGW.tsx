'use client';

import { useState } from 'react';
import type { BestGameweekData } from '../SeasonView';
import styles from './Leaderboard.module.css';

interface Props {
  bestData: BestGameweekData[];
  worstData: BestGameweekData[];
}

export function BestWorstGW({ bestData, worstData }: Props) {
  const [view, setView] = useState<'best' | 'worst'>('best');

  const data = view === 'best' ? bestData : worstData;
  const title = view === 'best' ? '🔥 Best Gameweeks' : '💀 Worst Gameweeks';

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>{title}</h4>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h4 className={styles.cardTitle}>{title}</h4>
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
      </div>
      <div className={styles.list}>
        {data.slice(0, 5).map((item, index) => (
          <div key={`${item.entry_id}-${item.event}`} className={styles.listItem}>
            <div className={styles.rank}>{index + 1}</div>
            <div className={styles.info}>
              <div className={styles.name}>{item.player_name}</div>
              <div className={styles.meta}>GW{item.event}</div>
            </div>
            <div className={styles.stats}>
              <div className={styles.statValue}>{item.points}</div>
              <div className={styles.statLabel}>pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
