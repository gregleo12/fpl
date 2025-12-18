'use client';

import { useState } from 'react';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

interface ValueData {
  entry_id: number;
  player_name: string;
  team_name: string;
  team_value: number;
  effective_value: number;
  value_gain: number;
}

interface Props {
  teamValue: ValueData[];
  effectiveValue: ValueData[];
}

export function ValueLeaderboard({ teamValue, effectiveValue }: Props) {
  const [view, setView] = useState<'team' | 'effective'>('team');
  const [showModal, setShowModal] = useState(false);

  const currentData = view === 'team' ? teamValue : effectiveValue;
  const title = view === 'team' ? 'Team Value' : 'Effective Value';

  const renderItem = (item: ValueData, index: number) => (
    <div key={item.entry_id} className={styles.listItem}>
      <div className={styles.rank}>{index + 1}</div>
      <div className={styles.info}>
        <div className={styles.name}>{item.player_name}</div>
        <div className={styles.meta}>{item.team_name}</div>
      </div>
      <div className={styles.stats}>
        <div className={styles.statValue}>
          £{(view === 'team' ? item.team_value : item.effective_value).toFixed(1)}m
        </div>
        <div className={styles.statLabel}>
          +£{item.value_gain.toFixed(1)}m
        </div>
      </div>
    </div>
  );

  if (!teamValue || teamValue.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>📈 Value Rankings</h4>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`${styles.card} ${styles.clickable}`}
        onClick={() => setShowModal(true)}
      >
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>📈 {title}</h4>
          <div className={styles.toggle} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.toggleButton} ${view === 'team' ? styles.active : ''}`}
              onClick={() => setView('team')}
            >
              Team
            </button>
            <button
              className={`${styles.toggleButton} ${view === 'effective' ? styles.active : ''}`}
              onClick={() => setView('effective')}
            >
              Eff
            </button>
          </div>
        </div>

        <div className={styles.list}>
          {currentData.slice(0, 5).map((item, index) => renderItem(item, index))}
        </div>

        <div className={styles.clickHint}>Click to view full rankings</div>
      </div>

      <FullRankingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${title} - Full Rankings`}
        icon="📈"
        data={currentData}
        renderItem={renderItem}
      />
    </>
  );
}
