'use client';

import { useState, useEffect } from 'react';
import PlayersFilters from './PlayersFilters';
import PlayersTable from './PlayersTable';
import PlayerDetailModal from './PlayerDetailModal';

export interface Player {
  id: number;
  web_name: string;
  team_short: string;
  team_name: string;
  position: string;
  total_points: number;
  form: string;
  now_cost: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  bonus: number;
  bps: number;
  minutes: number;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  selected_by_percent: string;
  status: string;
  chance_of_playing_next_round: number | null;
  price: string;
}

interface Team {
  id: number;
  name: string;
  short: string;
}

interface Filters {
  position: string;
  team: string;
  maxPrice: number;
  sort: string;
  search: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PlayersTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    position: 'all',
    team: 'all',
    maxPrice: 150,
    sort: 'total_points',
    search: ''
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const fetchPlayers = async (resetPage = false, pageOverride?: number) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : (pageOverride || page);

    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '50',
      sort: filters.sort,
      order: 'desc',
      maxPrice: filters.maxPrice.toString()
    });

    if (filters.position !== 'all') params.set('position', filters.position);
    if (filters.team !== 'all') params.set('team', filters.team);
    if (filters.search) params.set('search', filters.search);

    try {
      const res = await fetch(`/api/players?${params}`);
      const data = await res.json();

      if (resetPage) {
        setPlayers(data.players);
        setPage(1);
      } else {
        setPlayers(prev => [...prev, ...data.players]);
      }

      if (data.filters?.teams) {
        setTeams(data.filters.teams);
      }

      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers(true);
  }, [filters]);

  const loadMore = () => {
    if (pagination && page < pagination.totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPlayers(false, nextPage);
    }
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayerId(player.id);
  };

  const hasMore = pagination ? page < pagination.totalPages : false;

  return (
    <div className="space-y-4">
      <PlayersFilters
        filters={filters}
        setFilters={setFilters}
        teams={teams}
      />

      <PlayersTable
        players={players}
        loading={loading && players.length === 0}
        onPlayerClick={handlePlayerClick}
      />

      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="w-full py-3 text-center text-purple-400 hover:text-purple-300 transition-colors rounded-lg bg-[#1a1a2e] hover:bg-[#2a2a3e] border border-gray-800"
        >
          Load More Players
        </button>
      )}

      {loading && players.length > 0 && (
        <div className="text-center py-4 text-gray-400">Loading more...</div>
      )}

      {/* Player Detail Modal */}
      {selectedPlayerId && (
        <PlayerDetailModal
          playerId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}
