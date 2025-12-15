'use client';

import { useEffect, useState } from 'react';
import { PlayersTable } from './PlayersTable';
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

export type ViewMode = 'compact' | 'all';

export function PlayersTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/fpl-proxy', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch player data (Status: ${response.status})`);
      }

      const data = await response.json();

      // Sort by total_points descending by default
      const sortedPlayers = data.elements.sort((a: Player, b: Player) =>
        b.total_points - a.total_points
      );

      setPlayers(sortedPlayers);
      setTeams(data.teams);
    } catch (err: any) {
      console.error('Error fetching players:', err);
      setError(err.message || 'Failed to load players');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading players...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button
            onClick={fetchPlayers}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>All Players</h2>
        <div className={styles.subtitle}>{players.length} players</div>
      </div>

      <div className={styles.viewToggle}>
        <button
          className={viewMode === 'compact' ? styles.active : ''}
          onClick={() => setViewMode('compact')}
        >
          Compact Stats
        </button>
        <button
          className={viewMode === 'all' ? styles.active : ''}
          onClick={() => setViewMode('all')}
        >
          All Stats
        </button>
      </div>

      <PlayersTable players={players} teams={teams} viewMode={viewMode} />
    </div>
  );
}
