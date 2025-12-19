'use client';

import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { PitchView } from '@/components/PitchView/PitchView';
import { StatsPanel } from '@/components/PitchView/StatsPanel';
import { GWSelector } from '@/components/PitchView/GWSelector';
import { RankProgressModal } from './RankProgressModal';
import { PointsAnalysisModal } from './PointsAnalysisModal';
import { GWPointsModal } from './GWPointsModal';
import { GWRankModal } from './GWRankModal';
import { TransfersModal } from './TransfersModal';

// Format large numbers for readability
function formatRank(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return Math.round(num / 1000) + 'K';
  return num.toString();
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

  // Fetch stats for stat boxes
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/team/${myTeamId}/info?gw=${selectedGW}`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setGwPoints(data.gwPoints || 0);
        setGwRank(data.gwRank || 0);
        setGwTransfers(data.gwTransfers || { count: 0, cost: 0 });
        setOverallPoints(data.overallPoints || 0);
        setOverallRank(data.overallRank || 0);
        setTeamValue(data.teamValue || 0);
        setBank(data.bank || 0);
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
        <GWSelector
          selectedGW={selectedGW}
          maxGW={maxGW}
          onGWChange={setSelectedGW}
          isLive={isLiveGW && selectedGW === liveGWNumber}
        />

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
              <div className={styles.statBoxValue}>{overallPoints.toLocaleString()}</div>
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
