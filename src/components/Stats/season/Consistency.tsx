'use client';

import type { ConsistencyData } from '../SeasonView';
import styles from './Leaderboard.module.css';

interface Props {
  data: ConsistencyData[];
}

export function Consistency({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>📊 Most Consistent</h4>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>📊 Most Consistent</h4>
      <div className={styles.subtitle}>Lowest score variation</div>
      <div className={styles.list}>
        {data.slice(0, 5).map((item, index) => (
          <div key={item.entry_id} className={styles.listItem}>
            <div className={styles.rank}>{index + 1}</div>
            <div className={styles.info}>
              <div className={styles.name}>{item.player_name}</div>
              <div className={styles.meta}>Avg: {item.average_score} pts</div>
            </div>
            <div className={styles.stats}>
              <div className={styles.statValue}>±{item.std_deviation}</div>
              <div className={styles.statLabel}>std dev</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
