'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import styles from './player.module.css';

export default function PlayerProfile() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.playerId as string;
  const leagueId = params.leagueId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (playerId) {
      fetchPlayerData();
    }
  }, [playerId]);

  const fetchPlayerData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/player/${playerId}`);
      if (!response.ok) throw new Error('Failed to fetch player data');

      const playerData = await response.json();
      setData(playerData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading player profile...</div>
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

  if (!data) return null;

  const differential = data.stats.totalPointsFor -
    data.matchHistory.reduce((sum: number, m: any) => sum + m.opponentPoints, 0);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back to League
        </button>

        {/* Overview Card */}
        <div className={styles.overviewCard}>
          <div className={styles.playerHeader}>
            <div>
              <h1 className={styles.playerName}>{data.manager.player_name}</h1>
              <p className={styles.teamName}>{data.manager.team_name}</p>
            </div>
            <div className={styles.recordBadge}>
              <span className={styles.record}>
                {data.stats.wins}-{data.stats.draws}-{data.stats.losses}
              </span>
              <span className={styles.recordLabel}>W-D-L</span>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{data.stats.matchesPlayed}</span>
              <span className={styles.statLabel}>Played</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{data.stats.totalPointsFor}</span>
              <span className={styles.statLabel}>PF</span>
            </div>
            <div className={styles.statBox}>
              <span className={`${styles.statValue} ${
                differential > 0 ? styles.positive : differential < 0 ? styles.negative : ''
              }`}>
                {differential > 0 ? `+${differential}` : differential}
              </span>
              <span className={styles.statLabel}>+/-</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{data.stats.averagePoints}</span>
              <span className={styles.statLabel}>Avg/GW</span>
            </div>
          </div>
        </div>

        {/* Chips Played */}
        <section className={styles.section}>
          <h2>Chips Played</h2>
          {data.chipsPlayed.length > 0 ? (
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Chip</th>
                    <th>GW</th>
                    <th>Opponent</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {data.chipsPlayed.map((chip: any) => {
                    const match = data.matchHistory.find((m: any) => m.event === chip.event);
                    return (
                      <tr key={chip.event}>
                        <td><span className={styles.chipBadge}>{chip.name}</span></td>
                        <td>GW{chip.event}</td>
                        <td>{match?.opponentName || '-'}</td>
                        <td>
                          {match ? `${match.playerPoints}-${match.opponentPoints}` : '-'}
                        </td>
                        <td>
                          {match && (
                            <span className={`${styles.result} ${
                              match.result === 'W' ? styles.resultWin :
                              match.result === 'D' ? styles.resultDraw :
                              styles.resultLoss
                            }`}>
                              {match.result}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.emptyState}>No chips played yet</p>
          )}
        </section>

        {/* Chips Faced */}
        <section className={styles.section}>
          <h2>Chips Faced Against</h2>
          {data.chipsFaced.length > 0 ? (
            <>
              <div className={styles.chipsSummary}>
                <span>Faced <strong>{data.chipsFaced.length}</strong> chips total - </span>
                <span className={styles.positive}>
                  Won {data.chipsFaced.filter((c: any) => c.result === 'W').length}
                </span>
                <span> / </span>
                <span className={styles.negative}>
                  Lost {data.chipsFaced.filter((c: any) => c.result === 'L').length}
                </span>
              </div>
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>GW</th>
                      <th>Opponent</th>
                      <th>Chip Used</th>
                      <th>Their Score</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.chipsFaced.map((chip: any, idx: number) => (
                      <tr key={idx}>
                        <td>GW{chip.event}</td>
                        <td>{chip.opponentName}</td>
                        <td><span className={styles.chipBadge}>{chip.chipName}</span></td>
                        <td>{chip.opponentPoints}</td>
                        <td>
                          <span className={`${styles.result} ${
                            chip.result === 'W' ? styles.resultWin :
                            chip.result === 'D' ? styles.resultDraw :
                            styles.resultLoss
                          }`}>
                            {chip.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className={styles.emptyState}>No chips faced yet</p>
          )}
        </section>

        {/* Season Stats */}
        <section className={styles.section}>
          <h2>Season Stats</h2>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statCardLabel}>Highest Score</span>
              <span className={styles.statCardValue}>{data.stats.highestScore}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statCardLabel}>Lowest Score</span>
              <span className={styles.statCardValue}>{data.stats.lowestScore}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statCardLabel}>Biggest Win</span>
              <span className={`${styles.statCardValue} ${styles.positive}`}>
                +{data.stats.biggestWin}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statCardLabel}>Biggest Loss</span>
              <span className={`${styles.statCardValue} ${styles.negative}`}>
                {data.stats.biggestLoss}
              </span>
            </div>
          </div>
        </section>

        {/* Match History */}
        <section className={styles.section}>
          <h2>Match History</h2>
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th>GW</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>Margin</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {data.matchHistory.slice().reverse().map((match: any) => (
                  <tr key={match.event}>
                    <td>GW{match.event}</td>
                    <td>{match.opponentName}</td>
                    <td>{match.playerPoints}-{match.opponentPoints}</td>
                    <td>
                      <span className={
                        match.margin > 0 ? styles.positive :
                        match.margin < 0 ? styles.negative :
                        ''
                      }>
                        {match.margin > 0 ? `+${match.margin}` : match.margin}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.result} ${
                        match.result === 'W' ? styles.resultWin :
                        match.result === 'D' ? styles.resultDraw :
                        styles.resultLoss
                      }`}>
                        {match.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
