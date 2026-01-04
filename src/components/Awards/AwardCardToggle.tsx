'use client';

import { useState } from 'react';
import styles from './AwardCardToggle.module.css';

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
  isShame?: boolean;
}

interface Props {
  fameAward: Award;
  shameAward: Award;
  myTeamId: string;
  fameIcon?: React.ReactNode;
  shameIcon?: React.ReactNode;
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

export function AwardCardToggle({ fameAward, shameAward, myTeamId, fameIcon, shameIcon }: Props) {
  const [showShame, setShowShame] = useState(false);
  const currentAward = showShame ? shameAward : fameAward;
  const currentIcon = showShame ? shameIcon : fameIcon;

  const isWinnerMe = currentAward.winner.entry_id.toString() === myTeamId;
  const isRunnerUpMe = currentAward.runner_up?.entry_id.toString() === myTeamId;
  const isThirdPlaceMe = currentAward.third_place?.entry_id.toString() === myTeamId;

  return (
    <div className={`${styles.card} ${(isWinnerMe || isRunnerUpMe || isThirdPlaceMe) ? styles.myTeam : ''}`}>
      <div className={styles.header}>
        <div className={styles.titleWithIcon}>
          {currentIcon && (
            <span className={`${styles.icon} ${showShame ? styles.shame : ''}`}>
              {currentIcon}
            </span>
          )}
          <h3 className={styles.title}>{currentAward.title}</h3>
        </div>
        <div className={styles.toggle}>
          <button
            className={!showShame ? styles.active : ''}
            onClick={() => setShowShame(false)}
            title="View Fame award"
            aria-label="Fame"
          >
            🏆
          </button>
          <button
            className={showShame ? styles.active : ''}
            onClick={() => setShowShame(true)}
            title="View Shame award"
            aria-label="Shame"
          >
            💀
          </button>
        </div>
      </div>

      {(isWinnerMe || isRunnerUpMe || isThirdPlaceMe) && (
        <span className={styles.badge}>You!</span>
      )}

      {/* Winner */}
      <div className={styles.winner}>
        <div className={styles.place}>🥇 1st</div>
        <div className={styles.managerInfo}>
          <div className={styles.playerName}>{currentAward.winner.player_name}</div>
          <div className={styles.teamName}>{currentAward.winner.team_name}</div>
        </div>
        <div className={styles.valueCompact}>
          <span className={styles.number}>{formatCompactNumber(currentAward.winner_value, currentAward.unit)}</span>
          <span className={styles.unit}>{currentAward.unit}</span>
        </div>
      </div>

      {/* Runner-up */}
      {currentAward.runner_up && (
        <div className={styles.runnerUp}>
          <div className={styles.place}>🥈 2nd</div>
          <div className={styles.managerInfo}>
            <div className={styles.playerName}>{currentAward.runner_up.player_name}</div>
            <div className={styles.teamName}>{currentAward.runner_up.team_name}</div>
          </div>
          <div className={styles.valueCompact}>
            <span className={styles.number}>{formatCompactNumber(currentAward.runner_up_value, currentAward.unit)}</span>
            <span className={styles.unit}>{currentAward.unit}</span>
          </div>
        </div>
      )}

      {/* Third place */}
      {currentAward.third_place && (
        <div className={styles.thirdPlace}>
          <div className={styles.place}>🥉 3rd</div>
          <div className={styles.managerInfo}>
            <div className={styles.playerName}>{currentAward.third_place.player_name}</div>
            <div className={styles.teamName}>{currentAward.third_place.team_name}</div>
          </div>
          <div className={styles.valueCompact}>
            <span className={styles.number}>{formatCompactNumber(currentAward.third_place_value, currentAward.unit)}</span>
            <span className={styles.unit}>{currentAward.unit}</span>
          </div>
        </div>
      )}

      <div className={styles.description}>{currentAward.description}</div>
    </div>
  );
}
