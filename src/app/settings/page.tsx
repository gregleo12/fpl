'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadState, clearState, getRecentLeagues, clearRecentLeagues } from '@/lib/storage';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { InstallButton } from '@/components/InstallButton/InstallButton';
import styles from './settings.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const [state, setState] = useState(loadState());
  const [recentLeagues, setRecentLeagues] = useState(getRecentLeagues());
  const { updateAvailable, newVersion, currentVersion, applyUpdate } = useVersionCheck();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      router.push('/');
    }
  }, [state, router]);

  function handleChangeLeague() {
    if (confirm('Are you sure? This will clear your saved data and return to setup.')) {
      clearState();
      router.push('/');
    }
  }

  function handleChangeTeam() {
    if (!state) return;

    if (confirm('Select a different team in this league?')) {
      // Fetch league data again for team selection
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
      // Force a version check
      window.location.reload();
    } catch (error) {
      console.error('Update check failed:', error);
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  async function handleRefreshData() {
    if (!state) return;

    if (!confirm('Refresh all league data from FPL? This will take 30-60 seconds.')) {
      return;
    }

    setIsRefreshingData(true);
    setSyncStatus('Starting sync...');

    try {
      const response = await fetch(`/api/league/${state.leagueId}/sync`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setSyncStatus(data.message);

        // Poll for completion
        const checkInterval = setInterval(async () => {
          const statusResponse = await fetch(`/api/league/${state.leagueId}/sync`);
          const statusData = await statusResponse.json();

          if (statusData.status === 'completed') {
            clearInterval(checkInterval);
            setSyncStatus('Sync completed! Refreshing page...');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else if (statusData.status === 'failed') {
            clearInterval(checkInterval);
            setSyncStatus('Sync failed. Please try again.');
            setIsRefreshingData(false);
          } else {
            setSyncStatus(`Syncing... (${statusData.status})`);
          }
        }, 3000);

        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          if (isRefreshingData) {
            setSyncStatus('Sync taking longer than expected. Check back later.');
            setIsRefreshingData(false);
          }
        }, 120000);

      } else {
        setSyncStatus(data.error || 'Failed to start sync');
        setIsRefreshingData(false);
      }

    } catch (error) {
      console.error('Refresh failed:', error);
      setSyncStatus('Failed to refresh data. Please try again.');
      setIsRefreshingData(false);
    }
  }

  if (!state) {
    return null;
  }

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <button onClick={() => router.push('/dashboard')} className={styles.backButton}>
          ← Back to Dashboard
        </button>

        <h1 className={styles.title}>Settings</h1>

        <section className={styles.section}>
          <h2>League</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>Name</div>
            <div className={styles.infoValue}>{state.leagueName}</div>
            <div className={styles.infoLabel}>ID</div>
            <div className={styles.infoValue}>#{state.leagueId}</div>
          </div>
          <button onClick={handleChangeLeague} className={styles.actionButton}>
            Change League
          </button>
        </section>

        <section className={styles.section}>
          <h2>Your Team</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>Manager</div>
            <div className={styles.infoValue}>{state.myManagerName}</div>
            <div className={styles.infoLabel}>Team</div>
            <div className={styles.infoValue}>{state.myTeamName}</div>
          </div>
          <button onClick={handleChangeTeam} className={styles.actionButton}>
            Change My Team
          </button>
        </section>

        <section className={styles.section}>
          <h2>Data</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>Last Updated</div>
            <div className={styles.infoValue}>
              {new Date(state.lastFetched).toLocaleString()}
            </div>
            {syncStatus && (
              <>
                <div className={styles.infoLabel}>Sync Status</div>
                <div className={styles.infoValue}>{syncStatus}</div>
              </>
            )}
          </div>
          <button
            onClick={handleRefreshData}
            className={styles.actionButton}
            disabled={isRefreshingData}
          >
            {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </section>

        {recentLeagues.length > 0 && (
          <section className={styles.section}>
            <h2>Recent Leagues</h2>
            <div className={styles.recentList}>
              {recentLeagues.map((league) => (
                <div key={league.leagueId} className={styles.recentItem}>
                  <div>
                    <div className={styles.recentName}>{league.leagueName}</div>
                    <div className={styles.recentId}>#{league.leagueId}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleClearRecent} className={styles.secondaryButton}>
              Clear History
            </button>
          </section>
        )}

        <section className={styles.section}>
          <h2>App Updates</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>Current Version</div>
            <div className={styles.infoValue}>v{currentVersion}</div>
            {updateAvailable && (
              <>
                <div className={styles.infoLabel}>New Version Available</div>
                <div className={`${styles.infoValue} ${styles.updateAvailable}`}>
                  v{newVersion} 🎉
                </div>
              </>
            )}
          </div>
          {updateAvailable ? (
            <button onClick={applyUpdate} className={styles.updateButton}>
              Update to v{newVersion} Now
            </button>
          ) : (
            <button
              onClick={handleCheckUpdates}
              className={styles.secondaryButton}
              disabled={isCheckingUpdate}
            >
              {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
            </button>
          )}
        </section>

        <section className={styles.section}>
          <h2>App Installation</h2>
          <p className={styles.aboutText}>
            Install FPL H2H on your device for quick access, offline support, and a native app experience.
          </p>
          <InstallButton />
        </section>

        <section className={styles.section}>
          <h2>About</h2>
          <p className={styles.aboutText}>
            FPL H2H Analytics helps you track your Fantasy Premier League
            Head-to-Head league performance. Data is stored locally on your device.
          </p>
        </section>

        <button onClick={handleChangeLeague} className={styles.dangerButton}>
          Clear All Data & Reset
        </button>
      </div>
    </main>
  );
}
