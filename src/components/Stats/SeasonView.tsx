'use client';

import { useState, useEffect } from 'react';
import styles from './SeasonView.module.css';
import { CaptainLeaderboard } from './season/CaptainLeaderboard';
import { ChipPerformance, type ChipPerformanceData } from './season/ChipPerformance';
import { Streaks, type StreakData } from './season/Streaks';
import { BestWorstGW } from './season/BestWorstGW';
import { ValueLeaderboard } from './season/ValueLeaderboard';
import { BenchPoints, type BenchPointsData } from './season/BenchPoints';
import { FormRankings, type FormRankingsData } from './season/FormRankings';
import { Consistency, type ConsistencyData } from './season/Consistency';

export interface SeasonStats {
  completedGameweeks: number;
  leaderboards: {
    captainPoints: CaptainLeaderboardData[];
    chipPerformance: ChipPerformanceData;
    streaks: {
      winning: StreakData[];
      losing: StreakData[];
    };
    bestGameweeks: BestGameweekData[];
    worstGameweeks: BestGameweekData[];
  };
  trends: {
    chips: ChipTrendData[];
  };
  valueRankings?: ValueData[];
  benchPoints?: BenchPointsData[];
  formRankings?: FormRankingsData[];
  consistency?: ConsistencyData[];
}

export interface CaptainLeaderboardData {
  entry_id: number;
  player_name: string;
  team_name: string;
  total_points: number;
  percentage: number;
  average_per_gw: number;
}


export interface BestGameweekData {
  entry_id: number;
  player_name: string;
  team_name: string;
  event: number;
  points: number;
}

export interface ChipTrendData {
  gameweek: number;
  bboost: number;
  '3xc': number;
  freehit: number;
  wildcard: number;
}

export interface ValueData {
  entry_id: number;
  player_name: string;
  team_name: string;
  team_value: number;
  bank: number;
  total_value: number;
  value_gain: number;
}

interface Props {
  leagueId: string;
}

export function SeasonView({ leagueId }: Props) {
  const [data, setData] = useState<SeasonStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSeasonStats();
  }, [leagueId]);

  async function fetchSeasonStats() {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/league/${leagueId}/stats/season`);

      if (!response.ok) {
        throw new Error('Failed to fetch season stats');
      }

      const seasonData = await response.json();
      setData(seasonData);
    } catch (err: any) {
      setError(err.message || 'Failed to load season stats');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div className={styles.loading}>Loading season stats...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* K-101: Season GWs count - match Players tab style (plain text, no container) */}
      <div className={styles.seasonInfo}>
        {data.completedGameweeks} GWs Completed
      </div>

      {/* Leaderboards Section */}
      <div className={styles.section}>
        <div className={styles.leaderboards}>
          <CaptainLeaderboard data={data.leaderboards.captainPoints} />
          <ChipPerformance data={data.leaderboards.chipPerformance} />
          <Streaks
            winningStreaks={data.leaderboards.streaks.winning}
            losingStreaks={data.leaderboards.streaks.losing}
          />
          <BestWorstGW
            bestData={data.leaderboards.bestGameweeks}
            worstData={data.leaderboards.worstGameweeks}
          />
          {data.valueRankings && (
            <ValueLeaderboard data={data.valueRankings} />
          )}
          {data.benchPoints && data.benchPoints.length > 0 && (
            <BenchPoints data={data.benchPoints} />
          )}
          {data.formRankings && data.formRankings.length > 0 && (
            <FormRankings data={data.formRankings} />
          )}
          {data.consistency && data.consistency.length > 0 && (
            <Consistency data={data.consistency} />
          )}
        </div>
      </div>
    </div>
  );
}
