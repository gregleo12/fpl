'use client';

import { useState } from 'react';
import { Flame } from 'lucide-react';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

export interface FormRankingsData {
  entry_id: number;
  player_name: string;
  team_name: string;
  last5_points: number;
  form_rank: number;
  season_rank: number;
  trend: number;
}

interface Props {
  data: FormRankingsData[];
  myTeamId?: string;
}

export function FormRankings({ data, myTeamId }: Props) {
  const [showModal, setShowModal] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} color="#00ff87" /> Form Rankings
            </div>
          </h4>
        </div>
        <div className={styles.subtitle}>Performance over last 5 GWs</div>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  const top5 = data.slice(0, 5);

  const getTrendDisplay = (trend: number) => {
    if (trend > 0) return { arrow: '↑', value: trend, color: '#00ff87' }; // green - rising
    if (trend < 0) return { arrow: '↓', value: Math.abs(trend), color: '#ff4444' }; // red - falling
    return { arrow: '—', value: 0, color: 'rgba(255, 255, 255, 0.3)' }; // grey - same
  };

  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Flame size={18} color="#00ff87" /> Form Rankings
    </div>
  );

  // Render function for items (used by both card and modal)
  const renderItem = (item: FormRankingsData, index: number) => {
    const isMyTeam = myTeamId && item.entry_id.toString() === myTeamId;
    const trendInfo = getTrendDisplay(item.trend);

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
          {item.trend !== 0 && (
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: trendInfo.color,
                marginBottom: '0.125rem'
              }}
            >
              {trendInfo.arrow}{trendInfo.value}
            </div>
          )}
          <div className={styles.statValue}>
            {item.last5_points} <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>PTS</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`${styles.card} ${styles.clickable}`} onClick={() => setShowModal(true)}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{title}</h4>
        </div>
        <div className={styles.subtitle}>
          Performance over last 5 GWs
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
        title="Form Rankings - Full Rankings"
        icon={<Flame size={18} color="#00ff87" />}
        data={data}
        renderItem={renderItem}
      />
    </>
  );
}
