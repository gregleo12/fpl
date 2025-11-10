'use client';

import { useState, useEffect } from 'react';
import styles from './TeamFixtures.module.css';

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
}

interface Props {
  gameweek: number;
}

export function TeamFixtures({ gameweek }: Props) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  function formatKickoffTime(kickoffTime: string): string {
    const date = new Date(kickoffTime);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fixtureDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const daysDiff = Math.floor((fixtureDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    if (daysDiff === 0) {
      return `Today ${timeStr}`;
    } else if (daysDiff === 1) {
      return `Tomorrow ${timeStr}`;
    } else if (daysDiff === -1) {
      return `Yesterday ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      });
      return `${dateStr} ${timeStr}`;
    }
  }

  function getStatusDisplay(fixture: Fixture): JSX.Element {
    if (fixture.status === 'finished') {
      return <span className={styles.statusFinished}>FT</span>;
    }

    if (fixture.status === 'live') {
      return (
        <span className={styles.statusLive}>
          <span className={styles.liveDot}></span>
          {fixture.minutes}'
        </span>
      );
    }

    return (
      <span className={styles.statusNotStarted}>
        {formatKickoffTime(fixture.kickoff_time)}
      </span>
    );
  }

  function getScoreDisplay(fixture: Fixture): JSX.Element {
    if (fixture.home_team.score !== null && fixture.away_team.score !== null) {
      return (
        <div className={styles.score}>
          {fixture.home_team.score} - {fixture.away_team.score}
        </div>
      );
    }

    return (
      <div className={styles.score}>
        - : -
      </div>
    );
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
      {fixtures.map((fixture) => (
        <div
          key={fixture.id}
          className={`${styles.fixtureCard} ${fixture.status === 'live' ? styles.liveCard : ''}`}
        >
          {/* Status badge */}
          <div className={styles.statusBadge}>
            {getStatusDisplay(fixture)}
          </div>

          {/* Match info */}
          <div className={styles.matchInfo}>
            {/* Home team */}
            <div className={styles.team}>
              <span className={styles.teamName}>{fixture.home_team.short_name}</span>
            </div>

            {/* Score */}
            {getScoreDisplay(fixture)}

            {/* Away team */}
            <div className={styles.team}>
              <span className={styles.teamName}>{fixture.away_team.short_name}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
