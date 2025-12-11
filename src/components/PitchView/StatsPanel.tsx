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
  const [teamValue, setTeamValue] = useState<number>(0);
  const [bank, setBank] = useState<number>(0);
  const [gwTransfers, setGwTransfers] = useState<{ count: number; cost: number }>({ count: 0, cost: 0 });
  const [transfersTotal, setTransfersTotal] = useState<number>(0);
  const [transfersHits, setTransfersHits] = useState<number>(0);
  const [transfersHitsCost, setTransfersHitsCost] = useState<number>(0);
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
        setTeamValue(infoData.teamValue);
        setBank(infoData.bank);
        setGwTransfers(infoData.gwTransfers);

        if (transfersResponse.ok) {
          const transfersData = await transfersResponse.json();
          setTransfersTotal(transfersData.totalTransfers);
          setTransfersHits(transfersData.totalHits);
          setTransfersHitsCost(transfersData.totalHitsCost || 0);
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

      {/* Squad Value */}
      <CollapsibleSection title="Squad Value" defaultOpen={false}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Team Value</span>
          <span className={styles.statValue}>£{(teamValue / 10).toFixed(1)}m</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>In Bank</span>
          <span className={styles.statValue}>£{(bank / 10).toFixed(1)}m</span>
        </div>
      </CollapsibleSection>

      {/* Transfers */}
      <CollapsibleSection title="Transfers" defaultOpen={false}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Season Total</span>
          <span className={styles.statValue}>{transfersTotal}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Hits Taken</span>
          <span className={styles.statValue}>
            {transfersHits}
            {transfersHitsCost > 0 && <span className={styles.transferCost}> (-{transfersHitsCost}pts)</span>}
          </span>
        </div>
      </CollapsibleSection>

      {/* Current GW Transfer Details */}
      {currentGWTransfers.length > 0 && (
        <CollapsibleSection title={`GW${currentGW} Transfers`} defaultOpen={false}>
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
        </CollapsibleSection>
      )}
    </div>
  );
}
