'use client';

import { PlayerCell } from './PlayerCell';
import { ColumnDef } from './columns';
import styles from './PlayersTab.module.css';

interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  position: string;
  team_id: number;
  team_code: number;
  team_name: string;
  team_short: string;
  now_cost: number;
  selected_by_percent: string | number;
  total_points: number;
  form: string | number;
  points_per_game: string | number;
  event_points: number;
  starts: number;
  minutes: number;
  goals_scored: number;
  expected_goals: string | number;
  assists: number;
  expected_assists: string | number;
  expected_goal_involvements: string | number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
  bonus: number;
  bps: number;
  yellow_cards: number;
  red_cards: number;
  cost_change_start: number;
  [key: string]: any;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
}

interface Props {
  player: Player;
  team: Team;
  columns: ColumnDef[];
  onClick?: () => void;
}

export function PlayerRow({ player, team, columns, onClick }: Props) {
  return (
    <tr className={`${styles.row} ${styles.clickableRow}`} onClick={onClick}>
      <PlayerCell player={player} team={team} />
      {columns.map((col) => {
        const value = player[col.key];
        const displayValue = col.format ? col.format(value, player) : value;

        return (
          <td
            key={col.key}
            className={styles.statsCell}
            style={{ textAlign: col.align || 'center' }}
          >
            {displayValue !== null && displayValue !== undefined ? displayValue : '-'}
          </td>
        );
      })}
    </tr>
  );
}
