import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;

    // Fetch entry data and history from FPL API
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

    if (!entryResponse.ok || !historyResponse.ok) {
      throw new Error('Failed to fetch data from FPL API');
    }

    const entryData = await entryResponse.json();
    const historyData = await historyResponse.json();

    // Get current GW
    const currentGW = entryData.current_event || 1;

    // Fetch current GW picks for latest transfer info
    const picksResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${teamId}/event/${currentGW}/picks/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    );

    let gwTransfers = 0;
    let gwHits = 0;
    let freeTransfersAvailable = 1;

    if (picksResponse.ok) {
      const picksData = await picksResponse.json();
      gwTransfers = picksData.entry_history?.event_transfers || 0;
      gwHits = picksData.entry_history?.event_transfers_cost || 0;

      // Free transfers available for NEXT gameweek
      // If they made transfers this GW, the entry_history shows current state
      // Otherwise, we can infer from the entry data
      const transfersData = picksData.entry_history;

      // Calculate FTs available for next GW
      // If you made 0 transfers this GW, you have 2 FTs next GW (max)
      // If you made transfers, you start with 1 FT next GW
      // This is a simplification - the actual logic is complex
      if (gwTransfers === 0) {
        freeTransfersAvailable = 2;
      } else {
        freeTransfersAvailable = 1;
      }
    }

    // Get all GW history for season totals
    const gwHistory = historyData.current || [];

    let seasonTransfers = 0;
    let seasonHits = 0;

    gwHistory.forEach((h: any) => {
      seasonTransfers += h.event_transfers || 0;
      seasonHits += h.event_transfers_cost || 0;
    });

    // Get chips used
    const chipsUsed = (historyData.chips || []).map((chip: any) => ({
      name: chip.name,
      gw: chip.event
    }));

    return NextResponse.json({
      gwTransfers: gwTransfers,
      gwHits: gwHits,
      seasonTransfers: seasonTransfers,
      seasonHits: seasonHits,
      freeTransfersAvailable: freeTransfersAvailable,
      chipsUsed: chipsUsed
    });
  } catch (error: any) {
    console.error('Error fetching transfer stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transfer stats' },
      { status: 500 }
    );
  }
}
