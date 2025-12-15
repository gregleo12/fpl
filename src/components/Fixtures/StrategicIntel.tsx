import { Target } from 'lucide-react';
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
  overallRank: number;
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
        <Target size={18} color="#bb86fc" className={styles.emoji} />
        <span className={styles.title}>Strategic Intel</span>
      </div>

      {/* Row-by-Row Comparison Grid */}
      <div className={styles.intelGrid}>
        {/* Bench Points Row */}
        <div className={styles.intelRow}>
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>BENCH POINTS (Last 5)</div>
            <div className={styles.benchStats}>
              <div className={styles.benchTotal}>
                {entry1.strategicIntel.benchPoints.average.toFixed(1)} pts/GW
              </div>
              <div className={styles.benchAvg}>
                {entry1.strategicIntel.benchPoints.total} pts total
              </div>
            </div>
          </div>
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>BENCH POINTS (Last 5)</div>
            <div className={styles.benchStats}>
              <div className={styles.benchTotal}>
                {entry2.strategicIntel.benchPoints.average.toFixed(1)} pts/GW
              </div>
              <div className={styles.benchAvg}>
                {entry2.strategicIntel.benchPoints.total} pts total
              </div>
            </div>
          </div>
        </div>

        {/* Team Value Row */}
        <div className={styles.intelRow}>
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>TEAM VALUE</div>
            <div className={styles.teamValue}>
              £{entry1.strategicIntel.teamValue.toFixed(1)}M
            </div>
          </div>
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>TEAM VALUE</div>
            <div className={styles.teamValue}>
              £{entry2.strategicIntel.teamValue.toFixed(1)}M
            </div>
          </div>
        </div>

        {/* OR Rank Row */}
        <div className={styles.intelRow}>
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>OR RANK</div>
            <div className={styles.orRank}>
              {entry1.strategicIntel.overallRank > 0 ? entry1.strategicIntel.overallRank.toLocaleString() : 'N/A'}
            </div>
          </div>
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>OR RANK</div>
            <div className={styles.orRank}>
              {entry2.strategicIntel.overallRank > 0 ? entry2.strategicIntel.overallRank.toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>

        {/* Hits Taken Row */}
        <div className={styles.intelRow}>
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>HITS TAKEN</div>
            <div className={styles.hitsStats}>
              {entry1.strategicIntel.hitsTaken.count > 0 ? (
                <div className={styles.hitsTotal}>
                  {entry1.strategicIntel.hitsTaken.count} hit{entry1.strategicIntel.hitsTaken.count > 1 ? 's' : ''}
                </div>
              ) : (
                <div className={styles.noHits}>No hits</div>
              )}
            </div>
          </div>
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>HITS TAKEN</div>
            <div className={styles.hitsStats}>
              {entry2.strategicIntel.hitsTaken.count > 0 ? (
                <div className={styles.hitsTotal}>
                  {entry2.strategicIntel.hitsTaken.count} hit{entry2.strategicIntel.hitsTaken.count > 1 ? 's' : ''}
                </div>
              ) : (
                <div className={styles.noHits}>No hits</div>
              )}
            </div>
          </div>
        </div>

        {/* Captain Picks Row */}
        <div className={styles.intelRow}>
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>CAPTAIN PICKS (Last 5)</div>
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
          <div className={styles.intelSection}>
            <div className={styles.intelLabel}>CAPTAIN PICKS (Last 5)</div>
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

    </div>
  );
}
