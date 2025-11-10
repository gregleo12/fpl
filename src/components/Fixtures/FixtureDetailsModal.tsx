'use client';

import { useEffect } from 'react';
import styles from './FixtureDetailsModal.module.css';

interface PlayerStat {
  id: number;
  name: string;
  team_id: number;
  bps: number;
  bonus: number;
  defensive_contribution: number;
  goals_scored: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  minutes: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
}

interface Fixture {
  id: number;
  kickoff_time: string;
  event: number;
  started: boolean;
  finished: boolean;
  minutes: number;
  home_team: {
    id: number;
    name: string;
    short_name: string;
    score: number | null;
  };
  away_team: {
    id: number;
    name: string;
    short_name: string;
    score: number | null;
  };
  status: 'finished' | 'live' | 'not_started';
  player_stats: PlayerStat[] | null;
}

interface Props {
  fixture: Fixture | null;
  onClose: () => void;
}

export function FixtureDetailsModal({ fixture, onClose }: Props) {
  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!fixture) return null;

  const hasStats = fixture.player_stats && fixture.player_stats.length > 0;

  // Aggregate stats by team
  const homeStats = hasStats
    ? fixture.player_stats!.filter(p => p.team_id === fixture.home_team.id)
    : [];
  const awayStats = hasStats
    ? fixture.player_stats!.filter(p => p.team_id === fixture.away_team.id)
    : [];

  // Calculate team totals
  const homeGoals = homeStats.reduce((sum, p) => sum + p.goals_scored, 0);
  const awayGoals = awayStats.reduce((sum, p) => sum + p.goals_scored, 0);
  const homeAssists = homeStats.reduce((sum, p) => sum + p.assists, 0);
  const awayAssists = awayStats.reduce((sum, p) => sum + p.assists, 0);
  const homeYellowCards = homeStats.reduce((sum, p) => sum + p.yellow_cards, 0);
  const awayYellowCards = awayStats.reduce((sum, p) => sum + p.yellow_cards, 0);
  const homeRedCards = homeStats.reduce((sum, p) => sum + p.red_cards, 0);
  const awayRedCards = awayStats.reduce((sum, p) => sum + p.red_cards, 0);
  const homeSaves = homeStats.reduce((sum, p) => sum + p.saves, 0);
  const awaySaves = awayStats.reduce((sum, p) => sum + p.saves, 0);

  // Get goal scorers
  const homeGoalScorers = homeStats.filter(p => p.goals_scored > 0);
  const awayGoalScorers = awayStats.filter(p => p.goals_scored > 0);

  // Get assisters
  const homeAssisters = homeStats.filter(p => p.assists > 0);
  const awayAssisters = awayStats.filter(p => p.assists > 0);

  // Top 10 BPS players
  const topBPSPlayers = hasStats
    ? fixture.player_stats!.slice(0, 10)
    : [];

  function getBonusDisplay(bonus: number): string {
    if (bonus === 3) return '→ 3 bonus';
    if (bonus === 2) return '→ 2 bonus';
    if (bonus === 1) return '→ 1 bonus';
    return '';
  }

  function getTeamName(teamId: number, fixture: Fixture): string {
    if (teamId === fixture.home_team.id) return fixture.home_team.short_name;
    if (teamId === fixture.away_team.id) return fixture.away_team.short_name;
    return '';
  }

  function formatKickoffTime(kickoffTime: string): string {
    const date = new Date(kickoffTime);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className={styles.dragHandle}></div>

        {/* Modal header */}
        <div className={styles.modalHeader}>
          <div className={styles.matchupRow}>
            <span className={styles.teamName}>{fixture.home_team.short_name}</span>
            <span className={styles.scoreDisplay}>
              {fixture.status === 'not_started'
                ? formatKickoffTime(fixture.kickoff_time)
                : `${fixture.home_team.score ?? '-'}-${fixture.away_team.score ?? '-'}`
              }
            </span>
            <span className={styles.teamName}>{fixture.away_team.short_name}</span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Status Badge */}
        <div className={styles.statusBadge}>
          {fixture.status === 'live' ? (
            <span className={styles.liveBadge}>🔴 LIVE</span>
          ) : fixture.status === 'finished' ? (
            <span className={styles.ftBadge}>FT</span>
          ) : (
            <span className={styles.upcomingBadge}>GW{fixture.event}</span>
          )}
        </div>

        {/* Scrollable Content */}
        <div className={styles.scrollableContent}>
          {!hasStats && (
            <div className={styles.noDataMessage}>
              {fixture.status === 'not_started'
                ? 'Match has not started yet. Stats will be available once the match begins.'
                : 'No detailed stats available for this match.'}
            </div>
          )}

          {hasStats && (
            <>
              {/* Goals Scored */}
              {(homeGoals > 0 || awayGoals > 0) && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>GOALS SCORED</h3>
                  <div className={styles.twoColumnStat}>
                    <div className={styles.teamColumn}>
                      {homeGoalScorers.length > 0 ? (
                        homeGoalScorers.map(p => (
                          <div key={p.id} className={styles.playerStatItem}>
                            {p.name} ({p.goals_scored})
                          </div>
                        ))
                      ) : (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                    <div className={styles.teamColumn}>
                      {awayGoalScorers.length > 0 ? (
                        awayGoalScorers.map(p => (
                          <div key={p.id} className={styles.playerStatItem}>
                            {p.name} ({p.goals_scored})
                          </div>
                        ))
                      ) : (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Assists */}
              {(homeAssists > 0 || awayAssists > 0) && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>ASSISTS</h3>
                  <div className={styles.twoColumnStat}>
                    <div className={styles.teamColumn}>
                      {homeAssisters.length > 0 ? (
                        homeAssisters.map(p => (
                          <div key={p.id} className={styles.playerStatItem}>
                            {p.name} ({p.assists})
                          </div>
                        ))
                      ) : (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                    <div className={styles.teamColumn}>
                      {awayAssisters.length > 0 ? (
                        awayAssisters.map(p => (
                          <div key={p.id} className={styles.playerStatItem}>
                            {p.name} ({p.assists})
                          </div>
                        ))
                      ) : (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cards */}
              {(homeYellowCards > 0 || awayYellowCards > 0 || homeRedCards > 0 || awayRedCards > 0) && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>CARDS</h3>
                  <div className={styles.twoColumnStat}>
                    <div className={styles.teamColumn}>
                      {homeYellowCards > 0 && (
                        <div className={styles.playerStatItem}>
                          🟨 {homeYellowCards} Yellow
                        </div>
                      )}
                      {homeRedCards > 0 && (
                        <div className={styles.playerStatItem}>
                          🟥 {homeRedCards} Red
                        </div>
                      )}
                      {homeYellowCards === 0 && homeRedCards === 0 && (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                    <div className={styles.teamColumn}>
                      {awayYellowCards > 0 && (
                        <div className={styles.playerStatItem}>
                          🟨 {awayYellowCards} Yellow
                        </div>
                      )}
                      {awayRedCards > 0 && (
                        <div className={styles.playerStatItem}>
                          🟥 {awayRedCards} Red
                        </div>
                      )}
                      {awayYellowCards === 0 && awayRedCards === 0 && (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Saves */}
              {(homeSaves > 0 || awaySaves > 0) && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>SAVES</h3>
                  <div className={styles.twoColumnStat}>
                    <div className={styles.teamColumn}>
                      {homeSaves > 0 ? (
                        <div className={styles.playerStatItem}>
                          🧤 {homeSaves} saves
                        </div>
                      ) : (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                    <div className={styles.teamColumn}>
                      {awaySaves > 0 ? (
                        <div className={styles.playerStatItem}>
                          🧤 {awaySaves} saves
                        </div>
                      ) : (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bonus Points System */}
              {topBPSPlayers.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>BONUS POINTS SYSTEM</h3>
                  <div className={styles.twoColumnStat}>
                    <div className={styles.teamColumn}>
                      {homeStats
                        .sort((a, b) => b.bps - a.bps)
                        .slice(0, 5)
                        .map((player) => (
                          <div key={player.id} className={styles.bpsPlayerItem}>
                            <span className={styles.bpsPlayerName}>{player.name}</span>
                            <span className={styles.bpsPlayerScore}>
                              {player.bps}
                              {player.bonus > 0 && (
                                <span className={styles.bonusBadge}> +{player.bonus}</span>
                              )}
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className={styles.teamColumn}>
                      {awayStats
                        .sort((a, b) => b.bps - a.bps)
                        .slice(0, 5)
                        .map((player) => (
                          <div key={player.id} className={styles.bpsPlayerItem}>
                            <span className={styles.bpsPlayerName}>{player.name}</span>
                            <span className={styles.bpsPlayerScore}>
                              {player.bps}
                              {player.bonus > 0 && (
                                <span className={styles.bonusBadge}> +{player.bonus}</span>
                              )}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Defensive Contribution */}
              {hasStats && (homeStats.some(p => p.defensive_contribution > 0) || awayStats.some(p => p.defensive_contribution > 0)) && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>DEFENSIVE CONTRIBUTION</h3>
                  <div className={styles.twoColumnStat}>
                    <div className={styles.teamColumn}>
                      {homeStats
                        .filter(p => p.defensive_contribution > 0)
                        .sort((a, b) => b.defensive_contribution - a.defensive_contribution)
                        .slice(0, 5)
                        .map((player) => (
                          <div key={player.id} className={styles.bpsPlayerItem}>
                            <span className={styles.bpsPlayerName}>{player.name}</span>
                            <span className={styles.bpsPlayerScore}>
                              {player.defensive_contribution}
                            </span>
                          </div>
                        ))}
                      {!homeStats.some(p => p.defensive_contribution > 0) && (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                    <div className={styles.teamColumn}>
                      {awayStats
                        .filter(p => p.defensive_contribution > 0)
                        .sort((a, b) => b.defensive_contribution - a.defensive_contribution)
                        .slice(0, 5)
                        .map((player) => (
                          <div key={player.id} className={styles.bpsPlayerItem}>
                            <span className={styles.bpsPlayerName}>{player.name}</span>
                            <span className={styles.bpsPlayerScore}>
                              {player.defensive_contribution}
                            </span>
                          </div>
                        ))}
                      {!awayStats.some(p => p.defensive_contribution > 0) && (
                        <div className={styles.noData}>-</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
