'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [leagueId, setLeagueId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchLeagueData = async () => {
    if (!leagueId) return;

    setLoading(true);
    setError('');

    try {
      // First, fetch and store data from FPL API
      const response = await fetch(`/api/league/${leagueId}`);
      if (!response.ok) throw new Error('Failed to fetch league data');

      // Then fetch stats from our database
      const statsResponse = await fetch(`/api/league/${leagueId}/stats`);
      if (!statsResponse.ok) throw new Error('Failed to fetch league stats');

      const statsData = await statsResponse.json();
      setData(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            onClick={fetchLeagueData}
            disabled={loading || !leagueId}
            className={styles.button}
          >
            {loading ? 'Loading...' : 'Fetch League Data'}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {data && (
          <>
            <section className={styles.section}>
              <h2>{data.league?.name || 'League Standings'}</h2>
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
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

            <section className={styles.section}>
              <h2>Recent Matches</h2>
              <div className={styles.matches}>
                {data.recentMatches?.map((match: any) => (
                  <div key={match.id} className={styles.match}>
                    <div className={styles.matchEvent}>GW {match.event}</div>
                    <div className={styles.matchDetails}>
                      <div className={match.winner === match.entry_1_id ? styles.winner : ''}>
                        {match.entry_1_player} ({match.entry_1_team})
                        <span className={styles.score}>{match.entry_1_points}</span>
                      </div>
                      <div className={styles.vs}>vs</div>
                      <div className={match.winner === match.entry_2_id ? styles.winner : ''}>
                        {match.entry_2_player} ({match.entry_2_team})
                        <span className={styles.score}>{match.entry_2_points}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
