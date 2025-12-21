'use client';

import { Sparkles, Target, Star, RefreshCw, Zap } from 'lucide-react';
import type { ChipData } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: ChipData[];
}

const CHIP_ICON_COMPONENTS: Record<string, any> = {
  'BB': Target,
  'TC': Star,
  'WC': RefreshCw,
  'FH': Zap,
};

export function ChipsPlayed({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="#00ff87" /> Chips Played
        </h3>
        <div className={styles.noData}>No chips played this gameweek</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles size={18} color="#00ff87" /> Chips Played
      </h3>
      <div className={styles.subtitle}>
        {data.length} manager{data.length !== 1 ? 's' : ''} played chip{data.length !== 1 ? 's' : ''}
      </div>

      <div className={styles.compactList}>
        {data.map((manager) => {
          const IconComponent = CHIP_ICON_COMPONENTS[manager.chip_display] || Sparkles;
          return (
            <div key={manager.entry_id} className={styles.compactItem}>
              <div className={styles.compactInfo}>
                <div className={styles.itemName}>{manager.player_name}</div>
              </div>
              <div className={styles.chipBadge}>
                <IconComponent size={14} color="#00ff87" className={styles.chipIcon} />
                {manager.chip_display}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
