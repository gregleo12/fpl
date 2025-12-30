/**
 * K-163f: Luck System V2 - Four Components Debug Page
 *
 * Displays all 4 luck components with detailed breakdowns
 * Fetches from /api/league/[id]/luck endpoint
 */

'use client';

import { useEffect, useState } from 'react';

const LEAGUE_ID = 804742;

interface VarianceLuckGW {
  gw: number;
  value: number;
  your_var: number;
  opp_var: number;
  opponent: string;
}

interface RankLuckGW {
  gw: number;
  value: number;
  your_rank: number;
  total_managers: number;
  expected: number;
  result: number;
  opponent: string;
}

interface OpponentStrength {
  gw: number;
  opponent: string;
  opp_season_avg: number;
}

interface ChipFaced {
  gw: number;
  opponent: string;
  chip: string;
}

interface GWLuck {
  gw: number;
  variance: number;
  rank: number;
  total: number;
}

interface ManagerData {
  entry_id: string;
  name: string;
  team_name: string;
  season_avg_points: number;
  variance_luck: {
    total: number;
    per_gw: VarianceLuckGW[];
  };
  rank_luck: {
    total: number;
    per_gw: RankLuckGW[];
  };
  schedule_luck: {
    value: number;
    avg_opp_strength: number;
    league_avg_opp_strength: number;
    opponents: OpponentStrength[];
  };
  chip_luck: {
    value: number;
    chips_played: number;
    chips_faced: number;
    avg_chips_faced: number;
    chips_faced_detail: ChipFaced[];
  };
  gw_luck: GWLuck[];
  season_luck_index: number;
}

interface LuckData {
  leagueId: number;
  currentGW: number;
  managers: ManagerData[];
  league_totals: {
    variance_sum: number;
    rank_sum: number;
    schedule_sum: number;
    chip_sum: number;
  };
  per_gw_sums: {
    gw: number;
    variance_sum: number;
    rank_sum: number;
  }[];
  weights: {
    gw_luck: { variance: number; rank: number };
    season_luck: { variance: number; rank: number; schedule: number; chip: number };
  };
  normalization: {
    variance: string;
    rank: string;
    schedule: string;
    chip: string;
  };
}

