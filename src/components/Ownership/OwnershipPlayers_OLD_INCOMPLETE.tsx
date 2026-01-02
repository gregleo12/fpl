'use client';

import { useEffect, useState } from 'react';
import styles from './Ownership.module.css';

interface Player {
  id: number;
  web_name: string;
  position: string;
  team_short: string;
  now_cost: number;
  selected_by_percent: string | number;
  elite_ownership?: number;
  elite_delta?: number;
  total_points: number;
  form: string | number;
  goals_scored: number;
  assists: number;
  minutes: number;
  price: string;
}

type SortColumn = 'web_name' | 'now_cost' | 'selected_by_percent' | 'elite_ownership' | 'elite_delta' | 'total_points' | 'form';
type ViewMode = 'compact' | 'all';

export default function OwnershipPlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [sortColumn, setSortColumn] = useState<SortColumn>('elite_ownership');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/players?includeElite=true&limit=1000');

      if (!response.ok) {
        throw new Error('Failed to load players');
      }

      const data = await response.json();
      setPlayers(data.players || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getDeltaClass = (delta: number | undefined): string => {
    if (!delta && delta !== 0) return styles.deltaNeutral;
    if (delta >= 20) return styles.deltaStrongPositive;
    if (delta >= 5) return styles.deltaPositive;
    if (delta <= -20) return styles.deltaStrongNegative;
    if (delta <= -5) return styles.deltaNegative;
    return styles.deltaNeutral;
  };

  const formatDelta = (delta: number | undefined): string => {
    if (delta === undefined || delta === null) return '—';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}`;
  };

  // Filter and sort players
  const filteredPlayers = players
    .filter(p => {
      if (!searchQuery) return true;
      return p.web_name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      // Handle numeric vs string values
      if (sortColumn === 'selected_by_percent' || sortColumn === 'form') {
        aVal = parseFloat(aVal?.toString() || '0');
        bVal = parseFloat(bVal?.toString() || '0');
      }

      if (aVal === undefined) aVal = 0;
      if (bVal === undefined) bVal = 0;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.loading}>Loading players with elite ownership data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.section}>
        <div className={styles.error}>
          <p>{error}</p>
          <p className={styles.errorHint}>Try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.playersHeader}>
        <h3 className={styles.sectionTitle}>
          Elite vs Overall Ownership
        </h3>
        <p className={styles.sectionDesc}>
          Compare elite (Top 10K) ownership to overall ownership - find hidden gems and avoid traps
        </p>
      </div>

      {/* Controls */}
      <div className={styles.playersControls}>
        <input
          type="text"
          placeholder="Search players..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className={styles.viewModeToggle}>
          <button
            className={viewMode === 'compact' ? styles.viewModeActive : styles.viewMode}
            onClick={() => setViewMode('compact')}
          >
            Compact
          </button>
          <button
            className={viewMode === 'all' ? styles.viewModeActive : styles.viewMode}
            onClick={() => setViewMode('all')}
          >
            All Stats
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('web_name')} className={styles.sortable}>
                Player {sortColumn === 'web_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('now_cost')} className={styles.sortable}>
                Price {sortColumn === 'now_cost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('selected_by_percent')} className={styles.sortable}>
                Overall % {sortColumn === 'selected_by_percent' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('elite_ownership')} className={styles.sortable}>
                Elite % {sortColumn === 'elite_ownership' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('elite_delta')} className={styles.sortable}>
                Delta {sortColumn === 'elite_delta' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {viewMode === 'all' && (
                <>
                  <th onClick={() => handleSort('total_points')} className={styles.sortable}>
                    Pts {sortColumn === 'total_points' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('form')} className={styles.sortable}>
                    Form {sortColumn === 'form' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>G</th>
                  <th>A</th>
                  <th>Min</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr key={player.id} className={styles.playerRow}>
                <td className={styles.playerNameCell}>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>{player.web_name}</span>
                    <span className={styles.playerMeta}>
                      {player.position} · {player.team_short}
                    </span>
                  </div>
                </td>
                <td>{player.price}</td>
                <td>{parseFloat(player.selected_by_percent?.toString() || '0').toFixed(1)}%</td>
                <td className={styles.eliteCell}>
                  {player.elite_ownership !== undefined ? `${player.elite_ownership.toFixed(1)}%` : '—'}
                </td>
                <td className={getDeltaClass(player.elite_delta)}>
                  {formatDelta(player.elite_delta)}
                </td>
                {viewMode === 'all' && (
                  <>
                    <td>{player.total_points}</td>
                    <td>{typeof player.form === 'number' ? player.form.toFixed(1) : player.form}</td>
                    <td>{player.goals_scored}</td>
                    <td>{player.assists}</td>
                    <td>{player.minutes}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPlayers.length === 0 && (
        <div className={styles.noData}>No players found</div>
      )}

      {/* Info Footer */}
      <div className={styles.infoFooter}>
        ℹ️ Elite data from Top 10K managers · Delta = Elite % - Overall % · Green = Elites favor, Red = Casuals over-own
      </div>
    </div>
  );
}
