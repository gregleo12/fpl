'use client';

import { useState, useEffect } from 'react';
import styles from './Fixtures.module.css';
import { shortenTeamName, shortenManagerName } from '@/lib/nameUtils';
import { MatchDetails } from './MatchDetails';
import { MatchDetailsModal } from './MatchDetailsModal';
import { StateBadge } from './StateBadge';
import { LiveMatchModal } from './LiveMatchModal';
import { getLiveMatchData } from '@/lib/liveMatch';
import type { LiveMatchData } from '@/types/liveMatch';
import { TeamFixtures } from './TeamFixtures';

// Helper function to format score - show negative scores in parentheses
function formatScore(score: number): string {
  return score < 0 ? `(${Math.abs(score)})` : String(score);
}

interface Match {
  id: number;
  event: number;
  entry_1: {
    id: number;
    player_name: string;
    team_name: string;
    score: number;
    chip: string | null;
    captain: string | null;
    hit?: number; // Transfer hit points (0, -4, -8, etc.)
  };
  entry_2: {
    id: number;
    player_name: string;
    team_name: string;
    score: number;
    chip: string | null;
    captain: string | null;
    hit?: number; // Transfer hit points (0, -4, -8, etc.)
  };
  winner: number | null;
}

interface FixturesData {
  event: number;
  status: 'completed' | 'in_progress' | 'upcoming';
  matches: Match[];
}

interface OpponentInsights {
  opponent_name: string;
  opponent_team: string;
  opponent_rank: number;
  recent_form: {
    last_5_results: Array<{ result: string; event: number }>;
    avg_points_last_5: string;
  };
  your_stats: {
    avg_points_last_5: string;
  };
  chips_remaining: {
    yours: string[];
    theirs: string[];
  };
  momentum: {
    current_streak: number;
    streak_type: string;
    trend: string;
  };
  head_to_head: {
    total_meetings: number;
    your_wins: number;
    their_wins: number;
    last_meeting: {
      event: number;
      your_score: number;
      their_score: number;
      margin: number;
    } | null;
  };
  free_transfers?: number;
}

interface MatchDetailsData {
  match_id: number;
  entry_1: {
    id: number;
    player_name: string;
    team_name: string;
    recent_form: Array<{ result: string; event: number }>;
    avg_points_last_5: string;
    chips_remaining: string[];
    free_transfers: number;
    strategicIntel: {
      captainHistory: Array<{ playerName: string; count: number }>;
      benchPoints: {
        total: number;
        average: number;
        breakdown: number[];
      };
      teamValue: number;
      hitsTaken: {
        total: number;
        count: number;
        breakdown: Array<{ gameweek: number; cost: number }>;
      };
      overallRank: number;
      commonPlayers: {
        count: number;
        percentage: number;
        players: string[];
      };
    };
  };
  entry_2: {
    id: number;
    player_name: string;
    team_name: string;
    recent_form: Array<{ result: string; event: number }>;
    avg_points_last_5: string;
    chips_remaining: string[];
    free_transfers: number;
    strategicIntel: {
      captainHistory: Array<{ playerName: string; count: number }>;
      benchPoints: {
        total: number;
        average: number;
        breakdown: number[];
      };
      teamValue: number;
      hitsTaken: {
        total: number;
        count: number;
        breakdown: Array<{ gameweek: number; cost: number }>;
      };
      overallRank: number;
      commonPlayers: {
        count: number;
        percentage: number;
        players: string[];
      };
    };
  };
  head_to_head: {
    total_meetings: number;
    entry_1_wins: number;
    entry_2_wins: number;
    draws: number;
    last_meeting: {
      event: number;
      entry_1_score: number;
      entry_2_score: number;
    } | null;
  };
  differential_players?: {
    entry_1: Array<{
      playerName: string;
      avgPoints: number;
      form: number[];
      formMinutes: number[];
      position: string;
      currentGwPoints: number;
      currentGwMinutes: number;
    }>;
    entry_2: Array<{
      playerName: string;
      avgPoints: number;
      form: number[];
      formMinutes: number[];
      position: string;
      currentGwPoints: number;
      currentGwMinutes: number;
    }>;
  };
}

interface Props {
  leagueId: string;
  myTeamId: string;
  maxGW: number;
  defaultGW: number;
}

function getChipAbbreviation(chip: string | null): string {
  if (!chip) return '';
  const chipMap: { [key: string]: string } = {
    'wildcard': 'WC',
    'bboost': 'BB',
    '3xc': 'TC',
    'freehit': 'FH'
  };
  return chipMap[chip.toLowerCase()] || chip;
}

