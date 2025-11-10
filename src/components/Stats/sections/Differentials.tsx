'use client';

import type { DifferentialPlayer } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: DifferentialPlayer[];
}

export function Differentials({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>💎 Differentials</h3>
        <div className={styles.noData}>No differentials this gameweek</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>💎 Differentials</h3>
      <div className={styles.subtitle}>
        Low-owned players (&lt;25%) who scored 7+ points
      </div>
      <div className={styles.content}>
        {data.map((player, index) => (
          <div key={player.player_id} className={styles.item}>
            <div className={styles.itemRank}>{index + 1}</div>
            <div className={styles.itemInfo}>
              <div className={styles.itemName}>{player.player_name}</div>
              <div className={styles.itemMeta}>{player.team_name}</div>
            </div>
            <div className={styles.itemStats}>
              <div className={styles.itemStat}>
                <span className={styles.statValue}>{player.ownership_percentage.toFixed(0)}%</span>
                <span className={styles.statLabel}>owned</span>
              </div>
              <div className={styles.itemStat}>
                <span className={styles.statValue}>{player.avg_points.toFixed(1)}</span>
                <span className={styles.statLabel}>pts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
