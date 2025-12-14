'use client';

import { Player } from './PlayersTab';

interface Props {
  players: Player[];
  loading: boolean;
  onPlayerClick: (player: Player) => void;
}

export default function PlayersTable({ players, loading, onPlayerClick }: Props) {
  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading players...</div>;
  }

  if (players.length === 0) {
    return <div className="text-center py-8 text-gray-400">No players found</div>;
  }

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

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800 bg-[#1a1a2e]">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-[#16161e] sticky top-0 z-20">
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-3 px-2 w-10">#</th>
            <th className="text-left py-3 px-3 sticky left-0 bg-[#16161e] z-30 min-w-[140px] shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
              Player
            </th>
            <th className="text-center py-3 px-2">Team</th>
            <th className="text-right py-3 px-2">Pts</th>
            <th className="text-right py-3 px-2">Form</th>
            <th className="text-right py-3 px-2">Price</th>
            <th className="text-right py-3 px-2">GS</th>
            <th className="text-right py-3 px-2">A</th>
            <th className="text-right py-3 px-2">CS</th>
            <th className="text-right py-3 px-2">GC</th>
            <th className="text-right py-3 px-2">xG</th>
            <th className="text-right py-3 px-2">xA</th>
            <th className="text-right py-3 px-2">B</th>
            <th className="text-right py-3 px-2">BPS</th>
            <th className="text-right py-3 px-2">Min</th>
            <th className="text-right py-3 px-2">I</th>
            <th className="text-right py-3 px-2">C</th>
            <th className="text-right py-3 px-2">T</th>
            <th className="text-right py-3 px-2">ICT</th>
          </tr>
        </thead>
        <tbody className="bg-[#1a1a2e]">
          {players.map((player, index) => {
            const statusIndicator = getStatusIndicator(player);

            return (
              <tr
                key={player.id}
                onClick={() => onPlayerClick(player)}
                className="border-b border-gray-800 hover:bg-[#2a2a3e] cursor-pointer transition-colors"
              >
                <td className="py-3 px-2 text-gray-500">{index + 1}</td>
                <td className="py-3 px-3 sticky left-0 bg-[#1a1a2e] hover:bg-[#2a2a3e] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{player.web_name}</span>
                    {statusIndicator}
                  </div>
                </td>
                <td className="py-3 px-2 text-center text-gray-400">{player.team_short}</td>
                <td className="py-3 px-2 text-right font-medium text-white">{player.total_points}</td>
                <td className="py-3 px-2 text-right text-gray-300">{parseFloat(player.form).toFixed(1)}</td>
                <td className="py-3 px-2 text-right text-gray-300">£{(player.now_cost / 10).toFixed(1)}m</td>
                <td className="py-3 px-2 text-right text-gray-300">{player.goals_scored}</td>
                <td className="py-3 px-2 text-right text-gray-300">{player.assists}</td>
                <td className="py-3 px-2 text-right text-gray-300">{player.clean_sheets}</td>
                <td className="py-3 px-2 text-right text-gray-300">{player.goals_conceded}</td>
                <td className="py-3 px-2 text-right text-gray-300">{parseFloat(player.expected_goals).toFixed(1)}</td>
                <td className="py-3 px-2 text-right text-gray-300">{parseFloat(player.expected_assists).toFixed(1)}</td>
                <td className="py-3 px-2 text-right text-gray-300">{player.bonus}</td>
                <td className="py-3 px-2 text-right text-gray-300">{player.bps}</td>
                <td className="py-3 px-2 text-right text-gray-300">{player.minutes}</td>
                <td className="py-3 px-2 text-right text-gray-300">{parseFloat(player.influence).toFixed(1)}</td>
                <td className="py-3 px-2 text-right text-gray-300">{parseFloat(player.creativity).toFixed(1)}</td>
                <td className="py-3 px-2 text-right text-gray-300">{parseFloat(player.threat).toFixed(1)}</td>
                <td className="py-3 px-2 text-right text-gray-300">{parseFloat(player.ict_index).toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
