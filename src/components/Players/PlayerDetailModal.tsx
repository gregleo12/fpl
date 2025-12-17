'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Plus, Minus } from 'lucide-react';
import styles from './PlayerDetailModal.module.css';

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
      const response = await fetch(`https://fantasy.premierleague.com/api/element-summary/${player.id}/`);
      const data = await response.json();
      setPlayerDetails(data);
    } catch (error) {
      console.error('Error fetching player details:', error);
    } finally {
      setIsLoading(false);
    }
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

        {/* Form & Fixtures Row */}
        {!isLoading && playerDetails && (
          <div className={styles.formFixturesRow}>
            <div className={styles.formSection}>
              <h4>Form</h4>
              <div className={styles.formBadges}>
                {recentMatches.map((match) => {
                  const opponentTeam = getTeamById(match.opponent_team);
                  return (
                    <div key={match.fixture} className={styles.formBadge}>
                      <span className={styles.formOpponent}>
                        {opponentTeam?.short_name || 'N/A'} ({match.was_home ? 'H' : 'A'})
                      </span>
                      <span className={styles.formPoints}>{match.total_points} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.fixturesSection}>
              <h4>Fixtures</h4>
              <div className={styles.fixtureBadges}>
                {upcomingFixtures.map((fixture) => {
                  const opponentTeam = getTeamById(fixture.is_home ? fixture.team_a : fixture.team_h);
                  return (
                    <div
                      key={fixture.id}
                      className={styles.fixtureBadge}
                      style={{ borderColor: FDR_COLORS[fixture.difficulty] || FDR_COLORS[3] }}
                    >
                      <span className={styles.fixtureOpponent}>
                        {opponentTeam?.short_name || 'N/A'} ({fixture.is_home ? 'H' : 'A'})
                      </span>
                      <span
                        className={styles.fdrBadge}
                        style={{ backgroundColor: FDR_COLORS[fixture.difficulty] || FDR_COLORS[3] }}
                      >
                        {fixture.difficulty}
                      </span>
                    </div>
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
                  <h3>Season Stats</h3>
                  <div className={styles.statsList}>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Starts</span>
                      <span className={styles.statValue}>{player.starts}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Minutes Played</span>
                      <span className={styles.statValue}>{player.minutes}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Goals</span>
                      <span className={styles.statValue}>{player.goals_scored}</span>
                      <span className={styles.per90Label}>Per 90'</span>
                      <span className={styles.per90Value}>{calcPer90(player.goals_scored, player.minutes)}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Assists</span>
                      <span className={styles.statValue}>{player.assists}</span>
                      <span className={styles.per90Label}>Per 90'</span>
                      <span className={styles.per90Value}>{calcPer90(player.assists, player.minutes)}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Expected Goals (xG)</span>
                      <span className={styles.statValue}>{player.expected_goals}</span>
                      <span className={styles.per90Label}>Per 90'</span>
                      <span className={styles.per90Value}>{calcPer90(player.expected_goals, player.minutes)}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Expected Assists (xA)</span>
                      <span className={styles.statValue}>{player.expected_assists}</span>
                      <span className={styles.per90Label}>Per 90'</span>
                      <span className={styles.per90Value}>{calcPer90(player.expected_assists, player.minutes)}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Expected GI (xGI)</span>
                      <span className={styles.statValue}>{player.expected_goal_involvements}</span>
                      <span className={styles.per90Label}>Per 90'</span>
                      <span className={styles.per90Value}>
                        {calcPer90(player.expected_goal_involvements, player.minutes)}
                      </span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Clean Sheets</span>
                      <span className={styles.statValue}>{player.clean_sheets}</span>
                    </div>
                    {player.saves !== undefined && (
                      <div className={styles.statRow}>
                        <span className={styles.statLabel}>Saves</span>
                        <span className={styles.statValue}>{player.saves}</span>
                        <span className={styles.per90Label}>Per 90'</span>
                        <span className={styles.per90Value}>{calcPer90(player.saves, player.minutes)}</span>
                      </div>
                    )}
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Yellow Cards</span>
                      <span className={styles.statValue}>{player.yellow_cards}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Red Cards</span>
                      <span className={styles.statValue}>{player.red_cards}</span>
                    </div>
                  </div>

                  <h3>FPL Stats</h3>
                  <div className={styles.statsList}>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Total Points</span>
                      <span className={styles.statValue}>{player.total_points}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Bonus</span>
                      <span className={styles.statValue}>{player.bonus}</span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>BPS</span>
                      <span className={styles.statValue}>{player.bps}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && playerDetails && (
                <div className={styles.historyTab}>
                  {playerDetails.history_past && playerDetails.history_past.length > 0 ? (
                    <>
                      <h3>Previous Seasons</h3>
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
                        {playerDetails.history_past.map((season) => (
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
                      </div>
                    </>
                  ) : (
                    <div className={styles.noHistory}>
                      <p>No previous season data available</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
