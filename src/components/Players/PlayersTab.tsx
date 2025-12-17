'use client';

import { useEffect, useState, useMemo } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { PlayersTable } from './PlayersTable';
import { FilterModal, FilterState } from './FilterModal';
import styles from './PlayersTab.module.css';

interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  position: string;
  team_id: number;
  team_code: number;
  team_name: string;
  team_short: string;
  now_cost: number;
  selected_by_percent: string | number;
  total_points: number;
  form: string | number;
  points_per_game: string | number;
  event_points: number;
  starts: number;
  minutes: number;
  goals_scored: number;
  expected_goals: string | number;
  assists: number;
  expected_assists: string | number;
  expected_goal_involvements: string | number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
  bonus: number;
  bps: number;
  yellow_cards: number;
  red_cards: number;
  cost_change_start: number;
  status?: string;
  [key: string]: any;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
}

export type ViewMode = 'compact' | 'all';

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

// Map position strings to IDs
const POSITION_MAP: Record<string, number> = {
  'GKP': 1,
  'DEF': 2,
  'MID': 3,
  'FWD': 4
};

export function PlayersTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortState>({
    column: 'total_points',
    direction: 'desc'
  });
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 3.8,
    priceMax: 15.0,
    positions: [1, 2, 3, 4],
    teams: [],
    availability: 'all'
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      setIsLoading(true);
      setError('');

      // Fetch all players (no pagination, sorted by total_points desc)
      const response = await fetch('/api/players?limit=1000&sort=total_points&order=desc', {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch player data (Status: ${response.status})`);
      }

      const data = await response.json();

      const teamsList = data.filters.teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        short_name: t.short
      }));

      setPlayers(data.players);
      setTeams(teamsList);

      // Initialize filters with all teams
      setFilters(prev => ({
        ...prev,
        teams: teamsList.map((t: Team) => t.id)
      }));
    } catch (err: any) {
      console.error('Error fetching players:', err);
      setError(err.message || 'Failed to load players');
    } finally {
      setIsLoading(false);
    }
  }

  // Filter players based on current filters
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Price filter (now_cost is in tenths, e.g., 100 = £10.0m)
      const price = player.now_cost / 10;
      if (price < filters.priceMin || price > filters.priceMax) return false;

      // Position filter
      const positionId = POSITION_MAP[player.position];
      if (positionId && !filters.positions.includes(positionId)) return false;

      // Team filter
      if (!filters.teams.includes(player.team_id)) return false;

      // Availability filter
      const status = player.status || 'a';
      if (filters.availability === 'available' && status !== 'a') return false;
      if (filters.availability === 'unavailable' && status === 'a') return false;

      return true;
    });
  }, [players, filters]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    const sorted = [...filteredPlayers].sort((a, b) => {
      let aVal = a[sort.column];
      let bVal = b[sort.column];

      // Handle string numbers like "6.6" for form
      if (typeof aVal === 'string' && !isNaN(parseFloat(aVal))) {
        aVal = parseFloat(aVal);
      }
      if (typeof bVal === 'string' && !isNaN(parseFloat(bVal))) {
        bVal = parseFloat(bVal);
      }

      // Handle null/undefined
      if (aVal == null) aVal = 0;
      if (bVal == null) bVal = 0;

      if (sort.direction === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });

    return sorted;
  }, [filteredPlayers, sort]);

  // Apply search filter
  const searchFilteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return sortedPlayers;

    const query = searchQuery.toLowerCase().trim();

    return sortedPlayers.filter(player => {
      // Search by web_name (display name)
      if (player.web_name.toLowerCase().includes(query)) return true;

      // Search by first_name + second_name
      const fullName = `${player.first_name} ${player.second_name}`.toLowerCase();
      if (fullName.includes(query)) return true;

      // Search by team short name
      if (player.team_short?.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [sortedPlayers, searchQuery]);

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleSort = (column: string) => {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading players...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button
            onClick={fetchPlayers}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h2 className={styles.title}>All Players</h2>
          <button
            className={styles.filterButton}
            onClick={() => setShowFilterModal(true)}
            title="Filter Players"
          >
            <Filter size={18} />
            Filter
          </button>
        </div>
        <div className={styles.subtitle}>
          Showing {searchFilteredPlayers.length} of {players.length} players
        </div>
      </div>

      {/* Search Input */}
      <div className={styles.searchContainer}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search player..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        {searchQuery && (
          <button
            className={styles.clearSearch}
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={styles.viewToggle}>
        <button
          className={viewMode === 'compact' ? styles.active : ''}
          onClick={() => setViewMode('compact')}
        >
          Compact Stats
        </button>
        <button
          className={viewMode === 'all' ? styles.active : ''}
          onClick={() => setViewMode('all')}
        >
          All Stats
        </button>
      </div>

      <PlayersTable
        players={searchFilteredPlayers}
        teams={teams}
        viewMode={viewMode}
        sort={sort}
        onSort={handleSort}
      />

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        teams={teams}
      />
    </div>
  );
}
