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
}

interface Team {
  id: number;
  name: string;
  short_name: string;
}

export function PlayersTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      setIsLoading(true);
      const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');

      if (!response.ok) {
        throw new Error('Failed to fetch player data');
      }

      const data = await response.json();

      // Sort by total_points descending by default
      const sortedPlayers = data.elements.sort((a: Player, b: Player) =>
        b.total_points - a.total_points
      );

      setPlayers(sortedPlayers);
      setTeams(data.teams);
    } catch (err: any) {
      setError(err.message || 'Failed to load players');
      console.error('Error fetching players:', err);
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
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>All Players</h2>
        <div className={styles.subtitle}>{players.length} players</div>
      </div>

      <PlayersTable players={players} teams={teams} />
    </div>
  );
}
