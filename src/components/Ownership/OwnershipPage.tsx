'use client';

import { useState, useEffect } from 'react';
import styles from './Ownership.module.css';
import TeamSelector from './TeamSelector';
import CombinationTable from './CombinationTable';
import StackingSummary from './StackingSummary';
import TemplateCores from './TemplateCores';
import OwnershipPlayers from './OwnershipPlayers';

type TabType = 'combinations' | 'stacking' | 'templates' | 'players';

interface Player {
  id: number;
  name: string;
  ownership: number;
}

interface Combination {
  players: Player[];
  count: number;
  percentOfStackers: number;  // % of managers with 2+ (or 3+) from this team
  percentOfAll: number;        // % of all managers in sample
}

interface SingleOwnership {
  id: number;
  name: string;
  count: number;
  percentage: number;
}

interface CombinationsData {
  team: {
    id: number;
    name: string;
    short_name: string;
  };
  gameweek: number;
  sample_tier: string;
  sample_size: number;
  last_updated: string;
  multi_owners: {
    doubles: number;
    triples: number;
  };
  triples: Combination[];
  doubles: Combination[];
  singles: SingleOwnership[];
}

interface TeamSummary {
  team: {
    id: number;
    name: string;
    short_name: string;
  };
  doubleUpCount: number;
  doubleUpPercent: number;
  tripleUpCount: number;
  tripleUpPercent: number;
  topCombo: {
    players: string[];
    count: number;
    percent: number;
  } | null;
}

interface SummaryData {
  gameweek: number;
  lastUpdated: string;
  sampleSize: number;
  teams: TeamSummary[];
}

export default function OwnershipPage() {
  const [activeTab, setActiveTab] = useState<TabType>('combinations');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null); // null = show team selector
  const [data, setData] = useState<CombinationsData | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Only fetch when on combinations tab with selected team, or on stacking tab
      if (activeTab === 'combinations' && selectedTeamId === null) {
        setLoading(false);
        return;
      }

      if (activeTab === 'templates') {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'stacking') {
          // Fetch summary for all teams
          const response = await fetch(`/api/ownership/summary?tier=top10k`);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load summary');
          }

          const result = await response.json();
          setSummaryData(result);
          setData(null);
        } else if (activeTab === 'combinations' && selectedTeamId !== null) {
          // Fetch combinations for specific team
          const response = await fetch(`/api/ownership/combinations?team=${selectedTeamId}&tier=top10k`);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load data');
          }

          const result = await response.json();
          setData(result);
          setSummaryData(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab, selectedTeamId]);

  const handleTeamSelect = (teamId: number | null) => {
    setSelectedTeamId(teamId);
  };

  const handleBackToOverview = () => {
    setSelectedTeamId(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>🎯 Top 10K Ownership Combinations</h1>
        <p className={styles.subtitle}>
          See what player combinations elite FPL managers own together from each team
        </p>
        {(data || summaryData) && (
          <div className={styles.meta}>
            Last updated: GW{data?.gameweek || summaryData?.gameweek} • {new Date(data?.last_updated || summaryData?.lastUpdated || '').toLocaleDateString()} • {data?.sample_size || summaryData?.sampleSize || 0} teams
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tab} ${activeTab === 'combinations' ? styles.activeTab : ''}`}
          onClick={() => {
            setActiveTab('combinations');
            setSelectedTeamId(null);
          }}
        >
          Team Combinations
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'stacking' ? styles.activeTab : ''}`}
          onClick={() => {
            setActiveTab('stacking');
            setSelectedTeamId(null);
          }}
        >
          Team Stacking
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'templates' ? styles.activeTab : ''}`}
          onClick={() => {
            setActiveTab('templates');
            setSelectedTeamId(null);
          }}
        >
          Template Cores
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'players' ? styles.activeTab : ''}`}
          onClick={() => {
            setActiveTab('players');
            setSelectedTeamId(null);
          }}
        >
          Players
        </button>
      </div>

      {/* Team selector - always show on combinations tab */}
      {activeTab === 'combinations' && (
        <TeamSelector selectedTeamId={selectedTeamId} onChange={handleTeamSelect} />
      )}

      {loading && (
        <div className={styles.loading}>Loading ownership data...</div>
      )}

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <p className={styles.errorHint}>
            {error.includes('No data available') && 'Run `npm run sync:elite-picks` to fetch data.'}
          </p>
        </div>
      )}

      {/* Team Stacking Tab Content */}
      {!loading && !error && summaryData && activeTab === 'stacking' && (
        <>
          <StackingSummary teams={summaryData.teams} onTeamClick={(teamId) => {
            setActiveTab('combinations');
            setSelectedTeamId(teamId);
          }} />

          {/* Info Footer */}
          <div className={styles.infoFooter}>
            ℹ️ Data from {summaryData.sampleSize.toLocaleString()} managers in top 10K overall (by total points)
          </div>
        </>
      )}

      {/* Template Cores Tab Content */}
      {!loading && !error && activeTab === 'templates' && (
        <TemplateCores />
      )}

      {/* Players Tab Content */}
      {activeTab === 'players' && (
        <OwnershipPlayers />
      )}

      {/* Team Combinations Tab - Detail View */}
      {!loading && !error && data && activeTab === 'combinations' && (
        <>
          {/* Detail View */}
          {/* Singles Bar */}
          <div className={styles.singlesSection}>
            <h3 className={styles.sectionTitle}>📊 Single Ownership</h3>
            <div className={styles.singlesBar}>
              {data.singles.slice(0, 8).map(player => (
                <div key={player.id} className={styles.singleItem}>
                  <span className={styles.playerName}>{player.name}</span>
                  <span className={styles.ownership}>{player.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Doubles */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              👥 Double-Ups <span className={styles.count}>({data.doubles.length > 0 ? data.multi_owners.doubles : 0} managers)</span>
            </h3>
            {data.doubles.length > 0 ? (
              <>
                <p className={styles.sectionDesc}>
                  {((data.multi_owners.doubles / data.sample_size) * 100).toFixed(1)}% of managers own 2+ {data.team.name} players
                </p>
                <CombinationTable combinations={data.doubles} type="doubles" />
              </>
            ) : (
              <p className={styles.noData}>No managers own 2+ players from {data.team.name}</p>
            )}
          </div>

          {/* Triples */}
          {data.triples.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                👥👥 Triple-Ups <span className={styles.count}>({data.multi_owners.triples} managers)</span>
              </h3>
              <p className={styles.sectionDesc}>
                {((data.multi_owners.triples / data.sample_size) * 100).toFixed(1)}% of managers own 3+ {data.team.name} players
              </p>
              <CombinationTable combinations={data.triples} type="triples" />
            </div>
          )}

          {/* Info Footer */}
          <div className={styles.infoFooter}>
            ℹ️ Data from {data.sample_size.toLocaleString()} managers in top 10K overall (by total points)
          </div>
        </>
      )}
    </div>
  );
}
