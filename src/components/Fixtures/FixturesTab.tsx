'use client';

import { useState, useEffect } from 'react';
import styles from './Fixtures.module.css';
import { shortenTeamName, shortenManagerName } from '@/lib/nameUtils';
import { MatchDetails } from './MatchDetails';
import { MatchDetailsModal } from './MatchDetailsModal';
import { StateBadge } from './StateBadge';

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
  };
  entry_2: {
    id: number;
    player_name: string;
    team_name: string;
    score: number;
    chip: string | null;
    captain: string | null;
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
  const [currentGW, setCurrentGW] = useState(defaultGW);
  const [fixturesData, setFixturesData] = useState<FixturesData | null>(null);
  const [insights, setInsights] = useState<OpponentInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [matchDetails, setMatchDetails] = useState<{ [key: number]: MatchDetailsData }>({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<MatchDetailsData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<{ [key: number]: boolean }>({});
  const [initialGWSet, setInitialGWSet] = useState(false);

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
          setCurrentGW(liveGW.gw);
          setInitialGWSet(true);
          return;
        }

        // Priority 2: Find upcoming GW (prefer the one closest to defaultGW)
        const upcomingGWs = validResults.filter(r => r.status === 'upcoming');
        if (upcomingGWs.length > 0) {
          // Sort by proximity to defaultGW
          upcomingGWs.sort((a, b) => Math.abs(a.gw - defaultGW) - Math.abs(b.gw - defaultGW));
          setCurrentGW(upcomingGWs[0].gw);
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

  async function fetchFixtures() {
    setLoading(true);
    try {
      const response = await fetch(`/api/league/${leagueId}/fixtures/${currentGW}`);
      if (!response.ok) throw new Error('Failed to fetch fixtures');

      const data = await response.json();
      setFixturesData(data);

      // If upcoming, fetch opponent insights
      if (data.status === 'upcoming') {
        const myMatch = data.matches.find((m: Match) =>
          m.entry_1.id.toString() === myTeamId || m.entry_2.id.toString() === myTeamId
        );

        if (myMatch) {
          const opponentId = myMatch.entry_1.id.toString() === myTeamId
            ? myMatch.entry_2.id
            : myMatch.entry_1.id;

          const insightsResponse = await fetch(
            `/api/league/${leagueId}/insights/${opponentId}?myId=${myTeamId}`
          );

          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            setInsights(insightsData);
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

  async function handleCardClick(matchId: number) {
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
      {/* Gameweek Navigator */}
      <div className={styles.navigatorWrapper}>
        <div className={styles.navigator}>
          <button
            className={styles.navButton}
            onClick={handlePrevGW}
            disabled={currentGW <= 1}
            aria-label="Previous gameweek"
          >
            ◄
          </button>
          <div className={styles.gwInfo}>
            <span className={styles.gwNumber}>GW {currentGW}</span>
            <StateBadge status={fixturesData.status} />
          </div>
          <button
            className={styles.navButton}
            onClick={handleNextGW}
            disabled={currentGW >= maxGW}
            aria-label="Next gameweek"
          >
            ►
          </button>
        </div>

        {/* Timeline */}
        <div className={styles.timeline}>
          {Array.from({ length: maxGW }, (_, i) => i + 1).map(gw => (
            <button
              key={gw}
              onClick={() => setCurrentGW(gw)}
              className={`${styles.gwDot} ${gw === currentGW ? styles.active : ''}`}
              aria-label={`Go to gameweek ${gw}`}
              title={`GW${gw}`}
            >
              {gw}
            </button>
          ))}
        </div>
      </div>

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
          const isCompleted = fixturesData.status === 'completed';
          const entry1Won = isCompleted && match.entry_1.score > match.entry_2.score;
          const entry2Won = isCompleted && match.entry_2.score > match.entry_1.score;
          const isExpanded = expandedMatchId === match.id;
          const details = matchDetails[match.id];
          const isLoading = loadingDetails[match.id];

          return (
            <div
              key={match.id}
              className={`${styles.matchCard} ${isMyMatch ? styles.myMatch : ''} ${isExpanded ? styles.expanded : ''}`}
              onClick={() => handleCardClick(match.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.matchHeader}>
                <div className={styles.team}>
                  <div className={`${styles.teamName} ${entry1Won ? styles.winner : entry2Won ? styles.loser : ''}`}>
                    {shortenTeamName(match.entry_1.team_name)}
                  </div>
                  <div className={styles.playerName}>
                    {shortenManagerName(match.entry_1.player_name)}
                  </div>
                  {match.entry_1.captain && (
                    <div className={styles.captainInfo}>C: {match.entry_1.captain}</div>
                  )}
                  {match.entry_1.chip && (
                    <span className={styles.chipBadge}>
                      {getChipAbbreviation(match.entry_1.chip)}
                    </span>
                  )}
                </div>

                <div className={styles.scoreBox}>
                  <div className={styles.score}>
                    {match.entry_1.score} - {match.entry_2.score}
                  </div>
                </div>

                <div className={styles.team}>
                  <div className={`${styles.teamName} ${entry2Won ? styles.winner : entry1Won ? styles.loser : ''}`}>
                    {shortenTeamName(match.entry_2.team_name)}
                  </div>
                  <div className={styles.playerName}>
                    {shortenManagerName(match.entry_2.player_name)}
                  </div>
                  {match.entry_2.captain && (
                    <div className={styles.captainInfo}>C: {match.entry_2.captain}</div>
                  )}
                  {match.entry_2.chip && (
                    <span className={styles.chipBadge}>
                      {getChipAbbreviation(match.entry_2.chip)}
                    </span>
                  )}
                </div>
              </div>

              {/* Expansion indicator */}
              <div className={styles.expandIndicator}>
                {isExpanded ? '▲' : '▼'}
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
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL (Mobile) */}
      {showModal && modalData && (
        <MatchDetailsModal
          entry1={modalData.entry_1}
          entry2={modalData.entry_2}
          headToHead={modalData.head_to_head}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
