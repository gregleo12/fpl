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

  const captainGap = matchData.player1.captain.points - matchData.player2.captain.points;

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
            <span className={styles.sectionTitle}>Match Story</span>
          </div>

          <div className={styles.storyBox}>
            <p className={styles.storyText}>{matchStory.summary}</p>
            {matchStory.benchMention && (
              <p className={styles.benchMention}>{matchStory.benchMention}</p>
            )}
          </div>
        </div>

        {/* Top Performers Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>⭐</span>
            <span className={styles.sectionTitle}>Top Performers</span>
          </div>

          <div className={styles.performersGrid}>
            {/* Player 1's Top Performers */}
            <div className={styles.performersBox}>
              <div className={styles.performersLabel}>{matchData.player1.manager}</div>
              <div className={styles.performersList}>
                {matchData.player1.topPerformers.map((player, i) => (
                  <div key={i} className={styles.performer}>
                    <span className={styles.performerRank}>{i + 1}.</span>
                    <span className={styles.performerName}>
                      {player.name}
                      {player.isCaptain && <span className={styles.captainBadge}>(C)</span>}
                    </span>
                    <span className={styles.performerPoints}>{player.points} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Player 2's Top Performers */}
            <div className={styles.performersBox}>
              <div className={styles.performersLabel}>{matchData.player2.manager}</div>
              <div className={styles.performersList}>
                {matchData.player2.topPerformers.map((player, i) => (
                  <div key={i} className={styles.performer}>
                    <span className={styles.performerRank}>{i + 1}.</span>
                    <span className={styles.performerName}>
                      {player.name}
                      {player.isCaptain && <span className={styles.captainBadge}>(C)</span>}
                    </span>
                    <span className={styles.performerPoints}>{player.points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Key Differences Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>🔍</span>
            <span className={styles.sectionTitle}>Key Differences</span>
          </div>

          <div className={styles.differencesBox}>
            {/* Captain Gap */}
            <div className={styles.differenceRow}>
              <span className={styles.differenceLabel}>Captain Gap:</span>
              <span className={`${styles.differenceValue} ${captainGap === 0 ? '' : captainGap > 0 ? styles.positive : styles.negative}`}>
                {captainGap > 0 ? '+' : ''}{captainGap} pts
              </span>
            </div>

            {/* Bench Waste */}
            <div className={styles.differenceRow}>
              <span className={styles.differenceLabel}>Bench Waste:</span>
              <span className={styles.differenceValue}>
                {matchData.player1.manager} {matchData.player1.benchPoints} pts, {matchData.player2.manager} {matchData.player2.benchPoints} pts
              </span>
            </div>

            {/* Transfer Impact */}
            <div className={styles.differenceRow}>
              <span className={styles.differenceLabel}>Transfer Cost:</span>
              <span className={styles.differenceValue}>
                {matchData.player1.transferCost} pts vs {matchData.player2.transferCost} pts
              </span>
            </div>

            {/* Chips Used */}
            <div className={styles.differenceRow}>
              <span className={styles.differenceLabel}>Chips Used:</span>
              <div className={styles.chipsRow}>
                <span className={matchData.player1.chipUsed ? styles.chipActive : styles.noChip}>
                  {getChipDisplay(matchData.player1.chipUsed)}
                </span>
                <span className={styles.vsText}>vs</span>
                <span className={matchData.player2.chipUsed ? styles.chipActive : styles.noChip}>
                  {getChipDisplay(matchData.player2.chipUsed)}
                </span>
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
  const captainGap = Math.abs(matchData.player1.captain.points - matchData.player2.captain.points);
  const winnerPlayer = matchData.winner === 'player1' ? matchData.player1 : matchData.player2;
  const loserPlayer = matchData.winner === 'player1' ? matchData.player2 : matchData.player1;

  let summary = '';
  let benchMention = undefined;

  // Margin description
  if (matchData.winner === 'draw') {
    summary = 'Match ended in a draw.';
  } else if (margin <= 5) {
    summary = `Extremely close match with ${winnerPlayer.manager} edging ${loserPlayer.manager} by just ${margin} point${margin === 1 ? '' : 's'}.`;
  } else if (margin <= 15) {
    summary = `Close match with ${winnerPlayer.manager} defeating ${loserPlayer.manager} by ${margin} points.`;
  } else if (margin <= 30) {
    summary = `Comfortable ${margin}-point victory for ${winnerPlayer.manager} over ${loserPlayer.manager}.`;
  } else {
    summary = `Dominant ${margin}-point performance by ${winnerPlayer.manager} against ${loserPlayer.manager}.`;
  }

  // Captain impact
  if (captainGap >= margin && matchData.winner !== 'draw') {
    summary += ` The captain choice proved decisive - ${winnerPlayer.captain.name} (C) scored ${winnerPlayer.captain.points} points vs ${loserPlayer.captain.name} (C) with ${loserPlayer.captain.points} points.`;
  }

  // Chip usage
  if (matchData.winner !== 'draw') {
    if (winnerPlayer.chipUsed) {
      const chipName = winnerPlayer.chipUsed === 'bboost' ? 'Bench Boost'
                     : winnerPlayer.chipUsed === '3xc' ? 'Triple Captain'
                     : winnerPlayer.chipUsed === 'freehit' ? 'Free Hit'
                     : 'Wildcard';
      summary += ` ${winnerPlayer.manager} played their ${chipName} chip.`;
    } else if (loserPlayer.chipUsed) {
      const chipName = loserPlayer.chipUsed === 'bboost' ? 'Bench Boost'
                     : loserPlayer.chipUsed === '3xc' ? 'Triple Captain'
                     : loserPlayer.chipUsed === 'freehit' ? 'Free Hit'
                     : 'Wildcard';
      summary += ` Despite using ${chipName}, ${loserPlayer.manager} couldn't secure the win.`;
    }
  }

  // Bench mention
  const totalBenchWaste = matchData.player1.benchPoints + matchData.player2.benchPoints;
  if (totalBenchWaste > 20) {
    benchMention = `Combined ${totalBenchWaste} points were left on the bench (${matchData.player1.manager}: ${matchData.player1.benchPoints}, ${matchData.player2.manager}: ${matchData.player2.benchPoints}).`;
  } else if (matchData.winner !== 'draw') {
    const winnerBenchWaste = winnerPlayer.benchPoints;
    const loserBenchWaste = loserPlayer.benchPoints;
    if (loserBenchWaste > winnerBenchWaste + 5 && loserBenchWaste > 10) {
      benchMention = `Better bench management by ${loserPlayer.manager} could have changed the result - ${loserBenchWaste} points left unused vs ${winnerPlayer.manager}'s ${winnerBenchWaste}.`;
    }
  }

  return {
    summary,
    keyFactor: '',
    benchMention,
  };
}
