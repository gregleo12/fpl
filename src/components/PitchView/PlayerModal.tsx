'use client';

import { useEffect, useState } from 'react';
import styles from './PlayerModal.module.css';

interface PlayerInfo {
  id: number;
  web_name: string;
  team: number;
  team_code: number;
  element_type: number;
  event_points: number;
  bps?: number;
  bonus?: number;
  minutes?: number;
  multiplier?: number;
}

interface Pick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface Props {
  player: PlayerInfo;
  pick: Pick;
  gameweek: number;
  onClose: () => void;
}

// Helper function to calculate points for each stat
function calculateStatPoints(stat: string, value: number, position: number): number {
  if (value === 0) return 0;

  switch (stat) {
    case 'minutes':
      if (value >= 60) return 2;
      if (value > 0) return 1;
      return 0;

    case 'goals_scored':
      // GKP/DEF = 6, MID = 5, FWD = 4
      if (position === 1 || position === 2) return value * 6;
      if (position === 3) return value * 5;
      if (position === 4) return value * 4;
      return 0;

    case 'assists':
      return value * 3;

    case 'clean_sheets':
      // Only GKP/DEF/MID get clean sheet points
      if (position === 1 || position === 2) return value * 4;
      if (position === 3) return value * 1;
      return 0;

    case 'goals_conceded':
      // Only GKP/DEF, -1 for every 2 goals conceded
      if (position === 1 || position === 2) {
        return Math.floor(value / 2) * -1;
      }
      return 0;

    case 'saves':
      // Only GKP, +1 for every 3 saves
      if (position === 1) {
        return Math.floor(value / 3);
      }
      return 0;

    case 'penalties_saved':
      return value * 5;

    case 'penalties_missed':
      return value * -2;

    case 'yellow_cards':
      return value * -1;

    case 'red_cards':
      return value * -3;

    case 'own_goals':
      return value * -2;

    case 'bonus':
      return value; // Bonus points are 1:1

    case 'defensive_contribution':
      // DEF: +2 per 10 DC, MID: +2 per 12 DC
      if (position === 2) {
        return Math.floor(value / 10) * 2;
      }
      if (position === 3) {
        return Math.floor(value / 12) * 2;
      }
      return 0; // GKP and FWD don't get DC points

    default:
      return 0;
  }
}

export function PlayerModal({ player, pick, gameweek, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetailedData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/players/${player.id}`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('[PlayerModal] Error fetching player:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDetailedData();
  }, [player.id]);

  const kitUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}-110.webp`;
  const totalPoints = pick.multiplier > 1 ? player.event_points * pick.multiplier : player.event_points;

  // Find gameweek stats from history array (same as PlayerHistory.tsx does)
  const gwStats = data?.history?.find((h: any) => h.gameweek === gameweek);

  // Define stats to display with their labels
  const stats = [
    { key: 'minutes', label: 'Minutes played' },
    { key: 'goals_scored', label: 'Goals scored' },
    { key: 'assists', label: 'Assists' },
    { key: 'clean_sheets', label: 'Clean sheets' },
    { key: 'goals_conceded', label: 'Goals conceded' },
    { key: 'own_goals', label: 'Own goals' },
    { key: 'penalties_saved', label: 'Penalties saved', gkOnly: true },
    { key: 'penalties_missed', label: 'Penalties missed' },
    { key: 'saves', label: 'Saves', gkOnly: true },
    { key: 'yellow_cards', label: 'Yellow cards' },
    { key: 'red_cards', label: 'Red cards' },
    { key: 'defensive_contribution', label: 'Defensive contribution', defMidOnly: true },
    { key: 'bonus', label: 'Bonus', isBonus: true },
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>

        {/* Player Header */}
        <div className={styles.header}>
          <img src={kitUrl} alt={player.web_name} className={styles.jersey} />
          <div className={styles.headerText}>
            <h2 className={styles.playerName}>{player.web_name}</h2>
            <p className={styles.teamInfo}>
              {data?.player?.team_name || ''} · {data?.player?.position || ''}
              {pick.is_captain && <span className={styles.captainTag}> (C)</span>}
            </p>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <p>Loading stats...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid - Only show non-zero stats */}
            <div className={styles.stats}>
              {stats.map(({ key, label, gkOnly, defMidOnly, isBonus }) => {
                // Skip GK-only stats for non-goalkeepers
                if (gkOnly && player.element_type !== 1) return null;

                // Skip DEF/MID-only stats for GKP and FWD
                if (defMidOnly && player.element_type !== 2 && player.element_type !== 3) return null;

                const value = gwStats?.[key] || 0;

                // Always show minutes and defensive_contribution (for DEF/MID)
                const isDefOrMid = player.element_type === 2 || player.element_type === 3;
                const alwaysShow = key === 'minutes' ||
                  (key === 'defensive_contribution' && isDefOrMid);

                // Skip zero values (except for stats that should always show)
                if (value === 0 && !alwaysShow) return null;

                // Also skip minutes if actually 0
                if (key === 'minutes' && value === 0) return null;

                const points = calculateStatPoints(key, value, player.element_type);

                return (
                  <div key={key} className={styles.statRow}>
                    <span className={styles.statLabel}>{label}</span>
                    <span className={styles.statValue}>{value}</span>
                    <span className={styles.statPoints}>
                      {points > 0 ? '+' : ''}{points} pts
                    </span>
                  </div>
                );
              })}

              {/* BPS - shown for reference, doesn't contribute to points */}
              {gwStats?.bps > 0 && (
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>BPS</span>
                  <span className={styles.statValue}>{gwStats.bps}</span>
                  <span className={styles.statInfo}>(info only)</span>
                </div>
              )}
            </div>

            {/* Total Points */}
            <div className={styles.total}>
              <span className={styles.totalLabel}>TOTAL POINTS</span>
              <span className={styles.totalValue}>
                {player.event_points}
                {pick.multiplier > 1 && (
                  <span className={styles.multiplier}> ×{pick.multiplier} = {totalPoints}</span>
                )}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
