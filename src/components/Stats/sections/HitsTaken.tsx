'use client';

import { Zap } from 'lucide-react';
import type { HitData } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: HitData[];
}

export function HitsTaken({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={18} color="#00ff87" /> Hits Taken
        </h3>
        <div className={styles.noData}>No hits taken this gameweek</div>
      </div>
    );
  }

  const totalHits = data.reduce((sum, m) => sum + m.hits_taken, 0);
  const managersCount = data.length;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Zap size={18} color="#00ff87" /> Hits Taken
      </h3>
      <div className={styles.subtitle}>
        {totalHits} hit{totalHits !== 1 ? 's' : ''} by {managersCount} manager{managersCount !== 1 ? 's' : ''}
      </div>

      <div className={styles.compactList}>
        {data.map((manager) => (
          <div key={manager.entry_id} className={styles.compactItem}>
            <div className={styles.compactInfo}>
              <div className={styles.itemName}>{manager.player_name}</div>
            </div>
            <div className={styles.compactBadge}>
              -{manager.hits_taken * 4} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
