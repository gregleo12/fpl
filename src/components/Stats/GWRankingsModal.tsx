'use client';

import { useEffect } from 'react';
import type { GWRanking } from './sections/GWPointsLeaders';
import styles from './GWRankingsModal.module.css';
import { formatLuckValue } from '@/lib/luckFormatting';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gameweek: number;
  rankings: GWRanking[];
  myTeamId: string;
}

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

export function GWRankingsModal({ isOpen, onClose, gameweek, rankings, myTeamId }: Props) {
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
                    <div className={styles.luckColumn}>
                      {(() => {
                        // K-163N: Display GW luck × 10 for consistency with other luck displays
                        const gwLuck = (ranking as any).gw_luck || 0;
                        const displayValue = gwLuck * 10;
                        return (
                          <>
                            <div className={`${styles.luck} ${
                              displayValue > 0 ? styles.luckPositive :
                              displayValue < 0 ? styles.luckNegative :
                              styles.luckNeutral
                            }`}>
                              {formatLuckValue(displayValue)}
                            </div>
                            <div className={styles.luckLabel}>luck</div>
                          </>
                        );
                      })()}
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
