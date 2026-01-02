import styles from './Ownership.module.css';

interface TeamSelectorProps {
  selectedTeamId: number | null;
  onChange: (teamId: number | null) => void;
}

// Team IDs from database - all 20 current PL teams (2025/26 season)
const TEAMS = [
  { id: 1, name: 'Arsenal' },
  { id: 2, name: 'Aston Villa' },
  { id: 3, name: 'Burnley' },
  { id: 4, name: 'Bournemouth' },
  { id: 5, name: 'Brentford' },
  { id: 6, name: 'Brighton' },
  { id: 7, name: 'Chelsea' },
  { id: 8, name: 'Crystal Palace' },
  { id: 9, name: 'Everton' },
  { id: 10, name: 'Fulham' },
  { id: 11, name: 'Leeds' },
  { id: 12, name: 'Liverpool' },
  { id: 13, name: 'Man City' },
  { id: 14, name: 'Man Utd' },
  { id: 15, name: 'Newcastle' },
  { id: 16, name: 'Nott\'m Forest' },
  { id: 17, name: 'Sunderland' },
  { id: 18, name: 'Spurs' },
  { id: 19, name: 'West Ham' },
  { id: 20, name: 'Wolves' },
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
        value={selectedTeamId ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
      >
        <option value="">Select Team</option>
        {TEAMS.map(team => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
