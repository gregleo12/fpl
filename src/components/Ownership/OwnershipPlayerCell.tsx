'use client';

import styles from './OwnershipPlayers.module.css';

interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  position: string;
  team_id: number;
  team_code: number;
  team_short: string;
  now_cost: number;
  selected_by_percent: string | number;
  total_points: number;
  form: string | number;
  points_per_game: string | number;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
}

interface Props {
  player: Player;
  team: Team;
}

export function PlayerCell({ player, team }: Props) {
  const position = player.position || 'UNK';

  // Determine if goalkeeper for jersey variant
  const isGK = player.position === 'GKP';
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
            <span className={styles.teamName}>{player.team_short || team?.short_name || 'N/A'}</span>
          </div>
        </div>
      </div>
    </td>
  );
}
