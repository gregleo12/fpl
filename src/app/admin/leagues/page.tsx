'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './leagues.module.css';

interface League {
  league_id: number;
  league_name: string;
  team_count: number;
  total_requests: number;
  unique_users: number;
  unique_managers: number;
  last_seen: string;
  first_seen: string;
  created_at: string;
}

type SortField = keyof League;
type SortDirection = 'asc' | 'desc';

export default function AdminLeaguesPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('total_requests');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/leagues');
      if (!response.ok) {
        throw new Error('Failed to fetch leagues');
      }
      const data = await response.json();
      setLeagues(data.leagues);
    } catch (err: any) {
      setError(err.message || 'Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to desc for numbers, asc for strings
      setSortField(field);
      const isNumber = typeof leagues[0]?.[field] === 'number';
      setSortDirection(isNumber ? 'desc' : 'asc');
    }
  };

  const sortedLeagues = [...leagues].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading leagues...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <button onClick={() => router.push('/admin')} className={styles.backButton}>
            ← Back to Admin
          </button>
          <h1 className={styles.title}>🏆 All Leagues</h1>
          <div className={styles.count}>{leagues.length} total leagues</div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th onClick={() => handleSort('league_name')} className={styles.sortable}>
                  <span>League</span>
                  <span className={styles.sortIcon}>{getSortIcon('league_name')}</span>
                </th>
                <th onClick={() => handleSort('team_count')} className={styles.sortable}>
                  <span>Teams</span>
                  <span className={styles.sortIcon}>{getSortIcon('team_count')}</span>
                </th>
                <th onClick={() => handleSort('total_requests')} className={styles.sortable}>
                  <span>Requests</span>
                  <span className={styles.sortIcon}>{getSortIcon('total_requests')}</span>
                </th>
                <th onClick={() => handleSort('unique_users')} className={styles.sortable}>
                  <span>Users</span>
                  <span className={styles.sortIcon}>{getSortIcon('unique_users')}</span>
                </th>
                <th onClick={() => handleSort('unique_managers')} className={styles.sortable}>
                  <span>Managers</span>
                  <span className={styles.sortIcon}>{getSortIcon('unique_managers')}</span>
                </th>
                <th onClick={() => handleSort('last_seen')} className={styles.sortable}>
                  <span>Last Seen</span>
                  <span className={styles.sortIcon}>{getSortIcon('last_seen')}</span>
                </th>
                <th onClick={() => handleSort('first_seen')} className={styles.sortable}>
                  <span>First Seen</span>
                  <span className={styles.sortIcon}>{getSortIcon('first_seen')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeagues.map((league) => (
                <tr key={league.league_id}>
                  <td>
                    <div className={styles.leagueName}>{league.league_name}</div>
                    <div className={styles.leagueId}>ID: {league.league_id}</div>
                  </td>
                  <td className={styles.number}>{league.team_count}</td>
                  <td className={styles.number}>{league.total_requests.toLocaleString()}</td>
                  <td className={styles.number}>{league.unique_users}</td>
                  <td className={styles.number}>{league.unique_managers}</td>
                  <td className={styles.timestamp}>{formatTimestamp(league.last_seen)}</td>
                  <td className={styles.timestamp}>{formatTimestamp(league.first_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className={styles.refreshBtn} onClick={fetchLeagues}>
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
}
