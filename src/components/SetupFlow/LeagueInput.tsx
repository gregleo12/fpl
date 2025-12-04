'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRecentLeagues } from '@/lib/storage';
import styles from './SetupFlow.module.css';

export default function LeagueInput() {
  const [leagueId, setLeagueId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQuickAccess, setShowQuickAccess] = useState(() => {
    // Remember user's preference in localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('show_quick_access') === 'true';
    }
    return false;
  });
  const router = useRouter();
  const recentLeagues = getRecentLeagues();

  // Persist Quick Access toggle state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('show_quick_access', showQuickAccess.toString());
    }
  }, [showQuickAccess]);

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
        // Try to parse error as JSON for specific error types
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'unknown' };
        }

        console.error('League fetch failed:', errorData);

        // Handle specific error types with friendly messages
        if (errorData.error === 'classic_league') {
          throw new Error('⚠️ This is a Classic league. Only H2H leagues are supported currently.');
        } else if (errorData.error === 'no_standings') {
          throw new Error('⚠️ This league has no H2H matches yet. Please try again after GW1.');
        } else if (response.status === 404) {
          throw new Error('League not found. Please check the League ID and try again.');
        } else if (response.status === 400) {
          throw new Error(errorData.message || 'Invalid league ID. Please verify this is an H2H league.');
        } else {
          throw new Error('⚠️ Unable to load league. Please verify this is an H2H league ID.');
        }
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
      </form>

      {/* Recent Leagues - Moved above Quick Access */}
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

      {/* Collapsible Quick Access Section */}
      <div className={styles.quickAccessSection}>
        <button
          type="button"
          onClick={() => setShowQuickAccess(!showQuickAccess)}
          className={styles.toggleButton}
          aria-expanded={showQuickAccess}
        >
          <span className={styles.toggleIcon}>{showQuickAccess ? '▼' : '►'}</span>
          Quick Access
        </button>

        {showQuickAccess && (
          <div className={styles.quickAccessContent}>
            <button
              type="button"
              onClick={handleQuickSelect}
              disabled={isLoading}
              className={styles.quickSelectButton}
            >
              Dedoume FPL 9th Edition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
