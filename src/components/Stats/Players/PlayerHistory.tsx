'use client';

interface Props {
  history: any[];
  totals: any;
  per90: any;
  position: string;
}

export default function PlayerHistory({ history, totals, per90, position }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">No gameweek data available</p>
        <p className="text-sm mt-2">This player may not have played yet this season</p>
      </div>
    );
  }

  const getResultBadge = (result: string) => {
    if (!result) return null;

    const colors = {
      W: 'bg-green-600',
      D: 'bg-gray-600',
      L: 'bg-red-600'
    };

    return (
      <span className={`${colors[result as keyof typeof colors]} text-white text-xs px-1.5 py-0.5 rounded font-medium`}>
        {result}
      </span>
    );
  };

  const isDefensivePlayer = position === 'DEF' || position === 'GKP';

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800 bg-[#1a1a2e]">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-[#16161e] sticky top-0 z-20">
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-center py-3 px-3 sticky left-0 bg-[#16161e] z-30 min-w-[60px] shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
              GW
            </th>
            <th className="text-center py-3 px-2">OPP</th>
            <th className="text-center py-3 px-2" title="Result">R</th>
            <th className="text-right py-3 px-2">PTS</th>
            <th className="text-right py-3 px-2" title="Minutes Played">MP</th>
            <th className="text-right py-3 px-2" title="Goals Scored">GS</th>
            <th className="text-right py-3 px-2" title="Assists">A</th>
            <th className="text-right py-3 px-2" title="Expected Goals">xG</th>
            <th className="text-right py-3 px-2" title="Expected Assists">xA</th>
            {isDefensivePlayer && (
              <>
                <th className="text-right py-3 px-2" title="Clean Sheets">CS</th>
                <th className="text-right py-3 px-2" title="Goals Conceded">GC</th>
                <th className="text-right py-3 px-2" title="Saves">SV</th>
              </>
            )}
            <th className="text-right py-3 px-2" title="Bonus">B</th>
            <th className="text-right py-3 px-2" title="Bonus Points System">BPS</th>
            <th className="text-right py-3 px-2" title="Influence">I</th>
            <th className="text-right py-3 px-2" title="Creativity">C</th>
            <th className="text-right py-3 px-2" title="Threat">T</th>
            <th className="text-right py-3 px-2" title="ICT Index">ICT</th>
            <th className="text-right py-3 px-2" title="Value">£</th>
          </tr>
        </thead>
        <tbody className="bg-[#1a1a2e]">
          {/* Gameweek rows */}
          {history.map((gw) => (
            <tr key={gw.gameweek} className="border-b border-gray-800 hover:bg-[#2a2a3e] transition-colors">
              <td className="py-3 px-3 text-center font-medium text-white sticky left-0 bg-[#1a1a2e] hover:bg-[#2a2a3e] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                {gw.gameweek}
              </td>
              <td className="py-3 px-2 text-center text-gray-300">{gw.opponent_team}</td>
              <td className="py-3 px-2 text-center">{getResultBadge(gw.result)}</td>
              <td className="py-3 px-2 text-right font-medium text-white">{gw.total_points}</td>
              <td className="py-3 px-2 text-right text-gray-300">{gw.minutes}</td>
              <td className="py-3 px-2 text-right text-gray-300">{gw.goals_scored || 0}</td>
              <td className="py-3 px-2 text-right text-gray-300">{gw.assists || 0}</td>
              <td className="py-3 px-2 text-right text-gray-300">{parseFloat(gw.expected_goals || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-gray-300">{parseFloat(gw.expected_assists || 0).toFixed(1)}</td>
              {isDefensivePlayer && (
                <>
                  <td className="py-3 px-2 text-right text-gray-300">{gw.clean_sheets || 0}</td>
                  <td className="py-3 px-2 text-right text-gray-300">{gw.goals_conceded || 0}</td>
                  <td className="py-3 px-2 text-right text-gray-300">{gw.saves || 0}</td>
                </>
              )}
              <td className="py-3 px-2 text-right text-gray-300">{gw.bonus || 0}</td>
              <td className="py-3 px-2 text-right text-gray-300">{gw.bps || 0}</td>
              <td className="py-3 px-2 text-right text-gray-300">{parseFloat(gw.influence || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-gray-300">{parseFloat(gw.creativity || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-gray-300">{parseFloat(gw.threat || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-gray-300">{parseFloat(gw.ict_index || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-gray-300">£{(gw.value / 10).toFixed(1)}m</td>
            </tr>
          ))}

          {/* Totals row */}
          {totals && (
            <tr className="border-b-2 border-purple-500/30 bg-[#16161e] font-semibold">
              <td className="py-3 px-3 text-center text-purple-400 sticky left-0 bg-[#16161e] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                Total
              </td>
              <td className="py-3 px-2 text-center text-gray-500">-</td>
              <td className="py-3 px-2 text-center text-gray-500">-</td>
              <td className="py-3 px-2 text-right text-white">{totals.total_points || 0}</td>
              <td className="py-3 px-2 text-right text-white">{totals.minutes || 0}</td>
              <td className="py-3 px-2 text-right text-white">{totals.goals_scored || 0}</td>
              <td className="py-3 px-2 text-right text-white">{totals.assists || 0}</td>
              <td className="py-3 px-2 text-right text-white">{parseFloat(totals.expected_goals || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-white">{parseFloat(totals.expected_assists || 0).toFixed(1)}</td>
              {isDefensivePlayer && (
                <>
                  <td className="py-3 px-2 text-right text-white">{totals.clean_sheets || 0}</td>
                  <td className="py-3 px-2 text-right text-white">{totals.goals_conceded || 0}</td>
                  <td className="py-3 px-2 text-right text-white">{totals.saves || 0}</td>
                </>
              )}
              <td className="py-3 px-2 text-right text-white">{totals.bonus || 0}</td>
              <td className="py-3 px-2 text-right text-white">{totals.bps || 0}</td>
              <td className="py-3 px-2 text-right text-white">{parseFloat(totals.influence || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-white">{parseFloat(totals.creativity || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-white">{parseFloat(totals.threat || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-white">{parseFloat(totals.ict_index || 0).toFixed(1)}</td>
              <td className="py-3 px-2 text-right text-gray-500">-</td>
            </tr>
          )}

          {/* Per 90 row */}
          {per90 && (
            <tr className="bg-[#16161e] font-medium">
              <td className="py-3 px-3 text-center text-purple-400 sticky left-0 bg-[#16161e] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                Per 90
              </td>
              <td className="py-3 px-2 text-center text-gray-500">-</td>
              <td className="py-3 px-2 text-center text-gray-500">-</td>
              <td className="py-3 px-2 text-right text-white">{per90.total_points || '-'}</td>
              <td className="py-3 px-2 text-right text-gray-500">90</td>
              <td className="py-3 px-2 text-right text-white">{per90.goals_scored || '-'}</td>
              <td className="py-3 px-2 text-right text-white">{per90.assists || '-'}</td>
              <td className="py-3 px-2 text-right text-white">{per90.expected_goals || '-'}</td>
              <td className="py-3 px-2 text-right text-white">{per90.expected_assists || '-'}</td>
              {isDefensivePlayer && (
                <>
                  <td className="py-3 px-2 text-right text-white">{per90.clean_sheets || '-'}</td>
                  <td className="py-3 px-2 text-right text-white">{per90.goals_conceded || '-'}</td>
                  <td className="py-3 px-2 text-right text-white">{per90.saves || '-'}</td>
                </>
              )}
              <td className="py-3 px-2 text-right text-white">{per90.bonus || '-'}</td>
              <td className="py-3 px-2 text-right text-white">{per90.bps || '-'}</td>
              <td className="py-3 px-2 text-right text-white">{per90.influence || '-'}</td>
              <td className="py-3 px-2 text-right text-white">{per90.creativity || '-'}</td>
              <td className="py-3 px-2 text-right text-white">{per90.threat || '-'}</td>
              <td className="py-3 px-2 text-right text-white">{per90.ict_index || '-'}</td>
              <td className="py-3 px-2 text-right text-gray-500">-</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
