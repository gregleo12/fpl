'use client';

import type { CaptainPickData } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: CaptainPickData[];
}

export function CaptainPicks({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>⭐ Captain Picks</h3>
        <div className={styles.noData}>No captain data available</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>⭐ Captain Picks</h3>
      <div className={styles.content}>
        {data.slice(0, 5).map((captain, index) => (
          <div key={captain.player_id} className={styles.item}>
            <div className={styles.itemRank}>{index + 1}</div>
            <div className={styles.itemInfo}>
              <div className={styles.itemName}>{captain.player_name}</div>
              <div className={styles.itemMeta}>{captain.team_name}</div>
            </div>
            <div className={styles.itemStats}>
              <div className={styles.itemStat}>
                <span className={styles.statValue}>{captain.percentage.toFixed(0)}%</span>
                <span className={styles.statLabel}>owned</span>
              </div>
              <div className={styles.itemStat}>
                <span className={styles.statValue}>{captain.avg_points.toFixed(1)}</span>
                <span className={styles.statLabel}>pts avg</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
