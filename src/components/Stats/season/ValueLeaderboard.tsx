'use client';

import { useState } from 'react';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

interface ValueData {
  entry_id: number;
  player_name: string;
  team_name: string;
  team_value: number;
  bank: number;
  total_value: number;
  value_gain: number;
}

interface Props {
  data: ValueData[];
}

export function ValueLeaderboard({ data }: Props) {
  const [showModal, setShowModal] = useState(false);

  const renderItem = (item: ValueData, index: number) => (
    <div key={item.entry_id} className={styles.listItem}>
      <div className={styles.rank}>{index + 1}</div>
      <div className={styles.info}>
        <div className={styles.name}>{item.player_name}</div>
        <div className={styles.meta}>{item.team_name}</div>
      </div>
      <div className={styles.stats}>
        <div className={styles.statValue}>
          £{item.total_value.toFixed(1)}m
        </div>
        <div className={styles.meta} style={{ fontSize: '0.6875rem', marginTop: '2px' }}>
          £{item.team_value.toFixed(1)}m + £{item.bank.toFixed(1)}m
        </div>
      </div>
    </div>
  );

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>📈 Team Value</h4>
        </div>
        <div className={styles.subtitle}>
          Total budget (squad + ITB)
        </div>
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
          <h4 className={styles.cardTitle}>📈 Team Value</h4>
        </div>
        <div className={styles.subtitle}>
          Total budget (squad + ITB)
        </div>

        <div className={styles.list}>
          {data.slice(0, 3).map((item, index) => renderItem(item, index))}
        </div>

        <div className={styles.clickHint}>Click to view full rankings</div>
      </div>

      <FullRankingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Team Value - Full Rankings"
        icon="📈"
        data={data}
        renderItem={renderItem}
      />
    </>
  );
}
