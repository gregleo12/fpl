'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './select-league.module.css';

export default function SelectLeaguePage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const data = sessionStorage.getItem('fpl_user');
    if (!data) {
      router.push('/');
      return;
    }
    setUserData(JSON.parse(data));
  }, [router]);

  const handleLeagueSelect = async (league: any) => {
    setLoading(true);
    setSelectedLeagueId(league.id.toString());

    try {
      // Get user's team in this league
      const response = await fetch(
        `/api/auth/fpl-team-in-league?leagueId=${league.id}&userId=${userData.user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find team in league');
      }

      // Save to app state
      const state = {
        leagueId: league.id.toString(),
        leagueName: league.name,
        myTeamId: data.team.entryId.toString(),
        myTeamName: data.team.teamName,
        myManagerName: data.team.playerName,
        lastFetched: new Date().toISOString()
      };

      localStorage.setItem('fpl_h2h_state', JSON.stringify(state));
      sessionStorage.setItem('app_state', JSON.stringify(state));

      // Track team selection for managers analytics
      await fetch('/api/admin/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: league.id,
          endpoint: '/setup/fpl-login/select',
          method: 'POST',
          ip: 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          selectedTeamId: data.team.entryId
        })
      }).catch((err) => console.error('Tracking error:', err));

      // Clear temp data
      sessionStorage.removeItem('fpl_user');

      // Go to dashboard
      router.push('/dashboard');

    } catch (err: any) {
      alert(err.message || 'Failed to join league');
      setLoading(false);
      setSelectedLeagueId(null);
    }
  };

  if (!userData) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <button
          onClick={() => router.push('/')}
          className={styles.backButton}
        >
          ← Back
        </button>

        <h1 className={styles.title}>Select Your H2H League</h1>
        <p className={styles.subtitle}>
          Welcome, {userData.user.name}! Select a league to view.
        </p>

        {userData.leagues.length > 0 ? (
          <div className={styles.leaguesList}>
            {userData.leagues.map((league: any) => (
              <button
                key={league.id}
                className={`${styles.leagueCard} ${selectedLeagueId === league.id.toString() ? styles.loading : ''}`}
                onClick={() => handleLeagueSelect(league)}
                disabled={loading}
              >
                <div className={styles.leagueInfo}>
                  <h3 className={styles.leagueName}>{league.name}</h3>
                  <p className={styles.leagueRank}>
                    Current Rank: {league.entryRank}
                  </p>
                </div>
                {selectedLeagueId === league.id.toString() ? (
                  <span className={styles.loadingSpinner}>⟳</span>
                ) : (
                  <span className={styles.arrow}>→</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.noLeagues}>
            <p>You&apos;re not in any H2H leagues yet.</p>
            <button
              onClick={() => router.push('/')}
              className={styles.backToSetup}
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
