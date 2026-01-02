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
    <>
      {/* Double-Ups Table */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          👥 Double-Ups (2+ Players)
        </h3>
        <p className={styles.sectionDesc}>
          Click any team to see detailed combinations
        </p>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.teamNameCol}>Team</th>
                <th className={styles.stackPctCol}>% of Sample</th>
                <th className={styles.stackCountNumCol}>Managers</th>
                <th className={styles.topComboCol}>Top Combo</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((teamSummary) => (
                <tr
                  key={`double-${teamSummary.team.id}`}
                  className={styles.clickableRow}
                  onClick={() => onTeamClick(teamSummary.team.id)}
                >
                  <td className={styles.teamNameCell}>
                    <span className={styles.teamName}>{teamSummary.team.name}</span>
                  </td>
                  <td className={styles.stackPctCellSimple}>
                    <span className={styles.stackPct}>
                      {teamSummary.doubleUpPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className={styles.stackCountNumCell}>
                    {teamSummary.doubleUpCount.toLocaleString()}
                  </td>
                  <td className={styles.topComboCell}>
                    {teamSummary.topCombo ? (
                      <span className={styles.comboPlayers}>
                        {teamSummary.topCombo.players.join(' + ')}
                      </span>
                    ) : (
                      <span className={styles.noCombo}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Triple-Ups Table */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          👥👥 Triple-Ups (3+ Players)
        </h3>
        <p className={styles.sectionDesc}>
          Click any team to see detailed combinations
        </p>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.teamNameCol}>Team</th>
                <th className={styles.stackPctCol}>% of Sample</th>
                <th className={styles.stackCountNumCol}>Managers</th>
                <th className={styles.topComboCol}>Top Combo</th>
              </tr>
            </thead>
            <tbody>
              {teams
                .filter(t => t.tripleUpCount > 0)
                .map((teamSummary) => (
                  <tr
                    key={`triple-${teamSummary.team.id}`}
                    className={styles.clickableRow}
                    onClick={() => onTeamClick(teamSummary.team.id)}
                  >
                    <td className={styles.teamNameCell}>
                      <span className={styles.teamName}>{teamSummary.team.name}</span>
                    </td>
                    <td className={styles.stackPctCellSimple}>
                      <span className={styles.stackPct}>
                        {teamSummary.tripleUpPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className={styles.stackCountNumCell}>
                      {teamSummary.tripleUpCount.toLocaleString()}
                    </td>
                    <td className={styles.topComboCell}>
                      {teamSummary.topCombo ? (
                        <span className={styles.comboPlayers}>
                          {teamSummary.topCombo.players.join(' + ')} + ...
                        </span>
                      ) : (
                        <span className={styles.noCombo}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {teams.filter(t => t.tripleUpCount > 0).length === 0 && (
          <p className={styles.noData}>No teams have triple-up ownership</p>
        )}
      </div>
    </>
  );
}
