'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import type { CaptainLeaderboardData } from '../SeasonView';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

interface Props {
  data: CaptainLeaderboardData[];
}

export function CaptainLeaderboard({ data }: Props) {
  const [showTotal, setShowTotal] = useState(true); // K-127: Toggle for Total vs %
  const [showModal, setShowModal] = useState(false);

  // K-127: Sort data based on toggle
  const sortedData = showTotal
    ? [...data].sort((a, b) => b.total_points - a.total_points)  // Rank by total captain points
    : [...data].sort((a, b) => b.percentage - a.percentage);      // Rank by % of total

  // Render function for items (used by both card and modal)
  const renderItem = (item: CaptainLeaderboardData, index: number) => (
    <div className={styles.listItem}>
      <div className={styles.rank}>{index + 1}</div>
      <div className={styles.info}>
        <div className={styles.name}>{item.player_name}</div>
        <div className={styles.meta}>{item.team_name}</div>
      </div>
      <div className={styles.stats}>
        {showTotal ? (
          // Show raw points (primary) + percentage (secondary)
          <>
            <div className={styles.statValue}>
              {item.total_points} <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>PTS</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.125rem' }}>
              {item.percentage}%
            </div>
          </>
        ) : (
          // Show percentage (primary) + raw points (secondary)
          <>
            <div className={styles.statValue}>
              {item.percentage}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.125rem' }}>
              {item.total_points} PTS
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star size={18} color="#00ff87" /> Captain Points
          </h4>
        </div>
        <div className={styles.subtitle}>
          Total points from captain picks
        </div>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Star size={18} color="#00ff87" /> Captain Points
    </div>
  );

  return (
    <>
      <div
        className={`${styles.card} ${styles.clickable}`}
        onClick={() => setShowModal(true)}
      >
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{title}</h4>
          <div className={styles.toggle} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.toggleButton} ${showTotal ? styles.active : ''}`}
              onClick={() => setShowTotal(true)}
            >
              Total
            </button>
            <button
              className={`${styles.toggleButton} ${!showTotal ? styles.active : ''}`}
              onClick={() => setShowTotal(false)}
            >
              % of Total
            </button>
          </div>
        </div>
        <div className={styles.subtitle}>
          Total points from captain picks
        </div>

        <div className={styles.list}>
          {sortedData.slice(0, 3).map((item, index) => (
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
        icon={<Star size={18} color="#00ff87" />}
        data={sortedData}
        renderItem={renderItem}
      />
    </>
  );
}
