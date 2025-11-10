'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadState, updateLastFetched } from '@/lib/storage';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefresh/PullToRefreshIndicator';
import LeagueTab from '@/components/Dashboard/LeagueTab';
import MyTeamTab from '@/components/Dashboard/MyTeamTab';
import FixturesTab from '@/components/Fixtures/FixturesTab';
import StatsTab from '@/components/Stats/StatsTab';
import SettingsTab from '@/components/Settings/SettingsTab';
import styles from './player.module.css';

type TabType = 'league' | 'fixtures' | 'player' | 'stats' | 'settings';

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.playerId as string;
  const leagueId = params.leagueId as string;

  const [state, setState] = useState(loadState());
  const [activeTab, setActiveTab] = useState<TabType>('player');
  const [leagueData, setLeagueData] = useState<any>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if viewing self or another player
  const isViewingSelf = state?.myTeamId === playerId;

  useEffect(() => {
    if (!state) {
      // No saved state, redirect to setup
      router.push('/');
      return;
    }

    fetchAllData(leagueId, playerId);
  }, [playerId, leagueId, router]);

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
    await fetchAllData(leagueId, playerId);
    // Small delay for better UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const { isRefreshing: isPullingToRefresh, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: activeTab !== 'settings', // Disable on settings tab
  });

  if (isLoading && !playerData) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading player profile...</div>
      </div>
    );
  }

  if (!state) {
    return null;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!playerData) return null;

  // Get player name from player data
  const playerName = playerData.manager?.player_name || 'Player';
  const teamName = playerData.manager?.team_name || 'Team';

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
            className={`${styles.tab} ${activeTab === 'player' ? styles.active : ''}`}
            onClick={() => {
              if (isViewingSelf) {
                // Already viewing self, just switch tab
                setActiveTab('player');
              } else if (state?.myTeamId) {
                // Viewing someone else, navigate to your team
                router.push(`/league/${leagueId}/player/${state.myTeamId}`);
              }
            }}
          >
            <span className={styles.tabIcon}>🏆</span>
            <span className={styles.tabLabel}>My Team</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'stats' ? styles.active : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <span className={styles.tabIcon}>📈</span>
            <span className={styles.tabLabel}>Stats</span>
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
            myTeamId={state?.myTeamId || playerId}
            leagueId={leagueId}
            onPlayerClick={(clickedPlayerId) => {
              if (clickedPlayerId === playerId) {
                // Clicked the current player, just switch to their tab
                setActiveTab('player');
              } else {
                // Clicked a different player, navigate to their profile
                router.push(`/league/${leagueId}/player/${clickedPlayerId}`);
              }
            }}
          />
        )}
        {activeTab === 'fixtures' && leagueData && (
          <FixturesTab
            leagueId={leagueId}
            myTeamId={state?.myTeamId || playerId}
            maxGW={leagueData.maxGW || 1}
            defaultGW={leagueData.activeGW || leagueData.maxGW || 1}
          />
        )}
        {activeTab === 'player' && (
          <MyTeamTab
            data={leagueData}
            playerData={playerData}
            myTeamId={playerId}
            myManagerName={playerName}
            myTeamName={teamName}
            leagueId={leagueId}
          />
        )}
        {activeTab === 'stats' && state?.myTeamId && (
          <StatsTab leagueId={leagueId} myTeamId={state.myTeamId} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            leagueName={leagueData?.league?.name || state?.leagueName || ''}
            myTeamName={state?.myTeamName || ''}
            onRefresh={handleRefresh}
            isRefreshing={isLoading}
          />
        )}
      </main>
    </div>
  );
}
