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
      console.log('Fetching league:', id);
      const response = await fetch(`/api/league/${id}`);
      console.log('League response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('League fetch failed:', errorText);
        throw new Error(`League fetch failed: ${response.status}`);
      }

      const statsResponse = await fetch(`/api/league/${id}/stats`);
      console.log('Stats response status:', statsResponse.status);

      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        console.error('Stats fetch failed:', errorText);
        throw new Error(`Stats fetch failed: ${statsResponse.status}`);
      }

      const data = await statsResponse.json();
      console.log('Successfully fetched league data');

      // Store league data temporarily
      sessionStorage.setItem('temp_league', JSON.stringify({
        leagueId: id,
        leagueName: data.league?.name || `League ${id}`,
        standings: data.standings
      }));

      // Navigate to team selection
      router.push(`/setup/team`);
    } catch (err: any) {
      console.error('Full error:', err);
      setError(err.message || 'Could not fetch league. Please check the ID and try again.');
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
