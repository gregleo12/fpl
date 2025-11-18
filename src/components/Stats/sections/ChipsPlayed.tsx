'use client';

import type { ChipData } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: ChipData[];
}

const CHIP_ICONS: Record<string, string> = {
  'BB': '🎯',
  'TC': '⭐',
  'WC': '🔄',
  'FH': '⚡',
};

export function ChipsPlayed({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🎮 Chips Played</h3>
        <div className={styles.noData}>No chips played this gameweek</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>🎮 Chips Played</h3>
      <div className={styles.subtitle}>
        {data.length} manager{data.length !== 1 ? 's' : ''} played chip{data.length !== 1 ? 's' : ''}
      </div>

      <div className={styles.compactList}>
        {data.map((manager) => (
          <div key={manager.entry_id} className={styles.compactItem}>
            <div className={styles.compactInfo}>
              <div className={styles.itemName}>{manager.player_name}</div>
            </div>
            <div className={styles.chipBadge}>
              <span className={styles.chipIcon}>
                {CHIP_ICONS[manager.chip_display] || '🎮'}
              </span>
              {manager.chip_display}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
