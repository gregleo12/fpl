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

  // Sort by luck_index descending (luckiest first)
  const sortedData = [...data].sort((a, b) => b.luck_index - a.luck_index);

  // Show top 5 + bottom 2 in card view
  const top5 = sortedData.slice(0, 5);
  const bottom2 = sortedData.slice(-2);

  const formatLuck = (luck: number) => {
    const sign = luck >= 0 ? '+' : '';
    const emoji = luck >= 0 ? '🍀' : '😤';
    const color = luck >= 0 ? '#00ff87' : '#ff4444';
    return { display: `${sign}${Math.round(luck)}`, emoji, color };
  };

  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Sparkles size={18} color="#00ff87" /> Luck Index
    </div>
  );

  // Render function for items (used by both card and modal)
  const renderItem = (item: LuckIndexData, index: number) => {
    const isMyTeam = myTeamId && item.entry_id.toString() === myTeamId;
    const luckInfo = formatLuck(item.luck_index);

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
          <div
            className={styles.statValue}
            style={{ color: luckInfo.color }}
          >
            {luckInfo.display} <span style={{ fontSize: '1rem' }}>{luckInfo.emoji}</span>
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
          Opponent performance vs their average
        </div>

        <div className={styles.list}>
          {/* Top 5 luckiest */}
          {top5.map((item, index) => (
            <div key={item.entry_id}>
              {renderItem(item, index)}
            </div>
          ))}

          {/* Divider before unluckiest */}
          {bottom2.length > 0 && (
            <div style={{
              margin: '0.75rem 0',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '0.75rem'
            }} />
          )}

          {/* Bottom 2 unluckiest */}
          {bottom2.map((item) => {
            const index = sortedData.findIndex(d => d.entry_id === item.entry_id);
            return (
              <div key={item.entry_id}>
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>

        <div className={styles.clickHint}>Click to view full rankings</div>
      </div>

      <FullRankingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Luck Index - Full Rankings"
        icon={<Sparkles size={18} color="#00ff87" />}
        data={sortedData}
        renderItem={renderItem}
      />
    </>
  );
}
