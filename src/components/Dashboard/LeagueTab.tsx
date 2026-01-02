'use client';

import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { shortenTeamName, shortenManagerName } from '@/lib/nameUtils';
import { formatLuckValue } from '@/lib/luckFormatting';

interface Props {
  data: any;
  myTeamId: string;
  leagueId: string;
  onTeamClick?: (entryId: number, playerName: string, teamName: string) => void;
}

export default function LeagueTab({ data: initialData, myTeamId, leagueId, onTeamClick }: Props) {
  // Smart default: Show LIVE when GW is active, OFFICIAL when finished
  // Default to OFFICIAL (false) if isLive is undefined
  const [showLiveRankings, setShowLiveRankings] = useState(initialData?.isLive ?? false);
  const [data, setData] = useState(initialData);
  const [isLoadingToggle, setIsLoadingToggle] = useState(false);
  const [userHasToggledManually, setUserHasToggledManually] = useState(false);

  const handleToggleLiveRankings = async () => {
    setIsLoadingToggle(true);
    const newMode = !showLiveRankings;
    setShowLiveRankings(newMode);
    setUserHasToggledManually(true); // Mark that user has manually chosen a mode

    try {
      const response = await fetch(
        `/api/league/${leagueId}/stats?mode=${newMode ? 'live' : 'official'}&t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }
      );
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setIsLoadingToggle(false);
    }
  };

  useEffect(() => {
    setData(initialData);
    // Only update toggle state from data if user hasn't manually set a preference
    // This prevents the toggle from resetting after pull-to-refresh
    if (!userHasToggledManually && initialData?.isLive !== undefined) {
      setShowLiveRankings(initialData.isLive);
    }
  }, [initialData, userHasToggledManually]);

  if (!data || !data.standings) {
    return <div className={styles.emptyState}>No league data available</div>;
  }

  return (
    <div className={styles.leagueTab}>
      <div className={styles.section}>
        <div className={styles.sectionHeaderWithToggle}>
          <h2 className={styles.sectionTitle}>League Rankings</h2>
          <button
            onClick={handleToggleLiveRankings}
            className={`${styles.liveToggle} ${showLiveRankings ? styles.liveToggleActive : ''}`}
            disabled={isLoadingToggle}
          >
            {isLoadingToggle ? '...' : showLiveRankings ? 'LIVE' : 'OFFICIAL'}
          </button>
        </div>
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th className={styles.rankCol}>Rank</th>
                <th className={styles.teamCol}>Team</th>
                <th className={styles.recordCol}>W</th>
                <th className={styles.recordCol}>D</th>
                <th className={styles.recordCol}>L</th>
                <th className={styles.formCol}>Form</th>
                <th className={styles.streakCol}>Streak</th>
                <th className={styles.pfCol}>PF</th>
                <th className={styles.luckCol}>Luck</th>
                <th className={styles.ptsCol}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((team: any) => {
                const isMyTeam = team.entry_id.toString() === myTeamId;
                const isAverage = team.entry_id === -1 || team.player_name === 'AVERAGE';
                const luck = team.luck || 0; // K-150: Use luck instead of differential
                const rankChange = team.rankChange || 0;

                const handleRowClick = () => {
                  if (!isAverage && onTeamClick) {
                    onTeamClick(team.entry_id, team.player_name, team.team_name);
                  }
                };

                return (
                  <tr
                    key={team.entry_id}
                    className={isMyTeam ? styles.myTeamRow : ''}
                    onClick={handleRowClick}
                    style={
                      isAverage
                        ? { opacity: 0.6, fontStyle: 'italic', cursor: 'default' }
                        : { cursor: 'pointer' }
                    }
                  >
                    <td className={styles.rankCol}>
                      <div className={styles.rankCell}>
                        <span className={styles.currentRank}>{team.rank}</span>
                        {rankChange !== 0 && (
                          <span className={`${styles.rankChangeIndicator} ${
                            rankChange > 0 ? styles.rankUp : styles.rankDown
                          }`}>
                            {rankChange > 0 ? '▲' : '▼'}{Math.abs(rankChange)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.teamCol}>
                      <div className={styles.teamCell}>
                        <span className={styles.teamName}>{shortenTeamName(team.team_name)}</span>
                        <span className={styles.managerName}>{shortenManagerName(team.player_name)}</span>
                      </div>
                    </td>
                    <td className={styles.recordCol}>{team.matches_won}</td>
                    <td className={styles.recordCol}>{team.matches_drawn}</td>
                    <td className={styles.recordCol}>{team.matches_lost}</td>
                    <td className={styles.formCol}>
                      <div className={styles.form}>
                        {team.formArray?.map((result: string, idx: number) => (
                          <span
                            key={idx}
                            className={`${styles.formIndicator} ${
                              result === 'W' ? styles.formWin :
                              result === 'D' ? styles.formDraw :
                              styles.formLoss
                            }`}
                          >
                            {result}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={styles.streakCol}>
                      {team.streak && (
                        <span
                          className={`${styles.streak} ${
                            team.streak.startsWith('W') ? styles.streakWin :
                            team.streak.startsWith('D') ? styles.streakDraw :
                            styles.streakLoss
                          }`}
                        >
                          {team.streak}
                        </span>
                      )}
                    </td>
                    <td className={styles.pfCol}>{team.points_for}</td>
                    <td className={styles.luckCol}>
                      <span className={`${styles.luck} ${
                        luck > 0 ? styles.luckPositive :
                        luck < 0 ? styles.luckNegative :
                        styles.luckNeutral
                      }`}>
                        {formatLuckValue(luck)}
                      </span>
                    </td>
                    <td className={styles.ptsCol}><strong>{team.total}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
