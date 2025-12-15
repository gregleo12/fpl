'use client';

import styles from './PlayersTab.module.css';

interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  position: string;
  team_id: number;
  team_name: string;
  team_short: string;
  team_code: number;
  now_cost: number;
  selected_by_percent: string;
  total_points: number;
  form: string;
  points_per_game: string;
}

interface Props {
  player: Player;
}

export function PlayerCell({ player }: Props) {
  const position = player.position;

  // Determine if goalkeeper for jersey variant
  const isGK = position === 'GKP';
  const jerseyUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}${isGK ? '_1' : ''}-110.webp`;

  return (
    <td className={styles.playerCell}>
      <div className={styles.playerInfo}>
        <img
          src={jerseyUrl}
          alt={`${player.web_name} jersey`}
          className={styles.jersey}
          loading="lazy"
        />
        <div className={styles.playerDetails}>
          <div className={styles.playerName}>{player.web_name}</div>
          <div className={styles.playerMeta}>
            <span className={`${styles.positionBadge} ${styles[`position${position}`]}`}>
              {position}
            </span>
            <span className={styles.separator}>·</span>
            <span className={styles.teamName}>{player.team_short || 'N/A'}</span>
          </div>
        </div>
      </div>
    </td>
  );
}
