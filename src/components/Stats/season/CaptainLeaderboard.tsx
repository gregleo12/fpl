'use client';

import type { CaptainLeaderboardData } from '../SeasonView';
import styles from './Leaderboard.module.css';

interface Props {
  data: CaptainLeaderboardData[];
}

export function CaptainLeaderboard({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>⭐ Captain Points</h4>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>⭐ Captain Points</h4>
      <div className={styles.list}>
        {data.slice(0, 5).map((item, index) => (
          <div key={item.entry_id} className={styles.listItem}>
            <div className={styles.rank}>{index + 1}</div>
            <div className={styles.info}>
              <div className={styles.name}>{item.player_name}</div>
              <div className={styles.meta}>{item.team_name}</div>
            </div>
            <div className={styles.stats}>
              <div className={styles.statValue}>{item.total_points}</div>
              <div className={styles.statLabel}>pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
