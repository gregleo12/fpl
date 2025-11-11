'use client';

import { useState, useEffect } from 'react';
import styles from './SeasonView.module.css';
import { CaptainLeaderboard } from './season/CaptainLeaderboard';
import { ChipPerformance } from './season/ChipPerformance';
import { Consistency } from './season/Consistency';
import { BestWorstGW } from './season/BestWorstGW';
import { ScoresTrend } from './season/ScoresTrend';
import { CaptainTrend } from './season/CaptainTrend';
import { ChipsTrend } from './season/ChipsTrend';

export interface SeasonStats {
  completedGameweeks: number;
  leaderboards: {
    captainPoints: CaptainLeaderboardData[];
    chipPerformance: ChipPerformanceData[];
    consistency: ConsistencyData[];
    bestGameweeks: BestGameweekData[];
    worstGameweeks: BestGameweekData[];
  };
  trends: {
    scores: ScoreTrendData[];
    captainPicks: CaptainTrendData[];
    chips: ChipTrendData[];
  };
}

export interface CaptainLeaderboardData {
  entry_id: number;
  player_name: string;
  team_name: string;
  total_points: number;
  average_per_gw: number;
}

export interface ChipPerformanceData {
  entry_id: number;
  player_name: string;
  team_name: string;
  total_chip_points: number;
}

export interface ConsistencyData {
  entry_id: number;
  player_name: string;
  team_name: string;
  average_score: number;
  std_deviation: number;
  min_score: number;
  max_score: number;
}

export interface BestGameweekData {
  entry_id: number;
  player_name: string;
  team_name: string;
  event: number;
  points: number;
}

export interface ScoreTrendData {
  gameweek: number;
  average: number;
  highest: number;
  lowest: number;
}

export interface CaptainTrendData {
  gameweek: number;
  captain: string;
  count: number;
}

export interface ChipTrendData {
  gameweek: number;
  bboost: number;
  '3xc': number;
  freehit: number;
  wildcard: number;
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
      {/* Season Info */}
      <div className={styles.seasonInfo}>
        <span className={styles.seasonLabel}>Season Statistics</span>
        <span className={styles.seasonGW}>{data.completedGameweeks} Gameweeks Completed</span>
      </div>

      {/* Leaderboards Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🏆 Season Leaderboards</h3>
        <div className={styles.leaderboards}>
          <CaptainLeaderboard data={data.leaderboards.captainPoints} />
          <ChipPerformance data={data.leaderboards.chipPerformance} />
          <Consistency data={data.leaderboards.consistency} />
          <BestWorstGW
            bestData={data.leaderboards.bestGameweeks}
            worstData={data.leaderboards.worstGameweeks}
          />
        </div>
      </div>

      {/* Trends Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>📈 Historical Trends</h3>
        <div className={styles.trends}>
          <ScoresTrend data={data.trends.scores} />
          <CaptainTrend data={data.trends.captainPicks} />
          <ChipsTrend data={data.trends.chips} />
        </div>
      </div>
    </div>
  );
}
