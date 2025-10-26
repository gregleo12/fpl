'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadState, clearState, getRecentLeagues, clearRecentLeagues } from '@/lib/storage';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { InstallButton } from '@/components/InstallButton/InstallButton';
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
  const [recentLeagues, setRecentLeagues] = useState(getRecentLeagues());
  const { updateAvailable, newVersion, currentVersion, applyUpdate } = useVersionCheck();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  function handleChangeLeague() {
    if (confirm('Are you sure? This will clear your saved data and return to setup.')) {
      clearState();
      router.push('/');
    }
  }

  function handleChangeTeam() {
    if (!state) return;

    if (confirm('Select a different team in this league?')) {
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

  function handleClearRecent() {
    if (confirm('Clear recent leagues history?')) {
      clearRecentLeagues();
      setRecentLeagues([]);
    }
  }

  async function handleCheckUpdates() {
    setIsCheckingUpdate(true);
    try {
      window.location.reload();
    } catch (error) {
      console.error('Update check failed:', error);
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  if (!state) return null;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings</h2>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>League</h3>
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Name:</span>
            <span className={styles.value}>{state.leagueName}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>ID:</span>
            <span className={styles.value}>#{state.leagueId}</span>
          </div>
        </div>
        <button onClick={handleChangeLeague} className={styles.actionButton}>
          <span className={styles.buttonIcon}>🔄</span>
          <span className={styles.buttonText}>Change League</span>
        </button>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Your Team</h3>
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Manager:</span>
            <span className={styles.value}>{state.myManagerName}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Team:</span>
            <span className={styles.value}>{state.myTeamName}</span>
          </div>
        </div>
        <button onClick={handleChangeTeam} className={styles.actionButton}>
          <span className={styles.buttonIcon}>👤</span>
          <span className={styles.buttonText}>Change My Team</span>
        </button>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Data</h3>
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Last Updated:</span>
            <span className={styles.value}>
              {new Date(state.lastFetched).toLocaleString()}
            </span>
          </div>
        </div>
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
      </div>

      {recentLeagues.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Recent Leagues</h3>
          <div className={styles.recentList}>
            {recentLeagues.map((league) => (
              <div key={league.leagueId} className={styles.recentItem}>
                <div className={styles.recentName}>{league.leagueName}</div>
                <div className={styles.recentId}>#{league.leagueId}</div>
              </div>
            ))}
          </div>
          <button onClick={handleClearRecent} className={styles.secondaryButton}>
            <span className={styles.buttonIcon}>🗑️</span>
            <span className={styles.buttonText}>Clear History</span>
          </button>
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>App Updates</h3>
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Current Version:</span>
            <span className={styles.value}>v{currentVersion}</span>
          </div>
          {updateAvailable && (
            <div className={styles.infoRow}>
              <span className={styles.label}>New Version:</span>
              <span className={`${styles.value} ${styles.updateAvailable}`}>
                v{newVersion} 🎉
              </span>
            </div>
          )}
        </div>
        {updateAvailable ? (
          <button onClick={applyUpdate} className={styles.updateButton}>
            <span className={styles.buttonIcon}>⬆️</span>
            <span className={styles.buttonText}>Update to v{newVersion} Now</span>
          </button>
        ) : (
          <button
            onClick={handleCheckUpdates}
            className={styles.secondaryButton}
            disabled={isCheckingUpdate}
          >
            <span className={styles.buttonIcon}>🔍</span>
            <span className={styles.buttonText}>
              {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
            </span>
          </button>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>App Installation</h3>
        <p className={styles.about}>
          Install FPL H2H on your device for quick access, offline support, and a native app experience.
        </p>
        <InstallButton />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>About</h3>
        <p className={styles.about}>
          FPL H2H Analytics helps you track your Fantasy Premier League Head-to-Head league performance.
          Data is stored locally on your device.
        </p>
      </div>

      <button onClick={handleChangeLeague} className={`${styles.actionButton} ${styles.danger}`}>
        <span className={styles.buttonIcon}>🗑️</span>
        <span className={styles.buttonText}>Clear All Data & Reset</span>
      </button>
    </div>
  );
}
