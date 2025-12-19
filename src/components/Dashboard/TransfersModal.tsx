'use client';

import { StatTileModal } from './StatTileModal';
import { useState, useEffect } from 'react';
import styles from './TransfersModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  myTeamId: string;
}

interface TransferData {
  gwTransfers: number;
  gwHits: number;
  seasonTransfers: number;
  seasonHits: number;
  freeTransfersAvailable: number;
  chipsUsed: Array<{ name: string; gw: number }>;
}

// Helper to get chip abbreviation
function getChipAbbreviation(chipName: string): string {
  const chipMap: { [key: string]: string } = {
    'wildcard': 'WC',
    'bboost': 'BB',
    '3xc': 'TC',
    'freehit': 'FH'
  };

  const normalized = chipName.toLowerCase().replace(/\s+/g, '');
  return chipMap[normalized] || chipName;
}

export function TransfersModal({ isOpen, onClose, leagueId, myTeamId }: Props) {
  const [data, setData] = useState<TransferData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransferData() {
      if (!isOpen) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/team/${myTeamId}/transfer-stats?leagueId=${leagueId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch transfer data');
        }

        const transferData = await response.json();
        setData(transferData);
      } catch (error) {
        console.error('Error fetching transfer data:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchTransferData();
  }, [isOpen, myTeamId, leagueId]);

  return (
    <StatTileModal isOpen={isOpen} onClose={onClose} title="Transfers" icon="🔄">
      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : data ? (
        <div className={styles.content}>
          {/* Current GW Stats */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>This Gameweek</h3>
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <div className={styles.statValue}>{data.gwTransfers}</div>
                <div className={styles.statLabel}>Transfers</div>
              </div>
              <div className={styles.statBox}>
                <div className={`${styles.statValue} ${data.gwHits > 0 ? styles.negative : ''}`}>
                  {data.gwHits > 0 ? `-${data.gwHits}` : data.gwHits}
                </div>
                <div className={styles.statLabel}>Hits</div>
              </div>
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* Season Stats */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Season Totals</h3>
            <div className={styles.infoSection}>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Total Transfers:</div>
                <div className={styles.infoValue}>{data.seasonTransfers}</div>
              </div>

              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Total Hits Taken:</div>
                <div className={`${styles.infoValue} ${data.seasonHits > 0 ? styles.negative : ''}`}>
                  {data.seasonHits > 0 ? `-${data.seasonHits}` : data.seasonHits} pts
                </div>
              </div>

              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Free Transfers Available:</div>
                <div className={`${styles.infoValue} ${styles.positive}`}>
                  {data.freeTransfersAvailable}
                </div>
              </div>
            </div>
          </div>

          {/* Chips Used */}
          {data.chipsUsed.length > 0 && (
            <>
              <div className={styles.divider}></div>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Chips Used</h3>
                <div className={styles.chipsGrid}>
                  {data.chipsUsed.map((chip, idx) => (
                    <div key={idx} className={styles.chipItem}>
                      <span className={styles.chipBadge}>{getChipAbbreviation(chip.name)}</span>
                      <span className={styles.chipGW}>GW{chip.gw}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={styles.error}>Failed to load transfer data</div>
      )}
    </StatTileModal>
  );
}
