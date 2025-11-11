'use client';

import type { ChipData } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: ChipData[];
}

const CHIP_EMOJI: Record<string, string> = {
  'bboost': '⚡',
  '3xc': '🎯',
  'freehit': '🎲',
  'wildcard': '🃏',
};

export function ChipsPlayed({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🎮 Chips Played</h3>
        <div className={styles.noData}>Chip data not synced yet - visit Rankings tab to refresh</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>🎮 Chips Played</h3>
      <div className={styles.chipGrid}>
        {data.map((chip) => (
          <div key={chip.chip_name} className={styles.chipCard}>
            <div className={styles.chipIcon}>{CHIP_EMOJI[chip.chip_name] || '🎮'}</div>
            <div className={styles.chipName}>{chip.chip_display}</div>
            <div className={styles.chipCount}>{chip.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
