'use client';

import { useState, useEffect } from 'react';
import { AwardCard } from './AwardCard';
import styles from './AwardsTab.module.css';

type AwardView = 'gameweek' | 'monthly' | 'season';

interface AwardsTabProps {
  leagueId: string;
  myTeamId: string;
}

export default function AwardsTab({ leagueId, myTeamId }: AwardsTabProps) {
  const [view, setView] = useState<AwardView>('gameweek');
  const [awards, setAwards] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCompletedGW, setLastCompletedGW] = useState<number | null>(null);

  useEffect(() => {
    fetchAwards();
  }, [view, leagueId]);

  async function fetchAwards() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/league/${leagueId}/awards?view=${view}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch awards');
      }
      const data = await response.json();
      console.log('Awards data:', data); // Debug log
      setAwards(data);
      if (data.lastCompletedGW) {
        setLastCompletedGW(data.lastCompletedGW);
      }
    } catch (error: any) {
      console.error('Error fetching awards:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !awards) {
    return <div className={styles.loading}>Loading awards...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error loading awards: {error}</div>;
  }

  return (
    <div className={styles.awardsTab}>
      {/* Toggle */}
      <div className={styles.toggleContainer}>
        <button
          className={`${styles.toggleButton} ${view === 'gameweek' ? styles.active : ''}`}
          onClick={() => setView('gameweek')}
        >
          {lastCompletedGW ? `GW${lastCompletedGW}` : 'Last GW'}
        </button>
        <button
          className={`${styles.toggleButton} ${view === 'monthly' ? styles.active : ''}`}
          onClick={() => setView('monthly')}
        >
          This Month
        </button>
        <button
          className={`${styles.toggleButton} ${view === 'season' ? styles.active : ''}`}
          onClick={() => setView('season')}
        >
          Season
        </button>
      </div>

      {/* Awards Grid */}
      <div className={styles.awardsGrid}>
        {view === 'gameweek' && <GameweekAwards awards={awards?.gameweek || {}} />}
        {view === 'monthly' && <MonthlyAwards awards={awards?.monthly || {}} />}
        {view === 'season' && <SeasonAwards awards={awards?.season || {}} />}
      </div>
    </div>
  );
}

function GameweekAwards({ awards }: { awards: any }) {
  return (
    <>
      <AwardCard
        type="positive"
        icon="⭐"
        title="Top Gun"
        subtitle="Highest Gameweek score"
        winner={awards.topGun}
      />

      <AwardCard
        type="negative"
        icon="😬"
        title="Tough Week"
        subtitle="Lowest Gameweek score"
        winner={awards.toughWeek}
      />

      <AwardCard
        type="positive"
        icon="📈"
        title="Comeback Kid"
        subtitle="Biggest rank rise"
        winner={awards.comebackKid}
      />

      <AwardCard
        type="negative"
        icon="📉"
        title="Rank Crasher"
        subtitle="Biggest rank fall"
        winner={awards.rankCrasher}
      />

      <AwardCard
        type="positive"
        icon="🎖️"
        title="Chip Master"
        subtitle="Best score with a chip"
        winner={awards.chipMaster}
      />

      <AwardCard
        type="positive"
        icon="👑"
        title="Captain Fantastic"
        subtitle="Captain contributed >50% of score"
        winner={awards.captainFantastic}
      />

      <AwardCard
        type="negative"
        icon="💺"
        title="Bench Disaster"
        subtitle="Left 20+ points on bench"
        winner={awards.benchDisaster}
      />

      <AwardCard
        type="negative"
        icon="👎"
        title="Captain Flop"
        subtitle="Captain scored <4 points"
        winner={awards.captainFlop}
      />
    </>
  );
}

function MonthlyAwards({ awards }: { awards: any }) {
  return (
    <>
      <AwardCard
        type="positive"
        icon="🌟"
        title="Month MVP"
        subtitle="Most H2H points this month"
        winner={awards.monthMVP}
      />

      <AwardCard
        type="negative"
        icon="📉"
        title="Month's Faller"
        subtitle="Biggest rank drop this month"
        winner={awards.monthFaller}
      />

      <AwardCard
        type="positive"
        icon="🚀"
        title="Month's Highest Score"
        subtitle="Best single gameweek this month"
        winner={awards.monthHighest}
      />

      <AwardCard
        type="negative"
        icon="😬"
        title="Month's Toughest"
        subtitle="Lowest average score this month"
        winner={awards.monthToughest}
      />

      <AwardCard
        type="positive"
        icon="👑"
        title="Captain of the Month"
        subtitle="Best average captain score"
        winner={awards.captainOfMonth}
      />

      <AwardCard
        type="negative"
        icon="💺"
        title="Month's Bench Waste"
        subtitle="Most bench points this month"
        winner={awards.benchWaste}
      />
    </>
  );
}

function SeasonAwards({ awards }: { awards: any }) {
  return (
    <>
      <AwardCard
        type="positive"
        icon="👑"
        title="Season Leader"
        subtitle="Current #1 ranked"
        winner={awards.seasonLeader}
      />

      <AwardCard
        type="positive"
        icon="🔥"
        title="Hottest Streak"
        subtitle="Longest winning streak"
        winner={awards.hottestStreak}
      />

      <AwardCard
        type="positive"
        icon="🚀"
        title="Highest Peak"
        subtitle="Single highest gameweek score"
        winner={awards.highestPeak}
      />

      <AwardCard
        type="positive"
        icon="💪"
        title="Most Wins"
        subtitle="Most H2H wins"
        winner={awards.mostWins}
      />

      <AwardCard
        type="positive"
        icon="🎯"
        title="Consistency King"
        subtitle="Lowest score variance"
        winner={awards.consistencyKing}
      />

      <AwardCard
        type="positive"
        icon="💰"
        title="Richest Squad"
        subtitle="Highest team value"
        winner={awards.richestSquad}
      />

      <AwardCard
        type="positive"
        icon="📊"
        title="Points Machine"
        subtitle="Highest total FPL points"
        winner={awards.pointsMachine}
      />

      <AwardCard
        type="negative"
        icon="😅"
        title="Longest Losing Streak"
        subtitle="Most consecutive losses"
        winner={awards.losingStreak}
      />

      <AwardCard
        type="negative"
        icon="💺"
        title="Total Bench Waste"
        subtitle="Most total points on bench"
        winner={awards.totalBenchWaste}
      />

      <AwardCard
        type="negative"
        icon="🎲"
        title="Wildest Ride"
        subtitle="Highest score variance"
        winner={awards.wildestRide}
      />

      <AwardCard
        type="negative"
        icon="🔄"
        title="Hit Parade"
        subtitle="Most transfer hits taken"
        winner={awards.hitParade}
      />

      <AwardCard
        type="negative"
        icon="📉"
        title="Worst Loss"
        subtitle="Biggest margin of defeat"
        winner={awards.worstLoss}
      />
    </>
  );
}
