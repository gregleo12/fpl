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

    setSyncing(true);
    setResults(null);

    try {
      const response = await fetch('/api/admin/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueIds: selectedLeague === 'all' ? 'all' : [selectedLeague],
          gameweeks: selectedGWs.sort((a, b) => a - b),
          force: true
        })
      });

      const data = await response.json();
      setResults(data);

      // Refresh status after sync
      await fetchStatus();

    } catch (error) {
      console.error('Sync failed:', error);
      setResults({ error: 'Sync failed' });
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
        <label className={styles.label}>League:</label>
        <select
          className={styles.select}
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
        >
          <option value="all">All Leagues ({status.leagues.length})</option>
          {status.leagues.map(league => (
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
                ✅ {results.summary?.success || 0} / {results.summary?.total || 0} successful
                ({((results.summary?.totalDuration || 0) / 1000).toFixed(1)}s)
              </div>
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
