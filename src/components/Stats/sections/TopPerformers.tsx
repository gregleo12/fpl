'use client';

import type { TopPerformer } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: TopPerformer[];
  totalManagers: number;
}

export function TopPerformers({ data, totalManagers }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🌟 Top Performers</h3>
        <div className={styles.noData}>Data not available - visit Rankings to sync</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>🌟 Top Performers</h3>
      <div className={styles.subtitle}>
        Highest scoring players this gameweek
      </div>
      <div className={styles.content}>
        {data.map((player, index) => (
          <div key={player.player_id} className={styles.item}>
            <div className={styles.itemRank}>{index + 1}</div>
            <div className={styles.itemInfo}>
              <div className={styles.itemName}>{player.player_name}</div>
            </div>
            <div className={styles.itemStats}>
              <div className={styles.itemStat}>
                <span className={styles.statValue}>{player.points}</span>
                <span className={styles.statLabel}>pts</span>
              </div>
              <div className={styles.itemStat}>
                <span className={styles.statValue}>
                  {player.ownership_count}/{totalManagers}
                </span>
                <span className={styles.statLabel}>managers</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