export default function FixturesTab({ leagueId, myTeamId, maxGW, defaultGW }: Props) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'h2h' | 'fixtures'>('h2h');

  // Independent gameweek states for each tab
  const [h2hGameweek, setH2HGameweek] = useState(defaultGW);
  const [fixturesGameweek, setFixturesGameweek] = useState(defaultGW);

  // Use currentGW based on active tab
  const currentGW = activeTab === 'h2h' ? h2hGameweek : fixturesGameweek;
  const setCurrentGW = activeTab === 'h2h' ? setH2HGameweek : setFixturesGameweek;

  const [fixturesData, setFixturesData] = useState<FixturesData | null>(null);
  const [insights, setInsights] = useState<OpponentInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [matchDetails, setMatchDetails] = useState<{ [key: number]: MatchDetailsData }>({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<MatchDetailsData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<{ [key: number]: boolean }>({});
  const [initialGWSet, setInitialGWSet] = useState(false);
  const [showGWSelector, setShowGWSelector] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveMatchData, setLiveMatchData] = useState<LiveMatchData | null>(null);
  const [loadingLiveData, setLoadingLiveData] = useState(false);

  // Find the live or upcoming GW on initial load
  useEffect(() => {
    async function findOptimalGW() {
      try {
        // Check a range of GWs around the defaultGW to find live or upcoming
        const gwsToCheck = [
          defaultGW,
          defaultGW - 1,
          defaultGW + 1,
          defaultGW - 2,
        ].filter(gw => gw >= 1 && gw <= maxGW);

        // Fetch all GWs in parallel for faster detection
        const promises = gwsToCheck.map(async (gw) => {
          try {
            const response = await fetch(`/api/league/${leagueId}/fixtures/${gw}`);
            if (!response.ok) return null;
            const data = await response.json();
            return { gw, status: data.status };
          } catch {
            return null;
          }
        });

        const results = await Promise.all(promises);
        const validResults = results.filter(r => r !== null) as Array<{ gw: number; status: string }>;

        // Priority 1: Find live GW
        const liveGW = validResults.find(r => r.status === 'in_progress');
        if (liveGW) {
          setH2HGameweek(liveGW.gw);
          setFixturesGameweek(liveGW.gw);
          setInitialGWSet(true);
          return;
        }

        // Priority 2: Find upcoming GW (prefer the one closest to defaultGW)
        const upcomingGWs = validResults.filter(r => r.status === 'upcoming');
        if (upcomingGWs.length > 0) {
          // Sort by proximity to defaultGW
          upcomingGWs.sort((a, b) => Math.abs(a.gw - defaultGW) - Math.abs(b.gw - defaultGW));
          setH2HGameweek(upcomingGWs[0].gw);
          setFixturesGameweek(upcomingGWs[0].gw);
          setInitialGWSet(true);
          return;
        }

        // Priority 3: All completed, stick with defaultGW
        setInitialGWSet(true);
      } catch (error) {
        console.error('Error finding optimal GW:', error);
        setInitialGWSet(true);
      }
    }

    findOptimalGW();
  }, [leagueId, defaultGW, maxGW]);

  useEffect(() => {
    if (initialGWSet) {
      fetchFixtures();
    }
  }, [currentGW, initialGWSet]);

  // Auto-refresh for live gameweeks every 30 seconds
  useEffect(() => {
    if (fixturesData?.status === 'in_progress') {
      const interval = setInterval(() => {
        console.log('Auto-refreshing live gameweek scores...');
        fetchFixtures();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [fixturesData?.status]);

  async function fetchFixtures() {
    setLoading(true);
    try {
      // Add cache busting for fresh data (especially important for live gameweeks)
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`/api/league/${leagueId}/fixtures/${currentGW}${cacheBuster}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to fetch fixtures');

      const data = await response.json();
      setFixturesData(data);

      // If upcoming, fetch opponent insights (unless opponent is AVERAGE)
      if (data.status === 'upcoming') {
        const myMatch = data.matches.find((m: Match) =>
          m.entry_1.id.toString() === myTeamId || m.entry_2.id.toString() === myTeamId
        );

        if (myMatch) {
          const opponent = myMatch.entry_1.id.toString() === myTeamId
            ? myMatch.entry_2
            : myMatch.entry_1;

          const isOpponentAverage = opponent.player_name === 'AVERAGE';

          console.log('[INSIGHTS] Opponent check:', {
            opponentId: opponent.id,
            opponentName: opponent.player_name,
            isAverage: isOpponentAverage
          });

          // Skip fetching insights for AVERAGE opponent (odd-numbered leagues)
          if (!isOpponentAverage) {
            console.log('[INSIGHTS] Fetching insights for opponent:', opponent.id);
            const insightsResponse = await fetch(
              `/api/league/${leagueId}/insights/${opponent.id}?myId=${myTeamId}`
            );

            if (insightsResponse.ok) {
              const insightsData = await insightsResponse.json();
              setInsights(insightsData);
            }
          } else {
            console.log('[INSIGHTS] Skipping insights for AVERAGE opponent');
            setInsights(null);
          }
        }
      } else {
        setInsights(null);
      }
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePrevGW() {
    if (currentGW > 1) setCurrentGW(currentGW - 1);
  }

  function handleNextGW() {
    if (currentGW < maxGW) setCurrentGW(currentGW + 1);
  }

  function handleGWInfoPress() {
    setShowGWSelector(true);
  }

  function handleGWInfoMouseDown() {
    const timer = setTimeout(() => {
      setShowGWSelector(true);
    }, 300); // 300ms for long press
    setLongPressTimer(timer);
  }

  function handleGWInfoMouseUp() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }

  function handleSelectGW(gw: number) {
    setCurrentGW(gw);
    setShowGWSelector(false);
  }

  async function fetchMatchDetails(matchId: number) {
    if (matchDetails[matchId]) {
      return matchDetails[matchId]; // Already cached
    }

    setLoadingDetails({ ...loadingDetails, [matchId]: true });

    try {
      const response = await fetch(`/api/league/${leagueId}/matches/${matchId}`);
      if (!response.ok) throw new Error('Failed to fetch match details');

      const data: MatchDetailsData = await response.json();
      setMatchDetails({ ...matchDetails, [matchId]: data });
      setLoadingDetails({ ...loadingDetails, [matchId]: false });
      return data;
    } catch (error) {
      console.error('Error fetching match details:', error);
      setLoadingDetails({ ...loadingDetails, [matchId]: false });
      return null;
    }
  }

  async function handleCardClick(matchId: number, match: Match) {
    console.log('[CLICK] Handle card click:', {
      matchId,
      entry1: { id: match.entry_1.id, name: match.entry_1.player_name },
      entry2: { id: match.entry_2.id, name: match.entry_2.player_name }
    });

    // Prevent clicks on AVERAGE matches (odd-numbered leagues)
    // Use player_name check instead of entry_id because database may have AVERAGE with real IDs
    if (match.entry_1.player_name === 'AVERAGE' || match.entry_2.player_name === 'AVERAGE') {
      console.log('[CLICK] Ignoring click on AVERAGE match');
      return;
    }

    // Check if this is a live or completed match - use same modal for both
    if (fixturesData?.status === 'in_progress' || fixturesData?.status === 'completed') {
      // Fetch live match data (works for both live and completed)
      setLoadingLiveData(true);
      try {
        const statusLabel = fixturesData?.status === 'completed' ? 'completed' : 'live';
        console.log(`Fetching ${statusLabel} match data for GW`, currentGW);
        const liveData = await getLiveMatchData(
          match.entry_1.id,
          match.entry_2.id,
          currentGW,
          match.entry_1.player_name,
          match.entry_1.team_name,
          match.entry_2.player_name,
          match.entry_2.team_name,
          leagueId
        );
        console.log(`${statusLabel} match data received:`, liveData);
        setLiveMatchData(liveData);
        setShowLiveModal(true);
      } catch (error) {
        console.error('Error fetching match data:', error);
        alert('Failed to load match data. Please try again.');
      } finally {
        setLoadingLiveData(false);
      }
      return;
    }

    // For upcoming matches, show regular modal
    // Check if mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Fetch match details
    const details = await fetchMatchDetails(matchId);
    if (!details) return;

    if (isMobile) {
      // Show modal on mobile
      setModalData(details);
      setShowModal(true);
    } else {
      // Toggle inline expansion on desktop
      if (expandedMatchId === matchId) {
        setExpandedMatchId(null);
      } else {
        setExpandedMatchId(matchId);
      }
    }
  }

  if (!initialGWSet || (loading && !fixturesData)) {
    return <div className={styles.loading}>Loading fixtures...</div>;
  }

  if (!fixturesData) {
    return <div className={styles.error}>Failed to load fixtures</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header - matches Stats section */}
      <div className={styles.header}>
        {/* Sub-tabs: H2H Matches | Team Fixtures */}
        <div className={styles.subTabsContainer}>
          <button
            className={`${styles.subTab} ${activeTab === 'h2h' ? styles.subTabActive : ''}`}
            onClick={() => setActiveTab('h2h')}
          >
            ⚔️ H2H Matches
          </button>
          <button
            className={`${styles.subTab} ${activeTab === 'fixtures' ? styles.subTabActive : ''}`}
            onClick={() => setActiveTab('fixtures')}
          >
            ⚽ Team Fixtures
          </button>
        </div>

        {/* Gameweek Navigator */}
        <div className={styles.navigatorWrapper}>
          {/* Previous button */}
          <button
            className={styles.navButton}
            onClick={handlePrevGW}
            disabled={currentGW <= 1}
            aria-label="Previous gameweek"
          >
            ◄
          </button>

          {/* Gameweek display with inline status and dropdown */}
          <div className={styles.gwInfo}>
            <span className={styles.gwNumber}>GW {currentGW}</span>

            <button
              className={styles.dropdownButton}
              onClick={handleGWInfoPress}
              onMouseDown={handleGWInfoMouseDown}
              onMouseUp={handleGWInfoMouseUp}
              onMouseLeave={handleGWInfoMouseUp}
              onTouchStart={handleGWInfoMouseDown}
              onTouchEnd={handleGWInfoMouseUp}
              aria-label="Select gameweek"
            >
              ▼
            </button>

            {fixturesData.status === 'in_progress' && (
              <span className={styles.liveBadge}>LIVE</span>
            )}
          </div>

          {/* Next button */}
          <button
            className={styles.navButton}
            onClick={handleNextGW}
            disabled={currentGW >= maxGW}
            aria-label="Next gameweek"
          >
            ►
          </button>
        </div>
      </div>

      {/* GW Selector Dropdown */}
      {showGWSelector && (
        <div className={styles.gwSelectorOverlay} onClick={() => setShowGWSelector(false)}>
          <div className={styles.gwSelectorModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.gwSelectorHeader}>
              <h3>Select Gameweek</h3>
              <button
                className={styles.closeButton}
                onClick={() => setShowGWSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.gwGrid}>
              {Array.from({ length: maxGW }, (_, i) => i + 1).map(gw => (
                <button
                  key={gw}
                  onClick={() => handleSelectGW(gw)}
                  className={`${styles.gwGridItem} ${gw === currentGW ? styles.gwGridItemActive : ''}`}
                >
                  GW {gw}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* H2H MATCHES TAB CONTENT */}
      {activeTab === 'h2h' && (
        <>
          {/* Matches */}
          <div className={styles.matchesContainer}>
        {fixturesData.matches
          .sort((a, b) => {
            // Sort user's match to the top
            const aIsUserMatch = a.entry_1.id.toString() === myTeamId || a.entry_2.id.toString() === myTeamId;
            const bIsUserMatch = b.entry_1.id.toString() === myTeamId || b.entry_2.id.toString() === myTeamId;
            if (aIsUserMatch && !bIsUserMatch) return -1;
            if (!aIsUserMatch && bIsUserMatch) return 1;
            return 0;
          })
          .map((match) => {
          const isMyMatch = match.entry_1.id.toString() === myTeamId || match.entry_2.id.toString() === myTeamId;
          const isEntry1User = match.entry_1.id.toString() === myTeamId;
          const isEntry2User = match.entry_2.id.toString() === myTeamId;
          const isCompleted = fixturesData.status === 'completed';
          const entry1Won = isCompleted && match.entry_1.score > match.entry_2.score;
          const entry2Won = isCompleted && match.entry_2.score > match.entry_1.score;
          const isExpanded = expandedMatchId === match.id;
          const details = matchDetails[match.id];
          const isLoading = loadingDetails[match.id];

          // Detect if either entry is AVERAGE (odd-numbered leagues)
          // Use player_name check instead of entry_id because database may have AVERAGE with real IDs
          const isAverageMatch =
            match.entry_1.player_name === 'AVERAGE' ||
            match.entry_2.player_name === 'AVERAGE';

          if (isAverageMatch) {
            console.log('[AVERAGE] Match detected:', {
              matchId: match.id,
              entry1: { id: match.entry_1.id, name: match.entry_1.player_name },
              entry2: { id: match.entry_2.id, name: match.entry_2.player_name }
            });
          }

          return (
            <div
              key={match.id}
              className={`${styles.matchCard} ${isMyMatch ? styles.myMatch : ''} ${isExpanded ? styles.expanded : ''}`}
              onClick={isAverageMatch ? undefined : () => handleCardClick(match.id, match)}
              style={{ cursor: isAverageMatch ? 'default' : 'pointer', opacity: isAverageMatch ? 0.8 : 1 }}
            >
              <div className={styles.matchHeader}>
                {/* LEFT TEAM */}
                <div className={styles.team}>
                  {/* Line 1: Team name */}
                  <div className={styles.teamInfo}>
                    <span className={`${styles.teamName} ${entry1Won ? styles.winner : entry2Won ? styles.loser : ''} ${isEntry1User ? styles.myTeam : ''}`}>
                      {shortenTeamName(match.entry_1.team_name)}
                    </span>
                  </div>

                  {/* Line 2: Manager name */}
                  <div className={styles.playerName}>
                    {shortenManagerName(match.entry_1.player_name)}
                  </div>

                  {/* Line 3: Captain • Chip • Hit (info line - flows left to right) */}
                  <div className={styles.infoLine}>
                    {match.entry_1.captain && (
                      <span className={styles.captain}>C: {match.entry_1.captain}</span>
                    )}
                    {match.entry_1.chip && (
                      <>
                        {match.entry_1.captain && <span className={styles.separator}>•</span>}
                        <span className={styles.chipText}>
                          {getChipAbbreviation(match.entry_1.chip)}
                        </span>
                      </>
                    )}
                    {match.entry_1.hit && match.entry_1.hit < 0 && (
                      <>
                        {(match.entry_1.captain || match.entry_1.chip) && (
                          <span className={styles.separator}>•</span>
                        )}
                        <span className={styles.hitText}>({Math.abs(match.entry_1.hit)})</span>
                      </>
                    )}
                  </div>
                </div>

                {/* SCORE */}
                <div className={styles.scoreBox}>
                  <div className={styles.score}>
                    {formatScore(match.entry_1.score)} - {formatScore(match.entry_2.score)}
                  </div>
                </div>

                {/* RIGHT TEAM */}
                <div className={styles.team}>
                  {/* Line 1: Team name */}
                  <div className={styles.teamInfo}>
                    <span className={`${styles.teamName} ${entry2Won ? styles.winner : entry1Won ? styles.loser : ''} ${isEntry2User ? styles.myTeam : ''}`}>
                      {shortenTeamName(match.entry_2.team_name)}
                    </span>
                  </div>

                  {/* Line 2: Manager name */}
                  <div className={styles.playerName}>
                    {shortenManagerName(match.entry_2.player_name)}
                  </div>

                  {/* Line 3: Hit • Chip • Captain (info line - MIRRORED for visual symmetry) */}
                  <div className={styles.infoLine}>
                    {match.entry_2.hit && match.entry_2.hit < 0 && (
                      <span className={styles.hitText}>({Math.abs(match.entry_2.hit)})</span>
                    )}
                    {match.entry_2.chip && (
                      <>
                        {match.entry_2.hit && match.entry_2.hit < 0 && <span className={styles.separator}>•</span>}
                        <span className={styles.chipText}>
                          {getChipAbbreviation(match.entry_2.chip)}
                        </span>
                      </>
                    )}
                    {match.entry_2.captain && (
                      <>
                        {(match.entry_2.hit || match.entry_2.chip) && (
                          <span className={styles.separator}>•</span>
                        )}
                        <span className={styles.captain}>C: {match.entry_2.captain}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Loading state */}
              {isLoading && (
                <div className={styles.detailsLoading}>
                  Loading details...
                </div>
              )}

              {/* INLINE EXPANSION (Desktop/Tablet) */}
              {isExpanded && details && !isLoading && (
                <div className={styles.detailsPanel}>
                  <MatchDetails
                    entry1={details.entry_1}
                    entry2={details.entry_2}
                    headToHead={details.head_to_head}
                    differentialPlayers={details.differential_players}
                  />
                </div>
              )}
            </div>
          );
        })}
          </div>
        </>
      )}

      {/* TEAM FIXTURES TAB CONTENT */}
      {activeTab === 'fixtures' && (
        <TeamFixtures gameweek={currentGW} />
      )}

      {/* MODAL (Mobile) */}
      {showModal && modalData && (
        <MatchDetailsModal
          entry1={modalData.entry_1}
          entry2={modalData.entry_2}
          headToHead={modalData.head_to_head}
          differentialPlayers={modalData.differential_players}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* LIVE MATCH MODAL (used for both live and completed fixtures) */}
      {showLiveModal && liveMatchData && (
        <LiveMatchModal
          isOpen={showLiveModal}
          onClose={() => setShowLiveModal(false)}
          matchData={liveMatchData}
          isMyMatch={
            liveMatchData.player1.entryId.toString() === myTeamId ||
            liveMatchData.player2.entryId.toString() === myTeamId
          }
          isCompleted={fixturesData?.status === 'completed'}
        />
      )}

      {/* LOADING OVERLAY */}
      {loadingLiveData && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <div className={styles.loadingText}>Loading match data...</div>
          </div>
        </div>
      )}
    </div>
  );
}
