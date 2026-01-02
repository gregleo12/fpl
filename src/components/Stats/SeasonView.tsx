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
import { LuckIndex, type LuckIndexData } from './season/LuckIndex';
import { ClassicPts, type ClassicPtsData } from './season/ClassicPts';

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
  luckIndex?: LuckIndexData[];
  classicPts?: ClassicPtsData[]; // K-143: Classic Pts leaderboard
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

      {/* K-168: Removed Leaderboards/Awards toggle - Awards now in Stats sub-nav */}
      <div className={styles.section}>
        <div className={styles.leaderboards}>
            {/* K-143: Section order: Form → Luck → Captain → Chips → Streak → GW Records → Classic Pts → Team Value → Bench Points */}

            {/* 1. Form - Recent performance */}
            {data.formRankings && data.formRankings.length > 0 && (
              <FormRankings data={data.formRankings} />
            )}

            {/* 2. Luck - Variance indicator */}
            {data.luckIndex && data.luckIndex.length > 0 && (
              <LuckIndex data={data.luckIndex} />
            )}

            {/* 3. Captain - Captain points leaderboard */}
            <CaptainLeaderboard data={data.leaderboards.captainPoints} />

            {/* 4. Chips - Chip usage */}
            <ChipPerformance data={data.leaderboards.chipPerformance} />

            {/* 5. Streak - Win/loss streaks */}
            <Streaks
              winningStreaks={data.leaderboards.streaks.winning}
              losingStreaks={data.leaderboards.streaks.losing}
            />

            {/* 6. GW Records - Best/Worst individual GWs */}
            <BestWorstGW
              bestData={data.leaderboards.bestGameweeks}
              worstData={data.leaderboards.worstGameweeks}
            />

            {/* 7. Classic Pts - Points-based rankings (replaces Consistency) */}
            {data.classicPts && data.classicPts.length > 0 && (
              <ClassicPts data={data.classicPts} />
            )}

            {/* 8. Team Value - Squad value rankings */}
            {data.valueRankings && (
              <ValueLeaderboard data={data.valueRankings} />
            )}

            {/* 9. Bench Points - Points left on bench */}
            {data.benchPoints && data.benchPoints.length > 0 && (
              <BenchPoints data={data.benchPoints} />
            )}
        </div>
      </div>
    </div>
  );
}
