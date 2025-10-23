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
                <th className={styles.rankCol}>Rank</th>
                <th className={styles.teamCol}>Team</th>
                <th className={styles.recordCol}>W</th>
                <th className={styles.recordCol}>D</th>
                <th className={styles.recordCol}>L</th>
                <th className={styles.formCol}>Form</th>
                <th className={styles.streakCol}>Streak</th>
                <th className={styles.pfCol}>PF</th>
                <th className={styles.diffCol}>+/-</th>
                <th className={styles.ptsCol}>Pts</th>
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
                    <td className={styles.rankCol}>{team.rank}</td>
                    <td className={styles.teamCol}>
                      <div className={styles.teamCell}>
                        <span className={styles.teamName}>{team.team_name}</span>
                        <span className={styles.managerName}>{team.player_name}</span>
                      </div>
                    </td>
                    <td className={styles.recordCol}>{team.matches_won}</td>
                    <td className={styles.recordCol}>{team.matches_drawn}</td>
                    <td className={styles.recordCol}>{team.matches_lost}</td>
                    <td className={styles.formCol}>
                      <div className={styles.form}>
                        {team.formArray?.map((result: string, idx: number) => (
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
                    <td className={styles.streakCol}>
                      {team.streak && (
                        <span
                          className={`${styles.streak} ${
                            team.streak.startsWith('W') ? styles.streakWin :
                            team.streak.startsWith('D') ? styles.streakDraw :
                            styles.streakLoss
                          }`}
                        >
                          {team.streak}
                        </span>
                      )}
                    </td>
                    <td className={styles.pfCol}>{team.points_for}</td>
                    <td className={styles.diffCol}>
                      <span className={`${styles.differential} ${
                        differential > 0 ? styles.positive :
                        differential < 0 ? styles.negative :
                        styles.neutral
                      }`}>
                        {differential > 0 ? `+${differential}` : differential}
                      </span>
                    </td>
                    <td className={styles.ptsCol}><strong>{team.total}</strong></td>
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
