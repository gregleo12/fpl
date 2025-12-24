'use client';

import { useState } from 'react';
import { Activity } from 'lucide-react';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

export interface ConsistencyData {
  entry_id: number;
  player_name: string;
  team_name: string;
  avg_points: number;
  std_dev: number;
}

interface Props {
  data: ConsistencyData[];
  myTeamId?: string;
}

export function Consistency({ data, myTeamId }: Props) {
  const [showConsistent, setShowConsistent] = useState(true);
  const [showModal, setShowModal] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#00ff87" /> Consistency
            </div>
          </h4>
        </div>
        <div className={styles.subtitle}>Weekly score variance</div>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  // Sort data based on toggle
  const sortedData = showConsistent
    ? [...data].sort((a, b) => a.std_dev - b.std_dev)  // Low std dev first (most consistent)
    : [...data].sort((a, b) => b.std_dev - a.std_dev); // High std dev first (most variable)

  const top5 = sortedData.slice(0, 5);

  const IconComponent = Activity;
  const titleText = 'Consistency';
  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <IconComponent size={18} color="#00ff87" /> {titleText}
    </div>
  );

  // Render function for items (used by both card and modal)
  const renderItem = (item: ConsistencyData, index: number) => {
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
          <div className={styles.statValue}>
            {Math.round(item.avg_points)} <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 400 }}>±{Math.round(item.std_dev)}</span>
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
          <div className={styles.toggle} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.toggleButton} ${showConsistent ? styles.active : ''}`}
              onClick={() => setShowConsistent(true)}
            >
              Consistent
            </button>
            <button
              className={`${styles.toggleButton} ${!showConsistent ? styles.active : ''}`}
              onClick={() => setShowConsistent(false)}
            >
              Variable
            </button>
          </div>
        </div>
        <div className={styles.subtitle}>
          Weekly score variance
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
        title={`Consistency - Full Rankings${showConsistent ? ' (Most Consistent)' : ' (Most Variable)'}`}
        icon={<IconComponent size={18} color="#00ff87" />}
        data={sortedData}
        renderItem={renderItem}
      />
    </>
  );
}
