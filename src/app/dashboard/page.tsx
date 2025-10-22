'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadState, SavedState, updateLastFetched } from '@/lib/storage';
import Header from '@/components/Layout/Header';
import LeagueTab from '@/components/Dashboard/LeagueTab';
import MyTeamTab from '@/components/Dashboard/MyTeamTab';
import styles from './dashboard.module.css';

type TabType = 'league' | 'myteam';

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<SavedState | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('league');
  const [leagueData, setLeagueData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedState = loadState();

    if (!savedState) {
      // No saved state, redirect to setup
      router.push('/');
      return;
    }

    setState(savedState);
    fetchLeagueData(savedState.leagueId);
  }, [router]);

  async function fetchLeagueData(leagueId: string) {
    setIsLoading(true);
    setError('');

    try {
      // Fetch league standings
      const response = await fetch(`/api/league/${leagueId}/stats`);

      if (!response.ok) {
        throw new Error('Failed to fetch league data');
      }

      const data = await response.json();
      setLeagueData(data);
      updateLastFetched();
    } catch (err: any) {
      setError(err.message || 'Failed to load league data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    if (!state) return;
    await fetchLeagueData(state.leagueId);
  }

  if (isLoading && !leagueData) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  if (!state) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Header
        leagueName={state.leagueName}
        myTeamName={state.myTeamName}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'league' ? styles.active : ''}`}
          onClick={() => setActiveTab('league')}
        >
          📊 League Standings
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'myteam' ? styles.active : ''}`}
          onClick={() => setActiveTab('myteam')}
        >
          🏆 My Team
        </button>
      </nav>

      <main className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}

        {activeTab === 'league' && (
          <LeagueTab
            data={leagueData}
            myTeamId={state.myTeamId}
            leagueId={state.leagueId}
          />
        )}
        {activeTab === 'myteam' && (
          <MyTeamTab
            data={leagueData}
            myTeamId={state.myTeamId}
            myManagerName={state.myManagerName}
            myTeamName={state.myTeamName}
            leagueId={state.leagueId}
          />
        )}
      </main>
    </div>
  );
}
