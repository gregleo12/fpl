'use client';

import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

interface HeaderProps {
  leagueName: string;
  myTeamName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Header({ leagueName, myTeamName, onRefresh, isRefreshing }: HeaderProps) {
  const router = useRouter();

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.left}>
          <h1 className={styles.title}>FPL H2H</h1>
          <div className={styles.info}>
            <span className={styles.leagueName}>{leagueName}</span>
            <span className={styles.divider}>|</span>
            <span className={styles.teamName}>{myTeamName}</span>
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
