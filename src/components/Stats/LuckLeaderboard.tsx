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

              // K-163M: Calculate WEIGHTED × 10 components for display
              // Component columns now show (normalized × weight × 10) so they sum to Luck Index × 10
              const varianceNormalized = manager.variance_luck?.total ? manager.variance_luck.total / 10 : 0;
              const rankNormalized = manager.rank_luck?.total ?? 0;
              const scheduleNormalized = manager.schedule_luck?.value ? manager.schedule_luck.value / 5 : 0;
              const chipNormalized = manager.chip_luck?.value ? manager.chip_luck.value / 3 : 0;

              // Apply weights and multiply by 10 for display
              const displayVariance = varianceNormalized * weights.variance * 10; // × 4
              const displayRank = rankNormalized * weights.rank * 10; // × 3
              const displaySchedule = scheduleNormalized * weights.schedule * 10; // × 2
              const displayChip = chipNormalized * weights.chip * 10; // × 1
              const displayIndex = manager.season_luck_index * 10;

              // K-163M Debug: Log first manager's display values
              if (idx === 0) {
                console.log('[K-163M Display Debug] First manager:', {
                  name: manager.name,
                  index: manager.season_luck_index,
                  displayIndex,
                  varianceNormalized,
                  displayVariance,
                  rankNormalized,
                  displayRank,
                  scheduleNormalized,
                  displaySchedule,
                  chipNormalized,
                  displayChip,
                  sum: (displayVariance + displayRank + displaySchedule + displayChip).toFixed(2),
                  shouldEqual: displayIndex.toFixed(2),
                  matches: Math.abs((displayVariance + displayRank + displaySchedule + displayChip) - displayIndex) < 0.1
                });
              }

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
                      {formatLuck(displayIndex)}
                    </span>
                  </td>
                  <td className={`${styles.componentCell} ${getLuckClass(varianceNormalized, styles)}`}>
                    {formatLuck(displayVariance)}
                  </td>
                  <td className={`${styles.componentCell} ${getLuckClass(rankNormalized, styles)}`}>
                    {formatLuck(displayRank)}
                  </td>
                  <td className={`${styles.componentCell} ${getLuckClass(scheduleNormalized, styles)}`}>
                    {formatLuck(displaySchedule)}
                  </td>
                  <td className={`${styles.componentCell} ${getLuckClass(chipNormalized, styles)}`}>
                    {formatLuck(displayChip)}
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
