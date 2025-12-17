'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Repeat, User, LogOut } from 'lucide-react';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Fetch last synced time on mount
  useEffect(() => {
    if (!state) return;

    const leagueId = state.leagueId; // Capture in closure

    async function fetchSyncStatus() {
      try {
        const res = await fetch(`/api/league/${leagueId}/sync`);
        const data = await res.json();
        if (data.lastSynced) {
          setLastSynced(new Date(data.lastSynced).toLocaleString());
        }
      } catch (error) {
        console.error('Failed to fetch sync status:', error);
      }
    }

    fetchSyncStatus();
  }, [state]);

  const handleRefreshData = async () => {
    if (!state || isSyncing) return;

    const confirmed = confirm(
      'This will re-sync all league data from FPL. This may take 30-60 seconds. Continue?'
    );

    if (!confirmed) return;

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      // Trigger sync with force=true to clear and re-sync
      const response = await fetch(`/api/league/${state.leagueId}/sync?force=true`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }

      const result = await response.json();
      console.log('[Settings] Sync started:', result);

      // Poll for completion
      let pollCount = 0;
      const maxPolls = 30; // 30 polls * 3s = 90 seconds max

      const pollInterval = setInterval(async () => {
        pollCount++;

        try {
          const statusRes = await fetch(`/api/league/${state.leagueId}/sync`);
          const statusData = await statusRes.json();

          console.log(`[Settings] Poll ${pollCount}: status=${statusData.status}`);

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            setSyncStatus('success');
            setLastSynced(new Date().toLocaleString());

            // Reload page to show fresh data
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            setSyncStatus('error');
            setIsSyncing(false);
          }

          // Timeout
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setSyncStatus('error');
            setIsSyncing(false);
            console.error('[Settings] Sync timeout');
          }
        } catch (error) {
          console.error('[Settings] Poll error:', error);
        }
      }, 3000); // Poll every 3 seconds

    } catch (error) {
      console.error('[Settings] Sync error:', error);
      setSyncStatus('error');
      setIsSyncing(false);
    }
  };

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
        <h3 className={styles.sectionTitle}>League Data</h3>
        {lastSynced && (
          <p className={styles.lastSynced}>
            Last synced: {lastSynced}
          </p>
        )}
        <button
          onClick={handleRefreshData}
          disabled={isSyncing}
          className={styles.actionButton}
        >
          <RefreshCw
            size={20}
            color="#00ff87"
            className={`${styles.buttonIcon} ${isSyncing ? styles.spinning : ''}`}
          />
          <span className={styles.buttonText}>
            {isSyncing ? 'Syncing...' : 'Refresh League Data'}
          </span>
        </button>
        {syncStatus === 'success' && (
          <p className={styles.successMessage}>
            Sync complete! Reloading...
          </p>
        )}
        {syncStatus === 'error' && (
          <p className={styles.errorMessage}>
            Sync failed. Please try again.
          </p>
        )}
        <p className={styles.hint}>
          Re-syncs all historical data for this league. Use if something looks wrong or data is missing.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Actions</h3>

        <button
          onClick={handleChangeLeague}
          className={styles.actionButton}
        >
          <Repeat
            size={20}
            color="#00ff87"
            className={styles.buttonIcon}
          />
          <span className={styles.buttonText}>Change League</span>
        </button>

        <button
          onClick={handleChangeTeam}
          className={styles.actionButton}
        >
          <User
            size={20}
            color="#00ff87"
            className={styles.buttonIcon}
          />
          <span className={styles.buttonText}>Change Team</span>
        </button>

        <button
          onClick={handleLogout}
          className={`${styles.actionButton} ${styles.danger}`}
        >
          <LogOut
            size={20}
            color="#ff0066"
            className={styles.buttonIcon}
          />
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
