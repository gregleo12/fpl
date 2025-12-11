'use client';

import styles from './QuickStats.module.css';

interface Props {
  points: number;
  rank: number;
  transfers: number;
  hitCost: number;
}

export function QuickStats({ points, rank, transfers, hitCost }: Props) {
  return (
    <div className={styles.quickStats}>
      <div className={styles.statItem}>
        <div className={styles.statValue}>{points}</div>
        <div className={styles.statLabel}>POINTS</div>
      </div>
      <div className={styles.statDivider}></div>
      <div className={styles.statItem}>
        <div className={styles.statValue}>
          {rank > 0 ? `#${(rank / 1000000).toFixed(1)}M` : '-'}
        </div>
        <div className={styles.statLabel}>RANK</div>
      </div>
      <div className={styles.statDivider}></div>
      <div className={styles.statItem}>
        <div className={styles.statValue}>
          {transfers}
          {hitCost > 0 && <span className={styles.hitCost}> (-{hitCost})</span>}
        </div>
        <div className={styles.statLabel}>TRANSFERS</div>
      </div>
    </div>
  );
}
