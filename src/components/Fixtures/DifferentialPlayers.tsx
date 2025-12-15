import styles from './DifferentialPlayers.module.css';

interface DifferentialPlayer {
  playerName: string;
  avgPoints: number;
  form: number[];
  formMinutes: number[];
  position: string;
}

interface DifferentialPlayersProps {
  entry1Name: string;
  entry2Name: string;
  entry1Differentials: DifferentialPlayer[];
  entry2Differentials: DifferentialPlayer[];
}

export function DifferentialPlayers({
  entry1Name,
  entry2Name,
  entry1Differentials,
  entry2Differentials
}: DifferentialPlayersProps) {
  // Show message if no differentials
  if (entry1Differentials.length === 0 && entry2Differentials.length === 0) {
    return (
      <div className={styles.differentialSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.emoji}>⚔️</span>
          <span className={styles.title}>Differential Players</span>
        </div>
        <div className={styles.noDifferentials}>
          Both teams have identical squads
        </div>
      </div>
    );
  }

  return (
    <div className={styles.differentialSection}>
      {/* Section Header */}
      <div className={styles.sectionHeader}>
        <span className={styles.emoji}>⚔️</span>
        <span className={styles.title}>Differential Players</span>
      </div>

      {/* 2-Column Grid */}
      <div className={styles.differentialGrid}>
        {/* Entry 1 Column */}
        <div className={styles.differentialColumn}>
          <div className={styles.columnHeader}>{entry1Name}</div>
          {entry1Differentials.length === 0 ? (
            <div className={styles.noDifferentialsText}>No differentials</div>
          ) : (
            <div className={styles.playersList}>
              {entry1Differentials.map((player, idx) => (
                <div key={idx} className={styles.playerRow}>
                  <div className={styles.playerInfo}>
                    <span className={styles.position}>{player.position}</span>
                    <span className={styles.playerName}>{player.playerName}</span>
                  </div>
                  <div className={styles.playerStats}>
                    <div className={styles.avgPoints}>
                      {player.avgPoints.toFixed(1)}
                    </div>
                    <div className={styles.formBadges}>
                      {player.form.map((pts, i) => {
                        const minutes = player.formMinutes?.[i] || 0;
                        const hasPlayed = minutes > 0;

                        // Determine color based on minutes (played status) and points
                        const badgeClass = hasPlayed
                          ? (pts >= 10 ? styles.excellent :
                             pts >= 6 ? styles.good :
                             pts >= 3 ? styles.ok :
                             styles.good) // Played but 0-2 pts → green (good)
                          : styles.poor; // Didn't play → gray (poor)

                        return (
                          <div
                            key={i}
                            className={`${styles.formBadge} ${badgeClass}`}
                          >
                            {pts}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Entry 2 Column */}
        <div className={styles.differentialColumn}>
          <div className={styles.columnHeader}>{entry2Name}</div>
          {entry2Differentials.length === 0 ? (
            <div className={styles.noDifferentialsText}>No differentials</div>
          ) : (
            <div className={styles.playersList}>
              {entry2Differentials.map((player, idx) => (
                <div key={idx} className={styles.playerRow}>
                  <div className={styles.playerInfo}>
                    <span className={styles.position}>{player.position}</span>
                    <span className={styles.playerName}>{player.playerName}</span>
                  </div>
                  <div className={styles.playerStats}>
                    <div className={styles.avgPoints}>
                      {player.avgPoints.toFixed(1)}
                    </div>
                    <div className={styles.formBadges}>
                      {player.form.map((pts, i) => {
                        const minutes = player.formMinutes?.[i] || 0;
                        const hasPlayed = minutes > 0;

                        // Determine color based on minutes (played status) and points
                        const badgeClass = hasPlayed
                          ? (pts >= 10 ? styles.excellent :
                             pts >= 6 ? styles.good :
                             pts >= 3 ? styles.ok :
                             styles.good) // Played but 0-2 pts → green (good)
                          : styles.poor; // Didn't play → gray (poor)

                        return (
                          <div
                            key={i}
                            className={`${styles.formBadge} ${badgeClass}`}
                          >
                            {pts}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
