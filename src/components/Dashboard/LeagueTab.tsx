'use client';

import { useRouter } from 'next/navigation';
import styles from './Dashboard.module.css';

interface Props {
  data: any;
  myTeamId: string;
  leagueId: string;
}

export default function LeagueTab({ data, myTeamId, leagueId }: Props) {
  const router = useRouter();

  if (!data || !data.standings) {
    return <div className={styles.emptyState}>No league data available</div>;
  }

  return (
    <div className={styles.leagueTab}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Current Standings</h2>
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Manager</th>
                <th>Team</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>PF</th>
                <th>+/-</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((team: any) => {
                const isMyTeam = team.entry_id.toString() === myTeamId;
                const differential = team.points_for - team.points_against;

                return (
                  <tr
                    key={team.entry_id}
                    className={isMyTeam ? styles.myTeamRow : ''}
                    onClick={() => router.push(`/league/${leagueId}/player/${team.entry_id}`)}
                  >
                    <td>{team.rank}</td>
                    <td>{team.player_name}</td>
                    <td>{team.team_name}</td>
                    <td>{team.matches_won}</td>
                    <td>{team.matches_drawn}</td>
                    <td>{team.matches_lost}</td>
                    <td>{team.points_for}</td>
                    <td>
                      <span className={`${styles.differential} ${
                        differential > 0 ? styles.positive :
                        differential < 0 ? styles.negative :
                        styles.neutral
                      }`}>
                        {differential > 0 ? `+${differential}` : differential}
                      </span>
                    </td>
                    <td><strong>{team.total}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
