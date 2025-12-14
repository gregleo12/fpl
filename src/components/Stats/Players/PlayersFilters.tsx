'use client';

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

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  teams: Team[];
}

export default function PlayersFilters({ filters, setFilters, teams }: Props) {
  const positions = [
    { value: 'all', label: 'All positions' },
    { value: 'GKP', label: 'Goalkeepers' },
    { value: 'DEF', label: 'Defenders' },
    { value: 'MID', label: 'Midfielders' },
    { value: 'FWD', label: 'Forwards' }
  ];

  const sortOptions = [
    { value: 'total_points', label: 'Total points' },
    { value: 'form', label: 'Form' },
    { value: 'now_cost', label: 'Price' },
    { value: 'selected_by_percent', label: 'Selected %' },
    { value: 'goals_scored', label: 'Goals scored' },
    { value: 'assists', label: 'Assists' },
    { value: 'clean_sheets', label: 'Clean sheets' },
    { value: 'goals_conceded', label: 'Goals conceded' },
    { value: 'expected_goals', label: 'xG' },
    { value: 'expected_assists', label: 'xA' },
    { value: 'expected_goal_involvements', label: 'xGI' },
    { value: 'ict_index', label: 'ICT Index' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'bps', label: 'BPS' },
    { value: 'minutes', label: 'Minutes' }
  ];

  const priceOptions = [
    { value: 150, label: '£15.0m' },
    { value: 140, label: '£14.0m' },
    { value: 130, label: '£13.0m' },
    { value: 120, label: '£12.0m' },
    { value: 110, label: '£11.0m' },
    { value: 100, label: '£10.0m' },
    { value: 90, label: '£9.0m' },
    { value: 80, label: '£8.0m' },
    { value: 70, label: '£7.0m' },
    { value: 60, label: '£6.0m' },
    { value: 50, label: '£5.0m' },
    { value: 40, label: '£4.0m' }
  ];

  const reset = () => {
    setFilters({
      position: 'all',
      team: 'all',
      maxPrice: 150,
      sort: 'total_points',
      search: ''
    });
  };

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.position}
          onChange={(e) => setFilters({ ...filters, position: e.target.value })}
          className="bg-[#2a2a3e] text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-purple-500"
        >
          {positions.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <select
          value={filters.team}
          onChange={(e) => setFilters({ ...filters, team: e.target.value })}
          className="bg-[#2a2a3e] text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All teams</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
          className="bg-[#2a2a3e] text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-purple-500"
        >
          {priceOptions.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <button
          onClick={reset}
          className="text-gray-400 hover:text-white text-sm px-3 py-2 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Sort and search row */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm whitespace-nowrap">Sort by:</span>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="bg-[#2a2a3e] text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-purple-500"
          >
            {sortOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="🔍 Search player..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="bg-[#2a2a3e] text-white rounded-lg px-3 py-2 text-sm flex-1 min-w-[150px] border border-gray-700 focus:outline-none focus:border-purple-500 placeholder-gray-500"
        />
      </div>
    </div>
  );
}
