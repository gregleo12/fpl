'use client';

import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { PitchView } from '@/components/PitchView/PitchView';
import { StatsPanel } from '@/components/PitchView/StatsPanel';
import { RotateCw } from 'lucide-react';
import { RankProgressModal } from './RankProgressModal';
import { PointsAnalysisModal } from './PointsAnalysisModal';
import { GWPointsModal } from './GWPointsModal';
import { GWRankModal } from './GWRankModal';
import { TransfersModal } from './TransfersModal';
import PositionHistory from './PositionHistory';
import { shortenManagerName } from '@/lib/nameUtils';

// Format large numbers for readability
function formatRank(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return Math.round(num / 1000) + 'K';
  return num.toString();
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
  const [isLiveGW, setIsLiveGW] = useState<boolean>(false);
  const [liveGWNumber, setLiveGWNumber] = useState<number>(0);
  const [gwPoints, setGwPoints] = useState<number>(0);
  const [gwRank, setGwRank] = useState<number>(0);
  const [gwTransfers, setGwTransfers] = useState<{ count: number; cost: number }>({ count: 0, cost: 0 });
  const [overallPoints, setOverallPoints] = useState<number>(0);
  const [overallRank, setOverallRank] = useState<number>(0);
  const [teamValue, setTeamValue] = useState<number>(0);
  const [bank, setBank] = useState<number>(0);

  // Modal states
  const [showRankModal, setShowRankModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showGWPointsModal, setShowGWPointsModal] = useState(false);
  const [showGWRankModal, setShowGWRankModal] = useState(false);
  const [showTransfersModal, setShowTransfersModal] = useState(false);

  // History data for modals
  const [historyData, setHistoryData] = useState<any>(null);

  // K-68: Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // K-166d: Stats/Team data
  const [playerData, setPlayerData] = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);

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
        setIsLiveGW(data.isCurrentGWLive || false);
        setLiveGWNumber(data.liveGameweekNumber || 0);
      } catch (err: any) {
        console.error('Error fetching league info:', err);
      }
    }

    fetchLeagueInfo();
  }, [leagueId]);

  // K-166d: Fetch player data and standings for Stats/Team sections
  useEffect(() => {
    async function fetchPlayerData() {
      try {
        const [leagueResponse, playerResponse] = await Promise.all([
          fetch(`/api/league/${leagueId}/stats`),
          fetch(`/api/player/${myTeamId}?leagueId=${leagueId}`)
        ]);

        if (leagueResponse.ok && playerResponse.ok) {
          const leagueData = await leagueResponse.json();
          const player = await playerResponse.json();
          setStandings(leagueData.standings || []);
          setPlayerData(player);
        }
      } catch (err: any) {
        console.error('Error fetching player data:', err);
      }
    }

    fetchPlayerData();
  }, [leagueId, myTeamId]);

  // Fetch stats for stat boxes
  useEffect(() => {
    async function fetchStats() {
      try {
        // K-109 Phase 1: Use K-108c for GW points and transfer cost (100% accurate)
        const [teamResponse, infoResponse] = await Promise.all([
          fetch(`/api/gw/${selectedGW}/team/${myTeamId}`),
          fetch(`/api/team/${myTeamId}/info?gw=${selectedGW}`)
        ]);

        // Get GW points and transfer cost from K-108c
        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          setGwPoints(teamData.points.net_total || 0);
          setGwTransfers({
            count: 0, // Will be set from info endpoint
            cost: teamData.points.transfer_cost || 0
          });
        }

        // Get other stats from existing endpoint
        if (infoResponse.ok) {
          const data = await infoResponse.json();
          setGwRank(data.gwRank || 0);
          setGwTransfers(prev => ({
            count: data.gwTransfers?.count || 0,
            cost: prev.cost // Keep K-108c transfer cost
          }));
          setOverallPoints(data.overallPoints || 0);
          setOverallRank(data.overallRank || 0);
          setTeamValue(data.teamValue || 0);
          setBank(data.bank || 0);
        }
      } catch (err: any) {
        console.error('Error fetching stats:', err);
      }
    }

    if (selectedGW > 0) {
      fetchStats();
    }
  }, [myTeamId, selectedGW]);

  // Fetch history data for modals
  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/team/${myTeamId}/history?leagueId=${leagueId}`);
        const data = await response.json();
        // Always set data, even if empty arrays
        setHistoryData(data);
      } catch (err: any) {
        console.error('Error fetching history:', err);
        // Set empty data on error so modals still render
        setHistoryData({ history: [], transfers: [] });
      }
    }

    fetchHistory();
  }, [myTeamId, leagueId]);

  // K-68: Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Increment refresh key to force re-fetch
      setRefreshKey(prev => prev + 1);

      // K-109 Phase 1: Use K-108c for GW points and transfer cost (100% accurate)
      // K-148: Pass leagueId for smart validation on refresh
      const [teamResponse, infoResponse] = await Promise.all([
        fetch(`/api/gw/${selectedGW}/team/${myTeamId}?t=${Date.now()}`),
        fetch(`/api/team/${myTeamId}/info?gw=${selectedGW}&leagueId=${leagueId}&t=${Date.now()}`)
      ]);

      // Get GW points and transfer cost from K-108c
      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        setGwPoints(teamData.points.net_total || 0);
        setGwTransfers({
          count: 0, // Will be set from info endpoint
          cost: teamData.points.transfer_cost || 0
        });
      }

      // Get other stats from existing endpoint
      if (infoResponse.ok) {
        const data = await infoResponse.json();
        setGwRank(data.gwRank || 0);
        setGwTransfers(prev => ({
          count: data.gwTransfers?.count || 0,
          cost: prev.cost // Keep K-108c transfer cost
        }));
        setOverallPoints(data.overallPoints || 0);
        setOverallRank(data.overallRank || 0);
        setTeamValue(data.teamValue || 0);
        setBank(data.bank || 0);
      }
    } catch (err: any) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // K-68: Auto-refresh during live gameweeks (every 60 seconds)
  useEffect(() => {
    if (!isLiveGW || selectedGW !== liveGWNumber) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isLiveGW, liveGWNumber, selectedGW, myTeamId]);

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

      {/* Unified Layout - Same on all screen sizes */}
      <div className={styles.myTeamContent}>
        {/* K-91: EXACT COPY from Rivals header - unified nav bar */}
        <div className={styles.myTeamHeader}>
          {/* K-98: Left group - team name */}
          <div className={styles.leftGroup}>
            <span className={styles.teamNameHeader}>{myTeamName}</span>
          </div>

          {/* Right group: GW selector - EXACT COPY from Rivals */}
          <div className={styles.rightGroup}>
            {/* Refresh Button */}
            <button
              className={`${styles.refreshButton} ${isRefreshing ? styles.spinning : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RotateCw size={18} />
            </button>

            {/* Previous button */}
            <button
              className={styles.navButton}
              onClick={() => setSelectedGW(Math.max(1, selectedGW - 1))}
              disabled={selectedGW <= 1}
              aria-label="Previous gameweek"
            >
              ◄
            </button>

            {/* Gameweek display - glowing when live */}
            <div className={styles.gwInfo}>
              <span
                className={`${styles.gwNumber} ${isLiveGW && selectedGW === liveGWNumber ? styles.gwNumberLive : ''}`}
                title={isLiveGW && selectedGW === liveGWNumber ? "Live match" : undefined}
              >
                GW {selectedGW}
              </span>
            </div>

            {/* Next button */}
            <button
              className={styles.navButton}
              onClick={() => setSelectedGW(Math.min(maxGW, selectedGW + 1))}
              disabled={selectedGW >= maxGW}
              aria-label="Next gameweek"
            >
              ►
            </button>
          </div>
        </div>

        {/* Stat Boxes - 2 Rows */}
        <div className={styles.statBoxesContainer}>
          {/* Row 1: This Gameweek */}
          <div className={styles.statBoxRow}>
            <div
              className={`${styles.statBox} ${styles.clickable}`}
              onClick={() => setShowGWPointsModal(true)}
              title="Click to view GW points breakdown"
            >
              <div className={styles.statBoxValue}>{gwPoints}</div>
              <div className={styles.statBoxLabel}>GW PTS</div>
            </div>
            <div
              className={`${styles.statBox} ${styles.clickable}`}
              onClick={() => setShowGWRankModal(true)}
              title="Click to view GW rank stats"
            >
              <div className={styles.statBoxValue}>{formatRank(gwRank)}</div>
              <div className={styles.statBoxLabel}>GW RANK</div>
            </div>
            <div
              className={`${styles.statBox} ${styles.clickable}`}
              onClick={() => setShowTransfersModal(true)}
              title="Click to view transfer stats"
            >
              <div className={styles.statBoxValue}>
                {gwTransfers.count}
                {gwTransfers.cost > 0 && (
                  <span className={styles.statBoxSub}> (-{gwTransfers.cost})</span>
                )}
              </div>
              <div className={styles.statBoxLabel}>TRANSFERS</div>
            </div>
          </div>

          {/* Row 2: Season Totals */}
          <div className={styles.statBoxRow}>
            <div
              className={`${styles.statBox} ${styles.clickable}`}
              onClick={() => setShowPointsModal(true)}
              title="Click to view points analysis"
            >
              <div className={styles.statBoxValue}>{(overallPoints ?? 0).toLocaleString()}</div>
              <div className={styles.statBoxLabel}>TOTAL PTS</div>
            </div>
            <div
              className={`${styles.statBox} ${styles.clickable}`}
              onClick={() => setShowRankModal(true)}
              title="Click to view rank progress"
            >
              <div className={styles.statBoxValue}>{formatRank(overallRank)}</div>
              <div className={styles.statBoxLabel}>OVERALL RANK</div>
            </div>
          </div>
        </div>

        <PitchView
          key={`pitch-${refreshKey}`}
          leagueId={leagueId}
          myTeamId={myTeamId}
          selectedGW={selectedGW}
          maxGW={maxGW}
          onGWChange={setSelectedGW}
          showGWSelector={false}
        />

        {/* Team Value Boxes */}
        <div className={styles.teamValueBoxes}>
          <div className={styles.teamValueBox}>
            <div className={styles.teamValueBoxValue}>
              £{(teamValue / 10).toFixed(1)}m
            </div>
            <div className={styles.teamValueBoxLabel}>Team Value</div>
          </div>
          <div className={styles.teamValueBox}>
            <div className={styles.teamValueBoxValue}>
              £{(bank / 10).toFixed(1)}m
            </div>
            <div className={styles.teamValueBoxLabel}>In Bank</div>
          </div>
        </div>

        <StatsPanel
          leagueId={leagueId}
          myTeamId={myTeamId}
          myTeamName={myTeamName}
          myManagerName={myManagerName}
          selectedGW={selectedGW}
          mode="collapsible-only"
        />

        {/* K-166d: Stats/Team Content - Simple Stack */}
        {playerData && (
          <>
            {/* Position History */}
            <PositionHistory
              leagueId={leagueId}
              entryId={myTeamId}
              standings={standings}
              myManagerName={myManagerName}
            />

            {/* Chips Played */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Chips Played</h3>
              {playerData.chipsPlayed.length > 0 ? (
                <div className={styles.table}>
                  <table>
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
                      {playerData.chipsPlayed.map((chip: any) => {
                        const match = playerData.matchHistory.find((m: any) => m.event === chip.event);
                        return (
                          <tr key={chip.event}>
                            <td><span className={styles.chipBadge}>{getChipAbbreviation(chip.name)}</span></td>
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
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Chips Faced</h3>
              {playerData.chipsFaced.length > 0 ? (
                <>
                  <div className={styles.chipsSummary}>
                    <span>Faced <strong>{playerData.chipsFaced.length}</strong> chips total - </span>
                    <span className={styles.positive}>
                      Won {playerData.chipsFaced.filter((c: any) => c.result === 'W').length}
                    </span>
                    <span> / </span>
                    <span className={styles.negative}>
                      Lost {playerData.chipsFaced.filter((c: any) => c.result === 'L').length}
                    </span>
                  </div>
                  <div className={styles.table}>
                    <table>
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
                        {playerData.chipsFaced
                          .sort((a: any, b: any) => a.event - b.event)
                          .map((chip: any, idx: number) => {
                          const match = playerData.matchHistory.find((m: any) => m.event === chip.event);
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

            {/* Match History */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Match History</h3>
              <div className={styles.table}>
                <table>
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
                    {playerData.matchHistory.slice().reverse().map((match: any) => {
                      // Check if you played a chip in this GW
                      const yourChip = playerData.chipsPlayed.find((c: any) => c.event === match.event);
                      // Check if opponent played a chip in this GW
                      const oppChip = playerData.chipsFaced.find((c: any) => c.event === match.event);

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
          </>
        )}
      </div>

      {/* Modals */}
      {historyData && (
        <>
          <RankProgressModal
            isOpen={showRankModal}
            onClose={() => setShowRankModal(false)}
            data={historyData.history}
          />
          <PointsAnalysisModal
            isOpen={showPointsModal}
            onClose={() => setShowPointsModal(false)}
            data={historyData.history}
          />
        </>
      )}

      {/* GW Points Modal */}
      <GWPointsModal
        isOpen={showGWPointsModal}
        onClose={() => setShowGWPointsModal(false)}
        gameweek={selectedGW}
        points={gwPoints}
        leagueId={leagueId}
        myTeamId={myTeamId}
      />

      {/* GW Rank Modal */}
      <GWRankModal
        isOpen={showGWRankModal}
        onClose={() => setShowGWRankModal(false)}
        gameweek={selectedGW}
        leagueId={leagueId}
        myTeamId={myTeamId}
      />

      {/* Transfers Modal */}
      <TransfersModal
        isOpen={showTransfersModal}
        onClose={() => setShowTransfersModal(false)}
        leagueId={leagueId}
        myTeamId={myTeamId}
      />
    </div>
  );
}
