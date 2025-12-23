import { NextRequest, NextResponse } from 'next/server';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const { searchParams } = new URL(request.url);
    const gwParam = searchParams.get('gw');

    // Fetch entry info and history in parallel
    const [entryResponse, historyResponse] = await Promise.all([
      fetch(
        `https://fantasy.premierleague.com/api/entry/${teamId}/`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        }
      ),
      fetch(
        `https://fantasy.premierleague.com/api/entry/${teamId}/history/`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        }
      )
    ]);

    if (!entryResponse.ok) {
      throw new Error(`Failed to fetch entry info: ${entryResponse.status}`);
    }

    const entryData = await entryResponse.json();
    const historyData = historyResponse.ok ? await historyResponse.json() : null;

    // Fetch bootstrap data for total players count and current GW
    const bootstrapResponse = await fetch(
      'https://fantasy.premierleague.com/api/bootstrap-static/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        next: { revalidate: 300 }
      }
    );

    if (!bootstrapResponse.ok) {
      throw new Error(`Failed to fetch bootstrap data: ${bootstrapResponse.status}`);
    }

    const bootstrapData = await bootstrapResponse.json();
    const totalPlayers = bootstrapData.total_players || 0;

    // Get selected GW for display (could be historical)
    const currentGW = gwParam ? parseInt(gwParam) : (entryData.current_event || 1);

    // Get FPL-wide stats for current GW from events array
    const currentEvent = bootstrapData.events?.[currentGW - 1];
    const averagePoints = currentEvent?.average_entry_score || 0;
    const highestPoints = currentEvent?.highest_score || 0;

    // Determine gameweek status
    let status: 'upcoming' | 'in_progress' | 'completed' = 'in_progress';
    if (currentEvent) {
      if (currentEvent.finished) {
        status = 'completed';
      } else if (!currentEvent.is_current && !currentEvent.data_checked) {
        status = 'upcoming';
      }
    }

    // K-109 Phase 5: Use K-108c for accurate GW points
    console.log(`[K-109 Phase 5] Calculating GW${currentGW} points for team ${teamId} using K-108c`);
    const teamScore = await calculateTeamGameweekScore(parseInt(teamId), currentGW);
    const gwPoints = teamScore.points.net_total;
    console.log(`[K-109 Phase 5] Team ${teamId} GW${currentGW}: ${gwPoints} pts (status: ${teamScore.status})`);

    // Fetch picks for selected GW (for rank/transfers display)
    const picksResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${teamId}/event/${currentGW}/picks/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    );

    let gwRank = 0;
    let gwTransfers = { count: 0, cost: 0 };

    if (picksResponse.ok) {
      const picksData = await picksResponse.json();
      // K-65: GW rank is only available after GW finishes (FPL limitation)
      gwRank = picksData.entry_history?.rank || 0;
      // K-109 Phase 5: Transfer cost from K-108c, count from FPL API
      gwTransfers = {
        count: picksData.entry_history?.event_transfers || 0,
        cost: teamScore.points.transfer_cost
      };
    }

    // Find the selected GW's history entry
    let gwHistory = null;
    if (historyData && historyData.current) {
      gwHistory = historyData.current.find((h: any) => h.event === currentGW);
    }

    // K-65: Calculate TOTAL PTS correctly for live GW
    let overallPoints = 0;
    if (status === 'completed' && gwHistory) {
      // Completed GW: Use history data (includes this GW)
      overallPoints = gwHistory.total_points;
    } else if (status === 'in_progress' || status === 'upcoming') {
      // Live/Upcoming GW: Previous total + current GW live points
      // Get previous GW's total points
      let previousTotal = 0;
      if (historyData && historyData.current) {
        const previousGWs = historyData.current.filter((h: any) => h.event < currentGW);
        if (previousGWs.length > 0) {
          // Get the most recent previous GW's total_points
          const sortedPrevious = previousGWs.sort((a: any, b: any) => b.event - a.event);
          previousTotal = sortedPrevious[0].total_points || 0;
        }
      }
      // Add current GW live points
      overallPoints = previousTotal + gwPoints;
    } else {
      // Fallback
      overallPoints = entryData.summary_overall_points || 0;
    }

    // K-65: Overall rank only available after GW finishes (FPL limitation)
    let overallRank = 0;
    if (status === 'completed' && gwHistory) {
      // Completed GW: Use history data
      overallRank = gwHistory.overall_rank;
    } else {
      // Live/Upcoming GW: Show previous overall rank (can't calculate live)
      overallRank = entryData.summary_overall_rank || 0;
    }

    const teamValue = gwHistory?.value || entryData.last_deadline_value || 0;
    const bank = gwHistory?.bank || entryData.last_deadline_bank || 0;

    return NextResponse.json({
      overallPoints: overallPoints,
      overallRank: overallRank,
      teamValue: teamValue,
      bank: bank,
      totalPlayers: totalPlayers,
      gwPoints: gwPoints,
      gwRank: gwRank,
      gwTransfers: gwTransfers,
      averagePoints: averagePoints,
      highestPoints: highestPoints
    });
  } catch (error: any) {
    console.error('Error fetching team info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team info' },
      { status: 500 }
    );
  }
}
