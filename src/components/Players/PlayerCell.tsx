'use client';

import styles from './PlayersTab.module.css';

interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: number;
  team: number;
  team_code: number;
  now_cost: number;
  selected_by_percent: string;
  total_points: number;
  form: string;
  points_per_game: string;
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

const POSITION_MAP: Record<number, string> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

export function PlayerCell({ player, team }: Props) {
  const position = POSITION_MAP[player.element_type] || 'UNK';

  // Determine if goalkeeper for jersey variant
  const isGK = player.element_type === 1;
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
            <span className={styles.teamName}>{team?.short_name || 'N/A'}</span>
          </div>
        </div>
      </div>
    </td>
  );
}
