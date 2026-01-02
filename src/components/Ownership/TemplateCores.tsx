'use client';

import { useState, useEffect } from 'react';
import styles from './Ownership.module.css';

interface TemplatePlayer {
  id: number;
  name: string;
  team: string;
  ownership: number;
}

interface TemplateCore {
  players: TemplatePlayer[];
  count: number;
  percent: number;
}

interface TemplatesData {
  gameweek: number;
  lastUpdated: string;
  sampleSize: number;
  topOwned: TemplatePlayer[];
  cores3: TemplateCore[];
  cores4: TemplateCore[];
  cores5: TemplateCore[];
}

export default function TemplateCores() {
  const [data, setData] = useState<TemplatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/ownership/templates?tier=top10k`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load templates');
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
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading template cores...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <p className={styles.errorHint}>
          {error.includes('No data available') && 'Run `npm run sync:elite-picks` to fetch data.'}
        </p>
      </div>
    );
  }

  if (!data) {
    return <div className={styles.noData}>No template data available</div>;
  }

  return (
    <>
      {/* Top Owned Players */}
      <div className={styles.singlesSection}>
        <h3 className={styles.sectionTitle}>🌟 Most Owned Players</h3>
        <p className={styles.sectionDesc}>
          Players owned by more than 15% of top 10K managers (template players)
        </p>
        <div className={styles.singlesBar}>
          {data.topOwned.map(player => (
            <div key={player.id} className={styles.singleItem}>
              <span className={styles.playerName}>{player.name}</span>
              <span className={styles.teamName} style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                {player.team}
              </span>
              <span className={styles.ownership}>{player.ownership.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3-Player Cores */}
      {data.cores3.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            🎯 3-Player Cores <span className={styles.count}>(Top 10)</span>
          </h3>
          <p className={styles.sectionDesc}>
            Most common 3-player combinations across all teams
          </p>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rankCol}>#</th>
                  <th className={styles.comboCol}>Combination</th>
                  <th className={styles.countCol}>Count</th>
                  <th className={styles.pctAllCol}>% of All</th>
                </tr>
              </thead>
              <tbody>
                {data.cores3.map((core, index) => (
                  <tr key={index} className={styles.row}>
                    <td className={styles.rankCell}>{index + 1}</td>
                    <td className={styles.comboCell}>
                      {core.players.map((player, i) => (
                        <span key={player.id}>
                          <span className={styles.playerName}>{player.name}</span>
                          <span className={styles.playerOwnership}>({player.team})</span>
                          {i < core.players.length - 1 && <span className={styles.plus}> + </span>}
                        </span>
                      ))}
                    </td>
                    <td className={styles.countCell}>{core.count.toLocaleString()}</td>
                    <td className={styles.pctAllCell}>{core.percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4-Player Cores */}
      {data.cores4.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            🎯🎯 4-Player Cores <span className={styles.count}>(Top 10)</span>
          </h3>
          <p className={styles.sectionDesc}>
            Most common 4-player combinations across all teams
          </p>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rankCol}>#</th>
                  <th className={styles.comboCol}>Combination</th>
                  <th className={styles.countCol}>Count</th>
                  <th className={styles.pctAllCol}>% of All</th>
                </tr>
              </thead>
              <tbody>
                {data.cores4.map((core, index) => (
                  <tr key={index} className={styles.row}>
                    <td className={styles.rankCell}>{index + 1}</td>
                    <td className={styles.comboCell}>
                      {core.players.map((player, i) => (
                        <span key={player.id}>
                          <span className={styles.playerName}>{player.name}</span>
                          <span className={styles.playerOwnership}>({player.team})</span>
                          {i < core.players.length - 1 && <span className={styles.plus}> + </span>}
                        </span>
                      ))}
                    </td>
                    <td className={styles.countCell}>{core.count.toLocaleString()}</td>
                    <td className={styles.pctAllCell}>{core.percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5-Player Cores */}
      {data.cores5.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            🎯🎯🎯 5-Player Cores <span className={styles.count}>(Top 5)</span>
          </h3>
          <p className={styles.sectionDesc}>
            Most common 5-player combinations across all teams
          </p>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rankCol}>#</th>
                  <th className={styles.comboCol}>Combination</th>
                  <th className={styles.countCol}>Count</th>
                  <th className={styles.pctAllCol}>% of All</th>
                </tr>
              </thead>
              <tbody>
                {data.cores5.map((core, index) => (
                  <tr key={index} className={styles.row}>
                    <td className={styles.rankCell}>{index + 1}</td>
                    <td className={styles.comboCell}>
                      {core.players.map((player, i) => (
                        <span key={player.id}>
                          <span className={styles.playerName}>{player.name}</span>
                          <span className={styles.playerOwnership}>({player.team})</span>
                          {i < core.players.length - 1 && <span className={styles.plus}> + </span>}
                        </span>
                      ))}
                    </td>
                    <td className={styles.countCell}>{core.count.toLocaleString()}</td>
                    <td className={styles.pctAllCell}>{core.percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className={styles.infoFooter}>
        ℹ️ Data from {data.sampleSize.toLocaleString()} managers in top 10K overall • Template players are those owned by &gt;15% of sample
      </div>
    </>
  );
}
