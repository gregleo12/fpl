'use client';

import { StatTileModal } from './StatTileModal';
import { useEffect, useState } from 'react';
import styles from './TransferHistoryModal.module.css';

interface Transfer {
  event: number;
  player_in: number;
  player_out: number;
  player_in_cost: number;
  player_out_cost: number;
  transfer_time: string;
}

interface GWHistory {
  event: number;
  event_transfers_cost: number;
}

interface Player {
  id: number;
  web_name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transfers: Transfer[];
  gwHistory: GWHistory[];
}

export function TransferHistoryModal({ isOpen, onClose, transfers, gwHistory }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch player names from bootstrap
  useEffect(() => {
    async function fetchPlayers() {
      try {
        const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
        const data = await res.json();
        setPlayers(data.elements);
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  if (!transfers || transfers.length === 0) {
    return (
      <StatTileModal isOpen={isOpen} onClose={onClose} title="Transfer History" icon="🔄">
        <div className={styles.noData}>No transfers made this season</div>
      </StatTileModal>
    );
  }

  // Group transfers by GW
  const transfersByGW = transfers.reduce((acc, t) => {
    if (!acc[t.event]) acc[t.event] = [];
    acc[t.event].push(t);
    return acc;
  }, {} as Record<number, Transfer[]>);

  console.log('[TransferHistoryModal] Total transfers:', transfers.length);
  console.log('[TransferHistoryModal] Transfers by GW:', transfersByGW);
  console.log('[TransferHistoryModal] Players loaded:', players.length);
  console.log('[TransferHistoryModal] Loading state:', loading);

  // Calculate totals
  const totalTransfers = transfers.length;
  const totalHits = gwHistory.reduce((sum, h) => sum + h.event_transfers_cost, 0);
  const totalSpent = transfers.reduce((sum, t) => sum + t.player_in_cost, 0);
  const totalReceived = transfers.reduce((sum, t) => sum + t.player_out_cost, 0);
  const netValue = (totalSpent - totalReceived) / 10;

  // Get player name from bootstrap
  const getPlayerName = (elementId: number) => {
    const player = players.find(p => p.id === elementId);
    return player?.web_name || 'Loading...';
  };

  return (
    <StatTileModal isOpen={isOpen} onClose={onClose} title="Transfer History" icon="🔄">
      {/* Summary Stats */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{totalTransfers}</span>
          <span className={styles.summaryLabel}>Transfers</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryValue} ${styles.negative}`}>-{totalHits}</span>
          <span className={styles.summaryLabel}>Hit Pts</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryValue} ${netValue > 0 ? styles.negative : netValue < 0 ? styles.positive : ''}`}>
            {netValue > 0 ? `-£${netValue.toFixed(1)}m` : netValue < 0 ? `+£${Math.abs(netValue).toFixed(1)}m` : '£0.0m'}
          </span>
          <span className={styles.summaryLabel}>Net Spend</span>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading transfer details...</div>
      ) : (
        /* Transfers by GW */
        <div className={styles.transfersList}>
          {Object.entries(transfersByGW)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([gw, gwTransfers]) => {
              const hitCost = gwHistory.find(h => h.event === Number(gw))?.event_transfers_cost || 0;
              return (
                <div key={gw} className={styles.gwSection}>
                  <div className={styles.gwHeader}>
                    <span className={styles.gwLabel}>GW{gw}</span>
                    <span className={hitCost > 0 ? styles.hit : styles.free}>
                      {hitCost > 0 ? `-${hitCost} pts` : 'Free'}
                    </span>
                  </div>
                  <div className={styles.gwTransfers}>
                    {gwTransfers.map((t, i) => {
                      console.log(`[TransferHistoryModal] GW${gw} Transfer ${i}:`, {
                        player_in: t.player_in,
                        player_out: t.player_out,
                        player_in_name: getPlayerName(t.player_in),
                        player_out_name: getPlayerName(t.player_out),
                        costs: { in: t.player_in_cost, out: t.player_out_cost }
                      });
                      return (
                      <div key={i} className={styles.transferPair}>
                        <div className={styles.transferRow}>
                          <span className={styles.inLabel}>IN</span>
                          <span className={styles.playerName}>{getPlayerName(t.player_in)}</span>
                          <span className={styles.price}>£{(t.player_in_cost / 10).toFixed(1)}m</span>
                        </div>
                        <div className={styles.transferRow}>
                          <span className={styles.outLabel}>OUT</span>
                          <span className={styles.playerName}>{getPlayerName(t.player_out)}</span>
                          <span className={styles.price}>£{(t.player_out_cost / 10).toFixed(1)}m</span>
                        </div>
                        {i < gwTransfers.length - 1 && <div className={styles.separator} />}
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </StatTileModal>
  );
}
