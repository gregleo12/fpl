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
    <header className={styles.headerWrapper}>
      <div className={styles.floatingHeader}>
        <div className={styles.branding}>
          <h1 className={styles.appName}>FPL H2H</h1>
          <p className={styles.leagueInfo}>
            {leagueName} | {leagueId && myTeamId ? (
              <button onClick={handleTeamNameClick} className={styles.teamNameButton}>
                {myTeamName}
              </button>
            ) : (
              <span className={styles.teamName}>{myTeamName}</span>
            )}
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={styles.iconButton}
            aria-label="Refresh data"
            title="Refresh data"
          >
            {isRefreshing ? '⟳' : '↻'}
          </button>
          <button
            onClick={() => router.push('/settings')}
            className={styles.iconButton}
            aria-label="Settings"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>
    </header>
  );
}
