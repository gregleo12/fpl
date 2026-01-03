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
  third_place?: Manager;
  third_place_value?: number;
  unit: string;
  description: string;
}

interface Props {
  award: Award;
  myTeamId: string;
}

function formatCompactNumber(value: number | undefined, unit: string): string {
  if (value === undefined) return '';

  // Only format GW Rank values (detect by unit starting with "in GW")
  if (!unit.startsWith('in GW')) {
    return value.toLocaleString();
  }

  // Compact format for ranks
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'm';
  } else if (value >= 1_000) {
    return (value / 1_000).toFixed(1) + 'k';
  }
  return value.toString();
}

export function AwardCard({ award, myTeamId }: Props) {
  const isWinnerMe = award.winner.entry_id.toString() === myTeamId;
  const isRunnerUpMe = award.runner_up?.entry_id.toString() === myTeamId;
  const isThirdPlaceMe = award.third_place?.entry_id.toString() === myTeamId;

  return (
    <div className={`${styles.card} ${(isWinnerMe || isRunnerUpMe || isThirdPlaceMe) ? styles.myTeam : ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{award.title}</h3>
        {(isWinnerMe || isRunnerUpMe || isThirdPlaceMe) && <span className={styles.badge}>You!</span>}
      </div>

      {/* Winner */}
      <div className={styles.winner}>
        <div className={styles.place}>🥇 1st</div>
        <div className={styles.managerInfo}>
          <div className={styles.playerName}>{award.winner.player_name}</div>
          <div className={styles.teamName}>{award.winner.team_name}</div>
        </div>
        <div className={styles.valueCompact}>
          <span className={styles.number}>{formatCompactNumber(award.winner_value, award.unit)}</span>
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
            <span className={styles.number}>{formatCompactNumber(award.runner_up_value, award.unit)}</span>
            <span className={styles.unit}>{award.unit}</span>
          </div>
        </div>
      )}

      {/* Third place */}
      {award.third_place && (
        <div className={styles.thirdPlace}>
          <div className={styles.place}>🥉 3rd</div>
          <div className={styles.managerInfo}>
            <div className={styles.playerName}>{award.third_place.player_name}</div>
            <div className={styles.teamName}>{award.third_place.team_name}</div>
          </div>
          <div className={styles.valueCompact}>
            <span className={styles.number}>{formatCompactNumber(award.third_place_value, award.unit)}</span>
            <span className={styles.unit}>{award.unit}</span>
          </div>
        </div>
      )}

      <div className={styles.description}>{award.description}</div>
    </div>
  );
}
