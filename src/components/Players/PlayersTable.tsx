'use client';

import { PlayerRow } from './PlayerRow';
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
  players: Player[];
  teams: Team[];
}

export function PlayersTable({ players, teams }: Props) {
  // Create team lookup map
  const teamMap = teams.reduce((acc, team) => {
    acc[team.id] = team;
    return acc;
  }, {} as Record<number, Team>);

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.playerHeader}>Player</th>
            <th className={styles.statHeader}>Price</th>
            <th className={styles.statHeader}>TSB%</th>
            <th className={styles.statHeader}>Total</th>
            <th className={styles.statHeader}>Form</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              team={teamMap[player.team]}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
