'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

export interface LuckIndexData {
  entry_id: number;
  player_name: string;
  team_name: string;
  luck_index: number;
}

interface Props {
  data: LuckIndexData[];
  myTeamId?: string;
}

export function LuckIndex({ data, myTeamId }: Props) {
  const [showLucky, setShowLucky] = useState(true);
  const [showModal, setShowModal] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#00ff87" /> Luck Index
            </div>
          </h4>
        </div>
        <div className={styles.subtitle}>Opponent performance vs their average</div>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  // Sort data based on toggle
  const sortedData = showLucky
    ? [...data].sort((a, b) => b.luck_index - a.luck_index)  // High luck first (lucky)
    : [...data].sort((a, b) => a.luck_index - b.luck_index); // Low luck first (unlucky)

  const top5 = sortedData.slice(0, 5);

  const IconComponent = Sparkles;
  const titleText = 'Luck Index';
  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <IconComponent size={18} color="#00ff87" /> {titleText}
    </div>
  );

  // Render function for items (used by both card and modal)
  const renderItem = (item: LuckIndexData, index: number) => {
    const isMyTeam = myTeamId && item.entry_id.toString() === myTeamId;
    const sign = item.luck_index >= 0 ? '+' : '';
    const color = item.luck_index >= 0 ? '#00ff87' : '#ff4444';

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
          <div className={styles.statValue} style={{ color }}>
            {sign}{Math.round(item.luck_index)}
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
              className={`${styles.toggleButton} ${showLucky ? styles.active : ''}`}
              onClick={() => setShowLucky(true)}
            >
              Lucky
            </button>
            <button
              className={`${styles.toggleButton} ${!showLucky ? styles.active : ''}`}
              onClick={() => setShowLucky(false)}
            >
              Unlucky
            </button>
          </div>
        </div>
        <div className={styles.subtitle}>
          Opponent performance vs their average
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
        title={`Luck Index - Full Rankings${showLucky ? ' (Luckiest)' : ' (Unluckiest)'}`}
        icon={<IconComponent size={18} color="#00ff87" />}
        data={sortedData}
        renderItem={renderItem}
      />
    </>
  );
}