export default function LuckDebugPage() {
  const [data, setData] = useState<LuckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/league/${LEAGUE_ID}/luck`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8">Loading luck data...</div>;
  }

  if (!data) {
    return <div className="p-8">Failed to load luck data</div>;
  }

  const manager = selectedManager
    ? data.managers.find(m => m.entry_id === selectedManager)
    : data.managers[0];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-2">K-163f: Luck System V2 - Four Components</h1>
          <p className="text-gray-600 mb-4">League {data.leagueId} • Current GW: {data.currentGW}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Formula Weights</h3>
              <p><strong>GW Luck:</strong> {(data.weights.gw_luck.variance * 100).toFixed(0)}% Variance + {(data.weights.gw_luck.rank * 100).toFixed(0)}% Rank</p>
              <p><strong>Season Luck:</strong> {(data.weights.season_luck.variance * 100).toFixed(0)}% Variance + {(data.weights.season_luck.rank * 100).toFixed(0)}% Rank + {(data.weights.season_luck.schedule * 100).toFixed(0)}% Schedule + {(data.weights.season_luck.chip * 100).toFixed(0)}% Chip</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Normalization</h3>
              <p>Variance: {data.normalization.variance} | Rank: {data.normalization.rank}</p>
              <p>Schedule: {data.normalization.schedule} | Chip: {data.normalization.chip}</p>
            </div>
          </div>
        </div>

        {/* League Totals (Validation) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">League Totals (Zero-Sum Validation)</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className={`p-4 rounded ${Math.abs(data.league_totals.variance_sum) < 0.1 ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="text-2xl font-bold">{data.league_totals.variance_sum.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Variance Sum<br/>(should be ~0)</div>
            </div>
            <div className="p-4 rounded bg-blue-100">
              <div className="text-2xl font-bold">{data.league_totals.rank_sum.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Rank Sum<br/>(NOT zero-sum)</div>
            </div>
            <div className={`p-4 rounded ${Math.abs(data.league_totals.schedule_sum) < 0.1 ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="text-2xl font-bold">{data.league_totals.schedule_sum.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Schedule Sum<br/>(should be ~0)</div>
            </div>
            <div className={`p-4 rounded ${Math.abs(data.league_totals.chip_sum) < 0.1 ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="text-2xl font-bold">{data.league_totals.chip_sum.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Chip Sum<br/>(should be ~0)</div>
            </div>
          </div>
        </div>

        {/* Season Rankings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Season Luck Rankings</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Rank</th>
                  <th className="px-4 py-2 text-left">Manager</th>
                  <th className="px-4 py-2 text-right">Avg Pts</th>
                  <th className="px-4 py-2 text-right">Variance</th>
                  <th className="px-4 py-2 text-right">Rank</th>
                  <th className="px-4 py-2 text-right">Schedule</th>
                  <th className="px-4 py-2 text-right">Chip</th>
                  <th className="px-4 py-2 text-right font-bold">Season Luck</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.managers.map((m, idx) => (
                  <tr key={m.entry_id} className={`border-t ${selectedManager === m.entry_id ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-2">{idx + 1}</td>
                    <td className="px-4 py-2 font-medium">{m.name}</td>
                    <td className="px-4 py-2 text-right">{m.season_avg_points}</td>
                    <td className="px-4 py-2 text-right">{m.variance_luck.total.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{m.rank_luck.total.toFixed(4)}</td>
                    <td className="px-4 py-2 text-right">{m.schedule_luck.value.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{m.chip_luck.value.toFixed(2)}</td>
                    <td className={`px-4 py-2 text-right font-bold ${m.season_luck_index > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.season_luck_index > 0 ? '+' : ''}{m.season_luck_index.toFixed(4)}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setSelectedManager(m.entry_id)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manager Details */}
        {manager && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">{manager.name} - Detailed Breakdown</h2>

              {/* Component Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded bg-blue-50">
                  <div className="text-sm text-gray-600">Variance Luck</div>
                  <div className="text-2xl font-bold">{manager.variance_luck.total.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Per-GW, Zero-sum</div>
                </div>
                <div className="p-4 rounded bg-purple-50">
                  <div className="text-sm text-gray-600">Rank Luck</div>
                  <div className="text-2xl font-bold">{manager.rank_luck.total.toFixed(4)}</div>
                  <div className="text-xs text-gray-500">Per-GW, NOT zero-sum</div>
                </div>
                <div className="p-4 rounded bg-green-50">
                  <div className="text-sm text-gray-600">Schedule Luck</div>
                  <div className="text-2xl font-bold">{manager.schedule_luck.value.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Seasonal, Zero-sum</div>
                </div>
                <div className="p-4 rounded bg-yellow-50">
                  <div className="text-sm text-gray-600">Chip Luck</div>
                  <div className="text-2xl font-bold">{manager.chip_luck.value.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Seasonal, Zero-sum</div>
                </div>
              </div>

              {/* Variance Luck Per-GW */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">1. Variance Luck (Per-GW)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">GW</th>
                        <th className="px-2 py-1 text-left">Opponent</th>
                        <th className="px-2 py-1 text-right">Your Variance</th>
                        <th className="px-2 py-1 text-right">Opp Variance</th>
                        <th className="px-2 py-1 text-right font-bold">Luck</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manager.variance_luck.per_gw.map(gw => (
                        <tr key={gw.gw} className="border-t">
                          <td className="px-2 py-1">GW{gw.gw}</td>
                          <td className="px-2 py-1">{gw.opponent}</td>
                          <td className="px-2 py-1 text-right">{gw.your_var.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">{gw.opp_var.toFixed(2)}</td>
                          <td className={`px-2 py-1 text-right font-bold ${gw.value > 0 ? 'text-green-600' : gw.value < 0 ? 'text-red-600' : ''}`}>
                            {gw.value > 0 ? '+' : ''}{gw.value.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rank Luck Per-GW */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">2. Rank Luck (Per-GW)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">GW</th>
                        <th className="px-2 py-1 text-left">Opponent</th>
                        <th className="px-2 py-1 text-right">Your Rank</th>
                        <th className="px-2 py-1 text-right">Expected Win %</th>
                        <th className="px-2 py-1 text-right">Result</th>
                        <th className="px-2 py-1 text-right font-bold">Luck</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manager.rank_luck.per_gw.map(gw => (
                        <tr key={gw.gw} className="border-t">
                          <td className="px-2 py-1">GW{gw.gw}</td>
                          <td className="px-2 py-1">{gw.opponent}</td>
                          <td className="px-2 py-1 text-right">{gw.your_rank}/{gw.total_managers}</td>
                          <td className="px-2 py-1 text-right">{(gw.expected * 100).toFixed(1)}%</td>
                          <td className="px-2 py-1 text-right">{gw.result === 1 ? 'W' : gw.result === 0 ? 'L' : 'D'}</td>
                          <td className={`px-2 py-1 text-right font-bold ${gw.value > 0 ? 'text-green-600' : gw.value < 0 ? 'text-red-600' : ''}`}>
                            {gw.value > 0 ? '+' : ''}{gw.value.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Schedule Luck */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">3. Schedule Luck (Seasonal)</h3>
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-600">Your Avg Opp Strength</div>
                    <div className="text-xl font-bold">{manager.schedule_luck.avg_opp_strength.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-600">League Avg Opp Strength</div>
                    <div className="text-xl font-bold">{manager.schedule_luck.league_avg_opp_strength.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <div className="text-gray-600">Schedule Luck</div>
                    <div className="text-xl font-bold">{manager.schedule_luck.value.toFixed(2)}</div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">GW</th>
                        <th className="px-2 py-1 text-left">Opponent</th>
                        <th className="px-2 py-1 text-right">Opp Season Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manager.schedule_luck.opponents.map(opp => (
                        <tr key={opp.gw} className="border-t">
                          <td className="px-2 py-1">GW{opp.gw}</td>
                          <td className="px-2 py-1">{opp.opponent}</td>
                          <td className="px-2 py-1 text-right">{opp.opp_season_avg.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chip Luck */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">4. Chip Luck (Seasonal)</h3>
                <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-600">Chips Played</div>
                    <div className="text-xl font-bold">{manager.chip_luck.chips_played}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-600">Chips Faced</div>
                    <div className="text-xl font-bold">{manager.chip_luck.chips_faced}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-gray-600">League Avg Faced</div>
                    <div className="text-xl font-bold">{manager.chip_luck.avg_chips_faced.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded">
                    <div className="text-gray-600">Chip Luck</div>
                    <div className="text-xl font-bold">{manager.chip_luck.value.toFixed(2)}</div>
                  </div>
                </div>
                {manager.chip_luck.chips_faced_detail.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left">GW</th>
                          <th className="px-2 py-1 text-left">Opponent</th>
                          <th className="px-2 py-1 text-left">Chip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manager.chip_luck.chips_faced_detail.map((chip, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1">GW{chip.gw}</td>
                            <td className="px-2 py-1">{chip.opponent}</td>
                            <td className="px-2 py-1">{chip.chip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* GW Luck Index */}
              <div>
                <h3 className="font-semibold mb-2">GW Luck Index (60% Variance + 40% Rank)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">GW</th>
                        <th className="px-2 py-1 text-right">Variance</th>
                        <th className="px-2 py-1 text-right">Rank</th>
                        <th className="px-2 py-1 text-right font-bold">GW Luck</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manager.gw_luck.map(gw => (
                        <tr key={gw.gw} className="border-t">
                          <td className="px-2 py-1">GW{gw.gw}</td>
                          <td className="px-2 py-1 text-right">{gw.variance.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">{gw.rank.toFixed(4)}</td>
                          <td className={`px-2 py-1 text-right font-bold ${gw.total > 0 ? 'text-green-600' : gw.total < 0 ? 'text-red-600' : ''}`}>
                            {gw.total > 0 ? '+' : ''}{gw.total.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Per-GW Sums Validation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Per-GW Variance Validation (Should All Be 0)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">GW</th>
                  <th className="px-2 py-1 text-right">Variance Sum</th>
                  <th className="px-2 py-1 text-right">Rank Sum</th>
                </tr>
              </thead>
              <tbody>
                {data.per_gw_sums.map(gw => (
                  <tr key={gw.gw} className="border-t">
                    <td className="px-2 py-1">GW{gw.gw}</td>
                    <td className={`px-2 py-1 text-right font-bold ${Math.abs(gw.variance_sum) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      {gw.variance_sum.toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-right">{gw.rank_sum.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Download JSON */}
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `luck-k163f-${LEAGUE_ID}.json`;
              a.click();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Download Full JSON Data
          </button>
        </div>
      </div>
    </div>
  );
}
