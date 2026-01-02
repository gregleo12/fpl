import styles from './Ownership.module.css';

interface Player {
  id: number;
  name: string;
  ownership: number;
}

interface Combination {
  players: Player[];
  count: number;
  percentOfStackers: number;  // % of managers with 2+ (or 3+) from this team
  percentOfAll: number;        // % of all managers in sample
}

interface CombinationTableProps {
  combinations: Combination[];
  type: 'doubles' | 'triples';
}

export default function CombinationTable({ combinations, type }: CombinationTableProps) {
  if (combinations.length === 0) {
    return <p className={styles.noData}>No {type} found</p>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.rankCol}>#</th>
            <th className={styles.comboCol}>Combination</th>
            <th className={styles.countCol}>Count</th>
            <th className={styles.pctCol}>% of {type === 'doubles' ? '2+' : '3+'}</th>
            <th className={styles.pctAllCol}>% of All</th>
          </tr>
        </thead>
        <tbody>
          {combinations.map((combo, idx) => (
            <tr key={idx} className={styles.row}>
              <td className={styles.rankCell}>{idx + 1}</td>
              <td className={styles.comboCell}>
                {combo.players.map((player, i) => (
                  <span key={player.id}>
                    <span className={styles.playerName}>{player.name}</span>
                    <span className={styles.playerOwnership}>({player.ownership.toFixed(1)}%)</span>
                    {i < combo.players.length - 1 && <span className={styles.plus}> + </span>}
                  </span>
                ))}
              </td>
              <td className={styles.countCell}>{combo.count.toLocaleString()}</td>
              <td className={styles.pctCell}>{combo.percentOfStackers.toFixed(1)}%</td>
              <td className={styles.pctAllCell}>{combo.percentOfAll.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
