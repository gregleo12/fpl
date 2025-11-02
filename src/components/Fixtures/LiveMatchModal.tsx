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
        {/* Sticky Header with Score */}
        <div className={styles.stickyHeader}>
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
          </div>
        </div>

        {/* Scrollable Content */}
        <div className={styles.scrollableContent}>

        {/* Captain Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>👑</span>
            <span className={styles.sectionTitle}>Captains</span>
          </div>

          <div className={styles.captainGrid}>
            <div className={styles.captainBox}>
              <div className={styles.captainName}>{matchData.player1.captain.name}</div>
              <div className={styles.captainPoints}>
                {matchData.player1.captain.points} pts
              </div>
            </div>

            <div className={styles.captainBox}>
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

        {/* Differential Players Section */}
        {(matchData.player1.differentials.length > 0 || matchData.player2.differentials.length > 0) && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.emoji}>🔀</span>
              <span className={styles.sectionTitle}>Differential Players</span>
            </div>

            {/* Total Differential Points Summary */}
            <div className={styles.differentialTotals}>
              <div className={styles.differentialTotalBox}>
                <span className={styles.differentialTotalLabel}>{matchData.player1.manager}</span>
                <span className={styles.differentialTotalPoints}>
                  {matchData.player1.differentials.reduce((sum, p) => sum + p.points, 0)} pts
                </span>
              </div>
              <div className={styles.differentialVs}>vs</div>
              <div className={styles.differentialTotalBox}>
                <span className={styles.differentialTotalLabel}>{matchData.player2.manager}</span>
                <span className={styles.differentialTotalPoints}>
                  {matchData.player2.differentials.reduce((sum, p) => sum + p.points, 0)} pts
                </span>
              </div>
            </div>

            <div className={styles.differentialsGrid}>
              {/* Player 1 Differentials */}
              <div className={styles.differentialsBox}>
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

        {/* Win Requirements Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>🎯</span>
            <span className={styles.sectionTitle}>To Win</span>
          </div>

          <div className={styles.requirementsGrid}>
            <div className={styles.requirementBox}>
              <div className={styles.requirementStats}>
                {winRequirements.status === 'winning' ? (
                  <>
                    <div className={styles.requirementMain}>Maintain Lead</div>
                    <div className={styles.requirementDetail}>
                      +{winRequirements.margin} diff pts
                    </div>
                  </>
                ) : winRequirements.status === 'losing' ? (
                  <>
                    <div className={styles.requirementMain}>Needs +{winRequirements.pointsNeeded} diff pts</div>
                    <div className={styles.requirementDetail}>
                      {matchData.player1.playersRemaining} players left
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.requirementMain}>Level on Differentials</div>
                    <div className={styles.requirementDetail}>
                      {matchData.player1.playersRemaining} players left
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={styles.requirementBox}>
              <div className={styles.requirementStats}>
                {winRequirements.status === 'losing' ? (
                  <>
                    <div className={styles.requirementMain}>Maintain Lead</div>
                    <div className={styles.requirementDetail}>
                      +{winRequirements.margin} diff pts
                    </div>
                  </>
                ) : winRequirements.status === 'winning' ? (
                  <>
                    <div className={styles.requirementMain}>Needs +{winRequirements.pointsNeeded} diff pts</div>
                    <div className={styles.requirementDetail}>
                      {matchData.player2.playersRemaining} players left
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.requirementMain}>Level on Differentials</div>
                    <div className={styles.requirementDetail}>
                      {matchData.player2.playersRemaining} players left
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Players Status Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>⚽</span>
            <span className={styles.sectionTitle}>Players Status</span>
          </div>

          <div className={styles.playersGrid}>
            <div className={styles.playersBox}>
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

        {/* Chips Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>🎖️</span>
            <span className={styles.sectionTitle}>Chips</span>
          </div>

          <div className={styles.chipsGrid}>
            <div className={styles.chipsBox}>
              <div className={matchData.player1.chipActive ? styles.chipActive : styles.noChip}>
                {getChipDisplay(matchData.player1.chipActive)}
              </div>
            </div>

            <div className={styles.chipsBox}>
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
              <div className={`${styles.hitsPoints} ${matchData.player1.transferCost < 0 ? styles.negative : ''}`}>
                {matchData.player1.transferCost} pts
              </div>
            </div>

            <div className={styles.hitsBox}>
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
              <div className={styles.benchPoints}>
                {matchData.player1.benchPoints} pts
              </div>
            </div>

            <div className={styles.benchBox}>
              <div className={styles.benchPoints}>
                {matchData.player2.benchPoints} pts
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function calculateWinRequirements(matchData: LiveMatchData, isMyMatch: boolean): WinRequirements {
  // Calculate differential points for each player
  const player1DiffTotal = matchData.player1.differentials.reduce((sum, p) => sum + p.points, 0);
  const player2DiffTotal = matchData.player2.differentials.reduce((sum, p) => sum + p.points, 0);

  // Calculate the differential margin (how much ahead/behind based on differentials alone)
  const diffMargin = player1DiffTotal - player2DiffTotal;

  const yourPlayersLeft = matchData.player1.playersRemaining;
  const theirPlayersLeft = matchData.player2.playersRemaining;

  // Winning on differentials
  if (diffMargin > 0) {
    const opponentNeeds = diffMargin + 1;

    return {
      status: 'winning',
      margin: Math.abs(diffMargin),
      pointsNeeded: opponentNeeds,
      avgPerPlayer: 0,
      opponentAvgNeeded: 0,
      message: `Leading by ${diffMargin} differential pts. Opponent needs ${opponentNeeds}+ diff pts.`,
    };
  }

  // Level on differentials
  if (diffMargin === 0) {
    return {
      status: 'drawing',
      margin: 0,
      pointsNeeded: 1,
      avgPerPlayer: 0,
      opponentAvgNeeded: 0,
      message: 'Level on differentials! First to gain diff pts wins.',
    };
  }

  // Losing on differentials
  const youNeed = Math.abs(diffMargin) + 1;

  return {
    status: 'losing',
    margin: Math.abs(diffMargin),
    pointsNeeded: youNeed,
    avgPerPlayer: 0,
    opponentAvgNeeded: 0,
    message: `Need ${youNeed}+ differential pts from remaining players.`,
  };
}
