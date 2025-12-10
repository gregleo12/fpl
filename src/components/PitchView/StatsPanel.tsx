'use client';

import { useState, useEffect } from 'react';
import styles from './StatsPanel.module.css';

interface Props {
  leagueId: string;
  myTeamId: string;
  myTeamName: string;
  myManagerName: string;
}

export function StatsPanel({ leagueId, myTeamId, myTeamName, myManagerName }: Props) {
  const [overallPoints, setOverallPoints] = useState<number>(0);
  const [overallRank, setOverallRank] = useState<number>(0);
  const [teamValue, setTeamValue] = useState<number>(0);
  const [bank, setBank] = useState<number>(0);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [gwPoints, setGwPoints] = useState<number>(0);
  const [gwRank, setGwRank] = useState<number>(0);
  const [gwTransfers, setGwTransfers] = useState<{ count: number; cost: number }>({ count: 0, cost: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch entry info for overall stats and team value
        const response = await fetch(`/api/team/${myTeamId}/info`);
        if (!response.ok) throw new Error('Failed to fetch stats');

        const data = await response.json();
        setOverallPoints(data.overallPoints);
        setOverallRank(data.overallRank);
        setTeamValue(data.teamValue);
        setBank(data.bank);
        setTotalPlayers(data.totalPlayers);
        setGwPoints(data.gwPoints);
        setGwRank(data.gwRank);
        setGwTransfers(data.gwTransfers);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [myTeamId]);

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Loading stats...</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Team Header */}
      <div className={styles.teamHeader}>
        <h2 className={styles.managerName}>{myManagerName}</h2>
        <p className={styles.teamName}>{myTeamName}</p>
      </div>

      {/* Current GW Stats */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>This Gameweek</h3>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Points</span>
          <span className={styles.statValue}>{gwPoints}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Rank</span>
          <span className={styles.statValue}>{gwRank > 0 ? gwRank.toLocaleString() : '-'}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Transfers</span>
          <span className={styles.statValue}>
            {gwTransfers.count}
            {gwTransfers.cost > 0 && <span className={styles.transferCost}> (-{gwTransfers.cost}pts)</span>}
          </span>
        </div>
      </div>

      {/* Overall Stats */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Overall</h3>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Points</span>
          <span className={styles.statValue}>{overallPoints.toLocaleString()}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Rank</span>
          <span className={styles.statValue}>{overallRank > 0 ? overallRank.toLocaleString() : '-'}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Total Players</span>
          <span className={styles.statValue}>{totalPlayers > 0 ? `${(totalPlayers / 1000000).toFixed(1)}M` : '-'}</span>
        </div>
      </div>

      {/* Team Value */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Squad Value</h3>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Team Value</span>
          <span className={styles.statValue}>£{(teamValue / 10).toFixed(1)}m</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>In Bank</span>
          <span className={styles.statValue}>£{(bank / 10).toFixed(1)}m</span>
        </div>
      </div>
    </div>
  );
}
