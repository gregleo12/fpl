'use client';

import styles from './MedalTally.module.css';

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

interface MedalTallyProps {
  medalTally: MedalEntry[];
  shameTally: MedalEntry[];
  myTeamId: string;
}

function TallyTable({
  entries,
  title,
  subtitle,
  variant = 'medals',
  myTeamId
}: {
  entries: MedalEntry[];
  title: string;
  subtitle: string;
  variant?: 'medals' | 'shame';
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

export default function MedalTally({ medalTally, shameTally, myTeamId }: MedalTallyProps) {
  return (
    <div className={styles.wrapper}>
      <TallyTable
        entries={medalTally}
        title="🏆 Medal Tally"
        subtitle="Podium finishes in achievement awards"
        variant="medals"
        myTeamId={myTeamId}
      />
      <TallyTable
        entries={shameTally}
        title="💀 Wall of Shame"
        subtitle="Podium finishes in dubious honor awards"
        variant="shame"
        myTeamId={myTeamId}
      />
    </div>
  );
}
