'use client';

import { useState, useEffect } from 'react';
import styles from './Awards.module.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AwardCard } from './AwardCard';

export interface AwardData {
  category: string;
  winner: {
    entry_id: number;
    player_name: string;
    team_name: string;
    value: number | string;
  } | null;
}

export interface MonthAwardsData {
  month: number;
  monthName: string;
  startGW: number;
  endGW: number;
  awards: AwardData[];
}

interface Props {
  leagueId: string;
  completedGameweeks: number;
}

// Helper to get month info from GW number
function getMonthFromGW(gw: number): number {
  // GW1-4 = August (month 0)
  // GW5-8 = September (month 1)
  // GW9-12 = October (month 2)
  // GW13-16 = November (month 3)
  // GW17-21 = December (month 4)
  // GW22-25 = January (month 5)
  // GW26-29 = February (month 6)
  // GW30-33 = March (month 7)
  // GW34-38 = April/May (month 8)

  if (gw <= 4) return 0;  // August
  if (gw <= 8) return 1;  // September
  if (gw <= 12) return 2; // October
  if (gw <= 16) return 3; // November
  if (gw <= 21) return 4; // December
  if (gw <= 25) return 5; // January
  if (gw <= 29) return 6; // February
  if (gw <= 33) return 7; // March
  return 8;               // April/May
}

function getMonthName(monthIndex: number): string {
  const months = [
    'August',
    'September',
    'October',
    'November',
    'December',
    'January',
    'February',
    'March',
    'April/May'
  ];
  return months[monthIndex];
}

function getMonthRange(monthIndex: number): { startGW: number; endGW: number } {
  const ranges = [
    { startGW: 1, endGW: 4 },    // August
    { startGW: 5, endGW: 8 },    // September
    { startGW: 9, endGW: 12 },   // October
    { startGW: 13, endGW: 16 },  // November
    { startGW: 17, endGW: 21 },  // December
    { startGW: 22, endGW: 25 },  // January
    { startGW: 26, endGW: 29 },  // February
    { startGW: 30, endGW: 33 },  // March
    { startGW: 34, endGW: 38 },  // April/May
  ];
  return ranges[monthIndex];
}

export function Awards({ leagueId, completedGameweeks }: Props) {
  // Determine current month based on completed GWs
  const currentMonthIndex = getMonthFromGW(completedGameweeks);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);
  const [data, setData] = useState<MonthAwardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMonthAwards(selectedMonth);
  }, [selectedMonth, leagueId]);

  async function fetchMonthAwards(monthIndex: number) {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/league/${leagueId}/stats/awards/${monthIndex}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch monthly awards');
      }

      const awardsData = await response.json();
      setData(awardsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load monthly awards');
    } finally {
      setIsLoading(false);
    }
  }

  // Navigation handlers
  function goToPrevMonth() {
    if (selectedMonth > 0) {
      setSelectedMonth(selectedMonth - 1);
    }
  }

  function goToNextMonth() {
    if (selectedMonth < currentMonthIndex) {
      setSelectedMonth(selectedMonth + 1);
    }
  }

  if (isLoading) {
    return <div className={styles.loading}>Loading awards...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Month Selector */}
      <div className={styles.monthSelector}>
        <button
          className={styles.navButton}
          onClick={goToPrevMonth}
          disabled={selectedMonth === 0}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>

        <div className={styles.monthInfo}>
          <h2 className={styles.monthName}>{data.monthName}</h2>
          <p className={styles.monthRange}>
            GW {data.startGW}-{data.endGW}
          </p>
        </div>

        <button
          className={styles.navButton}
          onClick={goToNextMonth}
          disabled={selectedMonth >= currentMonthIndex}
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Awards Grid */}
      <div className={styles.awardsGrid}>
        {data.awards.map((award) => (
          <AwardCard
            key={award.category}
            award={award}
            leagueId={leagueId}
            monthName={data.monthName}
          />
        ))}
      </div>
    </div>
  );
}
