'use client';

import styles from './WalkTables.module.css';

interface MedalEntry {
  rank: number;
  entry_id: number;
  player_name: string;
  team_name: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  score: number;
}

interface WalkTablesProps {
  fame: MedalEntry[];
  shame: MedalEntry[];
  myTeamId: string;
}

function TallyTable({
  entries,
  title,
  subtitle,
  variant = 'fame',
  myTeamId
}: {
  entries: MedalEntry[];
  title: string;
  subtitle: string;
  variant?: 'fame' | 'shame';
  myTeamId: string;
}) {
  return (
    <div className={`${styles.container} ${styles[variant]}`}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thRank}>#</th>
              <th className={styles.thManager}>Manager</th>
              <th className={styles.thNumber}>Score</th>
              <th className={styles.thNumber}>Total</th>
              <th className={styles.thNumber}>🥇</th>
              <th className={styles.thNumber}>🥈</th>
              <th className={styles.thNumber}>🥉</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isMyTeam = entry.entry_id.toString() === myTeamId;
              return (
                <tr
                  key={entry.entry_id}
                  className={`${entry.rank <= 3 ? styles.topThree : ''} ${isMyTeam ? styles.myTeam : ''}`}
                >
                  <td className={styles.rank}>{entry.rank}</td>
                  <td className={styles.manager}>
                    <span className={styles.name}>
                      {entry.player_name}
                      {isMyTeam && <span className={styles.youBadge}>You!</span>}
                    </span>
                    <span className={styles.team}>{entry.team_name}</span>
                  </td>
                  <td className={styles.score}>{entry.score}</td>
                  <td className={styles.total}>{entry.total}</td>
                  <td className={styles.gold}>{entry.gold || '-'}</td>
                  <td className={styles.silver}>{entry.silver || '-'}</td>
                  <td className={styles.bronze}>{entry.bronze || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function WalkTables({ fame, shame, myTeamId }: WalkTablesProps) {
  return (
    <div className={styles.wrapper}>
      <TallyTable
        entries={fame}
        title="🏆 Walk of Fame"
        subtitle="Podium finishes in achievement awards"
        variant="fame"
        myTeamId={myTeamId}
      />
      <TallyTable
        entries={shame}
        title="💀 Walk of Shame"
        subtitle="Podium finishes in dubious honor awards"
        variant="shame"
        myTeamId={myTeamId}
      />
    </div>
  );
}
