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
  opponent_short?: string | null;
  opponent_name?: string | null;
  was_home?: boolean | null;
  kickoff_time?: string | null;
  fixture_started?: boolean;
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
      // DEF: +2 if DC >= 10 (one-time bonus), MID: +2 if DC >= 12
      if (position === 2) return value >= 10 ? 2 : 0;
      if (position === 3) return value >= 12 ? 2 : 0;
      return 0; // GKP and FWD don't get DC points

    default:
      return 0;
  }
}

export function PlayerModal({ player, pick, gameweek, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'history'>('overview');

  // Fetch player data (and make it reusable for polling)
  const fetchDetailedData = async () => {
    setLoading(true);
    try {
      // K-63b: Add cache busting for fresh BPS data during live games
      const cacheBuster = `?t=${Date.now()}`;
      const res = await fetch(`/api/players/${player.id}${cacheBuster}`, {
        cache: 'no-store'
      });
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('[PlayerModal] Error fetching player:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchDetailedData();
  }, [player.id]);

  // K-63b: Auto-refresh during live games (every 30 seconds)
  useEffect(() => {
    // Check if fixture is live: started but not finished
    // A game is live if fixture has started AND player hasn't finished playing yet
    // We check if data exists and has current GW history
    if (!data || !player.fixture_started) return;

    const gwStats = data.history?.find((h: any) => h.gameweek === gameweek || h.round === gameweek);

    // If no stats yet, or player is still playing (minutes < 90 for outfield, or game ongoing)
    // We can't perfectly detect "game finished" but we can poll if fixture started
    // and stop polling once we have final stats
    const isLive = player.fixture_started && (!gwStats || gwStats.minutes === 0 || gwStats.minutes < 90);

    if (isLive) {
      console.log('[PlayerModal] Setting up auto-refresh for live game...');
      const interval = setInterval(() => {
        console.log('[PlayerModal] Refreshing live player stats...');
        fetchDetailedData();
      }, 30000); // 30 seconds

      return () => {
        console.log('[PlayerModal] Clearing auto-refresh interval');
        clearInterval(interval);
      };
    }
  }, [data, player.fixture_started, player.id, gameweek]);

  const kitUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}-110.webp`;
  const totalPoints = pick.multiplier > 1 ? player.event_points * pick.multiplier : player.event_points;

  // Find gameweek stats from history array (same as PlayerHistory.tsx does)
  const gwStats = data?.history?.find((h: any) => h.gameweek === gameweek);

  // Check if player has played
  const hasPlayed = gwStats?.minutes > 0;
  const showFixture = !hasPlayed && !player.fixture_started && player.opponent_name;

  // Format kickoff time if available
  const formatKickoffTime = (kickoffTime: string | null | undefined) => {
    if (!kickoffTime) return null;
    try {
      const date = new Date(kickoffTime);
      return date.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

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

  // Calculate total points from gwStats breakdown (if available)
  let calculatedTotal = 0;
  if (gwStats) {
    stats.forEach(({ key, gkOnly, defMidOnly }) => {
      // Skip GK-only stats for non-goalkeepers
      if (gkOnly && player.element_type !== 1) return;

      // Skip DEF/MID-only stats for GKP and FWD
      if (defMidOnly && player.element_type !== 2 && player.element_type !== 3) return;

      // K-63c: Skip official bonus if we're showing provisional bonus instead
      if (key === 'bonus' && data?.isLive && data?.provisionalBonus > 0) return;

      const value = gwStats[key] || 0;
      calculatedTotal += calculateStatPoints(key, value, player.element_type);
    });

    // K-63c: Add provisional bonus to total for live games
    if (data?.isLive && data?.provisionalBonus > 0) {
      calculatedTotal += data.provisionalBonus;
    }
  }

  // Use calculated total if available, otherwise fall back to player.event_points
  const actualTotalPoints = gwStats ? calculatedTotal : player.event_points;

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

        {/* Tab Navigation */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'matches' ? styles.active : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            Matches
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <p>Loading stats...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {showFixture ? (
                  /* Upcoming Match View - Show when player hasn't played yet */
                  <div className={styles.upcomingMatch}>
                    <h3 className={styles.upcomingTitle}>Upcoming Match</h3>
                    <p className={styles.opponent}>
                      vs {player.opponent_name} ({player.was_home ? 'H' : 'A'})
                    </p>
                    {player.kickoff_time && formatKickoffTime(player.kickoff_time) && (
                      <p className={styles.kickoff}>
                        {formatKickoffTime(player.kickoff_time)}
                      </p>
                    )}
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

                // K-63c: Skip official bonus if we're showing provisional bonus instead
                if (key === 'bonus' && data?.isLive && data?.provisionalBonus > 0) return null;

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

              {/* K-63c: Provisional Bonus (Live) - shown during live games */}
              {data?.isLive && data?.provisionalBonus > 0 && (
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Bonus (Live)</span>
                  <span className={styles.statValue}>{data.provisionalBonus}</span>
                  <span className={styles.statPoints}>
                    +{data.provisionalBonus} pts
                  </span>
                </div>
              )}

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
                        {actualTotalPoints}
                        {pick.multiplier > 1 && (
                          <span className={styles.multiplier}> ×{pick.multiplier} = {actualTotalPoints * pick.multiplier}</span>
                        )}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Matches Tab */}
            {activeTab === 'matches' && (
              <div className={styles.matchesTab}>
                {!data?.history || data.history.length === 0 ? (
                  <div className={styles.emptyState}>No matches this season</div>
                ) : (
                  <div className={styles.matchesTableContainer}>
                    <table className={styles.matchesTable}>
                      <thead>
                        <tr>
                          <th>GW</th>
                          <th>PTS</th>
                          <th>MIN</th>
                          <th>G</th>
                          <th>A</th>
                          <th>CS</th>
                          <th>BPS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.history.map((gw: any) => (
                          <tr key={gw.gameweek} className={gw.gameweek === gameweek ? styles.currentGW : ''}>
                            <td className={styles.gwCell}>{gw.gameweek}</td>
                            <td className={styles.pointsCell}>{gw.total_points}</td>
                            <td>{gw.minutes}</td>
                            <td>{gw.goals_scored || '-'}</td>
                            <td>{gw.assists || '-'}</td>
                            <td>{gw.clean_sheets ? '✓' : '-'}</td>
                            <td>{gw.bps}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className={styles.historyTab}>
                <div className={styles.historyList}>
                  {/* Current Season */}
                  {data?.totals && (
                    <div className={styles.seasonCard}>
                      <div className={styles.seasonHeader}>
                        <span className={styles.seasonName}>2024/25 (Current)</span>
                        <span className={styles.seasonPts}>{data.totals.points} pts</span>
                      </div>
                      <div className={styles.seasonStats}>
                        <span>{data.totals.goals_scored}G</span>
                        <span>{data.totals.assists}A</span>
                        <span>{data.totals.minutes} mins</span>
                        <span>£{(data.player.now_cost / 10).toFixed(1)}m</span>
                      </div>
                    </div>
                  )}

                  {/* Past Seasons (reversed) */}
                  {data?.pastSeasons && data.pastSeasons.length > 0 && (
                    <>
                      {[...data.pastSeasons].reverse().map((season: any) => (
                        <div key={season.season_name} className={styles.seasonCard}>
                          <div className={styles.seasonHeader}>
                            <span className={styles.seasonName}>{season.season_name}</span>
                            <span className={styles.seasonPts}>{season.total_points} pts</span>
                          </div>
                          <div className={styles.seasonStats}>
                            <span>{season.goals_scored}G</span>
                            <span>{season.assists}A</span>
                            <span>{season.minutes} mins</span>
                            <span>£{(season.end_cost / 10).toFixed(1)}m</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {!data?.totals && (!data?.pastSeasons || data.pastSeasons.length === 0) && (
                    <div className={styles.emptyState}>No season data available</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
