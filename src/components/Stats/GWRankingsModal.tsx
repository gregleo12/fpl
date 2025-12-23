'use client';

import { useEffect } from 'react';
import type { GWRanking } from './sections/GWPointsLeaders';
import styles from './GWRankingsModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gameweek: number;
  rankings: GWRanking[];
  myTeamId: string;
}

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

export function GWRankingsModal({ isOpen, onClose, gameweek, rankings, myTeamId }: Props) {
  console.log('[K-109 Phase 3] GWRankingsModal received data:', {
    isOpen,
    gameweek,
    rankingsCount: rankings?.length || 0,
    myTeamId,
    topFive: rankings?.slice(0, 5).map(r => ({ rank: r.rank, name: r.player_name, points: r.points })) || []
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>
            <span className={styles.icon}>📊</span>
            GW {gameweek} Points Rankings
          </h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.content}>
          {rankings.length === 0 ? (
            <div className={styles.noData}>No rankings data available</div>
          ) : (
            <div className={styles.rankingsList}>
              {rankings.map((ranking) => {
                const isMyTeam = ranking.entry_id.toString() === myTeamId;
                const medal = ranking.rank <= 3 ? MEDAL_ICONS[ranking.rank - 1] : null;

                return (
                  <div
                    key={ranking.entry_id}
                    className={`${styles.rankingItem} ${isMyTeam ? styles.myTeam : ''}`}
                  >
                    <div className={styles.rankColumn}>
                      {medal ? (
                        <span className={styles.medal}>{medal}</span>
                      ) : (
                        <span className={styles.rank}>{ranking.rank}</span>
                      )}
                    </div>
                    <div className={styles.managerColumn}>
                      <div className={styles.playerName}>{ranking.player_name}</div>
                      <div className={styles.teamName}>{ranking.team_name}</div>
                    </div>
                    <div className={styles.pointsColumn}>
                      <div className={styles.points}>{ranking.points}</div>
                      <div className={styles.ptsLabel}>pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
