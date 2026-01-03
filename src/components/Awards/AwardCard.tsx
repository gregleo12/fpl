'use client';

import styles from './AwardCard.module.css';

interface Award {
  title: string;
  winner: {
    entry_id: number;
    player_name: string;
    team_name: string;
  };
  value: number;
  unit: string;
  description: string;
}

interface Props {
  award: Award;
  myTeamId: string;
}

export function AwardCard({ award, myTeamId }: Props) {
  const isMyTeam = award.winner.entry_id.toString() === myTeamId;

  return (
    <div className={`${styles.card} ${isMyTeam ? styles.myTeam : ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{award.title}</h3>
        {isMyTeam && <span className={styles.badge}>You!</span>}
      </div>

      <div className={styles.winner}>
        <div className={styles.playerName}>{award.winner.player_name}</div>
        <div className={styles.teamName}>{award.winner.team_name}</div>
      </div>

      <div className={styles.value}>
        <span className={styles.number}>{award.value.toLocaleString()}</span>
        <span className={styles.unit}>{award.unit}</span>
      </div>

      <div className={styles.description}>{award.description}</div>
    </div>
  );
}
