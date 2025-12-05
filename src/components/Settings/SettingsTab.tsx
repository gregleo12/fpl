'use client';

import { useRouter } from 'next/navigation';
import { loadState, clearState } from '@/lib/storage';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import MyLeagues from './MyLeagues';
import styles from './SettingsTab.module.css';

interface SettingsTabProps {
  leagueName: string;
  myTeamName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function SettingsTab({ leagueName, myTeamName, onRefresh, isRefreshing }: SettingsTabProps) {
  const router = useRouter();
  const state = loadState();
  const { currentVersion } = useVersionCheck();

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out? You will need to enter your league and team IDs again.')) {
      clearState();
      router.push('/');
    }
  };

  function handleChangeLeague() {
    if (confirm('Change league? This will return you to the setup page.')) {
      clearState();
      router.push('/');
    }
  }

  function handleChangeTeam() {
    if (!state) return;

    if (confirm('Change your team in this league?')) {
      fetch(`/api/league/${state.leagueId}/stats`)
        .then(res => res.json())
        .then(data => {
          sessionStorage.setItem('temp_league', JSON.stringify({
            leagueId: state.leagueId,
            leagueName: state.leagueName,
            standings: data.standings
          }));

          clearState();
          router.push('/setup/team');
        })
        .catch(err => {
          alert('Failed to load league data. Please try again.');
        });
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings</h2>

      <div className={styles.section}>
        <MyLeagues />
      </div>

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
          <div className={styles.infoRow}>
            <span className={styles.label}>App Version:</span>
            <span className={styles.value}>v{currentVersion}</span>
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
          onClick={handleChangeLeague}
          className={styles.actionButton}
        >
          <span className={styles.buttonIcon}>🔄</span>
          <span className={styles.buttonText}>Change League</span>
        </button>

        <button
          onClick={handleChangeTeam}
          className={styles.actionButton}
        >
          <span className={styles.buttonIcon}>👤</span>
          <span className={styles.buttonText}>Change Team</span>
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

      <div className={styles.footer}>
        <h4 className={styles.footerTitle}>Contact</h4>
        <p className={styles.footerText}>Found a bug? Have feedback?</p>
        <div className={styles.footerLinks}>
          <a
            href="https://reddit.com/u/gregleo"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            Reddit: u/gregleo
          </a>
          <a
            href="https://x.com/greglienart"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            X: @greglienart
          </a>
        </div>
      </div>
    </div>
  );
}
