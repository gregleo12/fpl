'use client';

import styles from './AwardCard.module.css';

interface Manager {
  entry_id: number;
  player_name: string;
  team_name: string;
}

interface Award {
  title: string;
  winner: Manager;
  winner_value: number;
  runner_up?: Manager;
  runner_up_value?: number;
  unit: string;
  description: string;
}

interface Props {
  award: Award;
  myTeamId: string;
}

export function AwardCard({ award, myTeamId }: Props) {
  const isWinnerMe = award.winner.entry_id.toString() === myTeamId;
  const isRunnerUpMe = award.runner_up?.entry_id.toString() === myTeamId;

  return (
    <div className={`${styles.card} ${(isWinnerMe || isRunnerUpMe) ? styles.myTeam : ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{award.title}</h3>
        {(isWinnerMe || isRunnerUpMe) && <span className={styles.badge}>You!</span>}
      </div>

      {/* Winner */}
      <div className={styles.winner}>
        <div className={styles.place}>🥇 1st</div>
        <div className={styles.managerInfo}>
          <div className={styles.playerName}>{award.winner.player_name}</div>
          <div className={styles.teamName}>{award.winner.team_name}</div>
        </div>
        <div className={styles.valueCompact}>
          <span className={styles.number}>{award.winner_value.toLocaleString()}</span>
          <span className={styles.unit}>{award.unit}</span>
        </div>
      </div>

      {/* Runner-up */}
      {award.runner_up && (
        <div className={styles.runnerUp}>
          <div className={styles.place}>🥈 2nd</div>
          <div className={styles.managerInfo}>
            <div className={styles.playerName}>{award.runner_up.player_name}</div>
            <div className={styles.teamName}>{award.runner_up.team_name}</div>
          </div>
          <div className={styles.valueCompact}>
            <span className={styles.number}>{award.runner_up_value?.toLocaleString()}</span>
            <span className={styles.unit}>{award.unit}</span>
          </div>
        </div>
      )}

      <div className={styles.description}>{award.description}</div>
    </div>
  );
}
