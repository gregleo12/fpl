'use client';

import { PlayerRow } from './PlayerRow';
import { COMPACT_COLUMNS, ALL_COLUMNS } from './columns';
import { ViewMode } from './PlayersTab';
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
  event_points?: number;
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
  cost_change_start?: number;
  [key: string]: any;
}

interface Team {
  id: number;
  name: string;
  short: string;
}

interface Props {
  players: Player[];
  teams: Team[];
  viewMode: ViewMode;
}

export function PlayersTable({ players, teams, viewMode }: Props) {
  const columns = viewMode === 'compact' ? COMPACT_COLUMNS : ALL_COLUMNS;

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.playerHeader}>Player</th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={styles.statHeader}
                style={{ width: col.width, textAlign: col.align || 'center' }}
                title={col.tooltip}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              columns={columns}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
