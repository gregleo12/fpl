import { useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LiveMatchData, WinRequirements } from '@/types/liveMatch';
import styles from './LiveMatchModal.module.css';

interface LiveMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchData: LiveMatchData;
  isMyMatch: boolean;
  isCompleted?: boolean;
}

export function LiveMatchModal({ isOpen, onClose, matchData, isMyMatch, isCompleted = false }: LiveMatchModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // NOTE: Scroll initialization now handled via CSS padding (see LiveMatchModal.module.css)
  // No JavaScript needed - CSS creates invisible scrollable space at top

  if (!isOpen) return null;

  // Only render on client side
  if (typeof window === 'undefined') {
    return null;
  }

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

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className={styles.dragHandle}></div>

        {/* Modal header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerBadge}>
            {isCompleted ? (
              <>
                <span className={styles.completedIndicator}>✓</span>
                <span className={styles.modalTitle}>COMPLETED (GW{matchData.gameweek})</span>
              </>
            ) : (
              <>
                <span className={styles.liveIndicator}>🔴</span>
                <span className={styles.modalTitle}>LIVE (GW{matchData.gameweek})</span>
              </>
            )}
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
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

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className={styles.scrollableContent}
        >

        {/* Captain Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.emoji}>👑</span>
            <span className={styles.sectionTitle}>Captains</span>
          </div>

          <div className={styles.differentialsGrid}>
            <div className={styles.differentialsBox}>
              <div className={styles.playersList}>
                <div className={styles.playerRow}>
                  <span className={styles.playerName}>{matchData.player1.captain.name}</span>
                  <span className={`${styles.playerPoints} ${matchData.player1.captain.points > 0 ? styles.positive : ''}`}>
                    {matchData.player1.captain.points} pts
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.differentialsBox}>
              <div className={styles.playersList}>
                <div className={styles.playerRow}>
                  <span className={styles.playerName}>{matchData.player2.captain.name}</span>
                  <span className={`${styles.playerPoints} ${matchData.player2.captain.points > 0 ? styles.positive : ''}`}>
                    {matchData.player2.captain.points} pts
                  </span>
                </div>
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
                          {player.wasAutoSubbedOut && <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{player.name}</span>}
                          {!player.wasAutoSubbedOut && player.name}
                          {player.isCaptain && <span className={styles.captainBadge}>(C)</span>}
                          {player.position > 11 && !player.wasAutoSubbedIn && <span className={styles.benchBadge}>(B)</span>}
                          {player.wasAutoSubbedOut && player.replacedBy && (
                            <span className={styles.autoSubBadge}>→ {player.replacedBy}</span>
                          )}
                          {player.wasAutoSubbedIn && <span className={styles.autoSubInBadge}>IN</span>}
                        </span>
                        <span className={`${styles.playerPoints} ${player.wasAutoSubbedOut && player.points > 0 ? styles.substituted : player.points > 0 ? styles.positive : player.points < 0 ? styles.negative : ''}`}>
                          <span className={player.bonusPoints && player.bonusPoints > 0 ? styles.pointsWithBonus : ''}>
                            {player.points < 0 ? `${player.points}` : player.points}
                          </span> pts
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
                          {player.wasAutoSubbedOut && <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{player.name}</span>}
                          {!player.wasAutoSubbedOut && player.name}
                          {player.isCaptain && <span className={styles.captainBadge}>(C)</span>}
                          {player.position > 11 && !player.wasAutoSubbedIn && <span className={styles.benchBadge}>(B)</span>}
                          {player.wasAutoSubbedOut && player.replacedBy && (
                            <span className={styles.autoSubBadge}>→ {player.replacedBy}</span>
                          )}
                          {player.wasAutoSubbedIn && <span className={styles.autoSubInBadge}>IN</span>}
                        </span>
                        <span className={`${styles.playerPoints} ${player.wasAutoSubbedOut && player.points > 0 ? styles.substituted : player.points > 0 ? styles.positive : player.points < 0 ? styles.negative : ''}`}>
                          <span className={player.bonusPoints && player.bonusPoints > 0 ? styles.pointsWithBonus : ''}>
                            {player.points < 0 ? `${player.points}` : player.points}
                          </span> pts
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

        {/* Common Players Section */}
        {matchData.commonPlayers.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.emoji}>👥</span>
              <span className={styles.sectionTitle}>Common Players</span>
            </div>

            <div className={styles.differentialsGrid}>
              {/* Player 1 Common Players */}
              <div className={styles.differentialsBox}>
                <div className={styles.playersList}>
                  {matchData.commonPlayers.map((player, idx) => (
                    <div key={idx} className={styles.playerRow}>
                      <span className={styles.playerName}>
                        {player.name}
                        {player.player1Captain && <span className={styles.captainBadge}>(C)</span>}
                      </span>
                      <span className={`${styles.playerPoints} ${player.player1Points > 0 ? styles.positive : ''}`}>
                        {player.player1Points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Player 2 Common Players */}
              <div className={styles.differentialsBox}>
                <div className={styles.playersList}>
                  {matchData.commonPlayers.map((player, idx) => (
                    <div key={idx} className={styles.playerRow}>
                      <span className={styles.playerName}>
                        {player.name}
                        {player.player2Captain && <span className={styles.captainBadge}>(C)</span>}
                      </span>
                      <span className={`${styles.playerPoints} ${player.player2Points > 0 ? styles.positive : ''}`}>
                        {player.player2Points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );

  // Render modal as portal at body level to avoid positioning conflicts
  return createPortal(modalContent, document.body);
}

function calculateWinRequirements(matchData: LiveMatchData, isMyMatch: boolean): WinRequirements {
  // Calculate differential points for each player
  const player1DiffTotal = matchData.player1.differentials.reduce((sum, p) => sum + p.points, 0);
  const player2DiffTotal = matchData.player2.differentials.reduce((sum, p) => sum + p.points, 0);

  // Calculate the differential margin (how much ahead/behind based on differentials alone)
  const diffMargin = player1DiffTotal - player2DiffTotal;

  // Count differential players remaining (haven't played yet)
  const player1DiffRemaining = matchData.player1.differentials.filter(p => !p.hasPlayed).length;
  const player2DiffRemaining = matchData.player2.differentials.filter(p => !p.hasPlayed).length;

  // Winning on differentials
  if (diffMargin > 0) {
    const opponentNeeds = diffMargin + 1;
    const avgPerPlayer = player2DiffRemaining > 0 ? opponentNeeds / player2DiffRemaining : 0;

    return {
      status: 'winning',
      margin: Math.abs(diffMargin),
      pointsNeeded: opponentNeeds,
      avgPerPlayer: avgPerPlayer,
      opponentAvgNeeded: avgPerPlayer,
      message: `Leading by ${diffMargin} differential pts. Opponent needs ${opponentNeeds}+ diff pts (avg ${avgPerPlayer.toFixed(1)}/diff player).`,
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
  const avgPerPlayer = player1DiffRemaining > 0 ? youNeed / player1DiffRemaining : 0;

  return {
    status: 'losing',
    margin: Math.abs(diffMargin),
    pointsNeeded: youNeed,
    avgPerPlayer: avgPerPlayer,
    opponentAvgNeeded: 0,
    message: `Need ${youNeed}+ differential pts from ${player1DiffRemaining} diff players (avg ${avgPerPlayer.toFixed(1)}/player).`,
  };
}
