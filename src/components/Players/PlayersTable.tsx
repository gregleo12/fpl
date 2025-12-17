'use client';

import { useState } from 'react';
import { PlayerRow } from './PlayerRow';
import { PlayerDetailModal } from './PlayerDetailModal';
import { COMPACT_COLUMNS, ALL_COLUMNS } from './columns';
import { ViewMode, SortState } from './PlayersTab';
import styles from './PlayersTab.module.css';

interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  position: string;
  element_type: number;
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
  status?: string;
  news?: string;
  [key: string]: any;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
}

interface Props {
  players: Player[];
  teams: Team[];
  viewMode: ViewMode;
  sort: SortState;
  onSort: (column: string) => void;
}

export function PlayersTable({ players, teams, viewMode, sort, onSort }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Create team lookup map
  const teamMap = teams.reduce((acc, team) => {
    acc[team.id] = team;
    return acc;
  }, {} as Record<number, Team>);

  const columns = viewMode === 'compact' ? COMPACT_COLUMNS : ALL_COLUMNS;

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.playerHeader}>Player</th>
              {columns.map((col) => {
                const isActive = sort.column === col.key;
                return (
                  <th
                    key={col.key}
                    className={`${styles.statHeader} ${styles.sortable} ${isActive ? styles.activeSort : ''}`}
                    style={{ width: col.width, textAlign: col.align || 'center' }}
                    title={col.tooltip}
                    onClick={() => onSort(col.key)}
                  >
                    <span className={styles.headerContent}>
                      {col.label}
                      {isActive && (
                        <span className={styles.sortIndicator}>
                          {sort.direction === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                team={teamMap[player.team_id]}
                columns={columns}
                onClick={() => setSelectedPlayer(player)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selectedPlayer && (
        <PlayerDetailModal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          player={selectedPlayer}
          team={teamMap[selectedPlayer.team_id]}
          teams={teams}
        />
      )}
    </>
  );
}
