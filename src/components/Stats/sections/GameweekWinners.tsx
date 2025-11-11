'use client';

import type { WinnersData } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: WinnersData;
}

export function GameweekWinners({ data }: Props) {
  if (!data) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🏆 Gameweek Winners</h3>
        <div className={styles.noData}>Data not available - visit Rankings to sync</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>🏆 Gameweek Winners</h3>
      <div className={styles.winnersGrid}>
        {data.highest_score && (
          <div className={styles.winnerCard}>
            <div className={styles.winnerBadge}>👑 Highest</div>
            <div className={styles.winnerName}>{data.highest_score.player_name}</div>
            <div className={styles.winnerTeam}>{data.highest_score.team_name}</div>
            <div className={styles.winnerScore}>{data.highest_score.score} pts</div>
          </div>
        )}

        <div className={styles.winnerCard}>
          <div className={styles.winnerBadge}>📊 Average</div>
          <div className={styles.winnerScore}>{data.average_score.toFixed(1)} pts</div>
        </div>

        {data.lowest_score && (
          <div className={styles.winnerCard}>
            <div className={styles.winnerBadge}>💀 Lowest</div>
            <div className={styles.winnerName}>{data.lowest_score.player_name}</div>
            <div className={styles.winnerTeam}>{data.lowest_score.team_name}</div>
            <div className={styles.winnerScore}>{data.lowest_score.score} pts</div>
          </div>
        )}
      </div>
    </div>
  );
}
