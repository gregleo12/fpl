'use client';

import { useState, useEffect } from 'react';
import styles from '../Dashboard/Dashboard.module.css';
import { shortenTeamName, shortenManagerName } from '@/lib/nameUtils';
import PositionHistory from '../Dashboard/PositionHistory';

interface Props {
  leagueId: string;
  myTeamId: string;
  myTeamName: string;
  myManagerName: string;
}

// Helper to get chip abbreviation
function getChipAbbreviation(chipName: string): string {
  const chipMap: { [key: string]: string } = {
    'wildcard': 'WC',
    'bboost': 'BB',
    '3xc': 'TC',
    'freehit': 'FH'
  };

  const normalized = chipName.toLowerCase().replace(/\s+/g, '');
  return chipMap[normalized] || chipName;
}

// Helper to get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) {
    return num + 'st';
  }
  if (j === 2 && k !== 12) {
    return num + 'nd';
  }
  if (j === 3 && k !== 13) {
    return num + 'rd';
  }
  return num + 'th';
}

export function MyTeamView({ leagueId, myTeamId, myTeamName, myManagerName }: Props) {
  const [data, setData] = useState<any>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [leagueId, myTeamId]);

  async function fetchData() {
    setIsLoading(true);
    setError('');

    try {
      const [leagueResponse, playerResponse] = await Promise.all([
        fetch(`/api/league/${leagueId}/stats`),
        fetch(`/api/player/${myTeamId}?leagueId=${leagueId}`)
      ]);

      if (!leagueResponse.ok || !playerResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const leagueData = await leagueResponse.json();
      const player = await playerResponse.json();

      setData(leagueData);
      setPlayerData(player);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.7)'
      }}>
        Loading your team stats...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#ef4444'
      }}>
        {error}
      </div>
    );
  }

  if (!data || !data.standings || !playerData) {
    return <div className={styles.emptyState}>No team data available</div>;
  }

  const myTeam = data.standings.find((team: any) => team.entry_id.toString() === myTeamId);

  if (!myTeam) {
    return <div className={styles.emptyState}>Team not found in league</div>;
  }

  const differential = playerData.stats.totalPointsFor -
    playerData.matchHistory.reduce((sum: number, m: any) => sum + m.opponentPoints, 0);

  return (
    <div className={styles.myTeamTab}>
      {/* Team Overview with Rank */}
      <div className={styles.section}>
        <div className={styles.teamHeader}>
          <div>
            <h2 className={styles.managerName}>{shortenManagerName(myManagerName)}</h2>
            <p className={styles.teamNameSubtitle}>{shortenTeamName(myTeamName)}</p>
          </div>
          <div className={styles.rankBadge}>
            <span className={styles.rankNumber}>{getOrdinalSuffix(myTeam.rank)}</span>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Performance</h3>
        <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.matchesPlayed}</span>
          <span className={styles.statLabel}>PLY</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.totalPointsFor}</span>
          <span className={styles.statLabel}>PTS</span>
        </div>
        <div className={`${styles.statCard}`}>
          <span className={`${styles.statValue} ${
            differential > 0 ? styles.positive :
            differential < 0 ? styles.negative :
            ''
          }`}>
            {differential > 0 ? `+${differential}` : differential}
          </span>
          <span className={styles.statLabel}>+/-</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.averagePoints}</span>
          <span className={styles.statLabel}>AVG</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.wins}</span>
          <span className={styles.statLabel}>WIN</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.draws}</span>
          <span className={styles.statLabel}>DRW</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{playerData.stats.losses}</span>
          <span className={styles.statLabel}>LSS</span>
        </div>
        <div className={`${styles.statCard} ${styles.highlight}`}>
          <span className={styles.statValue}>{myTeam.total}</span>
          <span className={styles.statLabel}>TOT</span>
        </div>
      </div>
      </div>

      {/* Recent Form */}
      {playerData.matchHistory && playerData.matchHistory.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Recent Form <span className={styles.subtitle}>(Last 5)</span>
          </h3>
          <div className={styles.formGrid}>
            {playerData.matchHistory.slice().reverse().slice(0, 5).map((match: any) => (
              <div key={match.event} className={styles.formItem}>
                <div
                  className={`${styles.formCircle} ${
                    match.result === 'W' ? styles.formWin :
                    match.result === 'D' ? styles.formDraw :
                    styles.formLoss
                  }`}
                  title={`GW${match.event}: ${shortenManagerName(match.opponentName)} (${match.playerPoints}-${match.opponentPoints})`}
                >
                  {match.result}
                </div>
                <div className={styles.gameweekLabel}>GW{match.event}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Season Stats */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Season Stats</h3>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{playerData.stats.highestScore}</span>
            <span className={styles.statLabel}>Highest Score</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{playerData.stats.lowestScore}</span>
            <span className={styles.statLabel}>Lowest Score</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.positive}`}>
              +{playerData.stats.biggestWin}
            </span>
            <span className={styles.statLabel}>Biggest Win</span>
          </div>
          <div className={styles.statCard}>
            <span className={`${styles.statValue} ${styles.negative}`}>
              {playerData.stats.biggestLoss}
            </span>
            <span className={styles.statLabel}>Biggest Loss</span>
          </div>
        </div>
      </div>

      {/* League Position Over Time */}
      <PositionHistory
        leagueId={leagueId}
        entryId={myTeamId}
        standings={data.standings}
        myManagerName={myManagerName}
      />

      {/* Chips Played */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Chips Played</h3>
        {playerData.chipsPlayed.length > 0 ? (
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
                {playerData.chipsPlayed.map((chip: any) => {
                  const match = playerData.matchHistory.find((m: any) => m.event === chip.event);
                  return (
                    <tr key={chip.event}>
                      <td><span className={styles.chipBadge}>{getChipAbbreviation(chip.name)}</span></td>
                      <td>GW{chip.event}</td>
                      <td>{match?.opponentName ? shortenManagerName(match.opponentName) : '-'}</td>
                      <td>
                        {match ? `${match.playerPoints}-${match.opponentPoints}` : '-'}
                      </td>
                      <td>
                        {match && (
                          <span className={`${styles.resultBadge} ${
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
      </div>

      {/* Chips Faced */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Chips Faced Against</h3>
        {playerData.chipsFaced.length > 0 ? (
          <>
            <div className={styles.chipsSummary}>
              <span>Faced <strong>{playerData.chipsFaced.length}</strong> chips total - </span>
              <span className={styles.positive}>
                Won {playerData.chipsFaced.filter((c: any) => c.result === 'W').length}
              </span>
              <span> / </span>
              <span className={styles.negative}>
                Lost {playerData.chipsFaced.filter((c: any) => c.result === 'L').length}
              </span>
            </div>
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
                  {playerData.chipsFaced.map((chip: any, idx: number) => {
                    const match = playerData.matchHistory.find((m: any) => m.event === chip.event);
                    const yourScore = match?.playerPoints || 0;
                    return (
                      <tr key={idx}>
                        <td><span className={styles.chipBadge}>{getChipAbbreviation(chip.chipName)}</span></td>
                        <td>GW{chip.event}</td>
                        <td>{shortenManagerName(chip.opponentName)}</td>
                        <td>
                          {yourScore}-{chip.opponentPoints}
                        </td>
                        <td>
                          <span className={`${styles.resultBadge} ${
                            chip.result === 'W' ? styles.resultWin :
                            chip.result === 'D' ? styles.resultDraw :
                            styles.resultLoss
                          }`}>
                            {chip.result}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className={styles.emptyState}>No chips faced yet</p>
        )}
      </div>
    </div>
  );
}
