'use client';

import { Player } from './PlayersTab';

interface Props {
  players: Player[];
  loading: boolean;
  sortBy: string;
  onPlayerClick: (player: Player) => void;
}

export default function PlayersTable({ players, loading, sortBy, onPlayerClick }: Props) {
  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading players...</div>;
  }

  if (players.length === 0) {
    return <div className="text-center py-8 text-gray-400">No players found</div>;
  }

  // Determine which stat column to show based on sort
  const getStatColumn = (player: Player) => {
    switch (sortBy) {
      case 'goals_scored':
        return { label: 'GS', value: player.goals_scored };
      case 'assists':
        return { label: 'A', value: player.assists };
      case 'clean_sheets':
        return { label: 'CS', value: player.clean_sheets };
      case 'goals_conceded':
        return { label: 'GC', value: player.goals_conceded };
      case 'expected_goals':
        return { label: 'xG', value: parseFloat(player.expected_goals).toFixed(1) };
      case 'expected_assists':
        return { label: 'xA', value: parseFloat(player.expected_assists).toFixed(1) };
      case 'expected_goal_involvements':
        return { label: 'xGI', value: parseFloat(player.expected_goal_involvements).toFixed(1) };
      case 'bonus':
        return { label: 'B', value: player.bonus };
      case 'bps':
        return { label: 'BPS', value: player.bps };
      case 'minutes':
        return { label: 'Min', value: player.minutes };
      case 'ict_index':
        return { label: 'ICT', value: parseFloat(player.ict_index).toFixed(1) };
      case 'selected_by_percent':
        return { label: 'Sel%', value: parseFloat(player.selected_by_percent).toFixed(1) + '%' };
      case 'form':
        return { label: 'Form', value: parseFloat(player.form).toFixed(1) };
      default:
        return { label: 'GS', value: player.goals_scored };
    }
  };

  const getStatusIndicator = (player: Player) => {
    if (player.status === 'a') return null;

    if (player.status === 'i' || player.status === 's' || player.status === 'u') {
      return <span className="w-2 h-2 rounded-full bg-red-500" title="Injured/Suspended/Unavailable" />;
    }

    if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round < 75) {
      return <span className="w-2 h-2 rounded-full bg-yellow-500" title="Doubtful" />;
    }

    return null;
  };

  const statColumn = players.length > 0 ? getStatColumn(players[0]) : { label: 'GS', value: 0 };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-[#1e1e2e] sticky top-0">
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-3 px-3 w-10">#</th>
            <th className="text-left py-3 px-3">Player</th>
            <th className="text-center py-3 px-3 w-12 hidden sm:table-cell">Team</th>
            <th className="text-right py-3 px-3 w-12">Pts</th>
            <th className="text-right py-3 px-3 w-12 hidden md:table-cell">Form</th>
            <th className="text-right py-3 px-3 w-16">Price</th>
            <th className="text-right py-3 px-3 w-12">{statColumn.label}</th>
          </tr>
        </thead>
        <tbody className="bg-[#16161e]">
          {players.map((player, index) => {
            const stat = getStatColumn(player);
            const statusIndicator = getStatusIndicator(player);

            return (
              <tr
                key={player.id}
                onClick={() => onPlayerClick(player)}
                className="border-b border-gray-800 hover:bg-[#2a2a3e] cursor-pointer transition-colors"
              >
                <td className="py-3 px-3 text-gray-500">{index + 1}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{player.web_name}</span>
                    {statusIndicator}
                    <span className="text-gray-500 text-xs sm:hidden">
                      {player.team_short}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center text-gray-400 hidden sm:table-cell">
                  {player.team_short}
                </td>
                <td className="py-3 px-3 text-right font-medium text-white">
                  {player.total_points}
                </td>
                <td className="py-3 px-3 text-right text-gray-300 hidden md:table-cell">
                  {parseFloat(player.form).toFixed(1)}
                </td>
                <td className="py-3 px-3 text-right text-gray-300">
                  £{(player.now_cost / 10).toFixed(1)}m
                </td>
                <td className="py-3 px-3 text-right text-gray-300">
                  {stat.value}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
