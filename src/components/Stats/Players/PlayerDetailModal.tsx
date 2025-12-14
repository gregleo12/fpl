'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PlayerSummary from './PlayerSummary';
import PlayerHistory from './PlayerHistory';

interface Props {
  playerId: number;
  onClose: () => void;
}

type Tab = 'summary' | 'history' | 'fixtures';

export default function PlayerDetailModal({ playerId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/players/${playerId}`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Error fetching player:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, [playerId]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-[#1a1a2e] rounded-lg p-8">
          <div className="text-white">Loading player data...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-[#1a1a2e] rounded-lg p-8">
          <div className="text-red-400">Failed to load player data</div>
          <button onClick={onClose} className="mt-4 text-gray-400 hover:text-white">Close</button>
        </div>
      </div>
    );
  }

  const { player, history, totals, per90 } = data;

  const statusColor = {
    'a': 'bg-green-500',
    'i': 'bg-red-500',
    's': 'bg-red-500',
    'd': 'bg-yellow-500',
    'u': 'bg-red-500'
  }[player.status] || 'bg-gray-500';

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-700 bg-[#16161e]">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {player.first_name} {player.second_name}
              </h2>
              <p className="text-gray-400 text-sm md:text-base">
                {player.team_name} · {player.position} · £{(player.now_cost / 10).toFixed(1)}m
              </p>
              <p className="text-gray-500 text-xs md:text-sm mt-1">
                Selected by {player.selected_by_percent}%
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Status indicator */}
          {player.status !== 'a' && player.news && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-gray-300">{player.news}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-t border-gray-700 pt-4">
            {(['summary', 'history', 'fixtures'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-purple-500'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'summary' && (
            <PlayerSummary player={player} totals={totals} per90={per90} />
          )}
          {activeTab === 'history' && (
            <PlayerHistory
              history={history}
              totals={totals}
              per90={per90}
              position={player.position}
            />
          )}
          {activeTab === 'fixtures' && (
            <div className="text-gray-400 text-center py-12">
              <p className="text-lg">Fixtures coming soon</p>
              <p className="text-sm mt-2">Future gameweeks and difficulty ratings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
