import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const teamId = params.teamId;
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID required' },
        { status: 400 }
      );
    }

    // K-65: Determine current GW and status
    const bootstrapResponse = await fetch(
      'https://fantasy.premierleague.com/api/bootstrap-static/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        next: { revalidate: 60 }
      }
    );

    let currentGW = 1;
    let currentGWStatus: 'upcoming' | 'in_progress' | 'completed' = 'in_progress';

    if (bootstrapResponse.ok) {
      const bootstrapData = await bootstrapResponse.json();
      const currentEvent = bootstrapData.events?.find((e: any) => e.is_current);
      if (currentEvent) {
        currentGW = currentEvent.id;
        // K-141: Only use database for truly completed GWs (finished AND next GW has started)
        if (currentEvent.finished && !currentEvent.is_current) {
          currentGWStatus = 'completed';
        } else if (!currentEvent.is_current && !currentEvent.data_checked) {
          currentGWStatus = 'upcoming';
        }
      }
    }

    const db = await getDatabase();

    // Get GW history from database (for completed GWs)
    // K-65: Database 'points' may be GROSS, so we calculate NET points here
    const historyResult = await db.query(`
      SELECT
        event,
        points - COALESCE(event_transfers_cost, 0) as points,
        overall_rank,
        rank as gw_rank,
        event_transfers_cost
      FROM manager_gw_history
      WHERE entry_id = $1 AND league_id = $2
      ORDER BY event ASC
    `, [teamId, leagueId]);

    let history = historyResult.rows;

    // K-65: Fallback to FPL API if database is empty (team not synced yet)
    if (history.length === 0) {
      try {
        const fplHistoryResponse = await fetch(
          `https://fantasy.premierleague.com/api/entry/${teamId}/history/`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          }
        );

        if (fplHistoryResponse.ok) {
          const fplHistory = await fplHistoryResponse.json();
          // Transform FPL API format to our format
          // Use 'current' array which has all completed GWs
          if (fplHistory.current && Array.isArray(fplHistory.current)) {
            history = fplHistory.current.map((gw: any) => ({
              event: gw.event,
              // K-65: FPL API 'points' is GROSS (before transfer cost), subtract to get NET
              points: gw.points - (gw.event_transfers_cost || 0),
              overall_rank: gw.overall_rank,
              gw_rank: gw.rank,
              event_transfers_cost: gw.event_transfers_cost || 0
            }));
          }
        }
      } catch (apiError) {
        console.error('[Team History API] Error fetching from FPL API:', apiError);
        // Continue with empty history
      }
    }

    // K-65 + K-109 Phase 5: If current GW is live/in-progress, calculate live points and add/update it in history
    if (currentGWStatus === 'in_progress' || currentGWStatus === 'upcoming') {
      try {
        // K-109 Phase 5: Use K-108c for live GW score
        console.log(`[K-109 Phase 5] Calculating live GW${currentGW} for team ${teamId} using K-108c`);
        const teamScore = await calculateTeamGameweekScore(parseInt(teamId), currentGW);
        const scoreResult = { score: teamScore.points.net_total };

        // Fetch live picks to get transfer cost and overall rank
        const picksResponse = await fetch(
          `https://fantasy.premierleague.com/api/entry/${teamId}/event/${currentGW}/picks/`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          }
        );

        let gwRank = 0;
        let transferCost = 0;
        let overallRank = 0;

        if (picksResponse.ok) {
          const picksData = await picksResponse.json();
          gwRank = picksData.entry_history?.rank || 0;
          // K-109 Phase 5: Transfer cost from K-108c
          transferCost = teamScore.points.transfer_cost;
          overallRank = picksData.entry_history?.overall_rank || 0;
        }

        // If no overall rank from picks (live GW), fetch from entry summary
        if (overallRank === 0) {
          const entryResponse = await fetch(
            `https://fantasy.premierleague.com/api/entry/${teamId}/`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
              }
            }
          );
          if (entryResponse.ok) {
            const entryData = await entryResponse.json();
            overallRank = entryData.summary_overall_rank || 0;
          }
        }

        // Check if current GW already exists in history (from database)
        const existingGWIndex = history.findIndex(h => h.event === currentGW);

        const liveGWData = {
          event: currentGW,
          points: scoreResult.score,
          overall_rank: overallRank,
          gw_rank: gwRank,
          event_transfers_cost: transferCost
        };

        if (existingGWIndex >= 0) {
          // Replace existing entry with live data
          history[existingGWIndex] = liveGWData;
        } else {
          // Add new entry for current GW
          history.push(liveGWData);
          // Re-sort by event ASC
          history.sort((a, b) => a.event - b.event);
        }
      } catch (liveError) {
        console.error('[Team History API] Error calculating live GW:', liveError);
        // Continue with database data only
      }
    }

    // Get transfers (for transfers modal)
    const transfersResult = await db.query(`
      SELECT
        event,
        player_in,
        player_out,
        player_in_cost,
        player_out_cost,
        transfer_time
      FROM manager_transfers
      WHERE entry_id = $1
      ORDER BY event DESC, transfer_time DESC
    `, [teamId]);

    return NextResponse.json({
      history,
      transfers: transfersResult.rows,
    });
  } catch (error: any) {
    console.error('[Team History API] Error:', error);
    // Return empty arrays instead of error to allow UI to function
    return NextResponse.json({
      history: [],
      transfers: [],
    });
  }
}
