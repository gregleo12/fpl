'use client';

import styles from './PullToRefreshIndicator.module.css';

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullDistance: number;
  threshold?: number;
}

export function PullToRefreshIndicator({
  isRefreshing,
  pullDistance,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const opacity = Math.min(pullDistance / threshold, 1);
  const rotation = (pullDistance / threshold) * 360;

  if (!isRefreshing && pullDistance === 0) return null;

  return (
    <div
      className={styles.indicator}
      style={{
        opacity,
        transform: `translateY(${pullDistance}px)`,
      }}
    >
      <div
        className={`${styles.spinner} ${isRefreshing ? styles.spinning : ''}`}
        style={{
          transform: isRefreshing ? 'rotate(0deg)' : `rotate(${rotation}deg)`,
        }}
      >
        🔄
      </div>
    </div>
  );
}
