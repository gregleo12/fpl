'use client';

import { useState, useEffect } from 'react';
import styles from './PitchView.module.css';
import { PlayerCard } from './PlayerCard';

interface Player {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface PlayerInfo {
  id: number;
  web_name: string;
  team: number;
  team_code: number;
  element_type: number;
  event_points: number;
}

interface Props {
  leagueId: string;
  myTeamId: string;
  selectedGW: number;
  maxGW: number;
  onGWChange: (gw: number) => void;
  showGWSelector?: boolean;
}

export function PitchView({ leagueId, myTeamId, selectedGW, maxGW, onGWChange, showGWSelector = true }: Props) {
  const [picks, setPicks] = useState<Player[]>([]);
  const [playerData, setPlayerData] = useState<{[key: number]: PlayerInfo}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch team data for selected GW
  useEffect(() => {
    async function fetchTeamData() {
      if (!selectedGW) return;

      setIsLoading(true);
      setError('');

      try {
        // Fetch data from our proxy API endpoint
        const response = await fetch(`/api/team/${myTeamId}/gameweek/${selectedGW}`);

        if (!response.ok) {
          throw new Error('Failed to fetch team data');
        }

        const data = await response.json();

        setPicks(data.picks);
        setPlayerData(data.playerData);

      } catch (err: any) {
        setError(err.message || 'Failed to load team data');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeamData();
  }, [myTeamId, selectedGW]);

  // Detect formation
  function detectFormation(): string {
    const starters = picks.filter(p => p.position <= 11);
    const defenders = starters.filter(p => playerData[p.element]?.element_type === 2).length;
    const midfielders = starters.filter(p => playerData[p.element]?.element_type === 3).length;
    const forwards = starters.filter(p => playerData[p.element]?.element_type === 4).length;
    return `${defenders}-${midfielders}-${forwards}`;
  }

  // Get players by position
  const getPlayersByType = (elementType: number, isBench: boolean = false) => {
    if (isBench) {
      return picks.filter(p => p.position > 11 && playerData[p.element]?.element_type === elementType);
    }
    return picks.filter(p => p.position <= 11 && playerData[p.element]?.element_type === elementType);
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        Loading your team...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        {error}
      </div>
    );
  }

  const formation = detectFormation();
  const goalkeepers = getPlayersByType(1);
  const defenders = getPlayersByType(2);
  const midfielders = getPlayersByType(3);
  const forwards = getPlayersByType(4);
  const bench = picks.filter(p => p.position > 11).sort((a, b) => a.position - b.position);

  return (
    <div className={styles.container}>
      {/* GW Selector */}
      {showGWSelector && (
        <div className={styles.gwSelector}>
          <button
            className={styles.gwButton}
            onClick={() => onGWChange(Math.max(1, selectedGW - 1))}
            disabled={selectedGW <= 1}
          >
            ←
          </button>
          <div className={styles.gwDisplay}>
            Gameweek {selectedGW}
          </div>
          <button
            className={styles.gwButton}
            onClick={() => onGWChange(Math.min(maxGW, selectedGW + 1))}
            disabled={selectedGW >= maxGW}
          >
            →
          </button>
        </div>
      )}

      {/* Pitch */}
      <div className={styles.pitch}>
        {/* PITCH MARKINGS - Drawn elements inside container */}
        <div className={styles.pitchMarkings}>
          <div className={styles.pitchBorder} />
          <div className={styles.goalFrame} />
          <div className={styles.sixYardBox} />
          <div className={styles.penaltyArea} />
          <div className={styles.penaltySpot} />
          <div className={styles.halfwayLine} />
          <div className={styles.centerCircle} />
        </div>

        {/* Goalkeepers */}
        <div className={styles.pitchRow}>
          {goalkeepers.map(pick => {
            const player = playerData[pick.element];
            return player ? (
              <PlayerCard
                key={pick.element}
                player={player}
                pick={pick}
              />
            ) : null;
          })}
        </div>

        {/* Defenders */}
        <div className={styles.pitchRow}>
          {defenders.map(pick => {
            const player = playerData[pick.element];
            return player ? (
              <PlayerCard
                key={pick.element}
                player={player}
                pick={pick}
              />
            ) : null;
          })}
        </div>

        {/* Midfielders */}
        <div className={styles.pitchRow}>
          {midfielders.map(pick => {
            const player = playerData[pick.element];
            return player ? (
              <PlayerCard
                key={pick.element}
                player={player}
                pick={pick}
              />
            ) : null;
          })}
        </div>

        {/* Forwards */}
        <div className={styles.pitchRow}>
          {forwards.map(pick => {
            const player = playerData[pick.element];
            return player ? (
              <PlayerCard
                key={pick.element}
                player={player}
                pick={pick}
              />
            ) : null;
          })}
        </div>

        {/* Bench - integrated into pitch */}
        <div className={styles.bench}>
          <div className={styles.benchLabel}>Bench</div>
          <div className={styles.benchRow}>
            {bench.map(pick => {
              const player = playerData[pick.element];
              return player ? (
                <PlayerCard
                  key={pick.element}
                  player={player}
                  pick={pick}
                  isBench={true}
                />
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
