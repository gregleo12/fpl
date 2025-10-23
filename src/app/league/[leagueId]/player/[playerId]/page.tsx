'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadState, updateLastFetched } from '@/lib/storage';
import Header from '@/components/Layout/Header';
import LeagueTab from '@/components/Dashboard/LeagueTab';
import MyTeamTab from '@/components/Dashboard/MyTeamTab';
import FixturesTab from '@/components/Fixtures/FixturesTab';
import styles from './player.module.css';

type TabType = 'league' | 'fixtures' | 'player';

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
  }

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
      <Header
        leagueName={leagueData?.league?.name || state.leagueName}
        myTeamName={teamName}
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
          className={`${styles.tab} ${activeTab === 'fixtures' ? styles.active : ''}`}
          onClick={() => setActiveTab('fixtures')}
        >
          🎯 Fixtures
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'player' ? styles.active : ''}`}
          onClick={() => setActiveTab('player')}
        >
          🏆 {playerName}
        </button>
      </nav>

      <main className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}

        {activeTab === 'league' && (
          <LeagueTab
            data={leagueData}
            myTeamId={playerId}
            leagueId={leagueId}
          />
        )}
        {activeTab === 'fixtures' && leagueData && (
          <FixturesTab
            leagueId={leagueId}
            myTeamId={playerId}
            maxGW={leagueData.maxGW || 1}
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
      </main>
    </div>
  );
}
