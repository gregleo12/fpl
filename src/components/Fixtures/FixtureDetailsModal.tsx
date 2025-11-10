'use client';

import { useEffect } from 'react';
import styles from './FixtureDetailsModal.module.css';

interface PlayerStat {
  id: number;
  name: string;
  team_id: number;
  bps: number;
  bonus: number;
  goals_scored: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  minutes: number;
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
  const awayGoals = awayStats.reduce((sum, p) => sum + p.assists, 0);
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.matchHeader}>
            <div className={styles.team}>
              <span className={styles.teamName}>{fixture.home_team.name}</span>
            </div>
            <div className={styles.scoreBox}>
              <div className={styles.score}>
                {fixture.home_team.score ?? '-'} : {fixture.away_team.score ?? '-'}
              </div>
              {fixture.status === 'live' && (
                <div className={styles.liveIndicator}>
                  <span className={styles.liveDot}></span>
                  {fixture.minutes}'
                </div>
              )}
              {fixture.status === 'finished' && (
                <div className={styles.statusBadge}>FT</div>
              )}
            </div>
            <div className={styles.team}>
              <span className={styles.teamName}>{fixture.away_team.name}</span>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {!hasStats && (
            <div className={styles.noDataMessage}>
              {fixture.status === 'not_started'
                ? 'Match has not started yet. Stats will be available once the match begins.'
                : 'No detailed stats available for this match.'}
            </div>
          )}

          {hasStats && (
            <>
              {/* Match Stats */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>MATCH STATS</h3>

                <div className={styles.statsGrid}>
                  {/* Goals */}
                  <div className={styles.statCard}>
                    <div className={styles.statHeader}>Goals Scored</div>
                    <div className={styles.statRow}>
                      <div className={styles.statValue}>{homeGoals}</div>
                      <div className={styles.statLabel}>Goals</div>
                      <div className={styles.statValue}>{awayGoals}</div>
                    </div>
                    {(homeGoalScorers.length > 0 || awayGoalScorers.length > 0) && (
                      <div className={styles.players}>
                        <div className={styles.playersColumn}>
                          {homeGoalScorers.map(p => (
                            <div key={p.id} className={styles.playerStat}>
                              {p.name} ({p.goals_scored})
                            </div>
                          ))}
                        </div>
                        <div className={styles.playersColumn}>
                          {awayGoalScorers.map(p => (
                            <div key={p.id} className={styles.playerStat}>
                              {p.name} ({p.goals_scored})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assists */}
                  <div className={styles.statCard}>
                    <div className={styles.statHeader}>Assists</div>
                    <div className={styles.statRow}>
                      <div className={styles.statValue}>{homeAssists}</div>
                      <div className={styles.statLabel}>Assists</div>
                      <div className={styles.statValue}>{awayAssists}</div>
                    </div>
                    {(homeAssisters.length > 0 || awayAssisters.length > 0) && (
                      <div className={styles.players}>
                        <div className={styles.playersColumn}>
                          {homeAssisters.map(p => (
                            <div key={p.id} className={styles.playerStat}>
                              {p.name} ({p.assists})
                            </div>
                          ))}
                        </div>
                        <div className={styles.playersColumn}>
                          {awayAssisters.map(p => (
                            <div key={p.id} className={styles.playerStat}>
                              {p.name} ({p.assists})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Yellow Cards */}
                  {(homeYellowCards > 0 || awayYellowCards > 0) && (
                    <div className={styles.statCard}>
                      <div className={styles.statHeader}>Yellow Cards</div>
                      <div className={styles.statRow}>
                        <div className={styles.statValue}>{homeYellowCards}</div>
                        <div className={styles.statLabel}>🟨</div>
                        <div className={styles.statValue}>{awayYellowCards}</div>
                      </div>
                    </div>
                  )}

                  {/* Red Cards */}
                  {(homeRedCards > 0 || awayRedCards > 0) && (
                    <div className={styles.statCard}>
                      <div className={styles.statHeader}>Red Cards</div>
                      <div className={styles.statRow}>
                        <div className={styles.statValue}>{homeRedCards}</div>
                        <div className={styles.statLabel}>🟥</div>
                        <div className={styles.statValue}>{awayRedCards}</div>
                      </div>
                    </div>
                  )}

                  {/* Saves */}
                  {(homeSaves > 0 || awaySaves > 0) && (
                    <div className={styles.statCard}>
                      <div className={styles.statHeader}>Saves</div>
                      <div className={styles.statRow}>
                        <div className={styles.statValue}>{homeSaves}</div>
                        <div className={styles.statLabel}>🧤</div>
                        <div className={styles.statValue}>{awaySaves}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bonus Points System */}
              {topBPSPlayers.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>BONUS POINTS SYSTEM</h3>
                  <div className={styles.bpsList}>
                    {topBPSPlayers.map((player, index) => (
                      <div key={player.id} className={styles.bpsItem}>
                        <span className={styles.bpsRank}>{index + 1}.</span>
                        <span className={styles.bpsPlayer}>
                          {player.name} ({getTeamName(player.team_id, fixture)})
                        </span>
                        <span className={styles.bpsScore}>{player.bps} BPS</span>
                        {player.bonus > 0 && (
                          <span className={styles.bpsBonus}>
                            {getBonusDisplay(player.bonus)}
                          </span>
                        )}
                      </div>
                    ))}
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
