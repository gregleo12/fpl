import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { fplApi } from '@/lib/fpl-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const matchId = parseInt(params.matchId);

    if (isNaN(leagueId) || isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get match details
    const matchResult = await db.query(`
      SELECT
        hm.*,
        m1.player_name as entry_1_player,
        m1.team_name as entry_1_team,
        m2.player_name as entry_2_player,
        m2.team_name as entry_2_team
      FROM h2h_matches hm
      JOIN managers m1 ON hm.entry_1_id = m1.entry_id
      JOIN managers m2 ON hm.entry_2_id = m2.entry_id
      WHERE hm.league_id = $1 AND hm.id = $2
      LIMIT 1
    `, [leagueId, matchId]);

    if (matchResult.rows.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const match = matchResult.rows[0];
    const entry1Id = match.entry_1_id;
    const entry2Id = match.entry_2_id;

    // Check if either entry is AVERAGE (odd-numbered leagues)
    // Use player_name check instead of entry_id because database may have AVERAGE with real IDs
    if (match.entry_1_player === 'AVERAGE' || match.entry_2_player === 'AVERAGE') {
      return NextResponse.json({
        error: 'Match details not available for AVERAGE opponent',
        isAverageMatch: true
      }, { status: 400 });
    }

    // Get current gameweek for chip calculations
    const bootstrapData = await fplApi.getBootstrapData();
    const currentEvent = bootstrapData.events.find(e => e.is_current || e.is_next);
    const currentGW = currentEvent?.id || 1;

    // Helper function to calculate remaining chips
    const calculateRemainingChips = (chipsUsed: any[], currentGW: number): string[] => {
      const remaining: string[] = [];
      const allChipTypes = ['wildcard', 'bboost', '3xc', 'freehit'];

      allChipTypes.forEach(chipType => {
        const uses = chipsUsed.filter((chip: any) => chip.name === chipType);

        if (uses.length === 0) {
          remaining.push(chipType);
        } else {
          const usedAfterGW19 = uses.some((use: any) => use.event >= 19);
          if (!usedAfterGW19 && currentGW >= 19) {
            remaining.push(chipType);
          }
        }
      });

      return remaining;
    };

    // Helper function to get player stats including strategic intel
    const getPlayerStats = async (entryId: number) => {
      // Get player's matches
      const matchesResult = await db.query(`
        SELECT
          event,
          CASE
            WHEN entry_1_id = $1 THEN entry_1_points
            ELSE entry_2_points
          END as points,
          CASE
            WHEN winner IS NULL THEN 'D'
            WHEN winner = $1 THEN 'W'
            ELSE 'L'
          END as result
        FROM h2h_matches
        WHERE league_id = $2
          AND (entry_1_id = $1 OR entry_2_id = $1)
          AND (entry_1_points > 0 OR entry_2_points > 0)
        ORDER BY event DESC
      `, [entryId, leagueId]);

      const matches = matchesResult.rows;

      // Calculate recent form (last 5)
      const last5 = matches.slice(0, 5);
      const recentForm = last5.map((m: any) => ({ result: m.result, event: m.event })).reverse(); // Oldest to newest (left to right)
      const avgPointsLast5 = last5.length > 0
        ? (last5.reduce((sum: number, m: any) => sum + (m.points || 0), 0) / last5.length).toFixed(1)
        : '0.0';

      // Get history data from FPL API
      let chipsRemaining: string[] = ['wildcard', 'bboost', '3xc', 'freehit'];
      let freeTransfers = 1;
      let captainHistory: Array<{ playerName: string; count: number }> = [];
      let benchPoints = { total: 0, average: 0, breakdown: [] as number[] };
      let hitsTaken = { total: 0, count: 0, breakdown: [] as Array<{ gameweek: number; cost: number }> };
      let teamValue = 100.0;
      let overallRank = 0;

      try {
        const historyData = await fplApi.getEntryHistory(entryId);

        if (historyData) {
          // Chips remaining
          if (historyData.chips && Array.isArray(historyData.chips)) {
            chipsRemaining = calculateRemainingChips(historyData.chips, currentGW);
          }

          // Current gameweeks data
          if (historyData.current && historyData.current.length > 0) {
            const currentGWs = historyData.current;

            // Calculate free transfers by tracking through the season
            // IMPORTANT: This calculates FT available FOR the current/upcoming GW,
            // NOT what you'll have after it completes
            let ftBalance = 0;

            for (const gw of currentGWs) {
              if (gw.event >= currentGW) {
                break;
              }

              if (gw.event === 1) {
                ftBalance = 1;
                continue;
              }

              // AFCON special rule: Everyone STARTS GW16 with 5 FT
              // This sets the balance before processing GW16 transfers
              if (gw.event === 16) {
                ftBalance = 5;
              }

              const transfers = gw.event_transfers || 0;
              const chipUsed = gw.chip_name;

              if (chipUsed === 'wildcard' || chipUsed === 'freehit') {
                // WC/FH: Transfers don't consume FT, and no +1 FT for next GW
              } else {
                // First consume transfers
                ftBalance = Math.max(0, ftBalance - transfers);

                // Then add +1 FT for the NEXT gameweek (but NOT if this is the last completed GW)
                // We check if the NEXT gw exists and is before currentGW
                const nextGWIndex = currentGWs.findIndex((g: any) => g.event === gw.event) + 1;
                const nextGW = currentGWs[nextGWIndex];

                if (nextGW && nextGW.event < currentGW) {
                  // There's another completed GW after this one, so add the +1 FT
                  ftBalance = Math.min(5, ftBalance + 1);
                } else {
                  // This is the last completed GW, DON'T add +1 FT
                  // (because that would show FT for AFTER currentGW, not FOR currentGW)
                }
              }
            }

            freeTransfers = ftBalance;

            // Bench points (last 5 GWs)
            const last5GWs = currentGWs.slice(-5);
            const benchBreakdown = last5GWs.map((gw: any) => gw.points_on_bench || 0);
            const benchTotal = benchBreakdown.reduce((sum: number, pts: number) => sum + pts, 0);
            benchPoints = {
              total: benchTotal,
              average: benchTotal / Math.max(benchBreakdown.length, 1),
              breakdown: benchBreakdown
            };

            // Hits taken (all season)
            const hitsBreakdown: Array<{ gameweek: number; cost: number }> = [];
            currentGWs.forEach((gw: any) => {
              if (gw.event_transfers_cost && gw.event_transfers_cost > 0) {
                hitsBreakdown.push({
                  gameweek: gw.event,
                  cost: -gw.event_transfers_cost
                });
              }
            });
            const hitsTotal = hitsBreakdown.reduce((sum, hit) => sum + hit.cost, 0);
            hitsTaken = {
              total: hitsTotal,
              count: hitsBreakdown.length,
              breakdown: hitsBreakdown
            };
          }
        }

        // Get entry data for team value and overall rank
        const entryData = await fplApi.getEntry(entryId);
        if (entryData) {
          if (entryData.last_deadline_value) {
            teamValue = entryData.last_deadline_value / 10;
          }
          if (entryData.summary_overall_rank) {
            overallRank = entryData.summary_overall_rank;
          }
        }

        // Get captain history (last 5 completed GWs)
        const completedGWs = last5.map(m => m.event);
        if (completedGWs.length > 0) {
          const captainCounts: Record<number, number> = {};

          for (const gw of completedGWs) {
            try {
              const picksData = await fplApi.getEntryPicks(entryId, gw);
              if (picksData && picksData.picks) {
                const captain = picksData.picks.find((p: any) => p.is_captain);
                if (captain) {
                  captainCounts[captain.element] = (captainCounts[captain.element] || 0) + 1;
                }
              }
            } catch (error) {
              // Skip if picks not available for this GW
            }
          }

          // Get player names from bootstrap
          if (Object.keys(captainCounts).length > 0) {
            const elements = bootstrapData.elements;
            captainHistory = Object.entries(captainCounts)
              .map(([playerId, count]) => {
                const player = elements.find((p: any) => p.id === parseInt(playerId));
                return {
                  playerName: player ? player.web_name : 'Unknown',
                  count: count as number
                };
              })
              .sort((a, b) => b.count - a.count);
          }
        }
      } catch (error) {
        console.log(`Error fetching strategic intel for entry ${entryId}:`, error);
      }

      return {
        recent_form: recentForm,
        avg_points_last_5: avgPointsLast5,
        chips_remaining: chipsRemaining,
        free_transfers: freeTransfers,
        strategicIntel: {
          captainHistory,
          benchPoints,
          teamValue,
          hitsTaken,
          overallRank,
          commonPlayers: { count: 0, percentage: 0, players: [] as string[] } // Calculated later
        }
      };
    };

    // Get stats for both players
    const [entry1Stats, entry2Stats] = await Promise.all([
      getPlayerStats(entry1Id),
      getPlayerStats(entry2Id)
    ]);

    // Calculate common players and differentials
    let commonPlayers = { count: 0, percentage: 0, players: [] as string[] };
    let differentialPlayers = {
      entry_1: [] as Array<{ playerName: string; avgPoints: number; form: number[]; formMinutes: number[]; position: string }>,
      entry_2: [] as Array<{ playerName: string; avgPoints: number; form: number[]; formMinutes: number[]; position: string }>
    };

    try {
      // Get current GW picks for both players
      const [picks1Data, picks2Data] = await Promise.all([
        fplApi.getEntryPicks(entry1Id, currentGW),
        fplApi.getEntryPicks(entry2Id, currentGW)
      ]);

      if (picks1Data && picks2Data && picks1Data.picks && picks2Data.picks) {
        // Get all squad player IDs (including bench)
        const team1Players = picks1Data.picks
          .map((p: any) => p.element);

        const team2Players = picks2Data.picks
          .map((p: any) => p.element);

        // Find common player IDs
        const commonPlayerIds = team1Players.filter((id: number) =>
          team2Players.includes(id)
        );

        // Get player names from bootstrap
        const elements = bootstrapData.elements;
        const playerNames = commonPlayerIds.map((id: number) => {
          const player = elements.find((p: any) => p.id === id);
          return player ? player.web_name : 'Unknown';
        });

        commonPlayers = {
          count: commonPlayerIds.length,
          percentage: Math.round((commonPlayerIds.length / 15) * 100),
          players: playerNames
        };

        // Calculate differential players (players one team has but the other doesn't)
        const team1Differentials = team1Players.filter((id: number) => !team2Players.includes(id));
        const team2Differentials = team2Players.filter((id: number) => !team1Players.includes(id));

        // Get last 5 GWs (including current GW to show live data)
        const last5GWs = Array.from({ length: 5 }, (_, i) => currentGW - i).filter(gw => gw > 0).reverse();

        // Fetch all GW data once (cache it) to avoid redundant API calls
        const gwDataCache: Map<number, any> = new Map();
        for (const gw of last5GWs) {
          try {
            const eventLiveData = await fplApi.getEventLive(gw);
            gwDataCache.set(gw, eventLiveData);
          } catch (error) {
            console.error(`Error fetching live data for GW${gw}:`, error);
            gwDataCache.set(gw, null);
          }
        }

        // Helper to get player stats for differentials (now uses cached GW data)
        const getPlayerDifferentialStats = (playerId: number) => {
          const player = elements.find((p: any) => p.id === playerId) as any;
          if (!player) return null;

          // Fetch player's performance for last 5 GWs using cached data
          const playerHistory: number[] = [];
          const playerMinutes: number[] = [];
          for (const gw of last5GWs) {
            const eventLiveData = gwDataCache.get(gw);
            if (eventLiveData && eventLiveData.elements) {
              const playerLiveData = eventLiveData.elements.find((e: any) => e.id === playerId);
              const points = playerLiveData?.stats?.total_points || 0;
              const minutes = playerLiveData?.stats?.minutes || 0;
              playerHistory.push(points);
              playerMinutes.push(minutes);
            } else {
              playerHistory.push(0);
              playerMinutes.push(0);
            }
          }

          const avgPoints = playerHistory.length > 0
            ? playerHistory.reduce((sum, pts) => sum + pts, 0) / playerHistory.length
            : 0;

          // Get position
          const positionMap: { [key: number]: string } = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };
          const position = positionMap[player.element_type] || 'Unknown';

          // Get current GW data (last element in arrays since we now include current GW)
          const currentGwPoints = playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : 0;
          const currentGwMinutes = playerMinutes.length > 0 ? playerMinutes[playerMinutes.length - 1] : 0;

          return {
            playerName: player.web_name,
            avgPoints: parseFloat(avgPoints.toFixed(1)),
            form: playerHistory,
            formMinutes: playerMinutes,
            position,
            currentGwPoints,
            currentGwMinutes
          };
        };

        // Get stats for all differential players (now synchronous since we have cached data)
        const team1DiffStats = team1Differentials.map(getPlayerDifferentialStats);
        const team2DiffStats = team2Differentials.map(getPlayerDifferentialStats);

        // Filter out nulls and sort by avg points (high to low)
        differentialPlayers.entry_1 = team1DiffStats
          .filter((stat: any): stat is { playerName: string; avgPoints: number; form: number[]; formMinutes: number[]; position: string; currentGwPoints: number; currentGwMinutes: number } => stat !== null)
          .sort((a: any, b: any) => b.avgPoints - a.avgPoints);

        differentialPlayers.entry_2 = team2DiffStats
          .filter((stat: any): stat is { playerName: string; avgPoints: number; form: number[]; formMinutes: number[]; position: string; currentGwPoints: number; currentGwMinutes: number } => stat !== null)
          .sort((a: any, b: any) => b.avgPoints - a.avgPoints);
      }
    } catch (error) {
      console.log('Error calculating common players and differentials:', error);
    }

    // Add common players to both strategic intel objects
    entry1Stats.strategicIntel.commonPlayers = commonPlayers;
    entry2Stats.strategicIntel.commonPlayers = commonPlayers;

    // Get head-to-head record
    const h2hResult = await db.query(`
      SELECT
        event,
        CASE
          WHEN entry_1_id = $1 THEN entry_1_points
          ELSE entry_2_points
        END as entry1_score,
        CASE
          WHEN entry_1_id = $2 THEN entry_1_points
          ELSE entry_2_points
        END as entry2_score,
        winner
      FROM h2h_matches
      WHERE league_id = $3
        AND (
          (entry_1_id = $1 AND entry_2_id = $2) OR
          (entry_1_id = $2 AND entry_2_id = $1)
        )
        AND (entry_1_points > 0 OR entry_2_points > 0)
      ORDER BY event DESC
    `, [entry1Id, entry2Id, leagueId]);

    const h2hMatches = h2hResult.rows;
    const entry1Wins = h2hMatches.filter((m: any) => m.winner && parseInt(m.winner) === entry1Id).length;
    const entry2Wins = h2hMatches.filter((m: any) => m.winner && parseInt(m.winner) === entry2Id).length;
    const draws = h2hMatches.filter((m: any) => !m.winner).length;

    return NextResponse.json({
      match_id: matchId,
      entry_1: {
        id: entry1Id,
        player_name: match.entry_1_player,
        team_name: match.entry_1_team,
        ...entry1Stats
      },
      entry_2: {
        id: entry2Id,
        player_name: match.entry_2_player,
        team_name: match.entry_2_team,
        ...entry2Stats
      },
      head_to_head: {
        total_meetings: h2hMatches.length,
        entry_1_wins: entry1Wins,
        entry_2_wins: entry2Wins,
        draws,
        last_meeting: h2hMatches.length > 0 ? {
          event: h2hMatches[0].event,
          entry_1_score: h2hMatches[0].entry1_score,
          entry_2_score: h2hMatches[0].entry2_score
        } : null
      },
      differential_players: differentialPlayers
    });
  } catch (error: any) {
    console.error('Error fetching match details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch match details' },
      { status: 500 }
    );
  }
}
