'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadState, clearState, getRecentLeagues, clearRecentLeagues } from '@/lib/storage';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import styles from './settings.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const [state, setState] = useState(loadState());
  const [recentLeagues, setRecentLeagues] = useState(getRecentLeagues());
  const { updateAvailable, newVersion, currentVersion, applyUpdate } = useVersionCheck();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

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
          </div>
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
