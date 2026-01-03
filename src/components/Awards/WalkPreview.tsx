'use client';

import styles from './WalkPreview.module.css';

interface MedalEntry {
  rank: number;
  entry_id: number;
  player_name: string;
  team_name: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  score: number;
}

interface WalkPreviewProps {
  fame: MedalEntry[];
  shame: MedalEntry[];
  myTeamId: string;
}

export default function WalkPreview({ fame, shame, myTeamId }: WalkPreviewProps) {
  return (
    <div className={styles.wrapper}>
      <div className={`${styles.card} ${styles.fame}`}>
        <h3 className={styles.title}>🏆 Walk of Fame</h3>
        <p className={styles.subtitle}>Top podium finishers</p>
        <ol className={styles.list}>
          {fame.slice(0, 3).map((entry) => {
            const isMyTeam = entry.entry_id.toString() === myTeamId;
            return (
              <li key={entry.entry_id} className={`${styles.entry} ${isMyTeam ? styles.myTeam : ''}`}>
                <span className={styles.name}>
                  {entry.player_name}
                  {isMyTeam && <span className={styles.badge}>You!</span>}
                </span>
                <span className={styles.score}>{entry.score}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={`${styles.card} ${styles.shame}`}>
        <h3 className={styles.title}>💀 Walk of Shame</h3>
        <p className={styles.subtitle}>Top dubious honors</p>
        <ol className={styles.list}>
          {shame.slice(0, 3).map((entry) => {
            const isMyTeam = entry.entry_id.toString() === myTeamId;
            return (
              <li key={entry.entry_id} className={`${styles.entry} ${isMyTeam ? styles.myTeam : ''}`}>
                <span className={styles.name}>
                  {entry.player_name}
                  {isMyTeam && <span className={styles.badge}>You!</span>}
                </span>
                <span className={styles.score}>{entry.score}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
