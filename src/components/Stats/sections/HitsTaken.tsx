'use client';

import type { HitData } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: HitData;
}

export function HitsTaken({ data }: Props) {
  if (!data || data.total_managers === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>💸 Hits Taken</h3>
        <div className={styles.noData}>Data not available - visit Rankings to sync</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>💸 Hits Taken</h3>
      <div className={styles.subtitle}>
        Transfer cost deductions this gameweek
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{data.managers_with_hits}</div>
          <div className={styles.statLabel}>Managers with hits</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{data.percentage_with_hits.toFixed(1)}%</div>
          <div className={styles.statLabel}>% of league</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>-{data.avg_hit_cost.toFixed(1)}</div>
          <div className={styles.statLabel}>Average hit</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>-{data.max_hit}</div>
          <div className={styles.statLabel}>Biggest hit</div>
        </div>
      </div>
    </div>
  );
}
