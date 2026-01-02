'use client';

import { useState } from 'react';
import styles from './FormStatBox.module.css';
import FormModal from './FormModal';

interface Match {
  event: number;
  result: 'W' | 'D' | 'L';
  opponentName: string;
  playerPoints: number;
  opponentPoints: number;
}

interface FormStatBoxProps {
  matchHistory: Match[];
}

export default function FormStatBox({ matchHistory }: FormStatBoxProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get last 5 matches (most recent on the right)
  const recentMatches = matchHistory?.slice(-5) || [];

  return (
    <>
      <div
        className={`${styles.statBox} ${styles.clickable}`}
        onClick={() => setIsModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsModalOpen(true);
          }
        }}
        aria-label="View form details"
      >
        <div className={styles.formDots}>
          {recentMatches.length > 0 ? (
            recentMatches.map((match, index) => (
              <div
                key={index}
                className={`${styles.dot} ${styles[`dot${match.result}`]}`}
                title={`GW${match.event}: ${match.result === 'W' ? 'Win' : match.result === 'D' ? 'Draw' : 'Loss'}`}
              />
            ))
          ) : (
            <div className={styles.noData}>No matches</div>
          )}
        </div>
        <div className={styles.statLabel}>FORM</div>
      </div>

      {isModalOpen && (
        <FormModal
          matchHistory={matchHistory}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
