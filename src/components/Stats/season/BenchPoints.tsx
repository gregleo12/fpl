'use client';

import { useState } from 'react';
import { Armchair } from 'lucide-react';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

export interface BenchPointsData {
  entry_id: number;
  player_name: string;
  team_name: string;
  total_bench_points: number;
  total_points: number;
  bench_percentage: number;
}

interface Props {
  data: BenchPointsData[];
  myTeamId?: string;
}

export function BenchPoints({ data, myTeamId }: Props) {
  const [showTotal, setShowTotal] = useState(true);
  const [showModal, setShowModal] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Armchair size={18} color="#00ff87" /> Bench Points
            </div>
          </h4>
        </div>
        <div className={styles.subtitle}>Points left on the bench</div>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  // Sort data based on toggle
  const sortedData = showTotal
    ? [...data].sort((a, b) => b.total_bench_points - a.total_bench_points)  // Rank by raw points
    : [...data].sort((a, b) => b.bench_percentage - a.bench_percentage);    // Rank by percentage

  const top5 = sortedData.slice(0, 5);

  const IconComponent = Armchair;
  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <IconComponent size={18} color="#00ff87" /> Bench Points
    </div>
  );

  // Render function for items (used by both card and modal)
  const renderItem = (item: BenchPointsData, index: number) => {
    const isMyTeam = myTeamId && item.entry_id.toString() === myTeamId;

    return (
      <div className={styles.listItem}>
        <div className={styles.rank}>{index + 1}</div>
        <div className={styles.info}>
          <div className={styles.name}>
            {item.player_name} {isMyTeam && '★'}
          </div>
          <div className={styles.meta}>{item.team_name}</div>
        </div>
        <div className={styles.stats}>
          {showTotal ? (
            // Show raw points (primary) + percentage (secondary)
            <>
              <div className={styles.statValue}>
                {item.total_bench_points} <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>PTS</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.125rem' }}>
                {item.bench_percentage}%
              </div>
            </>
          ) : (
            // Show percentage (primary) + raw points (secondary)
            <>
              <div className={styles.statValue}>
                {item.bench_percentage}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.125rem' }}>
                {item.total_bench_points} PTS
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`${styles.card} ${styles.clickable}`} onClick={() => setShowModal(true)}>
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
          Points left on the bench
        </div>

        <div className={styles.list}>
          {top5.map((item, index) => (
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
        title={`Bench Points - Full Rankings${showTotal ? ' (Total)' : ' (% of Total)'}`}
        icon={<IconComponent size={18} color="#00ff87" />}
        data={sortedData}
        renderItem={renderItem}
      />
    </>
  );
}
