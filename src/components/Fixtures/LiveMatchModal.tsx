import { useMemo } from 'react';
import { LiveMatchData, WinRequirements } from '@/types/liveMatch';
import styles from './LiveMatchModal.module.css';

interface LiveMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchData: LiveMatchData;
  isMyMatch: boolean;
}

export function LiveMatchModal({ isOpen, onClose, matchData, isMyMatch }: LiveMatchModalProps) {
  if (!isOpen) return null;

  const winRequirements = useMemo(
    () => calculateWinRequirements(matchData, isMyMatch),
    [matchData, isMyMatch]
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
            <span className={styles.liveIndicator}>🔴</span>
            <span className={styles.headerTitle}>LIVE MATCH (GW{matchData.gameweek})</span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {/* Score Section */}
        <div className={styles.scoreSection}>
          <div className={styles.scoreDisplay}>
            <div className={styles.teamScore}>
              <div className={styles.teamName}>{matchData.player1.manager}</div>
              <div className={styles.score}>{matchData.player1.currentScore}</div>
            </div>

            <div className={styles.vsLabel}>vs</div>

            <div className={styles.teamScore}>
              <div className={styles.teamName}>{matchData.player2.manager}</div>
              <div className={styles.score}>{matchData.player2.currentScore}</div>
            </div>
          </div>

          <div className={`${styles.statusBadge} ${styles[winRequirements.status]}`}>
            {winRequirements.status === 'winning' && `↑ WINNING BY ${winRequirements.margin}`}
            {winRequirements.status === 'losing' && `↓ LOSING BY ${winRequirements.margin}`}
            {winRequirements.status === 'drawing' && `LEVEL`}
          </div>
        </div>

        {/* Captain Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>👑</span>
            <span className={styles.sectionTitle}>Captains</span>
          </div>

          <div className={styles.captainGrid}>
            <div className={styles.captainBox}>
              <div className={styles.captainLabel}>
                {isMyMatch ? 'Your Captain' : matchData.player1.manager}
              </div>
              <div className={styles.captainName}>{matchData.player1.captain.name}</div>
              <div className={styles.captainPoints}>
                {matchData.player1.captain.points} pts
              </div>
            </div>

            <div className={styles.captainBox}>
              <div className={styles.captainLabel}>
                {isMyMatch ? 'Their Captain' : matchData.player2.manager}
              </div>
              <div className={styles.captainName}>{matchData.player2.captain.name}</div>
              <div className={styles.captainPoints}>
                {matchData.player2.captain.points} pts
              </div>
            </div>
          </div>

          {Math.abs(captainGap) > 0 && (
            <div className={`${styles.captainGap} ${captainGap < 0 ? styles.negative : styles.positive}`}>
              {captainGap > 0 ? '✓' : '⚠️'} {Math.abs(captainGap)} pts gap
            </div>
          )}
        </div>

        {/* Players Status Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>⚽</span>
            <span className={styles.sectionTitle}>Players Status</span>
          </div>

          <div className={styles.playersGrid}>
            <div className={styles.playersBox}>
              <div className={styles.playersLabel}>
                {isMyMatch ? 'You' : matchData.player1.manager}
              </div>
              <div className={styles.playersStats}>
                <div className={styles.playersPlayed}>
                  {matchData.player1.playersPlayed}/11 played
                </div>
                <div className={styles.playersRemaining}>
                  {matchData.player1.playersRemaining} remaining
                </div>
              </div>
            </div>

            <div className={styles.playersBox}>
              <div className={styles.playersLabel}>
                {isMyMatch ? 'Them' : matchData.player2.manager}
              </div>
              <div className={styles.playersStats}>
                <div className={styles.playersPlayed}>
                  {matchData.player2.playersPlayed}/11 played
                </div>
                <div className={styles.playersRemaining}>
                  {matchData.player2.playersRemaining} remaining
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Win Requirements Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>🎯</span>
            <span className={styles.sectionTitle}>To Win</span>
          </div>

          <div className={styles.requirementsBox}>
            {winRequirements.status === 'winning' ? (
              <div className={styles.requirementText}>
                <strong>Maintain your lead!</strong><br />
                They need avg {winRequirements.opponentAvgNeeded.toFixed(1)} pts/player from {matchData.player2.playersRemaining} remaining
              </div>
            ) : winRequirements.status === 'losing' ? (
              <div className={styles.requirementText}>
                <strong>You need {winRequirements.pointsNeeded}+ pts to win</strong><br />
                Avg {winRequirements.avgPerPlayer.toFixed(1)} pts/player from {matchData.player1.playersRemaining} remaining
                <div className={styles.opponentRequirement}>
                  They need avg {winRequirements.opponentAvgNeeded.toFixed(1)} pts/player to maintain lead
                </div>
              </div>
            ) : (
              <div className={styles.requirementText}>
                <strong>Level! First to score wins</strong><br />
                You: {matchData.player1.playersRemaining} players left<br />
                Them: {matchData.player2.playersRemaining} players left
              </div>
            )}
          </div>
        </div>

        {/* Chips Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>🎖️</span>
            <span className={styles.sectionTitle}>Chips</span>
          </div>

          <div className={styles.chipsGrid}>
            <div className={styles.chipsBox}>
              <div className={styles.chipsLabel}>
                {isMyMatch ? 'You' : matchData.player1.manager}
              </div>
              <div className={matchData.player1.chipActive ? styles.chipActive : styles.noChip}>
                {getChipDisplay(matchData.player1.chipActive)}
              </div>
            </div>

            <div className={styles.chipsBox}>
              <div className={styles.chipsLabel}>
                {isMyMatch ? 'Them' : matchData.player2.manager}
              </div>
              <div className={matchData.player2.chipActive ? styles.chipActive : styles.noChip}>
                {getChipDisplay(matchData.player2.chipActive)}
              </div>
            </div>
          </div>
        </div>

        {/* Bench Points Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>💺</span>
            <span className={styles.sectionTitle}>Bench Points</span>
          </div>

          <div className={styles.benchGrid}>
            <div className={styles.benchBox}>
              <div className={styles.benchLabel}>
                {isMyMatch ? 'You' : matchData.player1.manager}
              </div>
              <div className={styles.benchPoints}>
                {matchData.player1.benchPoints} pts
              </div>
            </div>

            <div className={styles.benchBox}>
              <div className={styles.benchLabel}>
                {isMyMatch ? 'Them' : matchData.player2.manager}
              </div>
              <div className={styles.benchPoints}>
                {matchData.player2.benchPoints} pts
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateWinRequirements(matchData: LiveMatchData, isMyMatch: boolean): WinRequirements {
  const yourScore = matchData.player1.currentScore;
  const theirScore = matchData.player2.currentScore;
  const yourPlayersLeft = matchData.player1.playersRemaining;
  const theirPlayersLeft = matchData.player2.playersRemaining;

  const margin = yourScore - theirScore;

  // Winning
  if (margin > 0) {
    const opponentNeeds = margin + 1;
    const opponentAvg = theirPlayersLeft > 0 ? opponentNeeds / theirPlayersLeft : 0;

    return {
      status: 'winning',
      margin: Math.abs(margin),
      pointsNeeded: 0,
      avgPerPlayer: 0,
      opponentAvgNeeded: opponentAvg,
      message: `Winning by ${margin}. They need ${opponentNeeds}+ pts from ${theirPlayersLeft} players.`,
    };
  }

  // Drawing
  if (margin === 0) {
    return {
      status: 'drawing',
      margin: 0,
      pointsNeeded: 1,
      avgPerPlayer: yourPlayersLeft > 0 ? 1 / yourPlayersLeft : 0,
      opponentAvgNeeded: theirPlayersLeft > 0 ? 1 / theirPlayersLeft : 0,
      message: 'Level! First to score wins.',
    };
  }

  // Losing
  const youNeed = Math.abs(margin) + 1;
  const yourAvg = yourPlayersLeft > 0 ? youNeed / yourPlayersLeft : Infinity;
  const opponentAvg = theirPlayersLeft > 0 ? Math.abs(margin) / theirPlayersLeft : 0;

  return {
    status: 'losing',
    margin: Math.abs(margin),
    pointsNeeded: youNeed,
    avgPerPlayer: yourAvg,
    opponentAvgNeeded: opponentAvg,
    message: `Need ${youNeed}+ pts from ${yourPlayersLeft} players (avg ${yourAvg.toFixed(1)}/player).`,
  };
}
