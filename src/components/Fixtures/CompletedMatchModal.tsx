import { useMemo } from 'react';
import { CompletedMatchData, MatchStory } from '@/types/completedMatch';
import styles from './CompletedMatchModal.module.css';

interface CompletedMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchData: CompletedMatchData;
}

export function CompletedMatchModal({
  isOpen,
  onClose,
  matchData,
}: CompletedMatchModalProps) {
  if (!isOpen) return null;

  const matchStory = useMemo(
    () => generateMatchStory(matchData),
    [matchData]
  );

  // No captain gap calculation needed - just showing captain names

  function getChipDisplay(chip: string | null): string {
    if (!chip) return 'None';
    const chipMap: { [key: string]: string } = {
      'wildcard': 'Wildcard',
      'bboost': 'Bench Boost',
      '3xc': 'Triple Captain',
      'freehit': 'Free Hit'
    };
    return chipMap[chip] || chip;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerBadge}>
            <span className={styles.completedIndicator}>✅</span>
            <span className={styles.headerTitle}>MATCH RESULT (GW{matchData.gameweek})</span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {/* Score Section */}
        <div className={styles.scoreSection}>
          <div className={styles.scoreDisplay}>
            <div className={styles.teamScore}>
              <div className={styles.teamName}>{matchData.player1.manager}</div>
              <div className={styles.score}>{matchData.player1.finalScore}</div>
            </div>

            <div className={styles.vsLabel}>vs</div>

            <div className={styles.teamScore}>
              <div className={styles.teamName}>{matchData.player2.manager}</div>
              <div className={styles.score}>{matchData.player2.finalScore}</div>
            </div>
          </div>

          <div className={`${styles.resultBadge} ${styles[matchData.winner]}`}>
            {matchData.winner === 'draw' && 'DRAW'}
            {matchData.winner === 'player1' && `${matchData.player1.manager.toUpperCase()} WON BY ${matchData.margin}`}
            {matchData.winner === 'player2' && `${matchData.player2.manager.toUpperCase()} WON BY ${matchData.margin}`}
          </div>
        </div>

        {/* Match Story Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>📖</span>
            <span className={styles.sectionTitle}>Match Summary</span>
          </div>

          <div className={styles.storyBox}>
            <p className={styles.storyText}>{matchStory.summary}</p>
          </div>
        </div>

        {/* Key Stats Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>📊</span>
            <span className={styles.sectionTitle}>Match Stats</span>
          </div>

          <div className={styles.statsGrid}>
            {/* Player 1 Stats */}
            <div className={styles.statsBox}>
              <div className={styles.statsLabel}>{matchData.player1.manager}</div>
              <div className={styles.statsList}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Captain:</span>
                  <span className={styles.statValue}>{matchData.player1.captain}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Chip:</span>
                  <span className={styles.statValue}>{getChipDisplay(matchData.player1.chipUsed)}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Hits:</span>
                  <span className={`${styles.statValue} ${matchData.player1.transferCost < 0 ? styles.negative : ''}`}>
                    {matchData.player1.transferCost} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Player 2 Stats */}
            <div className={styles.statsBox}>
              <div className={styles.statsLabel}>{matchData.player2.manager}</div>
              <div className={styles.statsList}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Captain:</span>
                  <span className={styles.statValue}>{matchData.player2.captain}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Chip:</span>
                  <span className={styles.statValue}>{getChipDisplay(matchData.player2.chipUsed)}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Hits:</span>
                  <span className={`${styles.statValue} ${matchData.player2.transferCost < 0 ? styles.negative : ''}`}>
                    {matchData.player2.transferCost} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateMatchStory(matchData: CompletedMatchData): MatchStory {
  const margin = matchData.margin;
  const winnerPlayer = matchData.winner === 'player1' ? matchData.player1 : matchData.player2;
  const loserPlayer = matchData.winner === 'player1' ? matchData.player2 : matchData.player1;

  let summary = '';

  // Margin description
  if (matchData.winner === 'draw') {
    summary = `Match ended in a draw. ${matchData.player1.manager} captained ${matchData.player1.captain}, ${matchData.player2.manager} captained ${matchData.player2.captain}.`;
  } else if (margin <= 5) {
    summary = `Extremely close match with ${winnerPlayer.manager} edging ${loserPlayer.manager} by just ${margin} point${margin === 1 ? '' : 's'}.`;
  } else if (margin <= 15) {
    summary = `${winnerPlayer.manager} defeated ${loserPlayer.manager} by ${margin} points.`;
  } else if (margin <= 30) {
    summary = `Comfortable ${margin}-point victory for ${winnerPlayer.manager}.`;
  } else {
    summary = `Dominant ${margin}-point performance by ${winnerPlayer.manager}.`;
  }

  // Add captain info
  if (matchData.winner !== 'draw') {
    summary += ` ${winnerPlayer.manager} captained ${winnerPlayer.captain}, ${loserPlayer.manager} captained ${loserPlayer.captain}.`;
  }

  // Chip usage
  if (winnerPlayer.chipUsed) {
    const chipName = winnerPlayer.chipUsed === 'bboost' ? 'Bench Boost'
                   : winnerPlayer.chipUsed === '3xc' ? 'Triple Captain'
                   : winnerPlayer.chipUsed === 'freehit' ? 'Free Hit'
                   : 'Wildcard';
    summary += ` ${winnerPlayer.manager} played ${chipName}.`;
  } else if (loserPlayer.chipUsed) {
    const chipName = loserPlayer.chipUsed === 'bboost' ? 'Bench Boost'
                   : loserPlayer.chipUsed === '3xc' ? 'Triple Captain'
                   : loserPlayer.chipUsed === 'freehit' ? 'Free Hit'
                   : 'Wildcard';
    summary += ` ${loserPlayer.manager} played ${chipName}.`;
  }

  return {
    summary,
    keyFactor: '',
  };
}
