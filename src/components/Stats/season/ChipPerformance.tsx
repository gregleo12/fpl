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
    chips_detail: string;
    chips_played_data?: Array<{chip: string, gw: number, result: string}>;
  }>;
  chipsFaced: Array<{
    entry_id: number;
    player_name: string;
    team_name: string;
    chips_faced_count: number;
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
    // Render chips played with color coding
    const renderChipsPlayed = () => {
      if (!manager.chips_played_data || manager.chips_played_data.length === 0) {
        return manager.chips_detail;
      }

      return manager.chips_played_data.map((chip: any, idx: number) => (
        <span key={idx}>
          <span className={chip.result === 'W' ? styles.chipWin : chip.result === 'L' ? styles.chipLoss : ''}>
            {chip.chip} (GW{chip.gw})
          </span>
          {idx < manager.chips_played_data.length - 1 && ', '}
        </span>
      ));
    };

    // Render chips faced with color coding
    const renderChipsFaced = () => {
      if (!manager.chips_faced_data || manager.chips_faced_data.length === 0) {
        return manager.chips_faced_detail;
      }

      return manager.chips_faced_data.map((chip: any, idx: number) => (
        <span key={idx}>
          <span className={chip.result === 'W' ? styles.chipWin : chip.result === 'L' ? styles.chipLoss : ''}>
            {chip.chip} (GW{chip.gw})
          </span>
          {idx < manager.chips_faced_data.length - 1 && ', '}
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
            {view === 'played' ? renderChipsPlayed() : renderChipsFaced()}
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
          <h4 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gamepad2 size={18} color="#00ff87" /> Chip Performance
          </h4>
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
