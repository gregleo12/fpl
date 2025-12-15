'use client';

import { PlayerCell } from './PlayerCell';
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

export function PlayerRow({ player, team }: Props) {
  // Format price (divide by 10 to get actual price)
  const price = (player.now_cost / 10).toFixed(1);

  return (
    <tr className={styles.row}>
      <PlayerCell player={player} team={team} />
      <td className={styles.statsCell}>£{price}</td>
      <td className={styles.statsCell}>{player.selected_by_percent}%</td>
      <td className={styles.statsCell}>{player.total_points}</td>
      <td className={styles.statsCell}>{player.form}</td>
    </tr>
  );
}
