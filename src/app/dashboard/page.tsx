'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadState, SavedState, updateLastFetched } from '@/lib/storage';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefresh/PullToRefreshIndicator';
import LeagueTab from '@/components/Dashboard/LeagueTab';
import MyTeamTab from '@/components/Dashboard/MyTeamTab';
import FixturesTab from '@/components/Fixtures/FixturesTab';
import AwardsTab from '@/components/Awards/AwardsTab';
import SettingsTab from '@/components/Settings/SettingsTab';
import styles from './dashboard.module.css';

type TabType = 'league' | 'fixtures' | 'myteam' | 'awards' | 'settings';

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<SavedState | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('league');
  const [leagueData, setLeagueData] = useState<any>(null);
  const [playerData, setPlayerData] = useState<any>(null);
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
    fetchAllData(savedState.leagueId, savedState.myTeamId);
  }, [router]);

  async function fetchAllData(leagueId: string, playerId: string) {
    setIsLoading(true);
    setError('');

    try {
      // Fetch league standings and player profile in parallel
      const [leagueResponse, playerResponse] = await Promise.all([
        fetch(`/api/league/${leagueId}/stats`),
        fetch(`/api/player/${playerId}`)
      ]);

      if (!leagueResponse.ok) {
        throw new Error('Failed to fetch league data');
      }

      if (!playerResponse.ok) {
        throw new Error('Failed to fetch player data');
      }

      const leagueData = await leagueResponse.json();
      const playerData = await playerResponse.json();

      setLeagueData(leagueData);
      setPlayerData(playerData);
      updateLastFetched();
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    if (!state) return;
    await fetchAllData(state.leagueId, state.myTeamId);
    // Small delay for better UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const { isRefreshing: isPullingToRefresh, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: activeTab !== 'settings', // Disable on settings tab
  });

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
      <PullToRefreshIndicator
        isRefreshing={isPullingToRefresh}
        pullDistance={pullDistance}
      />

      <div className={styles.tabsWrapper}>
        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'league' ? styles.active : ''}`}
            onClick={() => setActiveTab('league')}
          >
            <span className={styles.tabIcon}>📊</span>
            <span className={styles.tabLabel}>Rankings</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'fixtures' ? styles.active : ''}`}
            onClick={() => setActiveTab('fixtures')}
          >
            <span className={styles.tabIcon}>🎯</span>
            <span className={styles.tabLabel}>Fixtures</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'myteam' ? styles.active : ''}`}
            onClick={() => setActiveTab('myteam')}
          >
            <span className={styles.tabIcon}>🏆</span>
            <span className={styles.tabLabel}>My Team</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'awards' ? styles.active : ''}`}
            onClick={() => setActiveTab('awards')}
          >
            <span className={styles.tabIcon}>🎖️</span>
            <span className={styles.tabLabel}>Awards</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className={styles.tabIcon}>⚙️</span>
            <span className={styles.tabLabel}>Settings</span>
          </button>
        </nav>
      </div>

      <main className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}

        {activeTab === 'league' && (
          <LeagueTab
            data={leagueData}
            myTeamId={state.myTeamId}
            leagueId={state.leagueId}
          />
        )}
        {activeTab === 'fixtures' && leagueData && (
          <FixturesTab
            leagueId={state.leagueId}
            myTeamId={state.myTeamId}
            maxGW={leagueData.maxGW || 1}
            defaultGW={leagueData.activeGW || leagueData.maxGW || 1}
          />
        )}
        {activeTab === 'myteam' && (
          <MyTeamTab
            data={leagueData}
            playerData={playerData}
            myTeamId={state.myTeamId}
            myManagerName={state.myManagerName}
            myTeamName={state.myTeamName}
            leagueId={state.leagueId}
          />
        )}
        {activeTab === 'awards' && (
          <AwardsTab
            leagueId={state.leagueId}
            myTeamId={state.myTeamId}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            leagueName={state.leagueName}
            myTeamName={state.myTeamName}
            onRefresh={handleRefresh}
            isRefreshing={isLoading}
          />
        )}
      </main>
    </div>
  );
}
