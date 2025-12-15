'use client';

import { useState, useEffect } from 'react';
import { StatsHub } from './StatsHub';

interface StatsTabProps {
  leagueId: string;
  myTeamId: string;
  myTeamName: string;
  myManagerName: string;
}

export default function StatsTab({ leagueId, myTeamId, myTeamName, myManagerName }: StatsTabProps) {
  const [leagueData, setLeagueData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeagueData();
  }, [leagueId]);

  async function fetchLeagueData() {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/league/${leagueId}/stats`);

      if (!response.ok) {
        throw new Error('Failed to fetch league data');
      }

      const data = await response.json();
      setLeagueData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load league data');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.7)'
      }}>
        Loading stats...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#ef4444'
      }}>
        {error}
      </div>
    );
  }

  if (!leagueData) {
    return null;
  }

  // Only show GW as "current" if it's actually live OR it's the last completed GW
  const currentGW = leagueData.isCurrentGWLive
    ? leagueData.liveGameweekNumber
    : leagueData.activeGW || 1;
  const maxGW = leagueData.maxGW || 1;

  return (
    <StatsHub
      leagueId={leagueId}
      currentGW={currentGW}
      maxGW={maxGW}
      isCurrentGWLive={leagueData.isCurrentGWLive || false}
      myTeamId={myTeamId}
      myTeamName={myTeamName}
      myManagerName={myManagerName}
    />
  );
}
