'use client';

import { PlayerCell } from './PlayerCell';
import { ColumnDef } from './columns';
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
  event_points: number;
  starts: number;
  minutes: number;
  goals_scored: number;
  expected_goals: string;
  assists: number;
  expected_assists: string;
  expected_goal_involvements: string;
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
}

export function PlayerRow({ player, team, columns }: Props) {
  return (
    <tr className={styles.row}>
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
