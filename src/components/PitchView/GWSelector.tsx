'use client';

import styles from './GWSelector.module.css';
import { RotateCw } from 'lucide-react';

interface Props {
  selectedGW: number;
  maxGW: number;
  onGWChange: (gw: number) => void;
  isLive?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function GWSelector({ selectedGW, maxGW, onGWChange, isLive = false, onRefresh, isRefreshing = false }: Props) {
  return (
    <div className={styles.gwSelector}>
      {/* K-68: Desktop Refresh Button (left of GW selector) */}
      {onRefresh && (
        <button
          className={`${styles.refreshButton} ${isRefreshing ? styles.spinning : ''}`}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh data"
          aria-label="Refresh data"
        >
          <RotateCw size={18} />
        </button>
      )}

      <button
        className={styles.gwButton}
        onClick={() => onGWChange(Math.max(1, selectedGW - 1))}
        disabled={selectedGW <= 1}
      >
        ◄
      </button>

      <div className={styles.gwDisplay}>
        <span className={styles.gwLabel}>GW</span>
        <span
          className={`${styles.gwNumber} ${isLive ? styles.gwNumberLive : ''}`}
          title={isLive ? "Live match" : undefined}
        >
          {selectedGW}
        </span>
      </div>

      <button
        className={styles.gwButton}
        onClick={() => onGWChange(Math.min(maxGW, selectedGW + 1))}
        disabled={selectedGW >= maxGW}
      >
        ►
      </button>
    </div>
  );
}
