'use client';

import styles from './TeamHeader.module.css';

interface Props {
  managerName: string;
  teamName: string;
  points?: number;
  rank?: number;
  transfers?: number;
  hitCost?: number;
}

export function TeamHeader({ managerName, teamName, points, rank, transfers, hitCost }: Props) {
  const hasStats = points !== undefined && rank !== undefined && transfers !== undefined;

  return (
    <div className={styles.teamHeader}>
      <div className={styles.teamInfo}>
        <h2 className={styles.teamName}>{teamName}</h2>
        <p className={styles.managerName}>{managerName}</p>
      </div>

      {hasStats && (
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{points}</div>
            <div className={styles.statLabel}>pts</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>
              {rank > 0 ? `#${(rank / 1000000).toFixed(1)}M` : '-'}
            </div>
            <div className={styles.statLabel}>rank</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>
              {transfers}
              {hitCost !== undefined && hitCost > 0 && (
                <span className={styles.hitCost}> (-{hitCost})</span>
              )}
            </div>
            <div className={styles.statLabel}>transfers</div>
          </div>
        </div>
      )}
    </div>
  );
}
