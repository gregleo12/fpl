import styles from './Ownership.module.css';

interface TeamSummary {
  team: {
    id: number;
    name: string;
    short_name: string;
  };
  doubleUpCount: number;
  doubleUpPercent: number;
  tripleUpCount: number;
  tripleUpPercent: number;
  topCombo: {
    players: string[];
    count: number;
    percent: number;
  } | null;
}

interface StackingSummaryProps {
  teams: TeamSummary[];
  onTeamClick: (teamId: number) => void;
}

export default function StackingSummary({ teams, onTeamClick }: StackingSummaryProps) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        📊 Stacking Overview
      </h3>
      <p className={styles.sectionDesc}>
        Click any team to see detailed combinations
      </p>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.teamNameCol}>Team</th>
              <th className={styles.stackPctCol}>2+ Owned</th>
              <th className={styles.stackPctCol}>3+ Owned</th>
              <th className={styles.topComboCol}>Top Combo</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((teamSummary) => (
              <tr
                key={teamSummary.team.id}
                className={styles.clickableRow}
                onClick={() => onTeamClick(teamSummary.team.id)}
              >
                <td className={styles.teamNameCell}>
                  <span className={styles.teamName}>{teamSummary.team.name}</span>
                </td>
                <td className={styles.stackPctCell}>
                  <span className={styles.stackPct}>
                    {teamSummary.doubleUpPercent.toFixed(1)}%
                  </span>
                  <span className={styles.stackCount}>
                    ({teamSummary.doubleUpCount.toLocaleString()})
                  </span>
                </td>
                <td className={styles.stackPctCell}>
                  {teamSummary.tripleUpCount > 0 ? (
                    <>
                      <span className={styles.stackPct}>
                        {teamSummary.tripleUpPercent.toFixed(1)}%
                      </span>
                      <span className={styles.stackCount}>
                        ({teamSummary.tripleUpCount.toLocaleString()})
                      </span>
                    </>
                  ) : (
                    <span className={styles.noTriples}>—</span>
                  )}
                </td>
                <td className={styles.topComboCell}>
                  {teamSummary.topCombo ? (
                    <>
                      <span className={styles.comboPlayers}>
                        {teamSummary.topCombo.players.join(' + ')}
                      </span>
                      <span className={styles.comboPct}>
                        ({teamSummary.topCombo.percent.toFixed(1)}%)
                      </span>
                    </>
                  ) : (
                    <span className={styles.noCombo}>No 2+ owners</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
