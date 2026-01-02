'use client';

import { useState, useEffect } from 'react';
import { Awards } from './season/Awards';

interface AwardsTabProps {
  leagueId: string;
}

export default function AwardsTab({ leagueId }: AwardsTabProps) {
  const [completedGameweeks, setCompletedGameweeks] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeagueData();
  }, [leagueId]);

  async function fetchLeagueData() {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/league/${leagueId}/stats/season`);

      if (!response.ok) {
        throw new Error('Failed to fetch season data');
      }

      const data = await response.json();
      setCompletedGameweeks(data.completedGameweeks || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load awards data');
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
        Loading awards...
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

  return (
    <Awards leagueId={leagueId} completedGameweeks={completedGameweeks} />
  );
}
