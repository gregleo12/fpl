import styles from './Ownership.module.css';

interface TeamSelectorProps {
  selectedTeamId: number;
  onChange: (teamId: number) => void;
}

const TEAMS = [
  { id: 1, name: 'Arsenal' },
  { id: 2, name: 'Aston Villa' },
  { id: 4, name: 'Bournemouth' },
  { id: 5, name: 'Brentford' },
  { id: 6, name: 'Brighton' },
  { id: 7, name: 'Chelsea' },
  { id: 8, name: 'Crystal Palace' },
  { id: 9, name: 'Everton' },
  { id: 10, name: 'Fulham' },
  { id: 11, name: 'Ipswich' },
  { id: 12, name: 'Leicester' },
  { id: 13, name: 'Liverpool' },
  { id: 14, name: 'Man City' },
  { id: 15, name: 'Man Utd' },
  { id: 16, name: 'Newcastle' },
  { id: 17, name: 'Nott\'m Forest' },
  { id: 18, name: 'Southampton' },
  { id: 19, name: 'Spurs' },
  { id: 20, name: 'West Ham' },
  { id: 21, name: 'Wolves' },
];

export default function TeamSelector({ selectedTeamId, onChange }: TeamSelectorProps) {
  return (
    <div className={styles.selectorContainer}>
      <label htmlFor="team-select" className={styles.selectorLabel}>
        Select Team:
      </label>
      <select
        id="team-select"
        className={styles.teamSelect}
        value={selectedTeamId}
        onChange={(e) => onChange(parseInt(e.target.value))}
      >
        {TEAMS.map(team => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
