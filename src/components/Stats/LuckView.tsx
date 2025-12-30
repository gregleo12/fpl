'use client';

import { useState, useEffect } from 'react';
import styles from './LuckView.module.css';
import LuckLeaderboard from './LuckLeaderboard';
import LuckMethodology from './LuckMethodology';

interface LuckViewProps {
  leagueId: number;
  myTeamId: number;
}

interface LuckData {
  league_totals: {
    variance_sum: number;
    rank_sum: number;
    schedule_sum: number;
    chip_sum: number;
  };
  managers: Array<{
    entry_id: number;
    name: string;
    team_name: string;
    season_avg_points: number;
    season_luck_index: number;
    variance_luck: {
      total: number;
      per_gw: Array<{
        gw: number;
        value: number;
        your_var: number;
        opp_var: number;
        opponent: string;
      }>;
    };
    rank_luck: {
      total: number;
      per_gw: Array<{
        gw: number;
        value: number;
        your_rank: number;
        your_points: number;
        expected: number;
        result: number;
        opponent: string;
      }>;
    };
    schedule_luck: {
      value: number;
      avg_opp_strength: number;
      theoretical_opp_avg: number;
      your_season_avg: number;
    };
    chip_luck: {
      value: number;
      chips_played: number;
      chips_faced: number;
      avg_chips_faced: number;
      chips_faced_detail: Array<{
        gw: number;
        opponent: string;
        chip: string;
      }>;
    };
  }>;
  weights: {
    gw_luck: { variance: number; rank: number };
    season_luck: { variance: number; rank: number; schedule: number; chip: number };
  };
}

export default function LuckView({ leagueId, myTeamId }: LuckViewProps) {
  const [luckData, setLuckData] = useState<LuckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    fetch(`/api/league/${leagueId}/luck`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load luck data');
        return res.json();
      })
      .then(data => {
        setLuckData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [leagueId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading luck analysis...</div>
      </div>
    );
  }

  if (error || !luckData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          Failed to load luck data. Please try again later.
        </div>
      </div>
    );
  }

  // Sort by season_luck_index descending
  const rankedManagers = [...luckData.managers].sort(
    (a, b) => b.season_luck_index - a.season_luck_index
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>🍀 Luck Analysis</h2>
        <p className={styles.subtitle}>
          Who's been lucky? Who's been unlucky? Discover the role of fortune in your league.
        </p>
      </header>

      {/* Formula Display */}
      <div className={styles.formulaCard}>
        <h3 className={styles.formulaTitle}>Season Luck Index</h3>
        <div className={styles.formula}>
          <span className={styles.component}>
            <span className={styles.weight}>40%</span> Variance
          </span>
          {' + '}
          <span className={styles.component}>
            <span className={styles.weight}>30%</span> Rank
          </span>
          {' + '}
          <span className={styles.component}>
            <span className={styles.weight}>20%</span> Schedule
          </span>
          {' + '}
          <span className={styles.component}>
            <span className={styles.weight}>10%</span> Chip
          </span>
        </div>
      </div>

      {/* Methodology toggle */}
      <button
        className={styles.methodologyToggle}
        onClick={() => setShowMethodology(!showMethodology)}
      >
        {showMethodology ? '▼ Hide' : '▶ Show'} How It Works
      </button>

      {showMethodology && <LuckMethodology weights={luckData.weights} />}

      {/* Leaderboard */}
      <LuckLeaderboard
        managers={rankedManagers}
        myTeamId={myTeamId}
        weights={luckData.weights.season_luck}
      />

      {/* Validation Footer */}
      <div className={styles.validation}>
        <h4>Zero-Sum Validation</h4>
        <div className={styles.validationGrid}>
          <div className={styles.validationItem}>
            <span className={styles.validationLabel}>Variance:</span>
            <span className={getValidationClass(luckData.league_totals.variance_sum)}>
              {luckData.league_totals.variance_sum.toFixed(2)}
            </span>
          </div>
          <div className={styles.validationItem}>
            <span className={styles.validationLabel}>Schedule:</span>
            <span className={getValidationClass(luckData.league_totals.schedule_sum)}>
              {luckData.league_totals.schedule_sum.toFixed(2)}
            </span>
          </div>
          <div className={styles.validationItem}>
            <span className={styles.validationLabel}>Chip:</span>
            <span className={getValidationClass(luckData.league_totals.chip_sum)}>
              {luckData.league_totals.chip_sum.toFixed(2)}
            </span>
          </div>
        </div>
        <p className={styles.validationNote}>
          ✓ Values near 0 confirm proper zero-sum calculation
        </p>
      </div>
    </div>
  );
}

function getValidationClass(value: number): string {
  return Math.abs(value) < 0.1 ? styles.validGood : styles.validWarning;
}
