'use client';

import { useState, useEffect } from 'react';
import styles from './MatchHistorySection.module.css';
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

export default function MatchHistorySection({ myTeamId, leagueId }: Props) {
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [chipsPlayed, setChipsPlayed] = useState<any[]>([]);
  const [chipsFaced, setChipsFaced] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMatchHistory() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/player/${myTeamId}?leagueId=${leagueId}`);
        if (!response.ok) throw new Error('Failed to fetch match history');

        const data = await response.json();
        setMatchHistory(data.matchHistory || []);
        setChipsPlayed(data.chipsPlayed || []);
        setChipsFaced(data.chipsFaced || []);
      } catch (err) {
        console.error('Error fetching match history:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMatchHistory();
  }, [myTeamId, leagueId]);

  if (isLoading) {
    return <div className={styles.loading}>Loading match history...</div>;
  }

  if (matchHistory.length === 0) {
    return <p className={styles.emptyState}>No match history available yet</p>;
  }

  return (
    <div className={styles.matchHistorySection}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>GW</th>
              <th>Opponent</th>
              <th>Score</th>
              <th>Chips</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {matchHistory.slice().reverse().map((match: any) => {
              // Check if you played a chip in this GW
              const yourChip = chipsPlayed.find((c: any) => c.event === match.event);
              // Check if opponent played a chip in this GW
              const oppChip = chipsFaced.find((c: any) => c.event === match.event);

              return (
                <tr key={match.event}>
                  <td>{match.event}</td>
                  <td>{shortenManagerName(match.opponentName)}</td>
                  <td>{match.playerPoints}-{match.opponentPoints}</td>
                  <td>
                    <div className={styles.chipsCell}>
                      {yourChip && (
                        <span className={`${styles.chipBadgeSmall} ${styles.yourChip}`}>
                          {getChipAbbreviation(yourChip.name)}
                        </span>
                      )}
                      {oppChip && (
                        <span className={`${styles.chipBadgeSmall} ${styles.oppChip}`}>
                          {getChipAbbreviation(oppChip.chipName)}
                        </span>
                      )}
                      {!yourChip && !oppChip && (
                        <span className={styles.noChip}>-</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={
                      match.result === 'W' ? styles.positive :
                      match.result === 'L' ? styles.negative :
                      ''
                    }>
                      {match.result} {match.margin > 0 ? `+${match.margin}` : match.margin}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
