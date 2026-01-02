'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Plus, Minus } from 'lucide-react';
import styles from './OwnershipPlayerDetailModal.module.css';

interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  position: string;
  element_type: number;
  team_id: number;
  team_code: number;
  team_name: string;
  team_short: string;
  now_cost: number;
  selected_by_percent: string | number;
  total_points: number;
  form: string | number;
  points_per_game: string | number;
  event_points: number;
  starts: number;
  minutes: number;
  goals_scored: number;
  expected_goals: string | number;
  assists: number;
  expected_assists: string | number;
  expected_goal_involvements: string | number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
  bonus: number;
  bps: number;
  yellow_cards: number;
  red_cards: number;
  own_goals?: number;
  penalties_saved?: number;
  penalties_missed?: number;
  cost_change_start: number;
  status?: string;
  news?: string;
  [key: string]: any;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
}

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  team: Team;
  teams: Team[];
}

interface PlayerHistory {
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  was_home: boolean;
  kickoff_time: string;
  team_h_score: number;
  team_a_score: number;
  round: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  value: number;
  selected: number;
}

interface Fixture {
  id: number;
  code: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  event: number;
  finished: boolean;
  minutes: number;
  provisional_start_time: boolean;
  kickoff_time: string;
  event_name: string;
  is_home: boolean;
  difficulty: number;
}

interface HistoryPast {
  season_name: string;
  element_code: number;
  start_cost: number;
  end_cost: number;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  starts: number;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
}

type TabType = 'matches' | 'stats' | 'history';
type MatchesView = 'results' | 'fixtures';

const FDR_COLORS: Record<number, string> = {
  1: '#257d5a',
  2: '#00ff87',
  3: '#999999',
  4: '#ff7b7b',
  5: '#7d2525',
};

const getResultColor = (homeScore: number, awayScore: number, wasHome: boolean): string => {
  const teamScore = wasHome ? homeScore : awayScore;
  const oppScore = wasHome ? awayScore : homeScore;

  if (teamScore > oppScore) return '#00ff87';
  if (teamScore < oppScore) return '#e74c3c';
  return '#999999';
};

