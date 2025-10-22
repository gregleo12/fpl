'use client';

import { useRouter } from 'next/navigation';
import styles from './Dashboard.module.css';

interface Props {
  data: any;
  myTeamId: string;
  myManagerName: string;
  myTeamName: string;
  leagueId: string;
}

export default function MyTeamTab({ data, myTeamId, myManagerName, myTeamName, leagueId }: Props) {
  const router = useRouter();

  if (!data || !data.standings) {
    return <div className={styles.emptyState}>No team data available</div>;
  }

  const myTeam = data.standings.find((team: any) => team.entry_id.toString() === myTeamId);

  if (!myTeam) {
    return <div className={styles.emptyState}>Team not found in league</div>;
  }

  const differential = myTeam.points_for - myTeam.points_against;

  return (
    <div className={styles.myTeamTab}>
      {/* Team Overview */}
      <div className={styles.section}>
        <div className={styles.teamHeader}>
          <div>
            <h2 className={styles.managerName}>{myManagerName}</h2>
            <p className={styles.teamNameSubtitle}>{myTeamName}</p>
          </div>
          <div className={styles.rankBadge}>
            <span className={styles.rankNumber}>{myTeam.rank}</span>
            <span className={styles.rankLabel}>Rank</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{myTeam.matches_played}</span>
          <span className={styles.statLabel}>Matches Played</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{myTeam.matches_won}</span>
          <span className={styles.statLabel}>Wins</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{myTeam.matches_drawn}</span>
          <span className={styles.statLabel}>Draws</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{myTeam.matches_lost}</span>
          <span className={styles.statLabel}>Losses</span>
        </div>
      </div>

      {/* Points */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{myTeam.points_for}</span>
          <span className={styles.statLabel}>Points For</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statValue} ${
            differential > 0 ? styles.positive :
            differential < 0 ? styles.negative :
            ''
          }`}>
            {differential > 0 ? `+${differential}` : differential}
          </span>
          <span className={styles.statLabel}>Differential</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{myTeam.total}</span>
          <span className={styles.statLabel}>Total Points</span>
        </div>
      </div>

      {/* Form */}
      {myTeam.formArray && myTeam.formArray.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Recent Form</h3>
          <div className={styles.formRow}>
            {myTeam.formArray.map((result: string, idx: number) => (
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
        </div>
      )}

      {/* View Full Profile */}
      <button
        onClick={() => router.push(`/league/${leagueId}/player/${myTeamId}`)}
        className={styles.viewProfileButton}
      >
        View Full Profile →
      </button>
    </div>
  );
}
