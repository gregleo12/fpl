'use client';
import { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import styles from './Leaderboard.module.css';
import { FullRankingModal } from './FullRankingModal';

export interface ChipPerformanceData {
  chipsPlayed: Array<{
    entry_id: number;
    player_name: string;
    team_name: string;
    chip_count: number;
    chips_won: number;
    chips_drew: number;
    chips_lost: number;
    chips_detail: string;
    chips_played_data?: Array<{chip: string, gw: number, result: string}>;
  }>;
  chipsFaced: Array<{
    entry_id: number;
    player_name: string;
    team_name: string;
    chips_faced_count: number;
    chips_faced_won: number;
    chips_faced_drew: number;
    chips_faced_lost: number;
    chips_faced_detail: string;
    chips_faced_data?: Array<{chip: string, gw: number, result: string}>;
  }>;
}

interface Props {
  data: ChipPerformanceData;
}

export function ChipPerformance({ data }: Props) {
  const [view, setView] = useState<'played' | 'faced'>('played');
  const [showModal, setShowModal] = useState(false);

  const currentData = view === 'played' ? data.chipsPlayed : data.chipsFaced;
  const isEmpty = !currentData || currentData.length === 0;

  // Render function for items (used by both card and modal)
  const renderItem = (manager: any, index: number) => {
    // Render Won/Drew/Lost summary
    const renderWinLossSummary = () => {
      const won = view === 'played' ? manager.chips_won : manager.chips_faced_won;
      const drew = view === 'played' ? manager.chips_drew : manager.chips_faced_drew;
      const lost = view === 'played' ? manager.chips_lost : manager.chips_faced_lost;

      const parts: JSX.Element[] = [];

      if (won > 0) {
        parts.push(
          <span key="won" style={{ color: '#00ff87', fontWeight: 600 }}>
            Won {won}
          </span>
        );
      }

      if (drew > 0) {
        parts.push(
          <span key="drew" style={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
            Drew {drew}
          </span>
        );
      }

      if (lost > 0) {
        parts.push(
          <span key="lost" style={{ color: '#ff4444', fontWeight: 600 }}>
            Lost {lost}
          </span>
        );
      }

      // Join parts with spacing
      return parts.map((part, idx) => (
        <span key={idx}>
          {part}
          {idx < parts.length - 1 && '  '}
        </span>
      ));
    };

    return (
      <div className={styles.listItem}>
        <div className={styles.rank}>{index + 1}</div>
        <div className={styles.info}>
          <div className={styles.name}>{manager.player_name}</div>
          <div className={styles.meta}>{manager.team_name}</div>
          <div className={styles.chips}>
            {renderWinLossSummary()}
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.statValue}>
            {view === 'played' ? manager.chip_count : manager.chips_faced_count}
          </div>
          <div className={styles.statLabel}>
            {view === 'played' ? 'chips' : 'faced'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`${styles.card} ${styles.clickable}`} onClick={() => setShowModal(true)}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Gamepad2 size={18} color="#00ff87" /> Chip Performance
            </h4>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
              Chips played throughout the season
            </div>
          </div>
          <div className={styles.toggle} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.toggleButton} ${view === 'played' ? styles.active : ''}`}
              onClick={() => setView('played')}
            >
              Played
            </button>
            <button
              className={`${styles.toggleButton} ${view === 'faced' ? styles.active : ''}`}
              onClick={() => setView('faced')}
            >
              Faced
            </button>
          </div>
        </div>

        {isEmpty ? (
          <div className={styles.noData}>
            No chips {view === 'played' ? 'played' : 'faced'} yet
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {currentData.slice(0, 5).map((manager: any, index) => (
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
        title={`Chips ${view === 'played' ? 'Played' : 'Faced'} - Full Rankings`}
        icon={<Gamepad2 size={18} color="#00ff87" />}
        data={currentData}
        renderItem={renderItem}
      />
    </>
  );
}
