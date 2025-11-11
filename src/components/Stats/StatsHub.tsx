'use client';

import { useState, useEffect } from 'react';
import styles from './StatsHub.module.css';
import { CaptainPicks } from './sections/CaptainPicks';
import { ChipsPlayed } from './sections/ChipsPlayed';
import { HitsTaken } from './sections/HitsTaken';
import { GameweekWinners } from './sections/GameweekWinners';
import { Differentials } from './sections/Differentials';
import { SeasonView } from './SeasonView';

type ViewType = 'gameweek' | 'season';

export interface GameweekStats {
  event: number;
  captainPicks: CaptainPickData[];
  chipsPlayed: ChipData[];
  hitsTaken: HitData;
  winners: WinnersData;
  differentials: DifferentialPlayer[];
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
  chip_name: string;
  chip_display: string;
  count: number;
}

export interface HitData {
  total_managers: number;
  managers_with_hits: number;
  percentage_with_hits: number;
  total_hit_cost: number;
  avg_hit_cost: number;
  max_hit: number;
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

export interface DifferentialPlayer {
  player_id: number;
  player_name: string;
  team_name: string;
  ownership_percentage: number;
  avg_points: number;
  selected_by_count: number;
}

interface Props {
  leagueId: string;
  currentGW: number;
  maxGW: number;
  isCurrentGWLive: boolean;
}

export function StatsHub({ leagueId, currentGW, maxGW, isCurrentGWLive }: Props) {
  const [view, setView] = useState<ViewType>('gameweek');
  const [selectedGW, setSelectedGW] = useState(currentGW);
  const [stats, setStats] = useState<GameweekStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (view === 'gameweek') {
      fetchGameweekStats(selectedGW);
    }
  }, [selectedGW, leagueId, view]);

  async function fetchGameweekStats(gw: number) {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/league/${leagueId}/stats/gameweek/${gw}`);

      if (!response.ok) {
        throw new Error('Failed to fetch gameweek stats');
      }

      const data = await response.json();
      setStats(data);
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
        <h2 className={styles.title}>Stats Hub</h2>

        {/* View Toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewButton} ${view === 'gameweek' ? styles.active : ''}`}
            onClick={() => setView('gameweek')}
          >
            Gameweek
          </button>
          <button
            className={`${styles.viewButton} ${view === 'season' ? styles.active : ''}`}
            onClick={() => setView('season')}
          >
            Season
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
              <CaptainPicks data={stats.captainPicks} />
              <ChipsPlayed data={stats.chipsPlayed} />
              <HitsTaken data={stats.hitsTaken} />
              <GameweekWinners data={stats.winners} />
              <Differentials data={stats.differentials} />
            </div>
          )}
        </>
      )}

      {/* Season View */}
      {view === 'season' && (
        <SeasonView leagueId={leagueId} />
      )}
    </div>
  );
}
