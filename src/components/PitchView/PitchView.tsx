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
}

export function PitchView({ leagueId, myTeamId }: Props) {
  const [selectedGW, setSelectedGW] = useState<number>(1);
  const [maxGW, setMaxGW] = useState<number>(1);
  const [picks, setPicks] = useState<Player[]>([]);
  const [playerData, setPlayerData] = useState<{[key: number]: PlayerInfo}>({});
  const [overallPoints, setOverallPoints] = useState<number>(0);
  const [overallRank, setOverallRank] = useState<number>(0);
  const [gwPoints, setGwPoints] = useState<number>(0);
  const [transfers, setTransfers] = useState<{ count: number; cost: number }>({ count: 0, cost: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Fetch team data for selected GW
  useEffect(() => {
    async function fetchTeamData() {
      if (!selectedGW) return;

      setIsLoading(true);
      setError('');

      try {
        // Fetch user's picks for the selected GW
        const picksResponse = await fetch(
          `https://fantasy.premierleague.com/api/entry/${myTeamId}/event/${selectedGW}/picks/`
        );
        if (!picksResponse.ok) throw new Error('Failed to fetch picks');
        const picksData = await picksResponse.json();

        // Fetch bootstrap data for player info
        const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
        if (!bootstrapResponse.ok) throw new Error('Failed to fetch player data');
        const bootstrapData = await bootstrapResponse.json();

        // Create player lookup
        const playerLookup: {[key: number]: PlayerInfo} = {};
        bootstrapData.elements.forEach((player: any) => {
          playerLookup[player.id] = {
            id: player.id,
            web_name: player.web_name,
            team: player.team,
            team_code: player.team_code,
            element_type: player.element_type,
            event_points: player.event_points || 0
          };
        });

        setPicks(picksData.picks);
        setPlayerData(playerLookup);
        setGwPoints(picksData.entry_history.points);
        setTransfers({
          count: picksData.entry_history.event_transfers,
          cost: picksData.entry_history.event_transfers_cost
        });

        // Fetch entry info for overall stats
        const entryResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${myTeamId}/`);
        if (!entryResponse.ok) throw new Error('Failed to fetch entry info');
        const entryData = await entryResponse.json();

        setOverallPoints(entryData.summary_overall_points);
        setOverallRank(entryData.summary_overall_rank);

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
      {/* Overall Stats */}
      <div className={styles.overallStats}>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{overallPoints.toLocaleString()}</div>
          <div className={styles.statLabel}>Overall Points</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>
            {overallRank > 0 ? `▲ ${overallRank.toLocaleString()}` : '-'}
          </div>
          <div className={styles.statLabel}>Overall Rank</div>
        </div>
      </div>

      {/* GW Selector */}
      <div className={styles.gwSelector}>
        <button
          className={styles.gwButton}
          onClick={() => setSelectedGW(Math.max(1, selectedGW - 1))}
          disabled={selectedGW <= 1}
        >
          ←
        </button>
        <div className={styles.gwDisplay}>
          Gameweek {selectedGW}
        </div>
        <button
          className={styles.gwButton}
          onClick={() => setSelectedGW(Math.min(maxGW, selectedGW + 1))}
          disabled={selectedGW >= maxGW}
        >
          →
        </button>
      </div>

      {/* GW Stats */}
      <div className={styles.gwStats}>
        <div className={styles.gwStatBox}>
          <div className={styles.gwStatValue}>{gwPoints}</div>
          <div className={styles.gwStatLabel}>Points</div>
        </div>
        <div className={styles.gwStatBox}>
          <div className={styles.gwStatValue}>{transfers.count}</div>
          <div className={styles.gwStatLabel}>Transfers</div>
          {transfers.cost > 0 && (
            <div className={styles.gwStatCost}>-{transfers.cost} pts</div>
          )}
        </div>
      </div>

      {/* Formation Display */}
      <div className={styles.formationBadge}>
        {formation}
      </div>

      {/* Pitch */}
      <div className={styles.pitch}>
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
      </div>

      {/* Bench */}
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
  );
}
