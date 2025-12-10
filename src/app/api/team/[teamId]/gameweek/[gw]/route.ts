import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string; gw: string } }
) {
  try {
    const { teamId, gw } = params;

    // Fetch picks for the gameweek
    const picksResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${teamId}/event/${gw}/picks/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    );

    if (!picksResponse.ok) {
      throw new Error(`Failed to fetch picks: ${picksResponse.status}`);
    }

    const picksData = await picksResponse.json();

    // Fetch bootstrap data for player info (cache this as it doesn't change often)
    const bootstrapResponse = await fetch(
      'https://fantasy.premierleague.com/api/bootstrap-static/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    if (!bootstrapResponse.ok) {
      throw new Error(`Failed to fetch bootstrap data: ${bootstrapResponse.status}`);
    }

    const bootstrapData = await bootstrapResponse.json();

    // Fetch entry info for overall stats
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

    // Create player lookup
    const playerLookup: { [key: number]: any } = {};
    bootstrapData.elements.forEach((player: any) => {
      playerLookup[player.id] = {
        id: player.id,
        web_name: player.web_name,
        team: player.team,
        team_code: player.team_code,
        element_type: player.element_type,
        event_points: player.event_points || 0
      };
    });

    // Return combined data
    return NextResponse.json({
      picks: picksData.picks,
      playerData: playerLookup,
      gwPoints: picksData.entry_history.points,
      transfers: {
        count: picksData.entry_history.event_transfers,
        cost: picksData.entry_history.event_transfers_cost
      },
      overallPoints: entryData.summary_overall_points,
      overallRank: entryData.summary_overall_rank
    });
  } catch (error: any) {
    console.error('Error fetching gameweek data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gameweek data' },
      { status: 500 }
    );
  }
}
