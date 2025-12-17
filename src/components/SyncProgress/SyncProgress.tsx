'use client';

import styles from './SyncProgress.module.css';

interface SyncProgressProps {
  percent: number;
  message: string;
}

export function SyncProgress({ percent, message }: SyncProgressProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Loading League Data</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className={styles.percent}>{percent}%</p>

        <p className={styles.hint}>
          This only happens once. Future visits will be instant.
        </p>
      </div>
    </div>
  );
}
