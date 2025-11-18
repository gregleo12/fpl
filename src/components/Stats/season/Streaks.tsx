'use client';
import { useState } from 'react';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

export interface StreakData {
  entry_id: number;
  player_name: string;
  team_name: string;
  streak: number;
  gw_range: string;
}

interface StreaksProps {
  winningStreaks: StreakData[];
  losingStreaks: StreakData[];
}

export function Streaks({ winningStreaks, losingStreaks }: StreaksProps) {
  const [view, setView] = useState<'best' | 'worst'>('best');
  const [showModal, setShowModal] = useState(false);

  const currentData = view === 'best' ? winningStreaks : losingStreaks;
  const isEmpty = !currentData || currentData.length === 0;

  const title = view === 'best' ? '🔥 Best Streaks' : '💀 Worst Streaks';

  // Render function for items (used by both card and modal)
  const renderItem = (manager: StreakData, index: number) => (
    <div className={styles.listItem}>
      <div className={styles.rank}>{index + 1}</div>
      <div className={styles.info}>
        <div className={styles.nameWithRange}>
          <span className={styles.name}>{manager.player_name}</span>
          <span className={styles.gwRangeInline}>{manager.gw_range}</span>
        </div>
        <div className={styles.meta}>{manager.team_name}</div>
      </div>
      <div className={styles.stats}>
        <div className={styles.statValue}>{manager.streak}</div>
        <div className={styles.statLabel}>
          {view === 'best' ? 'wins' : 'losses'}
        </div>
      </div>
    </div>
  );

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
          Longest {view === 'best' ? 'winning' : 'losing'} streaks in H2H matches
        </div>

        {isEmpty ? (
          <div className={styles.noData}>
            No {view === 'best' ? 'winning' : 'losing'} streaks yet
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {currentData.slice(0, 5).map((manager, index) => (
                <div key={manager.entry_id}>
                  {renderItem(manager, index)}
                </div>
              ))}
            </div>
            <div className={styles.clickHint}>Click to view full rankings</div>
          </>
        )}
      </div>

      <FullRankingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${view === 'best' ? 'Winning' : 'Losing'} Streaks - Full Rankings`}
        icon={view === 'best' ? '🔥' : '💀'}
        data={currentData}
        renderItem={renderItem}
      />
    </>
  );
}
