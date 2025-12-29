'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

export interface ClassicPtsData {
  entry_id: number;
  player_name: string;
  team_name: string;
  total_points: number;
  pts_rank: number;
  h2h_rank: number;
  variance: number; // h2h_rank - pts_rank (negative = better in H2H, positive = worse in H2H)
}

interface Props {
  data: ClassicPtsData[];
  myTeamId?: string;
}

export function ClassicPts({ data, myTeamId }: Props) {
  const [showModal, setShowModal] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="#00ff87" /> Classic Pts
            </div>
          </h4>
        </div>
        <div className={styles.subtitle}>Points standings vs H2H rank</div>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  const IconComponent = TrendingUp;
  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <IconComponent size={18} color="#00ff87" /> Classic Pts
    </div>
  );

  const getVarianceColor = (variance: number) => {
    if (variance < 0) return '#00ff87'; // Green - doing better in H2H than points
    if (variance > 0) return '#ff4444'; // Red - doing worse in H2H than points
    return 'rgba(255, 255, 255, 0.6)'; // White/neutral - ranks match
  };

  const getVarianceDisplay = (variance: number) => {
    if (variance === 0) return '—';
    const sign = variance > 0 ? '+' : '';
    return `${sign}${variance}`;
  };

  // Render function for items (used by both card and modal)
  const renderItem = (item: ClassicPtsData, index: number) => {
    const isMyTeam = myTeamId && item.entry_id.toString() === myTeamId;
    const varianceColor = getVarianceColor(item.variance);
    const varianceDisplay = getVarianceDisplay(item.variance);

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
          <div className={styles.statValue}>
            {item.total_points} <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>PTS</span>
          </div>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: varianceColor,
            marginTop: '0.125rem'
          }}>
            {varianceDisplay}
          </div>
        </div>
      </div>
    );
  };

  const top5 = data.slice(0, 5);

  return (
    <>
      <div className={`${styles.card} ${styles.clickable}`} onClick={() => setShowModal(true)}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{title}</h4>
        </div>
        <div className={styles.subtitle}>
          Points standings vs H2H rank
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
        title="Classic Pts - Full Rankings"
        icon={<IconComponent size={18} color="#00ff87" />}
        data={data}
        renderItem={renderItem}
      />
    </>
  );
}
