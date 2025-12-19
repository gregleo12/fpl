'use client';

import { StatTileModal } from './StatTileModal';
import { useState, useEffect } from 'react';
import { GWRankingsModal } from '../Stats/GWRankingsModal';
import type { GWRanking } from '../Stats/sections/GWPointsLeaders';
import styles from './GWPointsModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gameweek: number;
  points: number;
  leagueId: string;
  myTeamId: string;
}

const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];

export function GWPointsModal({ isOpen, onClose, gameweek, points, leagueId, myTeamId }: Props) {
  const [rankings, setRankings] = useState<GWRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRankingsModal, setShowRankingsModal] = useState(false);

  useEffect(() => {
    async function fetchRankings() {
      if (!isOpen) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/league/${leagueId}/stats/gameweek/${gameweek}/rankings`);

        if (!response.ok) {
          throw new Error('Failed to fetch rankings');
        }

        const data = await response.json();
        setRankings(data.rankings || []);
      } catch (error) {
        console.error('Error fetching GW rankings:', error);
        setRankings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRankings();
  }, [isOpen, gameweek, leagueId]);

  const myRanking = rankings.find(r => r.entry_id.toString() === myTeamId);
  const winner = rankings.length > 0 ? rankings[0] : null;
  const gapToFirst = winner && myRanking ? myRanking.points - winner.points : 0;
  const rank = myRanking?.rank || 0;
  const totalManagers = rankings.length;

  return (
    <>
      <StatTileModal isOpen={isOpen} onClose={onClose} title={`GW ${gameweek} Points`} icon="📊">
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          <div className={styles.content}>
            {/* Big Points Number */}
            <div className={styles.pointsSection}>
              <div className={styles.points}>{points}</div>
              <div className={styles.ptsLabel}>PTS</div>
            </div>

            {/* Rank Badge */}
            {myRanking && (
              <div className={styles.rankBadge}>
                {rank <= 3 && <span className={styles.medal}>{MEDAL_EMOJIS[rank - 1]}</span>}
                <span className={styles.rankText}>
                  {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`} / {totalManagers}
                </span>
              </div>
            )}

            <div className={styles.divider}></div>

            {/* GW Info */}
            <div className={styles.infoSection}>
              {winner && (
                <div className={styles.infoRow}>
                  <div className={styles.infoLabel}>GW Winner:</div>
                  <div className={styles.infoValue}>
                    {winner.player_name} ({winner.points} pts)
                  </div>
                </div>
              )}

              {myRanking && (
                <>
                  <div className={styles.infoRow}>
                    <div className={styles.infoLabel}>Your Rank:</div>
                    <div className={styles.infoValue}>
                      {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}
                    </div>
                  </div>

                  {rank > 1 && (
                    <div className={styles.infoRow}>
                      <div className={styles.infoLabel}>Gap to 1st:</div>
                      <div className={`${styles.infoValue} ${gapToFirst < 0 ? styles.negative : ''}`}>
                        {gapToFirst > 0 ? '+' : ''}{gapToFirst} pts
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* View Full Rankings Button */}
            <button
              className={styles.viewRankingsButton}
              onClick={() => setShowRankingsModal(true)}
            >
              View Full GW Rankings →
            </button>
          </div>
        )}
      </StatTileModal>

      {/* Full Rankings Modal */}
      <GWRankingsModal
        isOpen={showRankingsModal}
        onClose={() => setShowRankingsModal(false)}
        gameweek={gameweek}
        rankings={rankings}
        myTeamId={myTeamId}
      />
    </>
  );
}
