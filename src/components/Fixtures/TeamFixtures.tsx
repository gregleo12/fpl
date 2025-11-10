'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './TeamFixtures.module.css';
import { FixtureDetailsModal } from './FixtureDetailsModal';

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
    code: number;
    score: number | null;
  };
  away_team: {
    id: number;
    name: string;
    short_name: string;
    code: number;
    score: number | null;
  };
  status: 'finished' | 'live' | 'not_started';
  player_stats: PlayerStat[] | null;
}

interface Props {
  gameweek: number;
}

interface FixturesByDate {
  [date: string]: Fixture[];
}

export function TeamFixtures({ gameweek }: Props) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  useEffect(() => {
    fetchFixtures();
  }, [gameweek]);

  async function fetchFixtures() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/fixtures/${gameweek}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch fixtures');
      }

      const data = await response.json();
      setFixtures(data.fixtures);
    } catch (err: any) {
      console.error('Error fetching fixtures:', err);
      setError(err.message || 'Failed to load fixtures');
    } finally {
      setLoading(false);
    }
  }

  // Group fixtures by date
  const fixturesByDate = useMemo(() => {
    const grouped: FixturesByDate = {};

    fixtures.forEach(fixture => {
      const date = new Date(fixture.kickoff_time);
      const dateKey = date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'short'
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(fixture);
    });

    return grouped;
  }, [fixtures]);

  function formatKickoffTime(kickoffTime: string): string {
    const date = new Date(kickoffTime);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  function getTeamBadgeUrl(teamCode: number): string {
    return `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`;
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading fixtures...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>No fixtures found for GW {gameweek}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {Object.entries(fixturesByDate).map(([date, dateFixtures]) => (
        <div key={date} className={styles.dateGroup}>
          {/* Date Header */}
          <div className={styles.dateHeader}>{date}</div>

          {/* Fixtures for this date */}
          <div className={styles.fixturesGroup}>
            {dateFixtures.map((fixture) => (
              <div
                key={fixture.id}
                className={styles.fixtureCard}
                onClick={() => setSelectedFixture(fixture)}
              >
                <div className={styles.fixtureContent}>
                  {/* Home Team */}
                  <div className={styles.homeTeam}>
                    <span className={styles.teamName}>{fixture.home_team.short_name}</span>
                    <img
                      src={getTeamBadgeUrl(fixture.home_team.code)}
                      alt={fixture.home_team.short_name}
                      className={styles.teamBadge}
                      onError={(e) => {
                        // Fallback to colored shirt emoji if image fails
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Score/Status */}
                  <div className={styles.scoreSection}>
                    {fixture.status === 'not_started' ? (
                      <div className={styles.kickoffTime}>{formatKickoffTime(fixture.kickoff_time)}</div>
                    ) : (
                      <>
                        <div className={styles.scoreDisplay}>
                          {fixture.status === 'live' && <span className={styles.liveDot}></span>}
                          <span className={styles.scoreValue}>
                            {fixture.home_team.score ?? '-'}
                          </span>
                          <span className={styles.scoreSeparator}>-</span>
                          <span className={styles.scoreValue}>
                            {fixture.away_team.score ?? '-'}
                          </span>
                        </div>
                        {fixture.status === 'live' && (
                          <div className={styles.liveMinutes}>{fixture.minutes}'</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className={styles.awayTeam}>
                    <img
                      src={getTeamBadgeUrl(fixture.away_team.code)}
                      alt={fixture.away_team.short_name}
                      className={styles.teamBadge}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className={styles.teamName}>{fixture.away_team.short_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Fixture Details Modal */}
      <FixtureDetailsModal
        fixture={selectedFixture}
        onClose={() => setSelectedFixture(null)}
      />
    </div>
  );
}
