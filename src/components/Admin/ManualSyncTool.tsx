'use client';

import { useState, useEffect } from 'react';
import styles from './ManualSyncTool.module.css';

interface League {
  id: number;
  name: string;
  managerCount: number;
}

interface SyncStatus {
  leagues: League[];
  currentGW: number;
  finishedGWs: number[];
  gwStatus: Record<string, Record<string, string>>;
}

export function ManualSyncTool() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<number | 'all'>('all');
  const [selectedGWs, setSelectedGWs] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnlyInvalid, setShowOnlyInvalid] = useState(false); // K-155: Filter for invalid leagues

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/sync/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
    setLoading(false);
  };

  const getGWStatus = (gw: number): string => {
    if (!status) return 'unknown';

    if (selectedLeague === 'all') {
      // Check all leagues - if any is invalid, mark as invalid
      for (const leagueId of Object.keys(status.gwStatus)) {
        const leagueStatus = status.gwStatus[leagueId]?.[gw];
        if (leagueStatus === 'invalid' || leagueStatus === 'missing') {
          return 'invalid';
        }
      }
      return status.gwStatus[Object.keys(status.gwStatus)[0]]?.[gw] || 'unknown';
    }

    return status.gwStatus[selectedLeague]?.[gw] || 'unknown';
  };

  // K-155: Filter leagues based on showOnlyInvalid flag
  const getFilteredLeagues = (): League[] => {
    if (!status || !showOnlyInvalid) return status?.leagues || [];

    // Filter to leagues that have at least one invalid/missing GW
    return status.leagues.filter(league => {
      // Check all finished GWs for this league
      return status.finishedGWs.some(gw => {
        const gwStatus = status.gwStatus[league.id]?.[gw];
        return gwStatus === 'invalid' || gwStatus === 'missing';
      });
    });
  };

  const filteredLeagues = getFilteredLeagues();

  const toggleGW = (gw: number) => {
    setSelectedGWs(prev =>
      prev.includes(gw)
        ? prev.filter(g => g !== gw)
        : [...prev, gw]
    );
  };

  const selectAllInvalid = () => {
    if (!status) return;

    const invalidGWs = status.finishedGWs.filter(gw => {
      const gwStatus = getGWStatus(gw);
      return gwStatus === 'invalid' || gwStatus === 'missing';
    });

    setSelectedGWs(invalidGWs);
  };

  const selectAll = () => {
    if (!status) return;
    setSelectedGWs([...status.finishedGWs]);
  };

  const clearSelection = () => {
    setSelectedGWs([]);
  };

  const runSync = async () => {
    if (selectedGWs.length === 0) return;

    // K-156: Calculate total tasks
    const leagueCount = selectedLeague === 'all' ? filteredLeagues.length : 1;
    const totalTasks = leagueCount * selectedGWs.length;

    // K-156: Warn about large batches
    if (totalTasks > 20) {
      const proceed = window.confirm(
        `This will sync ${totalTasks} league-gameweek combinations.\n\n` +
        `Large batches may take 5-15 minutes to complete.\n\n` +
        `Recommendation: Sync in smaller batches (≤20 at a time) for better reliability.\n\n` +
        `Continue with full batch?`
      );
      if (!proceed) return;
    }

    setSyncing(true);
    setResults(null);

    // K-156: Create AbortController with 11-minute timeout (slightly longer than backend's 10min)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 11 * 60 * 1000); // 11 minutes

    try {
      console.log(`[K-156] Starting sync: ${leagueCount} league(s) × ${selectedGWs.length} GW(s) = ${totalTasks} tasks`);

      const response = await fetch('/api/admin/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueIds: selectedLeague === 'all' ? 'all' : [selectedLeague],
          gameweeks: selectedGWs.sort((a, b) => a - b),
          force: true
        }),
        signal: controller.signal // K-156: Add abort signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[K-156] Sync complete:', data.summary);
      setResults(data);

      // Refresh status after sync
      await fetchStatus();

    } catch (error: any) {
      clearTimeout(timeoutId);

      console.error('[K-156] Sync failed:', error);

      // K-156: Better error messages
      let errorMessage = 'Sync failed';
      if (error.name === 'AbortError') {
        errorMessage = 'Sync timed out after 11 minutes. The sync may still be processing on the server. Please refresh and check the validation grid.';
      } else if (error.message) {
        errorMessage = `Sync failed: ${error.message}`;
      }

      setResults({ error: errorMessage });
    }

    setSyncing(false);
  };

  if (loading) {
    return <div className={styles.loading}>Loading sync status...</div>;
  }

  if (!status) {
    return <div className={styles.error}>Failed to load sync status</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Manual Sync Tool</h2>

      {/* League Selector */}
      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label className={styles.label}>League:</label>
          {/* K-155: Filter checkbox */}
          <label style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={showOnlyInvalid}
              onChange={(e) => {
                setShowOnlyInvalid(e.target.checked);
                // Reset to "all" when toggling filter
                setSelectedLeague('all');
              }}
              style={{ cursor: 'pointer' }}
            />
            Show Only Invalid/Missing
          </label>
        </div>
        <select
          className={styles.select}
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
        >
          <option value="all">
            {showOnlyInvalid
              ? `Invalid Leagues (${filteredLeagues.length})`
              : `All Leagues (${status.leagues.length})`
            }
          </option>
          {filteredLeagues.map(league => (
            <option key={league.id} value={league.id}>
              {league.id} - {league.name} ({league.managerCount} managers)
            </option>
          ))}
        </select>
      </div>

      {/* GW Grid */}
      <div className={styles.section}>
        <label className={styles.label}>Gameweeks:</label>
        <div className={styles.gwGrid}>
          {Array.from({ length: status.currentGW }, (_, i) => i + 1).map(gw => {
            const gwStatus = getGWStatus(gw);
            const isFinished = status.finishedGWs.includes(gw);
            const isSelected = selectedGWs.includes(gw);

            return (
              <button
                key={gw}
                className={`${styles.gwButton} ${styles[gwStatus]} ${isSelected ? styles.selected : ''}`}
                onClick={() => isFinished && toggleGW(gw)}
                disabled={!isFinished}
              >
                <span className={styles.gwNumber}>GW{gw}</span>
                <span className={styles.gwIndicator}>
                  {gwStatus === 'valid' && '✓'}
                  {gwStatus === 'invalid' && '⚠'}
                  {gwStatus === 'missing' && '○'}
                  {gwStatus === 'not_finished' && '○'}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.legend}>
          <span><span className={styles.validIndicator}>✓</span> Valid</span>
          <span><span className={styles.invalidIndicator}>⚠</span> Invalid/Zero</span>
          <span><span className={styles.missingIndicator}>○</span> Missing/Not Finished</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button className={styles.actionButton} onClick={selectAllInvalid}>
          Select All Invalid
        </button>
        <button className={styles.actionButton} onClick={selectAll}>
          Select All
        </button>
        <button className={styles.actionButton} onClick={clearSelection}>
          Clear
        </button>
      </div>

      {/* Selection Summary */}
      <div className={styles.summary}>
        Selected: {selectedGWs.length > 0
          ? `GW${selectedGWs.sort((a, b) => a - b).join(', GW')} (${selectedGWs.length} gameweek${selectedGWs.length > 1 ? 's' : ''})`
          : 'None'}
      </div>

      {/* Sync Button */}
      <button
        className={styles.syncButton}
        onClick={runSync}
        disabled={syncing || selectedGWs.length === 0}
      >
        {syncing ? '🔄 Syncing...' : '🔄 SYNC SELECTED'}
      </button>

      {/* Results */}
      {results && (
        <div className={styles.results}>
          <h3>Sync Results:</h3>
          {results.error ? (
            <div className={styles.resultError}>{results.error}</div>
          ) : (
            <>
              <div className={styles.resultsSummary}>
                {/* K-156: Show success/failed counts with color coding */}
                {results.summary?.failed > 0 ? '⚠️' : '✅'}
                {' '}{results.summary?.success || 0} / {results.summary?.total || 0} successful
                {results.summary?.failed > 0 && `, ${results.summary.failed} failed`}
                {' '}({((results.summary?.totalDuration || 0) / 1000).toFixed(1)}s)
              </div>
              {/* K-156: Show failed results first if any */}
              {results.summary?.failed > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', borderRadius: '4px' }}>
                  <strong>Failed:</strong>
                  {results.results?.filter((r: any) => r.status === 'error').map((r: any, i: number) => (
                    <div key={i} style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                      League {r.leagueId} GW{r.gw}: {r.error}
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.resultsList}>
                {results.results?.map((r: any, i: number) => (
                  <div key={i} className={`${styles.resultItem} ${styles[r.status]}`}>
                    {r.status === 'success' ? '✅' : '❌'}
                    League {r.leagueId} GW{r.gw}:
                    {r.status === 'success'
                      ? ` ${r.managers} managers, ${r.players} players (${(r.duration / 1000).toFixed(1)}s)`
                      : ` Error: ${r.error}`
                    }
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
