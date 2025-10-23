'use client';

import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

interface HeaderProps {
  leagueName: string;
  myTeamName: string;
  leagueId?: string;
  myTeamId?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Header({ leagueName, myTeamName, leagueId, myTeamId, onRefresh, isRefreshing }: HeaderProps) {
  const router = useRouter();

  const handleTeamNameClick = () => {
    if (leagueId && myTeamId) {
      router.push(`/league/${leagueId}/player/${myTeamId}`);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.left}>
          <h1 className={styles.title}>FPL H2H</h1>
          <div className={styles.info}>
            <span className={styles.leagueName}>{leagueName}</span>
            <span className={styles.divider}>|</span>
            {leagueId && myTeamId ? (
              <button onClick={handleTeamNameClick} className={styles.teamNameButton}>
                {myTeamName}
              </button>
            ) : (
              <span className={styles.teamName}>{myTeamName}</span>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={styles.refreshButton}
            title="Refresh data"
          >
            {isRefreshing ? '⟳' : '↻'}
          </button>
          <button
            onClick={() => router.push('/settings')}
            className={styles.settingsButton}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>
    </header>
  );
}
