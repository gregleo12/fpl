'use client';

import { useState, useEffect } from 'react';
import styles from './StatsHub.module.css';
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

  return (
    <div className={styles.container}>
      {/* Header with View Toggle and GW Selector */}
      <div className={styles.header}>
        {/* View Toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewButton} ${view === 'myteam' ? styles.active : ''}`}
            onClick={() => setView('myteam')}
          >
            Team
          </button>
          <button
            className={`${styles.viewButton} ${view === 'gameweek' ? styles.active : ''}`}
            onClick={() => setView('gameweek')}
          >
            GW
          </button>
          <button
            className={`${styles.viewButton} ${view === 'season' ? styles.active : ''}`}
            onClick={() => setView('season')}
          >
            Season
          </button>
          <button
            className={`${styles.viewButton} ${view === 'players' ? styles.active : ''}`}
            onClick={() => setView('players')}
          >
            Players
          </button>
        </div>

        {/* GW Selector (only for gameweek view) */}
        {view === 'gameweek' && (
          <div className={styles.gwSelector}>
            <button
              className={styles.gwButton}
              onClick={() => setSelectedGW(Math.max(1, selectedGW - 1))}
              disabled={selectedGW <= 1}
            >
              ←
            </button>

            <div className={styles.gwDisplay}>
              <span className={styles.gwLabel}>GW</span>
              <span className={styles.gwNumber}>{selectedGW}</span>
              {selectedGW === currentGW && isCurrentGWLive && (
                <span className={styles.liveBadge}>LIVE</span>
              )}
            </div>

            <button
              className={styles.gwButton}
              onClick={() => setSelectedGW(Math.min(currentGW, selectedGW + 1))}
              disabled={selectedGW >= currentGW}
            >
              →
            </button>
          </div>
        )}
      </div>

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
