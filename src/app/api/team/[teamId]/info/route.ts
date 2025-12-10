import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;

    // Fetch entry info
    const entryResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${teamId}/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    );

    if (!entryResponse.ok) {
      throw new Error(`Failed to fetch entry info: ${entryResponse.status}`);
    }

    const entryData = await entryResponse.json();

    // Fetch bootstrap data for total players count
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

    // Get current GW stats
    const currentGW = entryData.current_event || 1;
    const gwHistory = entryData.history || [];
    const currentGWData = gwHistory.find((h: any) => h.event === currentGW) || {};

    return NextResponse.json({
      overallPoints: entryData.summary_overall_points || 0,
      overallRank: entryData.summary_overall_rank || 0,
      teamValue: entryData.last_deadline_value || 0,
      bank: entryData.last_deadline_bank || 0,
      totalPlayers: totalPlayers,
      gwPoints: currentGWData.points || 0,
      gwRank: currentGWData.rank || 0,
      gwTransfers: {
        count: currentGWData.event_transfers || 0,
        cost: currentGWData.event_transfers_cost || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching team info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team info' },
      { status: 500 }
    );
  }
}
