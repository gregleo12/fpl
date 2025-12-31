'use client';

import { useState, useEffect } from 'react';
import styles from './Ownership.module.css';
import TeamSelector from './TeamSelector';
import CombinationTable from './CombinationTable';

interface Player {
  id: number;
  name: string;
  ownership: number;
}

interface Combination {
  players: Player[];
  count: number;
  percentage: number;
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

export default function OwnershipPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<number>(1); // Default: Arsenal
  const [data, setData] = useState<CombinationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/ownership/combinations?team=${selectedTeamId}&tier=top10k`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedTeamId]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>🎯 Top 10K Ownership Combinations</h1>
        <p className={styles.subtitle}>
          See what player combinations elite FPL managers own together from each team
        </p>
        {data && (
          <div className={styles.meta}>
            Last updated: GW{data.gameweek} • {new Date(data.last_updated).toLocaleDateString()} • {data.sample_size.toLocaleString()} teams
          </div>
        )}
      </header>

      <TeamSelector selectedTeamId={selectedTeamId} onChange={setSelectedTeamId} />

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

      {!loading && !error && data && (
        <>
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
