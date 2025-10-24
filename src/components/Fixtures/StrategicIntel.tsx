import styles from './StrategicIntel.module.css';

interface CaptainPick {
  playerName: string;
  count: number;
}

interface BenchPoints {
  total: number;
  average: number;
  breakdown: number[];
}

interface HitsTaken {
  total: number;
  count: number;
  breakdown: Array<{ gameweek: number; cost: number }>;
}

interface CommonPlayers {
  count: number;
  percentage: number;
  players: string[];
}

interface StrategicIntel {
  captainHistory: CaptainPick[];
  benchPoints: BenchPoints;
  teamValue: number;
  hitsTaken: HitsTaken;
  commonPlayers: CommonPlayers;
}

interface StrategicIntelProps {
  entry1: {
    player_name: string;
    strategicIntel: StrategicIntel;
  };
  entry2: {
    player_name: string;
    strategicIntel: StrategicIntel;
  };
}

export function StrategicIntel({ entry1, entry2 }: StrategicIntelProps) {
  return (
    <div className={styles.strategicIntel}>
      {/* Section Header */}
      <div className={styles.sectionHeader}>
        <span className={styles.emoji}>🎯</span>
        <span className={styles.title}>Strategic Intel</span>
      </div>

      {/* Two-Column Grid */}
      <div className={styles.intelGrid}>
        {/* LEFT COLUMN - Player 1 */}
        <div className={styles.playerColumn}>
          {/* Bench Points */}
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>BENCH POINTS (LAST 5 GWs)</div>
            <div className={styles.benchStats}>
              <div className={styles.benchTotal}>
                {entry1.strategicIntel.benchPoints.average.toFixed(1)} pts/GW
              </div>
              <div className={styles.benchAvg}>
                {entry1.strategicIntel.benchPoints.total} pts total
              </div>
            </div>
          </div>

          {/* Team Value */}
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>TEAM VALUE</div>
            <div className={styles.teamValue}>
              £{entry1.strategicIntel.teamValue.toFixed(1)}M
            </div>
          </div>

          {/* Hits Taken */}
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>HITS TAKEN (SEASON)</div>
            <div className={styles.hitsStats}>
              {entry1.strategicIntel.hitsTaken.total < 0 ? (
                <div className={styles.hitsTotal}>
                  {entry1.strategicIntel.hitsTaken.total} pts ({entry1.strategicIntel.hitsTaken.count} hit{entry1.strategicIntel.hitsTaken.count > 1 ? 's' : ''})
                </div>
              ) : (
                <div className={styles.noHits}>No hits</div>
              )}
            </div>
          </div>

          {/* Captain Picks */}
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>CAPTAIN PICKS (LAST 5 GWs)</div>
            <div className={styles.captainList}>
              {entry1.strategicIntel.captainHistory.slice(0, 3).map((cap, i) => (
                <div key={i} className={styles.captainItem}>
                  <span className={styles.captainName}>{cap.playerName}</span>
                  <span className={styles.captainCount}>({cap.count}x)</span>
                </div>
              ))}
              {entry1.strategicIntel.captainHistory.length === 0 && (
                <div className={styles.noData}>No data</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Player 2 */}
        <div className={styles.playerColumn}>
          {/* Bench Points */}
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>BENCH POINTS (LAST 5 GWs)</div>
            <div className={styles.benchStats}>
              <div className={styles.benchTotal}>
                {entry2.strategicIntel.benchPoints.average.toFixed(1)} pts/GW
              </div>
              <div className={styles.benchAvg}>
                {entry2.strategicIntel.benchPoints.total} pts total
              </div>
            </div>
          </div>

          {/* Team Value */}
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>TEAM VALUE</div>
            <div className={styles.teamValue}>
              £{entry2.strategicIntel.teamValue.toFixed(1)}M
            </div>
          </div>

          {/* Hits Taken */}
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>HITS TAKEN (SEASON)</div>
            <div className={styles.hitsStats}>
              {entry2.strategicIntel.hitsTaken.total < 0 ? (
                <div className={styles.hitsTotal}>
                  {entry2.strategicIntel.hitsTaken.total} pts ({entry2.strategicIntel.hitsTaken.count} hit{entry2.strategicIntel.hitsTaken.count > 1 ? 's' : ''})
                </div>
              ) : (
                <div className={styles.noHits}>No hits</div>
              )}
            </div>
          </div>

          {/* Captain Picks */}
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>CAPTAIN PICKS (LAST 5 GWs)</div>
            <div className={styles.captainList}>
              {entry2.strategicIntel.captainHistory.slice(0, 3).map((cap, i) => (
                <div key={i} className={styles.captainItem}>
                  <span className={styles.captainName}>{cap.playerName}</span>
                  <span className={styles.captainCount}>({cap.count}x)</span>
                </div>
              ))}
              {entry2.strategicIntel.captainHistory.length === 0 && (
                <div className={styles.noData}>No data</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Common Players - Full Width */}
      {entry1.strategicIntel.commonPlayers.count > 0 && (
        <div className={styles.commonPlayersSection}>
          <div className={styles.commonPlayersHeader}>
            <span className={styles.commonPlayersEmoji}>⚡</span>
            <span className={styles.commonPlayersTitle}>
              COMMON PLAYERS ({entry1.strategicIntel.commonPlayers.count} shared - {entry1.strategicIntel.commonPlayers.percentage}% overlap)
            </span>
          </div>
          <div className={styles.commonPlayersList}>
            {entry1.strategicIntel.commonPlayers.players.map((player, i) => (
              <span key={i} className={styles.commonPlayer}>
                {player}
                {i < entry1.strategicIntel.commonPlayers.players.length - 1 && ' • '}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
