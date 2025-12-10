'use client';

import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { PitchView } from '@/components/PitchView/PitchView';
import { StatsPanel } from '@/components/PitchView/StatsPanel';

interface Props {
  data: any;
  playerData: any;
  myTeamId: string;
  myManagerName: string;
  myTeamName: string;
  leagueId: string;
  isViewingOther?: boolean;
  onBackToMyTeam?: () => void;
}

export default function MyTeamTab({ leagueId, myTeamId, myManagerName, myTeamName, isViewingOther, onBackToMyTeam }: Props) {
  const [selectedGW, setSelectedGW] = useState<number>(1);
  const [maxGW, setMaxGW] = useState<number>(1);

  // Fetch current GW and max GW
  useEffect(() => {
    async function fetchLeagueInfo() {
      try {
        const response = await fetch(`/api/league/${leagueId}/stats`);
        if (!response.ok) throw new Error('Failed to fetch league info');
        const data = await response.json();
        const currentGW = data.isCurrentGWLive ? data.liveGameweekNumber : (data.activeGW || 1);
        setSelectedGW(currentGW);
        setMaxGW(data.maxGW || 1);
      } catch (err: any) {
        console.error('Error fetching league info:', err);
      }
    }

    fetchLeagueInfo();
  }, [leagueId]);

  return (
    <div className={styles.myTeamTab}>
      {/* Back to My Team button */}
      {isViewingOther && onBackToMyTeam && (
        <button
          onClick={onBackToMyTeam}
          className={styles.backButton}
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'rgba(0, 255, 135, 0.1)',
            color: '#00ff87',
            border: '1px solid rgba(0, 255, 135, 0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 135, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(0, 255, 135, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 135, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(0, 255, 135, 0.3)';
          }}
        >
          ← Back to My Team
        </button>
      )}

      {/* Two-column layout */}
      <div className={styles.pitchViewLayout}>
        {/* Left: Stats Panel */}
        <StatsPanel
          leagueId={leagueId}
          myTeamId={myTeamId}
          myTeamName={myTeamName}
          myManagerName={myManagerName}
          selectedGW={selectedGW}
        />

        {/* Right: Pitch View */}
        <PitchView
          leagueId={leagueId}
          myTeamId={myTeamId}
          selectedGW={selectedGW}
          maxGW={maxGW}
          onGWChange={setSelectedGW}
        />
      </div>
    </div>
  );
}
