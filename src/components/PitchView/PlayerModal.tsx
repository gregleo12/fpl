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

export function PlayerModal({ player, pick, gameweek, onClose }: Props) {
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [positionName, setPositionName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetailedData() {
      try {
        // Fetch bootstrap data for team names and player gameweek stats from our backend
        const [bootstrapRes, playerStatsRes] = await Promise.all([
          fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
          fetch(`/api/players/${player.id}/gameweek/${gameweek}`)
        ]);

        if (bootstrapRes.ok) {
          const bootstrapData = await bootstrapRes.json();

          // Get team name
          const team = bootstrapData.teams.find((t: any) => t.id === player.team);
          setTeamName(team?.name || 'Unknown Team');

          // Get position name
          const positions: { [key: number]: string } = {
            1: 'GKP',
            2: 'DEF',
            3: 'MID',
            4: 'FWD'
          };
          setPositionName(positions[player.element_type] || '');
        }

        // Get detailed stats from our backend API
        if (playerStatsRes.ok) {
          const data = await playerStatsRes.json();

          setDetailedStats({
            goals_scored: data.goals_scored || 0,
            assists: data.assists || 0,
            clean_sheets: data.clean_sheets || 0,
            goals_conceded: data.goals_conceded || 0,
            own_goals: data.own_goals || 0,
            penalties_saved: data.penalties_saved || 0,
            penalties_missed: data.penalties_missed || 0,
            yellow_cards: data.yellow_cards || 0,
            red_cards: data.red_cards || 0,
            saves: data.saves || 0,
            bonus: data.bonus || 0,
            bps: data.bps || 0,
            minutes: data.minutes || 0,
            total_points: data.total_points || 0,
            expected_goals: data.expected_goals || 0,
            expected_assists: data.expected_assists || 0,
            expected_goal_involvements: data.expected_goal_involvements || 0,
            influence: data.influence || 0,
            creativity: data.creativity || 0,
            threat: data.threat || 0,
            ict_index: data.ict_index || 0
          });
        } else {
          console.error('Failed to fetch player stats from backend');
          // Fallback to basic data from player prop
          setDetailedStats(null);
        }
      } catch (error) {
        console.error('Error fetching detailed data:', error);
        // Fallback to basic data from player prop
        setDetailedStats(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDetailedData();
  }, [player.id, player.team, player.element_type, gameweek]);

  const kitUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}-110.webp`;
  const totalPoints = pick.multiplier > 1 ? player.event_points * pick.multiplier : player.event_points;

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
              {teamName} · {positionName}
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
            {/* Stats Grid */}
            <div className={styles.stats}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Minutes played</span>
                <span className={styles.statValue}>{detailedStats?.minutes || player.minutes || 0}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Goals scored</span>
                <span className={styles.statValue}>{detailedStats?.goals_scored || 0}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Assists</span>
                <span className={styles.statValue}>{detailedStats?.assists || 0}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Clean sheets</span>
                <span className={styles.statValue}>{detailedStats?.clean_sheets || 0}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Goals conceded</span>
                <span className={styles.statValue}>{detailedStats?.goals_conceded || 0}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Yellow cards</span>
                <span className={styles.statValue}>{detailedStats?.yellow_cards || 0}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Red cards</span>
                <span className={styles.statValue}>{detailedStats?.red_cards || 0}</span>
              </div>
              {player.element_type === 1 && (
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Saves</span>
                  <span className={styles.statValue}>{detailedStats?.saves || 0}</span>
                </div>
              )}
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Bonus</span>
                <span className={styles.statValue}>{detailedStats?.bonus || player.bonus || 0}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>BPS</span>
                <span className={styles.statValue}>{detailedStats?.bps || player.bps || 0}</span>
              </div>
            </div>

            {/* Total Points */}
            <div className={styles.total}>
              <span className={styles.totalLabel}>TOTAL POINTS</span>
              <span className={styles.totalValue}>{totalPoints}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
