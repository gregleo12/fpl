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
        // Fetch entry info for overall stats and team value
        const [infoResponse, transfersResponse] = await Promise.all([
          fetch(`/api/team/${myTeamId}/info?gw=${selectedGW}`),
          fetch(`/api/team/${myTeamId}/transfers`)
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

      {/* GW Transfers - Static container, not collapsible */}
      {currentGWTransfers.length > 0 && (
        <div className={styles.gwTransfersContainer}>
          <div className={styles.gwTransfersTitle}>GW{currentGW} TRANSFERS</div>
          <div className={styles.gwTransfersList}>
            {currentGWTransfers.map((transfer, index) => {
              const netGain = transfer.netGain;
              const diffClass = netGain > 0 ? styles.positive : netGain < 0 ? styles.negative : styles.neutral;

              return (
                <div key={index} className={styles.transferCard}>
                  <div className={styles.transferPlayers}>
                    <span className={styles.transferOut}>
                      {transfer.playerOut.web_name} <span className={styles.transferPoints}>({transfer.playerOut.points}pts)</span>
                    </span>
                    <span className={styles.transferArrow}>→</span>
                    <span className={styles.transferIn}>
                      {transfer.playerIn.web_name} <span className={styles.transferPoints}>({transfer.playerIn.points}pts)</span>
                    </span>
                  </div>
                  <span className={`${styles.transferDiff} ${diffClass}`}>
                    {netGain > 0 ? '+' : ''}{netGain}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className={styles.transferSummary}>
            {(() => {
              const totalNet = currentGWTransfers.reduce((sum, t) => sum + t.netGain, 0);
              const afterHit = totalNet - gwTransfers.cost;
              return (
                <>
                  Net: {totalNet > 0 ? '+' : ''}{totalNet} pts
                  {gwTransfers.cost > 0 && (
                    <> (after -{gwTransfers.cost} hit: {afterHit > 0 ? '+' : ''}{afterHit} pts)</>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
