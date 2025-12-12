import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;

    // Get gameweek from query params, default to current if not provided
    const searchParams = request.nextUrl.searchParams;
    const requestedGW = searchParams.get('gw');

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

    // Get current GW from bootstrap or use requested GW
    const currentGW = bootstrapData.events.find((e: any) => e.is_current)?.id || 1;
    const targetGW = requestedGW ? parseInt(requestedGW) : currentGW;

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

    // Get transfers for target GW
    const targetGWTransfers = transfers.filter((t: any) => t.event === targetGW);

    // Fetch player points for target GW transfers
    let targetGWTransfersWithPoints: any[] = [];
    if (targetGWTransfers.length > 0) {
      try {
        const picksResponse = await fetch(
          `https://fantasy.premierleague.com/api/entry/${teamId}/event/${targetGW}/picks/`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          }
        );

        if (picksResponse.ok) {
          const picksData = await picksResponse.json();

          // Fetch live data for target GW to get accurate points
          const liveResponse = await fetch(
            `https://fantasy.premierleague.com/api/event/${targetGW}/live/`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
              }
            }
          );

          let playerPointsLookup: { [key: number]: number } = {};

          if (liveResponse.ok) {
            const liveData = await liveResponse.json();
            // Use live data for accurate GW points
            liveData.elements.forEach((player: any) => {
              playerPointsLookup[player.id] = player.stats.total_points || 0;
            });
          } else {
            // Fallback to bootstrap data (only accurate for current GW)
            bootstrapData.elements.forEach((player: any) => {
              playerPointsLookup[player.id] = player.event_points || 0;
            });
          }

          targetGWTransfersWithPoints = targetGWTransfers.map((transfer: any) => ({
            playerOut: {
              ...playerLookup[transfer.element_out],
              points: playerPointsLookup[transfer.element_out] || 0
            },
            playerIn: {
              ...playerLookup[transfer.element_in],
              points: playerPointsLookup[transfer.element_in] || 0
            },
            netGain: (playerPointsLookup[transfer.element_in] || 0) - (playerPointsLookup[transfer.element_out] || 0)
          }));
        }
      } catch (err) {
        console.error('Error fetching target GW picks:', err);
      }
    }

    // Fetch entry history to get accurate hits data
    const historyResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${teamId}/history/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    );

    let totalHits = 0;
    let totalHitsCost = 0;

    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      // Sum all event_transfers_cost from current season
      totalHitsCost = historyData.current.reduce(
        (sum: number, gw: any) => sum + (gw.event_transfers_cost || 0),
        0
      );
      // Each hit is -4 points
      totalHits = totalHitsCost / 4;
    }

    // Calculate totals
    const totalTransfers = transfers.length;

    return NextResponse.json({
      transfers: enrichedTransfers,
      totalTransfers: totalTransfers,
      totalHits: totalHits,
      totalHitsCost: totalHitsCost,
      currentGW: targetGW,
      currentGWTransfers: targetGWTransfersWithPoints
    });
  } catch (error: any) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}
