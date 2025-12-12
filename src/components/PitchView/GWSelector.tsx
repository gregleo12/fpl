'use client';

import styles from './GWSelector.module.css';

interface Props {
  selectedGW: number;
  maxGW: number;
  onGWChange: (gw: number) => void;
  isLive?: boolean;
}

export function GWSelector({ selectedGW, maxGW, onGWChange, isLive = false }: Props) {
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
        {isLive && <span className={styles.liveBadge}>LIVE</span>}
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
