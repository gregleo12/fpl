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
        // Fetch bootstrap data for team names and full player data from our backend
        const [bootstrapRes, playerDataRes] = await Promise.all([
          fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
          fetch(`/api/players/${player.id}`)
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
        if (playerDataRes.ok) {
          const playerData = await playerDataRes.json();

          // Find the current gameweek stats from history array
          const gwStats = playerData.history?.find((h: any) => h.gameweek === gameweek);

          if (gwStats) {
            setDetailedStats({
              goals_scored: gwStats.goals_scored || 0,
              assists: gwStats.assists || 0,
              clean_sheets: gwStats.clean_sheets || 0,
              goals_conceded: gwStats.goals_conceded || 0,
              own_goals: gwStats.own_goals || 0,
              penalties_saved: gwStats.penalties_saved || 0,
              penalties_missed: gwStats.penalties_missed || 0,
              yellow_cards: gwStats.yellow_cards || 0,
              red_cards: gwStats.red_cards || 0,
              saves: gwStats.saves || 0,
              bonus: gwStats.bonus || 0,
              bps: gwStats.bps || 0,
              minutes: gwStats.minutes || 0,
              total_points: gwStats.total_points || 0,
              expected_goals: gwStats.expected_goals || 0,
              expected_assists: gwStats.expected_assists || 0,
              expected_goal_involvements: gwStats.expected_goal_involvements || 0,
              influence: gwStats.influence || 0,
              creativity: gwStats.creativity || 0,
              threat: gwStats.threat || 0,
              ict_index: gwStats.ict_index || 0
            });
          } else {
            console.error(`No stats found for gameweek ${gameweek}`);
            // Fallback to basic data from player prop
            setDetailedStats(null);
          }
        } else {
          console.error('Failed to fetch player data from backend');
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