const calcPer90 = (value: string | number, minutes: number): string => {
  if (minutes === 0) return '0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return ((numValue / minutes) * 90).toFixed(2);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export function PlayerDetailModal({ isOpen, onClose, player, team, teams }: PlayerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('matches');
  const [matchesView, setMatchesView] = useState<MatchesView>('results');
  const [playerDetails, setPlayerDetails] = useState<{
    history: PlayerHistory[];
    fixtures: Fixture[];
    history_past: HistoryPast[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlayerDetails();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, player.id]);

  const fetchPlayerDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/players/${player.id}`);
      const data = await response.json();
      // Map API response to expected format
      setPlayerDetails({
        history: data.history || [],
        fixtures: data.fixtures || [],
        history_past: data.pastSeasons || []
      });
    } catch (error) {
      console.error('Error fetching player details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Stat configuration types
  interface StatConfig {
    key: string;
    label: string;
    per90?: boolean;
    decimal?: boolean;
    format?: 'number';
  }

  interface StatGroupConfig {
    title: string;
    stats: StatConfig[];
    columns?: number;
  }

  // Position-specific stat groups
  const getStatGroups = (): StatGroupConfig[] => {
    const position = player.position;

    // Position-specific groups
    const positionGroups: Record<string, StatGroupConfig[]> = {
      'GKP': [
        {
          title: 'GOALKEEPING',
          stats: [
            { key: 'saves', label: 'Saves', per90: true },
            { key: 'penalties_saved', label: 'Pen Saved' },
            { key: 'clean_sheets', label: 'Clean Sheets' },
          ]
        },
        {
          title: 'CONCEDED',
          stats: [
            { key: 'goals_conceded', label: 'Goals' },
          ],
          columns: 2
        }
      ],
      'DEF': [
        {
          title: 'DEFENSIVE',
          stats: [
            { key: 'clean_sheets', label: 'Clean Sheets' },
            { key: 'goals_conceded', label: 'Conceded' },
          ],
          columns: 2
        },
        {
          title: 'ATTACKING',
          stats: [
            { key: 'goals_scored', label: 'Goals', per90: true },
            { key: 'assists', label: 'Assists', per90: true },
            { key: 'expected_goal_involvements', label: 'xGI', decimal: true, per90: true },
          ]
        }
      ],
      'MID': [
        {
          title: 'ATTACKING',
          stats: [
            { key: 'goals_scored', label: 'Goals', per90: true },
            { key: 'assists', label: 'Assists', per90: true },
            { key: 'expected_goal_involvements', label: 'xGI', decimal: true, per90: true },
          ]
        },
        {
          title: 'EXPECTED',
          stats: [
            { key: 'expected_goals', label: 'xG', decimal: true },
            { key: 'expected_assists', label: 'xA', decimal: true },
          ],
          columns: 2
        },
        {
          title: 'DEFENSIVE',
          stats: [
            { key: 'clean_sheets', label: 'Clean Sheets' },
          ],
          columns: 2
        }
      ],
      'FWD': [
        {
          title: 'ATTACKING',
          stats: [
            { key: 'goals_scored', label: 'Goals', per90: true },
            { key: 'assists', label: 'Assists', per90: true },
            { key: 'expected_goal_involvements', label: 'xGI', decimal: true, per90: true },
          ]
        },
        {
          title: 'EXPECTED',
          stats: [
            { key: 'expected_goals', label: 'xG', decimal: true },
            { key: 'expected_assists', label: 'xA', decimal: true },
          ],
          columns: 2
        }
      ]
    };

    // Common groups for all positions
    const commonGroups: StatGroupConfig[] = [
      {
        title: 'APPEARANCES',
        stats: [
          { key: 'starts', label: 'Starts' },
          { key: 'minutes', label: 'Minutes', format: 'number' },
          { key: 'points_per_game', label: 'Pts/Game', decimal: true },
        ]
      },
      {
        title: 'BONUS',
        stats: [
          { key: 'bonus', label: 'Bonus' },
          { key: 'bps', label: 'BPS' },
        ],
        columns: 2
      },
      {
        title: 'DISCIPLINE',
        stats: [
          { key: 'yellow_cards', label: 'YC' },
          { key: 'red_cards', label: 'RC' },
          { key: 'own_goals', label: 'OG' },
        ]
      }
    ];

    return [...(positionGroups[position] || []), ...commonGroups];
  };

  // StatBox component
  const StatBox = ({
    value,
    label,
    per90Value,
    decimal = false,
    format
  }: {
    value: number | string;
    label: string;
    per90Value?: number;
    decimal?: boolean;
    format?: 'number';
  }) => {
    let displayValue: string;

    if (value === null || value === undefined || value === '') {
      displayValue = '-';
    } else {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        displayValue = '-';
      } else if (decimal) {
        displayValue = (numValue ?? 0).toFixed(2);
      } else if (format === 'number') {
        displayValue = (numValue ?? 0).toLocaleString();
      } else {
        displayValue = (numValue ?? 0).toString();
      }
    }

    return (
      <div className={styles.statBox}>
        <span className={styles.statValue}>{displayValue}</span>
        <span className={styles.statLabel}>{label}</span>
        {per90Value !== undefined && !isNaN(per90Value) && (
          <span className={styles.per90}>{per90Value.toFixed(2)}/90</span>
        )}
      </div>
    );
  };

  // StatGroup component
  const StatGroup = ({ title, stats, columns = 3 }: {
    title: string;
    stats: StatConfig[];
    columns?: number;
  }) => {
    const minutes = player.minutes || 1;

    return (
      <div className={styles.statGroup}>
        <h4 className={styles.groupTitle}>{title}</h4>
        <div className={`${styles.statGrid} ${columns === 2 ? styles.twoCol : ''}`}>
          {stats.map(stat => {
            const value = (player as any)[stat.key];
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            const per90 = stat.per90 && !isNaN(numValue) ? (numValue / minutes) * 90 : undefined;

            return (
              <StatBox
                key={stat.key}
                value={value}
                label={stat.label}
                per90Value={per90}
                decimal={stat.decimal}
                format={stat.format}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Render stats groups
  const renderStatsGroups = () => {
    const groups = getStatGroups();

    return groups.map((group, index) => (
      <StatGroup
        key={index}
        title={group.title}
        stats={group.stats}
        columns={group.columns}
      />
    ));
  };

  if (!isOpen) return null;

  const isGK = player.position === 'GKP' || player.element_type === 1;
  const jerseyUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}${isGK ? '_1' : ''}-110.webp`;

  const getTeamById = (teamId: number) => teams.find(t => t.id === teamId);

  const recentMatches = playerDetails?.history?.slice(-3).reverse() || [];
  const upcomingFixtures = playerDetails?.fixtures?.slice(0, 3) || [];

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>

          <div className={styles.playerInfo}>
            <img src={jerseyUrl} alt={`${player.web_name} jersey`} className={styles.jersey} />
            <div className={styles.playerDetails}>
              <h2 className={styles.playerName}>{player.web_name}</h2>
              <p className={styles.playerMeta}>
                {team.name} · {player.position} · £{(player.now_cost / 10).toFixed(1)}m
              </p>
              <p className={styles.selectedBy}>Selected by {player.selected_by_percent}%</p>
            </div>
          </div>

          {player.status && player.status !== 'a' && (
            <div className={styles.injuryBanner}>
              <AlertTriangle size={16} />
              <span>{player.news || 'Unavailable'}</span>
            </div>
          )}

          <div className={styles.quickStats}>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>£{(player.now_cost / 10).toFixed(1)}m</span>
              <span className={styles.quickStatLabel}>Price</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{player.points_per_game}</span>
              <span className={styles.quickStatLabel}>Pts/M</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{player.form}</span>
              <span className={styles.quickStatLabel}>Form</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{player.total_points}</span>
              <span className={styles.quickStatLabel}>Total</span>
            </div>
          </div>
        </div>

        {/* Compact Form & Fixtures */}
        {!isLoading && playerDetails && (
          <div className={styles.compactStats}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>FORM</span>
              <div className={styles.badges}>
                {recentMatches.slice(0, 3).map((match) => {
                  const opponentTeam = getTeamById(match.opponent_team);
                  return (
                    <span key={match.fixture} className={styles.badge}>
                      {opponentTeam?.short_name || 'N/A'}({match.was_home ? 'H' : 'A'}) {match.total_points}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className={styles.statRow}>
              <span className={styles.statLabel}>NEXT</span>
              <div className={styles.badges}>
                {upcomingFixtures.slice(0, 3).map((fixture) => {
                  const opponentTeam = getTeamById(fixture.is_home ? fixture.team_a : fixture.team_h);
                  const fdrClass = fixture.difficulty <= 2 ? styles.fdrEasy : fixture.difficulty >= 4 ? styles.fdrHard : styles.fdrMedium;
                  return (
                    <span key={fixture.id} className={`${styles.badge} ${fdrClass}`}>
                      {opponentTeam?.short_name || 'N/A'}({fixture.is_home ? 'H' : 'A'}) {fixture.difficulty}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className={styles.tabNavigation}>
          {(['matches', 'stats', 'history'] as TabType[]).map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {isLoading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <>
              {activeTab === 'matches' && playerDetails && (
                <div className={styles.matchesTab}>
                  <div className={styles.viewToggle}>
                    <button
                      className={matchesView === 'results' ? styles.active : ''}
                      onClick={() => setMatchesView('results')}
                    >
                      Results
                    </button>
                    <button
                      className={matchesView === 'fixtures' ? styles.active : ''}
                      onClick={() => setMatchesView('fixtures')}
                    >
                      Fixtures
                    </button>
                  </div>

                  {matchesView === 'results' ? (
                    <div className={styles.resultsList}>
                      {playerDetails.history && playerDetails.history.length > 0 ? (
                        playerDetails.history.slice().reverse().map((match) => {
                        const opponentTeam = getTeamById(match.opponent_team);
                        const isExpanded = expandedMatch === match.fixture;

                        return (
                          <div key={match.fixture}>
                            <div className={styles.matchRow}>
                              <span className={styles.gw}>GW{match.round}</span>
                              <div className={styles.opponent}>
                                <span>
                                  {opponentTeam?.short_name || 'N/A'} ({match.was_home ? 'H' : 'A'})
                                </span>
                              </div>
                              <span
                                className={styles.result}
                                style={{
                                  backgroundColor: getResultColor(
                                    match.team_h_score,
                                    match.team_a_score,
                                    match.was_home
                                  ),
                                }}
                              >
                                {match.team_h_score} - {match.team_a_score}
                              </span>
                              <span className={styles.points}>{match.total_points} pts</span>
                              <button
                                className={styles.expandButton}
                                onClick={() => setExpandedMatch(isExpanded ? null : match.fixture)}
                              >
                                {isExpanded ? <Minus size={16} /> : <Plus size={16} />}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className={styles.matchDetails}>
                                <div className={styles.detailRow}>
                                  <span>Minutes:</span>
                                  <span>{match.minutes}'</span>
                                </div>
                                {match.goals_scored > 0 && (
                                  <div className={styles.detailRow}>
                                    <span>Goals:</span>
                                    <span>{match.goals_scored}</span>
                                  </div>
                                )}
                                {match.assists > 0 && (
                                  <div className={styles.detailRow}>
                                    <span>Assists:</span>
                                    <span>{match.assists}</span>
                                  </div>
                                )}
                                {match.clean_sheets > 0 && (
                                  <div className={styles.detailRow}>
                                    <span>Clean Sheet:</span>
                                    <span>✓</span>
                                  </div>
                                )}
                                {match.bonus > 0 && (
                                  <div className={styles.detailRow}>
                                    <span>Bonus:</span>
                                    <span>{match.bonus}</span>
                                  </div>
                                )}
                                <div className={styles.detailRow}>
                                  <span>BPS:</span>
                                  <span>{match.bps}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                      ) : (
                        <div className={styles.noHistory}>
                          <p>No matches played yet this season</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.fixturesList}>
                      {playerDetails.fixtures && playerDetails.fixtures.length > 0 ? (
                        playerDetails.fixtures.map((fixture) => {
                        const opponentTeam = getTeamById(fixture.is_home ? fixture.team_a : fixture.team_h);
                        return (
                          <div key={fixture.id} className={styles.fixtureRow}>
                            <span className={styles.date}>{formatDate(fixture.kickoff_time)}</span>
                            <span className={styles.gw}>GW{fixture.event}</span>
                            <div className={styles.opponent}>
                              <span>
                                {opponentTeam?.short_name || 'N/A'} ({fixture.is_home ? 'H' : 'A'})
                              </span>
                            </div>
                            <span
                              className={styles.fdr}
                              style={{ backgroundColor: FDR_COLORS[fixture.difficulty] || FDR_COLORS[3] }}
                            >
                              {fixture.difficulty}
                            </span>
                          </div>
                        );
                      })
                      ) : (
                        <div className={styles.noHistory}>
                          <p>No upcoming fixtures</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stats' && (
                <div className={styles.statsTab}>
                  {renderStatsGroups()}
                </div>
              )}

              {activeTab === 'history' && playerDetails && (
                <div className={styles.historyTab}>
                  <h3>Season History</h3>
                  <div className={styles.historyTable}>
                    <div className={styles.historyHeader}>
                      <span>Season</span>
                      <span>Pts</span>
                      <span>St</span>
                      <span>MP</span>
                      <span>GS</span>
                      <span>A</span>
                      <span>xG</span>
                    </div>

                    {/* Current Season */}
                    <div className={styles.historyRow}>
                      <span>2024/25 (Current)</span>
                      <span>{player.total_points}</span>
                      <span>{player.starts}</span>
                      <span>{player.minutes}</span>
                      <span>{player.goals_scored}</span>
                      <span>{player.assists}</span>
                      <span>{typeof player.expected_goals === 'string' ? parseFloat(player.expected_goals).toFixed(1) : player.expected_goals.toFixed(1)}</span>
                    </div>

                    {/* Past Seasons (reversed) */}
                    {playerDetails.history_past && playerDetails.history_past.length > 0 && (
                      <>
                        {[...playerDetails.history_past].reverse().map((season) => (
                          <div key={season.season_name} className={styles.historyRow}>
                            <span>{season.season_name}</span>
                            <span>{season.total_points}</span>
                            <span>{season.starts}</span>
                            <span>{season.minutes}</span>
                            <span>{season.goals_scored}</span>
                            <span>{season.assists}</span>
                            <span>{season.expected_goals || '-'}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
