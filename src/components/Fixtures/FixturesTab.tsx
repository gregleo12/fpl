'use client';

import { useState, useEffect } from 'react';
import styles from './Fixtures.module.css';

interface Match {
  id: number;
  event: number;
  entry_1: {
    id: number;
    player_name: string;
    team_name: string;
    score: number;
    chip: string | null;
  };
  entry_2: {
    id: number;
    player_name: string;
    team_name: string;
    score: number;
    chip: string | null;
  };
  winner: number | null;
}

interface FixturesData {
  event: number;
  status: 'completed' | 'in_progress' | 'upcoming';
  matches: Match[];
}

interface OpponentInsights {
  opponent_name: string;
  opponent_team: string;
  opponent_rank: number;
  recent_form: {
    last_5_results: string[];
    avg_points_last_5: string;
  };
  your_stats: {
    avg_points_last_5: string;
  };
  chips_remaining: {
    yours: string[];
    theirs: string[];
  };
  momentum: {
    current_streak: number;
    streak_type: string;
    trend: string;
  };
  head_to_head: {
    total_meetings: number;
    your_wins: number;
    their_wins: number;
    last_meeting: {
      event: number;
      your_score: number;
      their_score: number;
      margin: number;
    } | null;
  };
}

interface Props {
  leagueId: string;
  myTeamId: string;
  maxGW: number;
}

function getChipAbbreviation(chip: string | null): string {
  if (!chip) return '';
  const chipMap: { [key: string]: string } = {
    'wildcard': 'WC',
    'bboost': 'BB',
    '3xc': 'TC',
    'freehit': 'FH'
  };
  return chipMap[chip.toLowerCase()] || chip;
}

