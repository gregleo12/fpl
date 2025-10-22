'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [leagueId, setLeagueId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [currentGW, setCurrentGW] = useState<number | null>(null);
  const [maxGW, setMaxGW] = useState<number | null>(null);

  const fetchLeagueData = async (gw?: number) => {
    if (!leagueId) return;

    setLoading(true);
    setError('');

    try {
      // First, fetch and store data from FPL API
      const response = await fetch(`/api/league/${leagueId}`);
      if (!response.ok) throw new Error('Failed to fetch league data');

      // Then fetch stats from our database
      const gwParam = gw ? `?gw=${gw}` : '';
      const statsResponse = await fetch(`/api/league/${leagueId}/stats${gwParam}`);
      if (!statsResponse.ok) throw new Error('Failed to fetch league stats');

      const statsData = await statsResponse.json();
      setData(statsData);

      // Set GW info
      if (statsData.currentGW) {
        setCurrentGW(statsData.currentGW);
        setMaxGW(statsData.maxGW);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateGW = (direction: 'prev' | 'next' | 'latest') => {
    if (!currentGW || !maxGW) return;

    let newGW = currentGW;
    if (direction === 'prev' && currentGW > 1) {
      newGW = currentGW - 1;
    } else if (direction === 'next' && currentGW < maxGW) {
      newGW = currentGW + 1;
    } else if (direction === 'latest') {
      newGW = maxGW;
    }

    if (newGW !== currentGW) {
      fetchLeagueData(newGW);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>FPL H2H League Analytics</h1>

        <div className={styles.search}>
          <input
            type="text"
            placeholder="Enter League ID"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className={styles.input}
          />
          <button
            onClick={() => fetchLeagueData()}
            disabled={loading || !leagueId}
            className={styles.button}
          >
            {loading ? 'Loading...' : 'Fetch League Data'}
          </button>
          <button
            onClick={() => {
              setLeagueId('804742');
              setTimeout(() => fetchLeagueData(), 100);
            }}
            disabled={loading}
            className={`${styles.button} ${styles.testButton}`}
          >
            Test League 804742
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {data && (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>{data.league?.name || 'League Standings'}</h2>
                {currentGW && maxGW && (
                  <div className={styles.gwControls}>
                    <button
                      onClick={() => navigateGW('prev')}
                      disabled={currentGW <= 1 || loading}
                      className={styles.gwButton}
                    >
                      ← GW {currentGW - 1}
                    </button>
                    <span className={styles.gwDisplay}>
                      Gameweek {currentGW}
                      {currentGW === maxGW && ' (Latest)'}
                    </span>
                    <button
                      onClick={() => navigateGW('next')}
                      disabled={currentGW >= maxGW || loading}
                      className={styles.gwButton}
                    >
                      GW {currentGW + 1} →
                    </button>
                    {currentGW < maxGW && (
                      <button
                        onClick={() => navigateGW('latest')}
                        disabled={loading}
                        className={`${styles.gwButton} ${styles.gwLatest}`}
                      >
                        Latest (GW {maxGW})
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Last GW</th>
                      <th>Manager</th>
                      <th>Team</th>
                      <th>Played</th>
                      <th>W</th>
                      <th>D</th>
                      <th>L</th>
                      <th>Form</th>
                      <th>Streak</th>
                      <th>PF</th>
                      <th>PA</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.standings?.map((standing: any) => (
                      <tr key={standing.entry_id}>
                        <td>{standing.rank}</td>
                        <td>
                          {standing.rankChange !== undefined && (
                            <span
                              className={`${styles.rankChange} ${
                                standing.rankChange > 0 ? styles.rankUp :
                                standing.rankChange < 0 ? styles.rankDown :
                                styles.rankSame
                              }`}
                            >
                              {standing.rankChange > 0 ? `↑ ${standing.rankChange}` :
                               standing.rankChange < 0 ? `↓ ${Math.abs(standing.rankChange)}` :
                               '→'}
                            </span>
                          )}
                        </td>
                        <td>{standing.player_name}</td>
                        <td>{standing.team_name}</td>
                        <td>{standing.matches_played}</td>
                        <td>{standing.matches_won}</td>
                        <td>{standing.matches_drawn}</td>
                        <td>{standing.matches_lost}</td>
                        <td>
                          <div className={styles.form}>
                            {standing.formArray?.map((result: string, idx: number) => (
                              <span
                                key={idx}
                                className={`${styles.formIndicator} ${
                                  result === 'W' ? styles.formWin :
                                  result === 'D' ? styles.formDraw :
                                  styles.formLoss
                                }`}
                              >
                                {result}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {standing.streak && (
                            <span
                              className={`${styles.streak} ${
                                standing.streak.startsWith('W') ? styles.streakWin :
                                standing.streak.startsWith('D') ? styles.streakDraw :
                                styles.streakLoss
                              }`}
                            >
                              {standing.streak}
                            </span>
                          )}
                        </td>
                        <td>{standing.points_for}</td>
                        <td>{standing.points_against}</td>
                        <td><strong>{standing.total}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
