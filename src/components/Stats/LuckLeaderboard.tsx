import styles from './LuckLeaderboard.module.css';

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
              <th className={styles.componentCol}>Variance<br/><span className={styles.weight}>(40%)</span></th>
              <th className={styles.componentCol}>Rank<br/><span className={styles.weight}>(30%)</span></th>
              <th className={styles.componentCol}>Schedule<br/><span className={styles.weight}>(20%)</span></th>
              <th className={styles.componentCol}>Chip<br/><span className={styles.weight}>(10%)</span></th>
            </tr>
          </thead>
          <tbody>
            {managers.map((manager, idx) => {
              const rank = idx + 1;
              const isMe = manager.entry_id === myTeamId;
              const icon = getRankIcon(rank, managers.length);

              // Calculate weighted components
              const varianceWeighted = manager.variance_luck.total / 10 * weights.variance;
              const rankWeighted = manager.rank_luck.total * weights.rank;
              const scheduleWeighted = manager.schedule_luck.value / 5 * weights.schedule;
              const chipWeighted = manager.chip_luck.value / 3 * weights.chip;

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
                  <td className={`${styles.luckCell} ${getLuckClass(manager.season_luck_index, styles)}`}>
                    <span className={styles.luckValue}>
                      {formatLuck(manager.season_luck_index)}
                    </span>
                  </td>
                  <td className={`${styles.componentCell} ${getLuckClass(varianceWeighted, styles)}`}>
                    {formatLuck(varianceWeighted)}
                  </td>
                  <td className={`${styles.componentCell} ${getLuckClass(rankWeighted, styles)}`}>
                    {formatLuck(rankWeighted)}
                  </td>
                  <td className={`${styles.componentCell} ${getLuckClass(scheduleWeighted, styles)}`}>
                    {formatLuck(scheduleWeighted)}
                  </td>
                  <td className={`${styles.componentCell} ${getLuckClass(chipWeighted, styles)}`}>
                    {formatLuck(chipWeighted)}
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

function formatLuck(val: number): string {
  const absVal = Math.abs(val);
  const formatted = absVal < 10 ? absVal.toFixed(2) : absVal.toFixed(1);
  return val >= 0 ? `+${formatted}` : `-${formatted}`;
}

function getLuckClass(val: number, styles: any): string {
  if (val > 0.5) return styles.lucky;
  if (val < -0.5) return styles.unlucky;
  return styles.neutral;
}

function getRankIcon(rank: number, total: number): string {
  if (rank <= 3) return '🍀'; // Top 3 - lucky
  if (rank >= total - 2) return '⛈️'; // Bottom 3 - unlucky
  return '';
}
