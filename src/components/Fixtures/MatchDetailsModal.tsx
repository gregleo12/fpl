'use client';

import { useEffect } from 'react';
import { MatchDetails } from './MatchDetails';
import styles from './MatchDetailsModal.module.css';

interface PlayerStats {
  id: number;
  player_name: string;
  team_name: string;
  recent_form: Array<{ result: string; event: number }>;
  avg_points_last_5: string;
  chips_remaining: string[];
  free_transfers: number;
}

interface H2HRecord {
  total_meetings: number;
  entry_1_wins: number;
  entry_2_wins: number;
  draws: number;
  last_meeting: {
    event: number;
    entry_1_score: number;
    entry_2_score: number;
  } | null;
}

interface MatchDetailsModalProps {
  entry1: PlayerStats;
  entry2: PlayerStats;
  headToHead?: H2HRecord;
  onClose: () => void;
}

export function MatchDetailsModal({ entry1, entry2, headToHead, onClose }: MatchDetailsModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className={styles.dragHandle}></div>

        {/* Modal header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Match Details</h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Match Details Component */}
        <MatchDetails
          entry1={entry1}
          entry2={entry2}
          headToHead={headToHead}
        />
      </div>
    </div>
  );
}
