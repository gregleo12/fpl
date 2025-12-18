import { NextRequest, NextResponse } from 'next/server';
import { calculateManagerLiveScore } from '@/lib/scoreCalculator';

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

    // Use live score calculator for accurate GW points
    const scoreResult = await calculateManagerLiveScore(parseInt(teamId), currentGW, status);
    const gwPoints = scoreResult.score;

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
      gwRank = picksData.entry_history?.rank || 0;
      gwTransfers = {
        count: picksData.entry_history?.event_transfers || 0,
        cost: picksData.entry_history?.event_transfers_cost || 0
      };
    }

    // Find the selected GW's history entry
    let gwHistory = null;
    if (historyData && historyData.current) {
      gwHistory = historyData.current.find((h: any) => h.event === currentGW);
    }

    // Use history data if available for selected GW, otherwise fall back to current values
    const overallPoints = gwHistory?.total_points || entryData.summary_overall_points || 0;
    const overallRank = gwHistory?.overall_rank || entryData.summary_overall_rank || 0;
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
