'use client';

import { useState } from 'react';
import type { CaptainLeaderboardData } from '../SeasonView';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

interface Props {
  data: CaptainLeaderboardData[];
}

export function CaptainLeaderboard({ data }: Props) {
  const [showModal, setShowModal] = useState(false);

  // Render function for items (used by both card and modal)
  const renderItem = (item: CaptainLeaderboardData, index: number) => (
    <div className={styles.listItem}>
      <div className={styles.rank}>{index + 1}</div>
      <div className={styles.info}>
        <div className={styles.name}>{item.player_name}</div>
        <div className={styles.meta}>{item.team_name}</div>
      </div>
      <div className={styles.stats}>
        <div className={styles.statValue}>
          {item.total_points}
          <span className={styles.percentage}> ({item.percentage}%)</span>
        </div>
        <div className={styles.statLabel}>pts</div>
      </div>
    </div>
  );

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>⭐ Captain Points</h4>
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
        <h4 className={styles.cardTitle}>⭐ Captain Points</h4>
        <div className={styles.list}>
          {data.slice(0, 5).map((item, index) => (
            <div key={item.entry_id}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
        <div className={styles.clickHint}>Click to view full rankings</div>
      </div>

      <FullRankingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Captain Points - Full Rankings"
        icon="⭐"
        data={data}
        renderItem={renderItem}
      />
    </>
  );
}
