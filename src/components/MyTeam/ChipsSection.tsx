'use client';

import { useState, useEffect } from 'react';
import styles from './ChipsSection.module.css';
import { shortenManagerName } from '@/lib/nameUtils';

interface Props {
  myTeamId: string;
  leagueId: string;
}

// Helper to get chip abbreviation
function getChipAbbreviation(chipName: string): string {
  const chipMap: { [key: string]: string } = {
    'wildcard': 'WC',
    'bboost': 'BB',
    '3xc': 'TC',
    'freehit': 'FH'
  };

  const normalized = chipName.toLowerCase().replace(/\s+/g, '');
  return chipMap[normalized] || chipName;
}

export default function ChipsSection({ myTeamId, leagueId }: Props) {
  const [chipsPlayed, setChipsPlayed] = useState<any[]>([]);
  const [chipsFaced, setChipsFaced] = useState<any[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchChipsData() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/player/${myTeamId}?leagueId=${leagueId}`);
        if (!response.ok) throw new Error('Failed to fetch chips data');

        const data = await response.json();
        setChipsPlayed(data.chipsPlayed || []);
        setChipsFaced(data.chipsFaced || []);
        setMatchHistory(data.matchHistory || []);
      } catch (err) {
        console.error('Error fetching chips data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchChipsData();
  }, [myTeamId, leagueId]);

  if (isLoading) {
    return <div className={styles.loading}>Loading chips data...</div>;
  }

  return (
    <div className={styles.chipsSection}>
      {/* Chips Played */}
      <div className={styles.subsection}>
        <h4 className={styles.subsectionTitle}>Chips Played</h4>
        {chipsPlayed.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Chip</th>
                  <th>GW</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {chipsPlayed.map((chip: any) => {
                  const match = matchHistory.find((m: any) => m.event === chip.event);
                  return (
                    <tr key={chip.event}>
                      <td>
                        <span className={styles.chipBadge}>
                          {getChipAbbreviation(chip.name)}
                        </span>
                      </td>
                      <td>{chip.event}</td>
                      <td>{match?.opponentName ? shortenManagerName(match.opponentName) : '-'}</td>
                      <td>
                        {match ? `${match.playerPoints}-${match.opponentPoints}` : '-'}
                      </td>
                      <td>
                        {match && (
                          <span className={`${styles.resultBadge} ${
                            match.result === 'W' ? styles.resultWin :
                            match.result === 'D' ? styles.resultDraw :
                            styles.resultLoss
                          }`}>
                            {match.result}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>No chips played yet</p>
        )}
      </div>

      {/* Chips Faced */}
      <div className={styles.subsection}>
        <h4 className={styles.subsectionTitle}>Chips Faced</h4>
        {chipsFaced.length > 0 ? (
          <>
            <div className={styles.chipsSummary}>
              <span>Faced <strong>{chipsFaced.length}</strong> chips total - </span>
              <span className={styles.positive}>
                Won {chipsFaced.filter((c: any) => c.result === 'W').length}
              </span>
              <span> / </span>
              <span className={styles.negative}>
                Lost {chipsFaced.filter((c: any) => c.result === 'L').length}
              </span>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Chip</th>
                    <th>GW</th>
                    <th>Opponent</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {chipsFaced
                    .sort((a: any, b: any) => a.event - b.event)
                    .map((chip: any, idx: number) => {
                      const match = matchHistory.find((m: any) => m.event === chip.event);
                      const yourScore = match?.playerPoints || 0;
                      return (
                        <tr key={idx}>
                          <td>
                            <span className={`${styles.chipBadge} ${
                              chip.result === 'W' ? styles.chipWin :
                              chip.result === 'L' ? styles.chipLoss :
                              ''
                            }`}>
                              {getChipAbbreviation(chip.chipName)}
                            </span>
                          </td>
                          <td>{chip.event}</td>
                          <td>{shortenManagerName(chip.opponentName)}</td>
                          <td>
                            {yourScore}-{chip.opponentPoints}
                          </td>
                          <td>
                            <span className={`${styles.resultBadge} ${
                              chip.result === 'W' ? styles.resultWin :
                              chip.result === 'D' ? styles.resultDraw :
                              styles.resultLoss
                            }`}>
                              {chip.result}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className={styles.emptyState}>No chips faced yet</p>
        )}
      </div>
    </div>
  );
}
