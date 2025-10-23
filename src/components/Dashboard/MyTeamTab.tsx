'use client';

import styles from './Dashboard.module.css';

interface Props {
  data: any;
  playerData: any;
  myTeamId: string;
  myManagerName: string;
  myTeamName: string;
  leagueId: string;
}

// Helper to get chip abbreviation
function getChipAbbreviation(chipName: string): string {
  const chipMap: { [key: string]: string } = {
    'wildcard': 'WC',
    'bboost': 'BB',
    '3xc': 'TC',
    'freehit': 'FH'
  };

  const normalized = chipName.toLowerCase().replace(/\s+/g, '');
  return chipMap[normalized] || chipName;
}

export default function MyTeamTab({ data, playerData, myTeamId, myManagerName, myTeamName }: Props) {
  if (!data || !data.standings) {
    return <div className={styles.emptyState}>No team data available</div>;
  }

  if (!playerData) {
    return <div className={styles.emptyState}>Loading your profile...</div>;
  }

  const myTeam = data.standings.find((team: any) => team.entry_id.toString() === myTeamId);

  if (!myTeam) {
    return <div className={styles.emptyState}>Team not found in league</div>;
  }

  const differential = playerData.stats.totalPointsFor -
    playerData.matchHistory.reduce((sum: number, m: any) => sum + m.opponentPoints, 0);

  return (
    <div className={styles.myTeamTab}>
      {/* Team Overview */}
      <div className={styles.section}>
        <div className={styles.teamHeader}>
          <div>
            <h2 className={styles.managerName}>{myManagerName}</h2>
            <p className={styles.teamNameSubtitle}>{myTeamName}</p>
          </div>
          <div className={styles.rankBadge}>
            <span className={styles.rankNumber}>{myTeam.rank}</span>
            <span className={styles.rankLabel}>Rank</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.matchesPlayed}</span>
          <span className={styles.statLabel}>Played</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.totalPointsFor}</span>
          <span className={styles.statLabel}>Points For</span>
        </div>
        <div className={`${styles.statCard}`}>
          <span className={`${styles.statValue} ${
            differential > 0 ? styles.positive :
            differential < 0 ? styles.negative :
            ''
          }`}>
            {differential > 0 ? `+${differential}` : differential}
          </span>
          <span className={styles.statLabel}>+/-</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.averagePoints}</span>
          <span className={styles.statLabel}>Avg/GW</span>
        </div>
      </div>

      {/* Record */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.wins}</span>
          <span className={styles.statLabel}>Wins</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.draws}</span>
          <span className={styles.statLabel}>Draws</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.losses}</span>
          <span className={styles.statLabel}>Losses</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{myTeam.total}</span>
          <span className={styles.statLabel}>Total Pts</span>
        </div>
      </div>

      {/* Form */}
      {myTeam.formArray && myTeam.formArray.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Recent Form</h3>
          <div className={styles.formRow}>
            {myTeam.formArray.map((result: string, idx: number) => (
              <span
                key={idx}
                className={`${styles.formIndicator} ${
                  result === 'W' ? styles.formWin :
                  result === 'D' ? styles.formDraw :
                  styles.formLoss
                }`}
              >
                {result}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Season Stats */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Season Stats</h3>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{playerData.stats.highestScore}</span>
            <span className={styles.statLabel}>Highest Score</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{playerData.stats.lowestScore}</span>
            <span className={styles.statLabel}>Lowest Score</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.positive}`}>
              +{playerData.stats.biggestWin}
            </span>
            <span className={styles.statLabel}>Biggest Win</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.negative}`}>
              {playerData.stats.biggestLoss}
            </span>
            <span className={styles.statLabel}>Biggest Loss</span>
          </div>
        </div>
      </div>

      {/* Chips Played */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Chips Played</h3>
        {playerData.chipsPlayed.length > 0 ? (
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th>Chip</th>
                  <th>GW</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {playerData.chipsPlayed.map((chip: any) => {
                  const match = playerData.matchHistory.find((m: any) => m.event === chip.event);
                  return (
                    <tr key={chip.event}>
                      <td><span className={styles.chipBadge}>{getChipAbbreviation(chip.name)}</span></td>
                      <td>GW{chip.event}</td>
                      <td>{match?.opponentName || '-'}</td>
                      <td>
                        {match ? `${match.playerPoints}-${match.opponentPoints}` : '-'}
                      </td>
                      <td>
                        {match && (
                          <span className={`${styles.resultBadge} ${
                            match.result === 'W' ? styles.resultWin :
                            match.result === 'D' ? styles.resultDraw :
                            styles.resultLoss
                          }`}>
                            {match.result}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>No chips played yet</p>
        )}
      </div>

      {/* Chips Faced */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Chips Faced Against</h3>
        {playerData.chipsFaced.length > 0 ? (
          <>
            <div className={styles.chipsSummary}>
              <span>Faced <strong>{playerData.chipsFaced.length}</strong> chips total - </span>
              <span className={styles.positive}>
                Won {playerData.chipsFaced.filter((c: any) => c.result === 'W').length}
              </span>
              <span> / </span>
              <span className={styles.negative}>
                Lost {playerData.chipsFaced.filter((c: any) => c.result === 'L').length}
              </span>
            </div>
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Chip</th>
                    <th>GW</th>
                    <th>Opponent</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {playerData.chipsFaced.map((chip: any, idx: number) => {
                    const match = playerData.matchHistory.find((m: any) => m.event === chip.event);
                    const yourScore = match?.playerPoints || 0;
                    return (
                      <tr key={idx}>
                        <td><span className={styles.oppChip}>{getChipAbbreviation(chip.chipName)}</span></td>
                        <td>GW{chip.event}</td>
                        <td>{chip.opponentName}</td>
                        <td>{yourScore}-{chip.opponentPoints}</td>
                        <td>
                          <span className={`${styles.resultBadge} ${
                            chip.result === 'W' ? styles.resultWin :
                            chip.result === 'D' ? styles.resultDraw :
                            styles.resultLoss
                          }`}>
                            {chip.result}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className={styles.emptyState}>No chips faced yet</p>
        )}
      </div>

      {/* Match History */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Match History</h3>
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>GW</th>
                <th>Opponent</th>
                <th>Score</th>
                <th>Chips</th>
                <th>Margin</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {playerData.matchHistory.slice().reverse().map((match: any) => {
                // Check if you played a chip in this GW
                const yourChip = playerData.chipsPlayed.find((c: any) => c.event === match.event);
                // Check if opponent played a chip in this GW
                const oppChip = playerData.chipsFaced.find((c: any) => c.event === match.event);

                return (
                  <tr key={match.event}>
                    <td>GW{match.event}</td>
                    <td>{match.opponentName}</td>
                    <td>{match.playerPoints}-{match.opponentPoints}</td>
                    <td>
                      <div className={styles.chipsCell}>
                        {yourChip && (
                          <span className={`${styles.chipBadgeSmall} ${styles.yourChip}`}>
                            {getChipAbbreviation(yourChip.name)}
                          </span>
                        )}
                        {oppChip && (
                          <span className={`${styles.chipBadgeSmall} ${styles.oppChip}`}>
                            {getChipAbbreviation(oppChip.chipName)}
                          </span>
                        )}
                        {!yourChip && !oppChip && (
                          <span className={styles.noChip}>-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={
                        match.margin > 0 ? styles.positive :
                        match.margin < 0 ? styles.negative :
                        ''
                      }>
                        {match.margin > 0 ? `+${match.margin}` : match.margin}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.resultBadge} ${
                        match.result === 'W' ? styles.resultWin :
                        match.result === 'D' ? styles.resultDraw :
                        styles.resultLoss
                      }`}>
                        {match.result}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
