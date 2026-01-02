import styles from './LuckLeaderboard.module.css';
import { formatSeasonLuck, formatLuckValue, getLuckClass as getSharedLuckClass, type ManagerLuck } from '@/lib/luckFormatting';

interface Manager {
  entry_id: number;
  name: string;
  team_name: string;
  season_avg_points: number;
  season_luck_index: number;
  variance_luck: { total: number };
  rank_luck: { total: number };
  schedule_luck: { value: number };
  chip_luck: { value: number };
}

interface LuckLeaderboardProps {
  managers: Manager[];
  myTeamId: number;
  weights: {
    variance: number;
    rank: number;
    schedule: number;
    chip: number;
  };
}

export default function LuckLeaderboard({ managers, myTeamId, weights }: LuckLeaderboardProps) {
  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rankCol}>Rank</th>
              <th className={styles.nameCol}>Manager</th>
              <th className={styles.teamCol}>Team</th>
              <th className={styles.luckCol}>Luck Index</th>
              <th className={styles.componentCol}>Variance</th>
              <th className={styles.componentCol}>Rank</th>
              <th className={styles.componentCol}>Schedule</th>
              <th className={styles.componentCol}>Chip</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((manager, idx) => {
              const rank = idx + 1;
              const isMe = manager.entry_id === myTeamId;
              const icon = getRankIcon(rank, managers.length);

              // K-163N: Use shared formatting utility for consistent luck display
              const formatted = formatSeasonLuck(manager as unknown as ManagerLuck);

              // For color classes, use normalized values (before × 10)
              const varianceNormalized = manager.variance_luck?.total ? manager.variance_luck.total / 10 : 0;
              const rankNormalized = manager.rank_luck?.total ?? 0;
              const scheduleNormalized = manager.schedule_luck?.value ? manager.schedule_luck.value / 5 : 0;
              const chipNormalized = manager.chip_luck?.value ? manager.chip_luck.value / 3 : 0;

              return (
                <tr
                  key={manager.entry_id}
                  className={`${styles.row} ${isMe ? styles.myRow : ''}`}
                >
                  <td className={styles.rankCell}>
                    <span className={styles.rankIcon}>{icon}</span>
                    {rank}
                  </td>
                  <td className={styles.nameCell}>{manager.name}</td>
                  <td className={styles.teamCell}>{manager.team_name}</td>
                  <td className={`${styles.luckCell} ${getSharedLuckClass(manager.season_luck_index, styles)}`}>
                    <span className={styles.luckValue}>
                      {formatLuckValue(formatted.index)}
                    </span>
                  </td>
                  <td className={`${styles.componentCell} ${getSharedLuckClass(varianceNormalized, styles)}`}>
                    {formatLuckValue(formatted.variance)}
                  </td>
                  <td className={`${styles.componentCell} ${getSharedLuckClass(rankNormalized, styles)}`}>
                    {formatLuckValue(formatted.rank)}
                  </td>
                  <td className={`${styles.componentCell} ${getSharedLuckClass(scheduleNormalized, styles)}`}>
                    {formatLuckValue(formatted.schedule)}
                  </td>
                  <td className={`${styles.componentCell} ${getSharedLuckClass(chipNormalized, styles)}`}>
                    {formatLuckValue(formatted.chip)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getRankIcon(rank: number, total: number): string {
  if (rank <= 3) return '🍀'; // Top 3 - lucky
  if (rank >= total - 2) return '⛈️'; // Bottom 3 - unlucky
  return '';
}
