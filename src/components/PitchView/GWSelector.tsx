'use client';

import styles from './GWSelector.module.css';

interface Props {
  selectedGW: number;
  maxGW: number;
  onGWChange: (gw: number) => void;
}

export function GWSelector({ selectedGW, maxGW, onGWChange }: Props) {
  return (
    <div className={styles.gwSelector}>
      <button
        className={styles.gwButton}
        onClick={() => onGWChange(Math.max(1, selectedGW - 1))}
        disabled={selectedGW <= 1}
      >
        ←
      </button>

      <div className={styles.gwDisplay}>
        <span className={styles.gwLabel}>GW</span>
        <span className={styles.gwNumber}>{selectedGW}</span>
      </div>

      <button
        className={styles.gwButton}
        onClick={() => onGWChange(Math.min(maxGW, selectedGW + 1))}
        disabled={selectedGW >= maxGW}
      >
        →
      </button>
    </div>
  );
}
