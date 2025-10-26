'use client';

import { useRouter } from 'next/navigation';
import { clearState } from '@/lib/storage';
import styles from './SettingsTab.module.css';

interface SettingsTabProps {
  leagueName: string;
  myTeamName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function SettingsTab({ leagueName, myTeamName, onRefresh, isRefreshing }: SettingsTabProps) {
  const router = useRouter();

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out? You will need to enter your league and team IDs again.')) {
      clearState();
      router.push('/');
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings</h2>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Current Setup</h3>
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.label}>League:</span>
            <span className={styles.value}>{leagueName}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Team:</span>
            <span className={styles.value}>{myTeamName}</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Actions</h3>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={styles.actionButton}
        >
          <span className={styles.buttonIcon}>{isRefreshing ? '⟳' : '↻'}</span>
          <span className={styles.buttonText}>
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </span>
        </button>

        <button
          onClick={handleLogout}
          className={`${styles.actionButton} ${styles.danger}`}
        >
          <span className={styles.buttonIcon}>🚪</span>
          <span className={styles.buttonText}>Log Out</span>
        </button>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>About</h3>
        <p className={styles.about}>
          FPL H2H Analytics - Track your Fantasy Premier League Head-to-Head league performance,
          fixtures, awards, and detailed statistics.
        </p>
      </div>
    </div>
  );
}
