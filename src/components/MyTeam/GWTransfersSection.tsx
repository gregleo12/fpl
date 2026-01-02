'use client';

import { useState, useEffect } from 'react';
import CollapsibleSection from './CollapsibleSection';
import styles from './GWTransfersSection.module.css';

interface Transfer {
  playerIn: { web_name: string; points: number };
  playerOut: { web_name: string; points: number };
  netGain: number;
}

interface Props {
  myTeamId: string;
  selectedGW: number;
}

export default function GWTransfersSection({ myTeamId, selectedGW }: Props) {
  const [gwTransfers, setGwTransfers] = useState<{ count: number; cost: number }>({ count: 0, cost: 0 });
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [currentGWTransfers, setCurrentGWTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTransfers() {
      try {
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
        console.error('Error fetching transfers:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransfers();
  }, [myTeamId, selectedGW]);

  if (isLoading) {
    return (
      <CollapsibleSection
        title={`GW${selectedGW} Transfers`}
        defaultExpanded={true}
        storageKey="myteam-transfers-expanded"
      >
        <div className={styles.loading}>Loading transfers...</div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={`GW${currentGW || selectedGW} Transfers`}
      defaultExpanded={true}
      storageKey="myteam-transfers-expanded"
    >
      {currentGWTransfers.length === 0 ? (
        <p className={styles.noTransfers}>No transfers made</p>
      ) : (
        <div className={styles.transfersContent}>
          {/* Transfer rows */}
          {currentGWTransfers.map((transfer, index) => {
            const netGain = transfer.netGain;
            const diffClass = netGain > 0 ? styles.positive : netGain < 0 ? styles.negative : styles.neutral;

            return (
              <div key={index} className={styles.transferRow}>
                <div className={styles.transferPlayers}>
                  <span className={styles.playerName}>
                    <span className={styles.label}>OUT:</span> {transfer.playerOut.web_name}
                  </span>
                  <span className={styles.points}>({transfer.playerOut.points}pts)</span>
                </div>
                <div className={styles.transferPlayers}>
                  <span className={styles.playerName}>
                    <span className={styles.label}>IN:</span> {transfer.playerIn.web_name}
                  </span>
                  <span className={styles.points}>({transfer.playerIn.points}pts)</span>
                </div>
                <div className={`${styles.netGain} ${diffClass}`}>
                  Net: {netGain > 0 ? '+' : ''}{netGain} pts
                </div>
              </div>
            );
          })}

          {/* Hit row */}
          {gwTransfers.cost > 0 && (
            <div className={styles.hitRow}>
              <span className={styles.hitLabel}>Transfer Hit</span>
              <span className={styles.hitValue}>-{gwTransfers.cost} pts</span>
            </div>
          )}

          {/* Separator */}
          <hr className={styles.separator} />

          {/* Net result */}
          {(() => {
            const totalNet = currentGWTransfers.reduce((sum, t) => sum + t.netGain, 0);
            const netResult = totalNet - gwTransfers.cost;
            const netClass = netResult > 0 ? styles.positive : netResult < 0 ? styles.negative : styles.neutral;

            return (
              <div className={styles.netResult}>
                <span className={styles.netLabel}>Net Result:</span>
                <span className={`${styles.netValue} ${netClass}`}>
                  {netResult > 0 ? '+' : ''}{netResult} pts
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </CollapsibleSection>
  );
}
