import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const db = await getDatabase();

    // Get gameweek from query params, default to current if not provided
    const searchParams = request.nextUrl.searchParams;
    const requestedGW = searchParams.get('gw');

    // Fetch transfers from database
    const transfersResult = await db.query(`
      SELECT
        mt.event,
        mt.transfer_time as time,
        mt.player_in as element_in,
        mt.player_out as element_out,
        mt.player_in_cost as element_in_cost,
        mt.player_out_cost as element_out_cost,
        pin.id as pin_id,
        pin.web_name as pin_web_name,
        pin.team as pin_team,
        pin.team_code as pin_team_code,
        pin.element_type as pin_element_type,
        pout.id as pout_id,
        pout.web_name as pout_web_name,
        pout.team as pout_team,
        pout.team_code as pout_team_code,
        pout.element_type as pout_element_type
      FROM manager_transfers mt
      JOIN players pin ON pin.id = mt.player_in
      JOIN players pout ON pout.id = mt.player_out
      WHERE mt.entry_id = $1
      ORDER BY mt.event DESC, mt.transfer_time DESC
    `, [parseInt(teamId)]);

    const transfers = transfersResult.rows;

    // Fetch bootstrap data for current GW
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

    // Enrich transfers with player data (already joined from database)
    const enrichedTransfers = transfers.map((transfer: any) => ({
      event: transfer.event,
      time: transfer.time,
      playerIn: {
        id: transfer.pin_id,
        web_name: transfer.pin_web_name,
        team: transfer.pin_team,
        team_code: transfer.pin_team_code,
        element_type: transfer.pin_element_type,
        cost: transfer.element_in_cost
      },
      playerOut: {
        id: transfer.pout_id,
        web_name: transfer.pout_web_name,
        team: transfer.pout_team,
        team_code: transfer.pout_team_code,
        element_type: transfer.pout_element_type,
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
              id: transfer.pout_id,
              web_name: transfer.pout_web_name,
              team: transfer.pout_team,
              team_code: transfer.pout_team_code,
              element_type: transfer.pout_element_type,
              points: playerPointsLookup[transfer.element_out] || 0
            },
            playerIn: {
              id: transfer.pin_id,
              web_name: transfer.pin_web_name,
              team: transfer.pin_team,
              team_code: transfer.pin_team_code,
              element_type: transfer.pin_element_type,
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
