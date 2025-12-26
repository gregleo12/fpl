'use client';

import { useState } from 'react';
import { Flame, Skull } from 'lucide-react';
import type { BestGameweekData } from '../SeasonView';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

interface Props {
  bestData: BestGameweekData[];
  worstData: BestGameweekData[];
}

export function BestWorstGW({ bestData, worstData }: Props) {
  const [view, setView] = useState<'best' | 'worst'>('best');
  const [showModal, setShowModal] = useState(false);

  console.log('[K-109 Phase 4] BestWorstGW received data:', {
    bestCount: bestData?.length || 0,
    worstCount: worstData?.length || 0,
    bestTopThree: bestData?.slice(0, 3).map(d => ({ name: d.player_name, gw: d.event, pts: d.points })) || [],
    worstTopThree: worstData?.slice(0, 3).map(d => ({ name: d.player_name, gw: d.event, pts: d.points })) || [],
    uniqueGWsInBest: Array.from(new Set(bestData?.map(d => d.event) || [])).sort((a, b) => b - a)
  });

  const data = view === 'best' ? bestData : worstData;
  const IconComponent = view === 'best' ? Flame : Skull;
  const titleText = view === 'best' ? 'GW Records' : 'Worst Gameweeks';
  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <IconComponent size={18} color="#00ff87" /> {titleText}
    </div>
  );

  // Render function for items (used by both card and modal)
  const renderItem = (item: BestGameweekData, index: number) => (
    <div className={styles.listItem}>
      <div className={styles.rank}>{index + 1}</div>
      <div className={styles.info}>
        <div className={styles.name}>{item.player_name}</div>
        <div className={styles.meta}>GW{item.event}</div>
      </div>
      <div className={styles.stats}>
        <div className={styles.statValue}>
          {item.points} <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>PTS</span>
        </div>
      </div>
    </div>
  );

  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>{title}</h4>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  return (
    <>
      <div className={`${styles.card} ${styles.clickable}`} onClick={() => setShowModal(true)}>
        <div className={styles.cardHeader}>
          <h4 className={styles.cardTitle}>{title}</h4>
          <div className={styles.toggle} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.toggleButton} ${view === 'best' ? styles.active : ''}`}
              onClick={() => setView('best')}
            >
              Best
            </button>
            <button
              className={`${styles.toggleButton} ${view === 'worst' ? styles.active : ''}`}
              onClick={() => setView('worst')}
            >
              Worst
            </button>
          </div>
        </div>
        <div className={styles.subtitle}>
          {view === 'best' ? 'Best individual gameweek scores' : 'Worst individual gameweek scores'}
        </div>

        <div className={styles.list}>
          {data.slice(0, 3).map((item, index) => (
            <div key={`${item.entry_id}-${item.event}`}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
        <div className={styles.clickHint}>Click to view full rankings</div>
      </div>

      <FullRankingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${view === 'best' ? 'Best' : 'Worst'} Gameweeks - Full Rankings`}
        icon={<IconComponent size={18} color="#00ff87" />}
        data={data}
        renderItem={renderItem}
      />
    </>
  );
}
