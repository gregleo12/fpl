'use client';

import { useState, useEffect } from 'react';
import styles from './StatsHub.module.css';
import { RotateCw, Home, BarChart2, Trophy, Shirt } from 'lucide-react';
import { CaptainPicks } from './sections/CaptainPicks';
import { ChipsPlayed } from './sections/ChipsPlayed';
import { HitsTaken } from './sections/HitsTaken';
import { GameweekWinners } from './sections/GameweekWinners';
import { TopPerformers } from './sections/TopPerformers';
import { GWPointsLeaders, type GWRanking } from './sections/GWPointsLeaders';
import { GWRankingsModal } from './GWRankingsModal';
import { SeasonView } from './SeasonView';
import { MyTeamView } from './MyTeamView';
import { PlayersTab } from '@/components/Players/PlayersTab';

type ViewType = 'myteam' | 'gameweek' | 'season' | 'players';

export interface GameweekStats {
  event: number;
  captainPicks: CaptainPickData[];
  chipsPlayed: ChipData[];
  hitsTaken: HitData[];
  winners: WinnersData;
  topPerformers: TopPerformer[];
  totalManagers: number;
}

export interface CaptainPickData {
  player_id: number;
  player_name: string;
  team_name: string;
  count: number;
  percentage: number;
  avg_points: number;
}

export interface ChipData {
  entry_id: number;
  player_name: string;
  chip_name: string;
  chip_display: string;
}

export interface HitData {
  entry_id: number;
  player_name: string;
  hits_taken: number;
}

export interface WinnersData {
  highest_score: {
    entry_id: number;
    player_name: string;
    team_name: string;
    score: number;
  } | null;
  lowest_score: {
    entry_id: number;
    player_name: string;
    team_name: string;
    score: number;
  } | null;
  average_score: number;
}

export interface TopPerformer {
  player_id: number;
  player_name: string;
  points: number;
  ownership_count: number;
  ownership_percentage: number;
}

interface Props {
  leagueId: string;
  currentGW: number;
  maxGW: number;
  isCurrentGWLive: boolean;
  myTeamId: string;
  myTeamName: string;
  myManagerName: string;
}

export function StatsHub({ leagueId, currentGW, maxGW, isCurrentGWLive, myTeamId, myTeamName, myManagerName }: Props) {
  const [view, setView] = useState<ViewType>('myteam');
  const [selectedGW, setSelectedGW] = useState(currentGW);
  const [stats, setStats] = useState<GameweekStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [gwRankings, setGwRankings] = useState<GWRanking[]>([]);
  const [showRankingsModal, setShowRankingsModal] = useState(false);

  // K-68: Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (view === 'gameweek') {
      fetchGameweekStats(selectedGW);
    }
  }, [selectedGW, leagueId, view]);

  async function fetchGameweekStats(gw: number) {
    setIsLoading(true);
    setError('');

    try {
      // Fetch both stats and rankings in parallel
      const [statsResponse, rankingsResponse] = await Promise.all([
        fetch(`/api/league/${leagueId}/stats/gameweek/${gw}`),
        fetch(`/api/league/${leagueId}/stats/gameweek/${gw}/rankings`)
      ]);

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch gameweek stats');
      }

      const statsData = await statsResponse.json();
      setStats(statsData);

      // Rankings might fail for upcoming GWs, handle gracefully
      if (rankingsResponse.ok) {
        const rankingsData = await rankingsResponse.json();
        setGwRankings(rankingsData.rankings || []);
      } else {
        setGwRankings([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }

  // K-68: Manual refresh handler
  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await fetchGameweekStats(selectedGW);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className={styles.container}>
      {/* K-94: First bar - View toggle with icons (matches Rivals style) */}
      <div className={styles.viewToggleBar}>
        <button
          className={`${styles.subTab} ${view === 'myteam' ? styles.subTabActive : ''}`}
          onClick={() => setView('myteam')}
        >
          <Home size={16} />
          Team
        </button>
        <button
          className={`${styles.subTab} ${view === 'gameweek' ? styles.subTabActive : ''}`}
          onClick={() => setView('gameweek')}
        >
          <BarChart2 size={16} />
          GW
        </button>
        <button
          className={`${styles.subTab} ${view === 'season' ? styles.subTabActive : ''}`}
          onClick={() => setView('season')}
        >
          <Trophy size={16} />
          Season
        </button>
        <button
          className={`${styles.subTab} ${view === 'players' ? styles.subTabActive : ''}`}
          onClick={() => setView('players')}
        >
          <Shirt size={16} />
          Players
        </button>
      </div>

      {/* K-94: Second bar - GW selector (only for gameweek view) */}
      {view === 'gameweek' && (
        <div className={styles.gwSelectorBar}>
          {/* Refresh Button */}
          <button
            className={`${styles.refreshButton} ${isRefreshing ? styles.spinning : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh data"
            aria-label="Refresh data"
          >
            <RotateCw size={18} />
          </button>

          {/* Previous button */}
          <button
            className={styles.navButton}
            onClick={() => setSelectedGW(Math.max(1, selectedGW - 1))}
            disabled={selectedGW <= 1}
            aria-label="Previous gameweek"
          >
            ◄
          </button>

          {/* Gameweek display - glowing when live */}
          <div className={styles.gwInfo}>
            <span
              className={`${styles.gwNumber} ${selectedGW === currentGW && isCurrentGWLive ? styles.gwNumberLive : ''}`}
              title={selectedGW === currentGW && isCurrentGWLive ? "Live match" : undefined}
            >
              GW {selectedGW}
            </span>
          </div>

          {/* Next button */}
          <button
            className={styles.navButton}
            onClick={() => setSelectedGW(Math.min(currentGW, selectedGW + 1))}
            disabled={selectedGW >= currentGW}
            aria-label="Next gameweek"
          >
            ►
          </button>
        </div>
      )}

      {/* Gameweek View */}
      {view === 'gameweek' && (
        <>
          {/* Loading State */}
          {isLoading && (
            <div className={styles.loading}>Loading gameweek stats...</div>
          )}

          {/* Error State */}
          {error && (
            <div className={styles.error}>{error}</div>
          )}

          {/* Stats Sections */}
          {!isLoading && !error && stats && (
            <div className={styles.sections}>
              <GWPointsLeaders
                data={gwRankings}
                onViewFullRankings={() => setShowRankingsModal(true)}
              />
              <CaptainPicks data={stats.captainPicks} totalManagers={stats.totalManagers} />
              <ChipsPlayed data={stats.chipsPlayed} />
              <HitsTaken data={stats.hitsTaken} />
              <GameweekWinners data={stats.winners} />
              <TopPerformers data={stats.topPerformers} totalManagers={stats.totalManagers} />
            </div>
          )}
        </>
      )}

      {/* My Team View */}
      {view === 'myteam' && (
        <MyTeamView
          leagueId={leagueId}
          myTeamId={myTeamId}
          myTeamName={myTeamName}
          myManagerName={myManagerName}
        />
      )}

      {/* Season View */}
      {view === 'season' && (
        <SeasonView leagueId={leagueId} />
      )}

      {/* Players View */}
      {view === 'players' && (
        <PlayersTab />
      )}

      {/* GW Rankings Modal */}
      <GWRankingsModal
        isOpen={showRankingsModal}
        onClose={() => setShowRankingsModal(false)}
        gameweek={selectedGW}
        rankings={gwRankings}
        myTeamId={myTeamId}
      />
    </div>
  );
}
