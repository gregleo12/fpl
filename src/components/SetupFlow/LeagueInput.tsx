'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRecentLeagues } from '@/lib/storage';
import styles from './SetupFlow.module.css';

export default function LeagueInput() {
  const [leagueId, setLeagueId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const recentLeagues = getRecentLeagues();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!leagueId.trim()) {
      setError('Please enter a league ID');
      return;
    }

    await fetchAndNavigate(leagueId);
  }

  async function fetchAndNavigate(id: string) {
    setIsLoading(true);
    setError('');

    try {
      // Fetch league data from API
      const response = await fetch(`/api/league/${id}`);

      if (!response.ok) {
        throw new Error('League not found');
      }

      const statsResponse = await fetch(`/api/league/${id}/stats`);
      if (!statsResponse.ok) {
        throw new Error('Could not fetch league stats');
      }

      const data = await statsResponse.json();

      // Store league data temporarily
      sessionStorage.setItem('temp_league', JSON.stringify({
        leagueId: id,
        leagueName: data.league?.name || `League ${id}`,
        standings: data.standings
      }));

      // Navigate to team selection
      router.push(`/setup/team`);
    } catch (err) {
      setError('Could not fetch league. Please check the ID and try again.');
      setIsLoading(false);
    }
  }

  function handleQuickSelect() {
    setLeagueId('804742');
    fetchAndNavigate('804742');
  }

  function handleRecentClick(id: string) {
    setLeagueId(id);
    fetchAndNavigate(id);
  }

  return (
    <div className={styles.setupCard}>
      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label htmlFor="leagueId">Enter League ID</label>
          <input
            id="leagueId"
            type="text"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            placeholder="e.g., 804742"
            disabled={isLoading}
            autoFocus
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={isLoading} className={styles.submitButton}>
          {isLoading ? 'Fetching...' : 'Continue'}
        </button>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <button
          type="button"
          onClick={handleQuickSelect}
          disabled={isLoading}
          className={styles.quickSelect}
        >
          Dedoume FPL 9th Edition
        </button>
      </form>

      {recentLeagues.length > 0 && (
        <div className={styles.recentSection}>
          <h3>Recent Leagues</h3>
          <div className={styles.recentList}>
            {recentLeagues.map((league) => (
              <button
                key={league.leagueId}
                onClick={() => handleRecentClick(league.leagueId)}
                className={styles.recentItem}
                disabled={isLoading}
              >
                <span className={styles.recentName}>{league.leagueName}</span>
                <span className={styles.recentId}>#{league.leagueId}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
