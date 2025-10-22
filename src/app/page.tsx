'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';

export default function Landing() {
  const router = useRouter();
  const [leagueId, setLeagueId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentLeagues, setRecentLeagues] = useState<string[]>([]);

  useEffect(() => {
    // Load recent leagues from localStorage
    const recent = localStorage.getItem('recentLeagues');
    if (recent) {
      setRecentLeagues(JSON.parse(recent));
    }

    // Auto-redirect to last viewed league
    const lastLeague = localStorage.getItem('lastLeagueId');
    if (lastLeague) {
      // Optionally auto-redirect after a short delay
      // setTimeout(() => router.push(`/league/${lastLeague}`), 1000);
    }
  }, []);

  const saveToRecent = (id: string) => {
    const recent = Array.from(new Set([id, ...recentLeagues])).slice(0, 3);
    setRecentLeagues(recent);
    localStorage.setItem('recentLeagues', JSON.stringify(recent));
    localStorage.setItem('lastLeagueId', id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueId) return;

    setLoading(true);
    setError('');

    try {
      // Fetch league data to validate it exists
      const response = await fetch(`/api/league/${leagueId}`);
      if (!response.ok) throw new Error('League not found or invalid ID');

      // Save to recent
      saveToRecent(leagueId);

      // Navigate to league page
      router.push(`/league/${leagueId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load league');
      setLoading(false);
    }
  };

  const handleRecentClick = (id: string) => {
    setLeagueId(id);
    saveToRecent(id);
    router.push(`/league/${id}`);
  };

  const handleTestLeague = () => {
    setLeagueId('804742');
    saveToRecent('804742');
    router.push(`/league/804742`);
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>FPL H2H Analytics</h1>
        <p className={styles.subtitle}>Track your Head-to-Head league performance</p>

        <div className={styles.searchCard}>
          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.searchForm}>
            <input
              type="text"
              placeholder="Enter League ID"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className={styles.input}
              disabled={loading}
              autoFocus
            />

            <div className={styles.buttonGroup}>
              <button
                type="submit"
                disabled={loading || !leagueId}
                className={styles.button}
              >
                {loading ? (
                  <span className={styles.loading}>Loading...</span>
                ) : (
                  'View League'
                )}
              </button>

              <button
                type="button"
                onClick={handleTestLeague}
                disabled={loading}
                className={`${styles.button} ${styles.testButton}`}
              >
                Dedoume
              </button>
            </div>
          </form>

          {recentLeagues.length > 0 && (
            <div className={styles.recentLeagues}>
              <div className={styles.recentTitle}>Recent Leagues</div>
              <div className={styles.recentList}>
                {recentLeagues.map((id) => (
                  <div
                    key={id}
                    onClick={() => handleRecentClick(id)}
                    className={styles.recentItem}
                  >
                    League {id}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
