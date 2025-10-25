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
              <div className={styles.captainLabel}>{matchData.player1.manager}</div>
              <div className={styles.captainName}>{matchData.player1.captain.name}</div>
              <div className={styles.captainPoints}>
                {matchData.player1.captain.points} pts
              </div>
            </div>

            <div className={styles.captainBox}>
              <div className={styles.captainLabel}>{matchData.player2.manager}</div>
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
              <div className={styles.playersLabel}>{matchData.player1.manager}</div>
              <div className={styles.playersStats}>
                <div className={styles.playersPlayed}>
                  {matchData.player1.playersPlayed}/{matchData.player1.totalPlayers} played
                </div>
                <div className={styles.playersRemaining}>
                  {matchData.player1.playersRemaining} remaining
                </div>
                <div className={styles.avgPoints}>
                  Avg: {matchData.player1.playersPlayed > 0
                    ? (matchData.player1.currentScore / matchData.player1.playersPlayed).toFixed(1)
                    : '0.0'} pts/player
                </div>
              </div>
            </div>

            <div className={styles.playersBox}>
              <div className={styles.playersLabel}>{matchData.player2.manager}</div>
              <div className={styles.playersStats}>
                <div className={styles.playersPlayed}>
                  {matchData.player2.playersPlayed}/{matchData.player2.totalPlayers} played
                </div>
                <div className={styles.playersRemaining}>
                  {matchData.player2.playersRemaining} remaining
                </div>
                <div className={styles.avgPoints}>
                  Avg: {matchData.player2.playersPlayed > 0
                    ? (matchData.player2.currentScore / matchData.player2.playersPlayed).toFixed(1)
                    : '0.0'} pts/player
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

          <div className={styles.requirementsGrid}>
            <div className={styles.requirementBox}>
              <div className={styles.requirementLabel}>{matchData.player1.manager}</div>
              <div className={styles.requirementStats}>
                {winRequirements.status === 'winning' ? (
                  <>
                    <div className={styles.requirementMain}>Maintain Lead</div>
                    <div className={styles.requirementDetail}>
                      Ahead by {winRequirements.margin} pts
                    </div>
                  </>
                ) : winRequirements.status === 'losing' ? (
                  <>
                    <div className={styles.requirementMain}>Needs {winRequirements.pointsNeeded}+ pts</div>
                    <div className={styles.requirementDetail}>
                      Avg {winRequirements.avgPerPlayer.toFixed(1)} pts/player
                    </div>
                    <div className={styles.requirementDetail}>
                      {matchData.player1.playersRemaining} players left
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.requirementMain}>Level</div>
                    <div className={styles.requirementDetail}>
                      {matchData.player1.playersRemaining} players left
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={styles.requirementBox}>
              <div className={styles.requirementLabel}>{matchData.player2.manager}</div>
              <div className={styles.requirementStats}>
                {winRequirements.status === 'losing' ? (
                  <>
                    <div className={styles.requirementMain}>Maintain Lead</div>
                    <div className={styles.requirementDetail}>
                      Ahead by {winRequirements.margin} pts
                    </div>
                  </>
                ) : winRequirements.status === 'winning' ? (
                  <>
                    <div className={styles.requirementMain}>Needs {Math.abs(winRequirements.margin) + 1}+ pts</div>
                    <div className={styles.requirementDetail}>
                      Avg {winRequirements.opponentAvgNeeded.toFixed(1)} pts/player
                    </div>
                    <div className={styles.requirementDetail}>
                      {matchData.player2.playersRemaining} players left
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.requirementMain}>Level</div>
                    <div className={styles.requirementDetail}>
                      {matchData.player2.playersRemaining} players left
                    </div>
                  </>
                )}
              </div>
            </div>
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
              <div className={styles.chipsLabel}>{matchData.player1.manager}</div>
              <div className={matchData.player1.chipActive ? styles.chipActive : styles.noChip}>
                {getChipDisplay(matchData.player1.chipActive)}
              </div>
            </div>

            <div className={styles.chipsBox}>
              <div className={styles.chipsLabel}>{matchData.player2.manager}</div>
              <div className={matchData.player2.chipActive ? styles.chipActive : styles.noChip}>
                {getChipDisplay(matchData.player2.chipActive)}
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Hits Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>🔄</span>
            <span className={styles.sectionTitle}>Transfer Hits</span>
          </div>

          <div className={styles.hitsGrid}>
            <div className={styles.hitsBox}>
              <div className={styles.hitsLabel}>{matchData.player1.manager}</div>
              <div className={`${styles.hitsPoints} ${matchData.player1.transferCost < 0 ? styles.negative : ''}`}>
                {matchData.player1.transferCost} pts
              </div>
            </div>

            <div className={styles.hitsBox}>
              <div className={styles.hitsLabel}>{matchData.player2.manager}</div>
              <div className={`${styles.hitsPoints} ${matchData.player2.transferCost < 0 ? styles.negative : ''}`}>
                {matchData.player2.transferCost} pts
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
              <div className={styles.benchLabel}>{matchData.player1.manager}</div>
              <div className={styles.benchPoints}>
                {matchData.player1.benchPoints} pts
              </div>
            </div>

            <div className={styles.benchBox}>
              <div className={styles.benchLabel}>{matchData.player2.manager}</div>
              <div className={styles.benchPoints}>
                {matchData.player2.benchPoints} pts
              </div>
            </div>
          </div>
        </div>

        {/* Differential Players Section */}
        {(matchData.player1.differentials.length > 0 || matchData.player2.differentials.length > 0) && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.emoji}>🔀</span>
              <span className={styles.sectionTitle}>Differential Players</span>
            </div>

            <div className={styles.differentialsGrid}>
              {/* Player 1 Differentials */}
              <div className={styles.differentialsBox}>
                <div className={styles.differentialsLabel}>{matchData.player1.manager}</div>
                {matchData.player1.differentials.length > 0 ? (
                  <div className={styles.playersList}>
                    {matchData.player1.differentials.map((player, idx) => (
                      <div key={idx} className={styles.playerRow}>
                        <span className={styles.playerName}>
                          {player.name}
                          {player.isCaptain && <span className={styles.captainBadge}>(C)</span>}
                          {player.position > 11 && <span className={styles.benchBadge}>(B)</span>}
                        </span>
                        <span className={`${styles.playerPoints} ${player.points > 0 ? styles.positive : ''}`}>
                          {player.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noDifferentials}>No unique players</div>
                )}
              </div>

              {/* Player 2 Differentials */}
              <div className={styles.differentialsBox}>
                <div className={styles.differentialsLabel}>{matchData.player2.manager}</div>
                {matchData.player2.differentials.length > 0 ? (
                  <div className={styles.playersList}>
                    {matchData.player2.differentials.map((player, idx) => (
                      <div key={idx} className={styles.playerRow}>
                        <span className={styles.playerName}>
                          {player.name}
                          {player.isCaptain && <span className={styles.captainBadge}>(C)</span>}
                          {player.position > 11 && <span className={styles.benchBadge}>(B)</span>}
                        </span>
                        <span className={`${styles.playerPoints} ${player.points > 0 ? styles.positive : ''}`}>
                          {player.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noDifferentials}>No unique players</div>
                )}
              </div>
            </div>
          </div>
        )}
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
