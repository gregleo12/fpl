'use client';

import { useState, useEffect } from 'react';
import styles from './StatsPanel.module.css';

interface Props {
  leagueId: string;
  myTeamId: string;
  myTeamName: string;
  myManagerName: string;
  selectedGW: number;
}

export function StatsPanel({ leagueId, myTeamId, myTeamName, myManagerName, selectedGW }: Props) {
  const [overallPoints, setOverallPoints] = useState<number>(0);
  const [overallRank, setOverallRank] = useState<number>(0);
  const [teamValue, setTeamValue] = useState<number>(0);
  const [bank, setBank] = useState<number>(0);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [gwPoints, setGwPoints] = useState<number>(0);
  const [gwRank, setGwRank] = useState<number>(0);
  const [gwTransfers, setGwTransfers] = useState<{ count: number; cost: number }>({ count: 0, cost: 0 });
  const [averagePoints, setAveragePoints] = useState<number>(0);
  const [highestPoints, setHighestPoints] = useState<number>(0);
  const [transfersTotal, setTransfersTotal] = useState<number>(0);
  const [transfersHits, setTransfersHits] = useState<number>(0);
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [currentGWTransfers, setCurrentGWTransfers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch entry info for overall stats and team value
        const [infoResponse, transfersResponse] = await Promise.all([
          fetch(`/api/team/${myTeamId}/info?gw=${selectedGW}`),
          fetch(`/api/team/${myTeamId}/transfers`)
        ]);

        if (!infoResponse.ok) throw new Error('Failed to fetch team info');

        const infoData = await infoResponse.json();
        setOverallPoints(infoData.overallPoints);
        setOverallRank(infoData.overallRank);
        setTeamValue(infoData.teamValue);
        setBank(infoData.bank);
        setTotalPlayers(infoData.totalPlayers);
        setGwPoints(infoData.gwPoints);
        setGwRank(infoData.gwRank);
        setGwTransfers(infoData.gwTransfers);
        setAveragePoints(infoData.averagePoints);
        setHighestPoints(infoData.highestPoints);

        if (transfersResponse.ok) {
          const transfersData = await transfersResponse.json();
          setTransfersTotal(transfersData.totalTransfers);
          setTransfersHits(transfersData.totalHits);
          setCurrentGW(transfersData.currentGW || 0);
          setCurrentGWTransfers(transfersData.currentGWTransfers || []);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [myTeamId, selectedGW]);

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
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Average Points</span>
          <span className={styles.statValue}>{averagePoints}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Highest Points</span>
          <span className={styles.statValue}>{highestPoints}</span>
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

      {/* Transfers Summary */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Transfers</h3>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Season Total</span>
          <span className={styles.statValue}>{transfersTotal}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Hits Taken</span>
          <span className={styles.statValue}>
            {transfersHits}
            {transfersHits > 0 && <span className={styles.transferCost}> (-{transfersHits * 4}pts)</span>}
          </span>
        </div>
      </div>

      {/* Current GW Transfer Details */}
      {currentGWTransfers.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>GW{currentGW} Transfers</h3>
          <div className={styles.transferDetail}>
            {currentGWTransfers.map((transfer, index) => {
              const netGain = transfer.netGain;
              const totalNet = currentGWTransfers.reduce((sum, t) => sum + t.netGain, 0);
              const afterHit = totalNet - gwTransfers.cost;

              return (
                <div key={index}>
                  <div className={styles.transferRow}>
                    <span className={styles.playerOut}>
                      {transfer.playerOut.web_name} <span className={styles.points}>({transfer.playerOut.points}pts)</span>
                    </span>
                    <span className={styles.arrow}>→</span>
                    <span className={styles.playerIn}>
                      {transfer.playerIn.web_name} <span className={styles.points}>({transfer.playerIn.points}pts)</span>
                    </span>
                    <span className={`${styles.netGain} ${netGain < 0 ? styles.negative : ''}`}>
                      {netGain > 0 ? '+' : ''}{netGain}
                    </span>
                  </div>
                  {index === currentGWTransfers.length - 1 && (
                    <>
                      <div className={styles.transferDivider}></div>
                      <div className={styles.transferSummary}>
                        Net: {totalNet > 0 ? '+' : ''}{totalNet} pts
                        {gwTransfers.cost > 0 && (
                          <> (after -{gwTransfers.cost} hit: {afterHit > 0 ? '+' : ''}{afterHit} pts)</>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
