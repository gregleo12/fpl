'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadState, SavedState, updateLastFetched } from '@/lib/storage';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefresh/PullToRefreshIndicator';
import LeagueTab from '@/components/Dashboard/LeagueTab';
import MyTeamTab from '@/components/Dashboard/MyTeamTab';
import FixturesTab from '@/components/Fixtures/FixturesTab';
import StatsTab from '@/components/Stats/StatsTab';
import SettingsTab from '@/components/Settings/SettingsTab';
import styles from './dashboard.module.css';

type TabType = 'league' | 'fixtures' | 'myteam' | 'stats' | 'settings';

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<SavedState | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('myteam');
  const [leagueData, setLeagueData] = useState<any>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State for viewing other players
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  const [viewingPlayerData, setViewingPlayerData] = useState<any>(null);
  const [viewingPlayerName, setViewingPlayerName] = useState<string>('');
  const [viewingTeamName, setViewingTeamName] = useState<string>('');
  const [isLoadingViewing, setIsLoadingViewing] = useState(false);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

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

  async function fetchAllData(leagueId: string, playerId: string, forceSync = false) {
    setIsLoading(true);
    setError('');

    try {
      // Check if we need to sync database with FPL (only if >5 mins since last sync)
      const lastSyncKey = `league_${leagueId}_last_sync`;
      const lastSync = localStorage.getItem(lastSyncKey);
      const lastSyncTime = lastSync ? parseInt(lastSync) : 0;
      const now = Date.now();
      const SYNC_THRESHOLD = 5 * 60 * 1000; // 5 minutes
      const needsSync = forceSync || !lastSync || (now - lastSyncTime) > SYNC_THRESHOLD;

      if (needsSync) {
        console.log('[Dashboard] Syncing league data with FPL...');
        // Sync h2h_matches table with latest FPL data
        const syncResponse = await fetch(`/api/league/${leagueId}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (syncResponse.ok) {
          localStorage.setItem(lastSyncKey, now.toString());
          console.log('[Dashboard] League data synced successfully');
        } else {
          console.warn('[Dashboard] Failed to sync league data, continuing with cached data');
        }
      } else {
        console.log('[Dashboard] Using cached data (last sync:', Math.round((now - lastSyncTime) / 1000), 'seconds ago)');
      }

      // Fetch league standings and player profile in parallel
      const [leagueResponse, playerResponse] = await Promise.all([
        fetch(`/api/league/${leagueId}/stats?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }),
        fetch(`/api/player/${playerId}?leagueId=${leagueId}&t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
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
    // Force sync on pull-to-refresh to ensure fresh data
    await fetchAllData(state.leagueId, state.myTeamId, true);
    // Small delay for better UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async function handleTeamClick(entryId: number, playerName: string, teamName: string) {
    if (!state) return;

    // If clicking own team, just switch to myteam tab
    if (entryId.toString() === state.myTeamId) {
      setViewingPlayerId(null);
      setViewingPlayerData(null);
      setActiveTab('myteam');
      return;
    }

    setIsLoadingViewing(true);
    setViewingPlayerName(playerName);
    setViewingTeamName(teamName);

    try {
      const response = await fetch(`/api/player/${entryId}?leagueId=${state.leagueId}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch player data');
      }

      const data = await response.json();
      setViewingPlayerId(entryId.toString());
      setViewingPlayerData(data);
      setActiveTab('myteam');
    } catch (err: any) {
      console.error('Error fetching player data:', err);
      setError(err.message || 'Failed to load player data');
    } finally {
      setIsLoadingViewing(false);
    }
  }

  function handleBackToMyTeam() {
    setViewingPlayerId(null);
    setViewingPlayerData(null);
    setViewingPlayerName('');
    setViewingTeamName('');
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
            className={`${styles.tab} ${activeTab === 'myteam' ? styles.active : ''}`}
            onClick={() => setActiveTab('myteam')}
          >
            <span className={styles.tabIcon}>🏆</span>
            <span className={styles.tabLabel}>My Team</span>
          </button>
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
            myTeamId={state.myTeamId}
            leagueId={state.leagueId}
            onTeamClick={handleTeamClick}
          />
        )}
        {activeTab === 'fixtures' && leagueData && (
          <FixturesTab
            leagueId={state.leagueId}
            myTeamId={state.myTeamId}
            maxGW={38}
            defaultGW={leagueData.activeGW || leagueData.maxGW || 1}
          />
        )}
        {activeTab === 'myteam' && (isLoadingViewing ? (
          <div className={styles.loading}>Loading player data...</div>
        ) : (
          <MyTeamTab
            data={leagueData}
            playerData={viewingPlayerId ? viewingPlayerData : playerData}
            myTeamId={viewingPlayerId || state.myTeamId}
            myManagerName={viewingPlayerId ? viewingPlayerName : state.myManagerName}
            myTeamName={viewingPlayerId ? viewingTeamName : state.myTeamName}
            leagueId={state.leagueId}
            isViewingOther={!!viewingPlayerId}
            onBackToMyTeam={handleBackToMyTeam}
          />
        ))}
        {activeTab === 'stats' && (
          <StatsTab
            leagueId={state.leagueId}
            myTeamId={state.myTeamId}
            myTeamName={state.myTeamName}
            myManagerName={state.myManagerName}
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
