'use client';

import { useEffect } from 'react';
import styles from './FormModal.module.css';
import { shortenManagerName } from '@/lib/nameUtils';

interface Match {
  event: number;
  result: 'W' | 'D' | 'L';
  opponentName: string;
  playerPoints: number;
  opponentPoints: number;
}

interface FormModalProps {
  matchHistory: Match[];
  onClose: () => void;
}

export default function FormModal({ matchHistory, onClose }: FormModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Get last 10 matches, most recent first
  const recentMatches = matchHistory?.slice(-10).reverse() || [];

  // Calculate stats
  const wins = matchHistory?.filter(m => m.result === 'W').length || 0;
  const draws = matchHistory?.filter(m => m.result === 'D').length || 0;
  const losses = matchHistory?.filter(m => m.result === 'L').length || 0;
  const total = matchHistory?.length || 0;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Current streak
  let currentStreak = '';
  if (matchHistory && matchHistory.length > 0) {
    const lastResult = matchHistory[matchHistory.length - 1].result;
    let streakCount = 1;
    for (let i = matchHistory.length - 2; i >= 0; i--) {
      if (matchHistory[i].result === lastResult) {
        streakCount++;
      } else {
        break;
      }
    }
    const streakType = lastResult === 'W' ? 'winning' : lastResult === 'L' ? 'losing' : 'drawing';
    currentStreak = `${streakCount} ${streakType} streak`;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Recent Form</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Stats Summary */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{wins}</span>
              <span className={styles.statLabel}>Wins</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{draws}</span>
              <span className={styles.statLabel}>Draws</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{losses}</span>
              <span className={styles.statLabel}>Losses</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{winRate}%</span>
              <span className={styles.statLabel}>Win Rate</span>
            </div>
          </div>

          {currentStreak && (
            <div className={styles.streak}>
              {currentStreak}
            </div>
          )}

          {/* Match History Table */}
          {recentMatches.length > 0 ? (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>GW</th>
                    <th>Opponent</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMatches.map((match) => (
                    <tr key={match.event}>
                      <td className={styles.gwCell}>GW{match.event}</td>
                      <td className={styles.opponentCell}>
                        {shortenManagerName(match.opponentName)}
                      </td>
                      <td className={styles.scoreCell}>
                        {match.playerPoints} - {match.opponentPoints}
                      </td>
                      <td className={styles.resultCell}>
                        <span className={`${styles.resultBadge} ${styles[`result${match.result}`]}`}>
                          {match.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.noMatches}>
              No matches played yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
