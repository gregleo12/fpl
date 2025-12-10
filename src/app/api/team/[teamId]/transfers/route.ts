import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;

    // Fetch transfers
    const transfersResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${teamId}/transfers/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    );

    if (!transfersResponse.ok) {
      throw new Error(`Failed to fetch transfers: ${transfersResponse.status}`);
    }

    const transfers = await transfersResponse.json();

    // Fetch bootstrap data for player names
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

    // Create player lookup
    const playerLookup: { [key: number]: any } = {};
    bootstrapData.elements.forEach((player: any) => {
      playerLookup[player.id] = {
        id: player.id,
        web_name: player.web_name,
        team: player.team,
        team_code: player.team_code,
        element_type: player.element_type
      };
    });

    // Enrich transfers with player names
    const enrichedTransfers = transfers.map((transfer: any) => ({
      event: transfer.event,
      time: transfer.time,
      playerIn: {
        ...playerLookup[transfer.element_in],
        cost: transfer.element_in_cost
      },
      playerOut: {
        ...playerLookup[transfer.element_out],
        cost: transfer.element_out_cost
      }
    }));

    // Calculate totals
    const totalTransfers = transfers.length;
    const totalHits = transfers.filter((t: any) => t.event !== 1).length;

    return NextResponse.json({
      transfers: enrichedTransfers,
      totalTransfers: totalTransfers,
      totalHits: Math.max(0, Math.floor((totalTransfers - totalHits) / 1)) // Approximate hits
    });
  } catch (error: any) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}
