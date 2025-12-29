'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRecentLeagues } from '@/lib/storage';
import { SyncProgress } from '@/components/SyncProgress/SyncProgress';
import { FPLError } from '@/lib/fpl-errors';
import styles from './SetupFlow.module.css';

export default function LeagueInput() {
  const [leagueId, setLeagueId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FPLError | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [syncPercent, setSyncPercent] = useState(0);
  const [syncMessage, setSyncMessage] = useState('Starting sync...');
  const [showQuickAccess, setShowQuickAccess] = useState(() => {
    // Remember user's preference in localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('show_quick_access') === 'true';
    }
    return false;
  });
  const router = useRouter();
  const recentLeagues = getRecentLeagues();

  // Persist Quick Access toggle state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('show_quick_access', showQuickAccess.toString());
    }
  }, [showQuickAccess]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!leagueId.trim()) {
      setError({
        type: 'unknown',
        message: 'Please enter a league ID',
        icon: '❌',
        retryable: false
      });
      return;
    }

    await fetchAndNavigate(leagueId);
  }

  async function pollSyncStatus(leagueId: string): Promise<void> {
    let pollCount = 0;
    const maxPolls = 40; // 40 polls * 3s = 2 minutes max

    return new Promise((resolve) => {
      const pollInterval = setInterval(async () => {
        pollCount++;

        try {
          const statusRes = await fetch(`/api/league/${leagueId}/sync`);
          const statusData = await statusRes.json();


          // Update progress based on status
          if (statusData.status === 'syncing') {
            // Gradually increase progress while syncing
            const baseProgress = 20;
            const progressIncrement = Math.min(70, pollCount * 5);
            setSyncPercent(baseProgress + progressIncrement);
            setSyncMessage('Syncing league data...');
          } else if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            setSyncPercent(100);
            setSyncMessage('Sync complete!');
            setTimeout(() => {
              setShowSyncProgress(false);
              resolve();
            }, 1000);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            setShowSyncProgress(false);
            // Use error object from status response if available
            if (statusData.error) {
              setError(statusData.error);
            } else {
              setError({
                type: 'unknown',
                message: 'Sync failed. Data may be incomplete.',
                icon: '❌',
                retryable: true
              });
            }
            resolve();
          } else if (statusData.status === 'pending') {
            // Still waiting to start
            setSyncPercent(5);
            setSyncMessage('Waiting to start...');
          }

          // Timeout after max polls
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setShowSyncProgress(false);
            resolve();
          }
        } catch (error) {
          console.error('[Sync Poll] Error:', error);
        }
      }, 3000); // Poll every 3 seconds
    });
  }

  async function fetchAndNavigate(id: string) {
    setIsLoading(true);
    setError(null);
    setLoadingMessage('');

    // For large leagues, show helpful message after 3 seconds
    const timeoutId = setTimeout(() => {
      setLoadingMessage('⏳ Large leagues take longer to load... please wait');
    }, 3000);

    try {
      // Fetch league data from API
      const response = await fetch(`/api/league/${id}`);

      if (!response.ok) {
        // Try to parse error as JSON for specific error types
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            error: {
              type: 'unknown',
              message: 'Unable to load league. Please try again.',
              icon: '❌',
              retryable: true
            }
          };
        }

        console.error('League fetch failed:', errorData);

        // If API returned an FPLError object, use it directly
        if (errorData.error && typeof errorData.error === 'object' && errorData.error.type) {
          setError(errorData.error);
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        // Legacy string error handling (for backwards compatibility)
        let errorObj: FPLError;
        if (errorData.error === 'classic_league') {
          errorObj = {
            type: 'classic_league',
            message: 'This is a Classic league. Only H2H leagues are supported.',
            icon: '⚠️',
            retryable: false
          };
        } else if (errorData.error === 'no_standings') {
          errorObj = {
            type: 'unknown',
            message: 'This league has no H2H matches yet. Please try again after GW1.',
            icon: '⚠️',
            retryable: false
          };
        } else {
          errorObj = {
            type: 'unknown',
            message: errorData.message || 'Unable to load league. Please try again.',
            icon: '❌',
            retryable: true
          };
        }

        setError(errorObj);
        setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      const leagueData = await response.json();

      // Check if sync was triggered for first-time league load
      if (leagueData.syncTriggered) {
        clearTimeout(timeoutId);
        setIsLoading(false);
        setShowSyncProgress(true);
        setSyncPercent(10);
        setSyncMessage('Initializing league data sync...');

        // Poll sync status
        await pollSyncStatus(id);
      }

      const statsResponse = await fetch(`/api/league/${id}/stats`);

      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        console.error('Stats fetch failed:', errorText);
        throw new Error(`Stats fetch failed: ${statsResponse.status}`);
      }

      const data = await statsResponse.json();

      // Store league data temporarily
      sessionStorage.setItem('temp_league', JSON.stringify({
        leagueId: id,
        leagueName: data.league?.name || `League ${id}`,
        standings: data.standings
      }));

      // Navigate to team selection
      clearTimeout(timeoutId);
      router.push(`/setup/team`);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('League fetch error:', err);

      // Build error object
      let errorObj: FPLError;

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorObj = {
          type: 'timeout',
          message: 'Request timed out. FPL may be slow - try again.',
          icon: '⏰',
          retryable: true
        };
      } else if (err.response?.status === 500) {
        errorObj = {
          type: 'unknown',
          message: 'Server error. Please try again in a moment.',
          icon: '❌',
          retryable: true
        };
      } else if (err.message?.includes('Network Error') || err.message?.includes('fetch')) {
        errorObj = {
          type: 'network_error',
          message: 'Network error. Please check your connection.',
          icon: '🌐',
          retryable: true
        };
      } else {
        errorObj = {
          type: 'unknown',
          message: err.message || 'Could not load league. Please try again.',
          icon: '❌',
          retryable: true
        };
      }

      setError(errorObj);
      setLoadingMessage('');
      setIsLoading(false);
    }
  }

  function handleQuickSelect() {
    setLeagueId('804742');
    fetchAndNavigate('804742');
  }

  function handleRecentClick(id: string) {
    setLeagueId(id);
    fetchAndNavigate(id);
  }

  return (
    <div className={styles.setupCard}>
      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label htmlFor="leagueId">Enter League ID</label>
          <input
            id="leagueId"
            type="text"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            placeholder="e.g., 804742"
            disabled={isLoading}
            autoFocus
          />
        </div>

        {error && (
          <div className={styles.errorBox}>
            <p className={styles.error}>
              <span className={styles.errorIcon}>{error.icon}</span>
              {error.message}
            </p>
            {error.retryable && (
              <button
                type="button"
                onClick={() => fetchAndNavigate(leagueId)}
                className={styles.retryButton}
                disabled={isLoading}
              >
                Try Again
              </button>
            )}
          </div>
        )}
        {loadingMessage && <p className={styles.loadingMessage}>{loadingMessage}</p>}

        <button type="submit" disabled={isLoading} className={styles.submitButton}>
          {isLoading ? 'Fetching...' : 'Continue'}
        </button>
      </form>

      {/* Recent Leagues - Moved above Quick Access */}
      {recentLeagues.length > 0 && (
        <div className={styles.recentSection}>
          <h3>Recent Leagues</h3>
          <div className={styles.recentList}>
            {recentLeagues.map((league) => (
              <button
                key={league.leagueId}
                onClick={() => handleRecentClick(league.leagueId)}
                className={styles.recentItem}
                disabled={isLoading}
              >
                <span className={styles.recentName}>{league.leagueName}</span>
                <span className={styles.recentId}>#{league.leagueId}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Quick Access Section */}
      <div className={styles.quickAccessSection}>
        <button
          type="button"
          onClick={() => setShowQuickAccess(!showQuickAccess)}
          className={styles.toggleButton}
          aria-expanded={showQuickAccess}
        >
          <span className={styles.toggleIcon}>{showQuickAccess ? '▼' : '►'}</span>
          Quick Access
        </button>

        {showQuickAccess && (
          <div className={styles.quickAccessContent}>
            <button
              type="button"
              onClick={handleQuickSelect}
              disabled={isLoading}
              className={styles.quickSelectButton}
            >
              Dedoume FPL 9th Edition
            </button>
          </div>
        )}
      </div>

      {/* Sync Progress Modal */}
      {showSyncProgress && (
        <SyncProgress percent={syncPercent} message={syncMessage} />
      )}
    </div>
  );
}