export default function FixturesTab({ leagueId, myTeamId, maxGW }: Props) {
  const [currentGW, setCurrentGW] = useState(maxGW);
  const [fixturesData, setFixturesData] = useState<FixturesData | null>(null);
  const [insights, setInsights] = useState<OpponentInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFixtures();
  }, [currentGW]);

  async function fetchFixtures() {
    setLoading(true);
    try {
      const response = await fetch(`/api/league/${leagueId}/fixtures/${currentGW}`);
      if (!response.ok) throw new Error('Failed to fetch fixtures');

      const data = await response.json();
      setFixturesData(data);

      // If upcoming, fetch opponent insights
      if (data.status === 'upcoming') {
        const myMatch = data.matches.find((m: Match) =>
          m.entry_1.id.toString() === myTeamId || m.entry_2.id.toString() === myTeamId
        );

        if (myMatch) {
          const opponentId = myMatch.entry_1.id.toString() === myTeamId
            ? myMatch.entry_2.id
            : myMatch.entry_1.id;

          const insightsResponse = await fetch(
            `/api/league/${leagueId}/insights/${opponentId}?myId=${myTeamId}`
          );

          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            setInsights(insightsData);
          }
        }
      } else {
        setInsights(null);
      }
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePrevGW() {
    if (currentGW > 1) setCurrentGW(currentGW - 1);
  }

  function handleNextGW() {
    if (currentGW < maxGW) setCurrentGW(currentGW + 1);
  }

  if (loading && !fixturesData) {
    return <div className={styles.loading}>Loading fixtures...</div>;
  }

  if (!fixturesData) {
    return <div className={styles.error}>Failed to load fixtures</div>;
  }

  const statusText = {
    completed: 'Completed',
    in_progress: 'In Progress',
    upcoming: 'Upcoming'
  }[fixturesData.status];

  return (
    <div className={styles.container}>
      {/* Gameweek Navigator */}
      <div className={styles.navigator}>
        <button
          className={styles.navButton}
          onClick={handlePrevGW}
          disabled={currentGW <= 1}
        >
          ◄
        </button>
        <div className={styles.gwInfo}>
          <span className={styles.gwNumber}>GW {currentGW}</span>
          <span className={styles.gwStatus}>{statusText}</span>
        </div>
        <button
          className={styles.navButton}
          onClick={handleNextGW}
          disabled={currentGW >= maxGW}
        >
          ►
        </button>
      </div>

      {/* Opponent Insights for Upcoming GWs */}
      {fixturesData.status === 'upcoming' && insights && (
        <div className={styles.insightsCard}>
          <h3 className={styles.insightsTitle}>🎯 Your Next Opponent</h3>
          <div className={styles.opponentHeader}>
            <div>
              <div className={styles.opponentName}>{insights.opponent_name}</div>
              <div className={styles.opponentTeam}>{insights.opponent_team}</div>
            </div>
            <div className={styles.rankBadge}>
              Rank: {insights.opponent_rank}
            </div>
          </div>

          <div className={styles.insightsGrid}>
            <div className={styles.insightBox}>
              <div className={styles.insightLabel}>Recent Form (Last 5)</div>
              <div className={styles.formBadges}>
                {insights.recent_form.last_5_results.map((result, idx) => (
                  <span
                    key={idx}
                    className={`${styles.formBadge} ${
                      result === 'W' ? styles.formWin :
                      result === 'D' ? styles.formDraw :
                      styles.formLoss
                    }`}
                  >
                    {result}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.insightBox}>
              <div className={styles.insightLabel}>Average Points (Last 5 GWs)</div>
              <div className={styles.comparison}>
                <span>You: {insights.your_stats.avg_points_last_5}</span>
                <span className={styles.divider}>vs</span>
                <span>Them: {insights.recent_form.avg_points_last_5}</span>
              </div>
            </div>

            <div className={styles.insightBox}>
              <div className={styles.insightLabel}>Chips Remaining</div>
              <div className={styles.chipsComparison}>
                <div>
                  <strong>You:</strong> {insights.chips_remaining.yours.map(c => getChipAbbreviation(c)).join(', ') || 'None'}
                </div>
                <div>
                  <strong>Them:</strong> {insights.chips_remaining.theirs.map(c => getChipAbbreviation(c)).join(', ') || 'None'}
                </div>
              </div>
            </div>

            {insights.momentum.current_streak >= 3 && (
              <div className={styles.insightBox}>
                <div className={styles.insightLabel}>⚠️ Momentum Alert</div>
                <div className={styles.momentum}>
                  On a {insights.momentum.current_streak}-game {insights.momentum.streak_type} streak!
                </div>
              </div>
            )}

            {insights.head_to_head.total_meetings > 0 && (
              <div className={styles.insightBox}>
                <div className={styles.insightLabel}>Head-to-Head Record</div>
                <div className={styles.h2hRecord}>
                  <span>Total: {insights.head_to_head.your_wins}-{insights.head_to_head.their_wins}</span>
                  {insights.head_to_head.last_meeting && (
                    <span className={styles.lastMeeting}>
                      Last: GW{insights.head_to_head.last_meeting.event}
                      ({insights.head_to_head.last_meeting.your_score}-{insights.head_to_head.last_meeting.their_score})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Matches */}
      <div className={styles.matchesContainer}>
        {fixturesData.matches.map((match) => {
          const isMyMatch = match.entry_1.id.toString() === myTeamId || match.entry_2.id.toString() === myTeamId;
          const margin = match.entry_1.score - match.entry_2.score;

          return (
            <div
              key={match.id}
              className={`${styles.matchCard} ${isMyMatch ? styles.myMatch : ''}`}
            >
              <div className={styles.matchHeader}>
                <div className={styles.team}>
                  <div className={styles.playerName}>{match.entry_1.player_name}</div>
                  <div className={styles.teamName}>{match.entry_1.team_name}</div>
                  {match.entry_1.chip && (
                    <span className={styles.chipBadge}>
                      {getChipAbbreviation(match.entry_1.chip)}
                    </span>
                  )}
                </div>

                <div className={styles.scoreBox}>
                  <div className={styles.score}>
                    {match.entry_1.score} - {match.entry_2.score}
                  </div>
                  {fixturesData.status === 'completed' && margin !== 0 && (
                    <div className={`${styles.margin} ${margin > 0 ? styles.positive : styles.negative}`}>
                      {margin > 0 ? `+${margin}` : margin}
                    </div>
                  )}
                </div>

                <div className={styles.team}>
                  <div className={styles.playerName}>{match.entry_2.player_name}</div>
                  <div className={styles.teamName}>{match.entry_2.team_name}</div>
                  {match.entry_2.chip && (
                    <span className={styles.chipBadge}>
                      {getChipAbbreviation(match.entry_2.chip)}
                    </span>
                  )}
                </div>
              </div>

              {match.winner && (
                <div className={styles.result}>
                  Winner: {match.winner === match.entry_1.id ? match.entry_1.player_name : match.entry_2.player_name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
