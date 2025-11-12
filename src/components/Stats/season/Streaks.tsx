'use client';

import styles from './Leaderboard.module.css';

export interface StreakData {
  entry_id: number;
  player_name: string;
  team_name: string;
  current_streak: number;
  streak_type: string;
  form: string;
}

interface Props {
  winningStreaks: StreakData[];
  losingStreaks: StreakData[];
}

export function Streaks({ winningStreaks, losingStreaks }: Props) {
  return (
    <div className={styles.streaksContainer}>
      {/* Winning Streaks */}
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>🔥 Winning Streaks</h4>
        <div className={styles.subtitle}>Current consecutive wins</div>
        {!winningStreaks || winningStreaks.length === 0 ? (
          <div className={styles.noData}>No active winning streaks</div>
        ) : (
          <div className={styles.list}>
            {winningStreaks.slice(0, 5).map((item, index) => (
              <div key={item.entry_id} className={styles.listItem}>
                <div className={styles.rank}>{index + 1}</div>
                <div className={styles.info}>
                  <div className={styles.name}>{item.player_name}</div>
                  <div className={styles.meta}>Form: {item.form}</div>
                </div>
                <div className={styles.stats}>
                  <div className={styles.statValue}>{item.current_streak}</div>
                  <div className={styles.statLabel}>wins</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Losing Streaks */}
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>💀 Losing Streaks</h4>
        <div className={styles.subtitle}>Current consecutive losses</div>
        {!losingStreaks || losingStreaks.length === 0 ? (
          <div className={styles.noData}>No active losing streaks</div>
        ) : (
          <div className={styles.list}>
            {losingStreaks.slice(0, 5).map((item, index) => (
              <div key={item.entry_id} className={styles.listItem}>
                <div className={styles.rank}>{index + 1}</div>
                <div className={styles.info}>
                  <div className={styles.name}>{item.player_name}</div>
                  <div className={styles.meta}>Form: {item.form}</div>
                </div>
                <div className={styles.stats}>
                  <div className={styles.statValue}>{item.current_streak}</div>
                  <div className={styles.statLabel}>losses</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
