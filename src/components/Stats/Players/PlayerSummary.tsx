'use client';

interface Props {
  player: any;
  totals: any;
  per90: any;
}

export default function PlayerSummary({ player, totals, per90 }: Props) {
  const statusInfo = {
    'a': { color: 'bg-green-500', text: 'Available' },
    'i': { color: 'bg-red-500', text: 'Injured' },
    's': { color: 'bg-red-500', text: 'Suspended' },
    'd': { color: 'bg-yellow-500', text: 'Doubtful' },
    'u': { color: 'bg-red-500', text: 'Unavailable' }
  };

  const status = statusInfo[player.status as keyof typeof statusInfo] || statusInfo['a'];

  const StatRow = ({ label, value, label2, value2 }: { label: string; value: string | number; label2?: string; value2?: string | number }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-800 last:border-b-0">
      <div className="flex-1">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className="text-white font-medium ml-3">{value}</span>
      </div>
      {label2 && (
        <div className="flex-1">
          <span className="text-gray-400 text-sm">{label2}</span>
          <span className="text-white font-medium ml-3">{value2}</span>
        </div>
      )}
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-[#16161e] rounded-lg p-4 border border-gray-800">
      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Season Stats */}
      <Section title="Season Stats">
        <StatRow
          label="Total Points"
          value={player.total_points}
          label2="Form"
          value2={parseFloat(player.form).toFixed(1)}
        />
        <StatRow
          label="Minutes"
          value={player.minutes?.toLocaleString() || 0}
          label2="Starts"
          value2={totals?.starts || 0}
        />
        <StatRow
          label="Points per Game"
          value={player.points_per_game || '0.0'}
          label2="Selected by"
          value2={`${player.selected_by_percent}%`}
        />
      </Section>

      {/* Attacking */}
      <Section title="Attacking">
        <StatRow
          label="Goals"
          value={player.goals_scored}
          label2="xG"
          value2={parseFloat(player.expected_goals || 0).toFixed(2)}
        />
        <StatRow
          label="Assists"
          value={player.assists}
          label2="xA"
          value2={parseFloat(player.expected_assists || 0).toFixed(2)}
        />
        <StatRow
          label="Goal Involvements"
          value={player.goals_scored + player.assists}
          label2="xGI"
          value2={parseFloat(player.expected_goal_involvements || 0).toFixed(2)}
        />
        {per90 && (
          <div className="pt-2 mt-2 border-t border-gray-700">
            <div className="text-gray-500 text-xs mb-2">Per 90 minutes:</div>
            <StatRow
              label="Goals/90"
              value={per90.goals_scored}
              label2="Assists/90"
              value2={per90.assists}
            />
          </div>
        )}
      </Section>

      {/* Defensive */}
      {(player.position === 'DEF' || player.position === 'GKP' || player.clean_sheets > 0) && (
        <Section title="Defensive">
          <StatRow
            label="Clean Sheets"
            value={player.clean_sheets}
            label2="Goals Conceded"
            value2={player.goals_conceded}
          />
          <StatRow
            label="Own Goals"
            value={player.own_goals || 0}
            label2="Penalties Saved"
            value2={player.penalties_saved || 0}
          />
          <StatRow
            label="Saves"
            value={player.saves || 0}
            label2="Yellow Cards"
            value2={player.yellow_cards || 0}
          />
          <StatRow
            label="Red Cards"
            value={player.red_cards || 0}
          />
        </Section>
      )}

      {/* Bonus */}
      <Section title="Bonus">
        <StatRow
          label="Bonus Points"
          value={player.bonus}
          label2="BPS"
          value2={player.bps}
        />
      </Section>

      {/* ICT Index */}
      <Section title="ICT Index">
        <StatRow
          label="Influence"
          value={parseFloat(player.influence || 0).toFixed(1)}
          label2="Creativity"
          value2={parseFloat(player.creativity || 0).toFixed(1)}
        />
        <StatRow
          label="Threat"
          value={parseFloat(player.threat || 0).toFixed(1)}
          label2="ICT Index"
          value2={parseFloat(player.ict_index || 0).toFixed(1)}
        />
      </Section>

      {/* Status */}
      <Section title="Status">
        <div className="flex items-center gap-2 py-2">
          <span className={`w-3 h-3 rounded-full ${status.color}`} />
          <span className="text-white font-medium">{status.text}</span>
        </div>
        {player.news && (
          <div className="mt-2 p-3 bg-[#1a1a2e] rounded border border-gray-700">
            <p className="text-gray-300 text-sm">{player.news}</p>
            {player.news_added && (
              <p className="text-gray-500 text-xs mt-1">
                Updated: {new Date(player.news_added).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
        {player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round < 100 && (
          <div className="mt-2 text-sm">
            <span className="text-gray-400">Chance of playing next round:</span>
            <span className="text-white ml-2">{player.chance_of_playing_next_round}%</span>
          </div>
        )}
      </Section>
    </div>
  );
}
