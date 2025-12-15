'use client';

import { useState, useEffect } from 'react';
import styles from './StatsPanel.module.css';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.collapsibleSection}>
      <button
        className={styles.sectionToggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.toggleIcon}>{isOpen ? '▼' : '▶'}</span>
      </button>
      <div className={`${styles.sectionContent} ${isOpen ? styles.open : styles.closed}`}>
        {children}
      </div>
    </div>
  );
}

interface Props {
  leagueId: string;
  myTeamId: string;
  myTeamName: string;
  myManagerName: string;
  selectedGW: number;
  mode?: 'full' | 'collapsible-only';
}

export function StatsPanel({ leagueId, myTeamId, myTeamName, myManagerName, selectedGW, mode = 'full' }: Props) {
  const [gwTransfers, setGwTransfers] = useState<{ count: number; cost: number }>({ count: 0, cost: 0 });
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [currentGWTransfers, setCurrentGWTransfers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch entry info for overall stats and team value, and transfers for selected GW
        const [infoResponse, transfersResponse] = await Promise.all([
          fetch(`/api/team/${myTeamId}/info?gw=${selectedGW}`),
          fetch(`/api/team/${myTeamId}/transfers?gw=${selectedGW}`)
        ]);

        if (!infoResponse.ok) throw new Error('Failed to fetch team info');

        const infoData = await infoResponse.json();
        setGwTransfers(infoData.gwTransfers);

        if (transfersResponse.ok) {
          const transfersData = await transfersResponse.json();
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
      {/* Team Header - only in full mode */}
      {mode === 'full' && (
        <div className={styles.teamHeader}>
          <h2 className={styles.managerName}>{myManagerName}</h2>
          <p className={styles.teamName}>{myTeamName}</p>
        </div>
      )}

      {/* GW Transfers - Receipt-style layout */}
      {currentGWTransfers.length > 0 && (
        <div className={styles.gwTransfersContainer}>
          <h3 className={styles.gwTransfersTitle}>GW{currentGW} TRANSFERS</h3>

          {/* Transfer rows */}
          {currentGWTransfers.map((transfer, index) => {
            const netGain = transfer.netGain;
            const diffClass = netGain > 0 ? styles.positive : netGain < 0 ? styles.negative : styles.neutral;

            return (
              <div key={index} className={styles.transferRow}>
                <div className={styles.transferPlayers}>
                  <span className={styles.transferOut}>
                    {transfer.playerOut.web_name}
                  </span>
                  <span className={styles.transferPoints}>({transfer.playerOut.points}pts)</span>
                  <span className={styles.transferArrow}>→</span>
                  <span className={styles.transferIn}>
                    {transfer.playerIn.web_name}
                  </span>
                  <span className={styles.transferPoints}>({transfer.playerIn.points}pts)</span>
                </div>
                <span className={`${styles.transferPointsDiff} ${diffClass}`}>
                  {netGain > 0 ? '+' : ''}{netGain}
                </span>
              </div>
            );
          })}

          {/* Hit row - only if hit taken */}
          {gwTransfers.cost > 0 && (
            <div className={styles.hitRow}>
              <span className={styles.hitLabel}>Hit</span>
              <span className={styles.hitValue}>-{gwTransfers.cost}</span>
            </div>
          )}

          {/* Separator */}
          <hr className={styles.transferSeparator} />

          {/* Net result */}
          {(() => {
            const totalNet = currentGWTransfers.reduce((sum, t) => sum + t.netGain, 0);
            const netResult = totalNet - gwTransfers.cost;
            const netClass = netResult > 0 ? styles.positive : netResult < 0 ? styles.negative : styles.neutral;

            return (
              <div className={styles.netResultRow}>
                <span className={styles.netResultLabel}>Net result:</span>
                <span className={`${styles.netResultValue} ${netClass}`}>
                  {netResult > 0 ? '+' : ''}{netResult} pts
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
