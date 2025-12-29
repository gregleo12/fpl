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

    // Fetch bootstrap data first to determine current GW and status
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

    // Determine if target GW is live/upcoming (K-27 Data Source Rules)
    const targetGWEvent = bootstrapData.events.find((e: any) => e.id === targetGW);
    const isLiveOrUpcoming = targetGWEvent && (!targetGWEvent.finished || targetGWEvent.is_next);

    let transfers: any[] = [];

    if (isLiveOrUpcoming) {
      // Live/Upcoming GW → Fetch from FPL API (real-time data)

      try {
        const fplTransfersResponse = await fetch(
          `https://fantasy.premierleague.com/api/entry/${teamId}/transfers/`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          }
        );

        if (fplTransfersResponse.ok) {
          const fplTransfers = await fplTransfersResponse.json();

          // Map FPL API format to our internal format
          // We'll need to fetch player details from bootstrap
          transfers = fplTransfers.map((t: any) => {
            const playerIn = bootstrapData.elements.find((p: any) => p.id === t.element_in);
            const playerOut = bootstrapData.elements.find((p: any) => p.id === t.element_out);

            return {
              event: t.event,
              time: t.time,
              element_in: t.element_in,
              element_out: t.element_out,
              element_in_cost: t.element_in_cost,
              element_out_cost: t.element_out_cost,
              pin_id: playerIn?.id,
              pin_web_name: playerIn?.web_name,
              pin_team: playerIn?.team,
              pin_team_code: playerIn?.team_code,
              pin_element_type: playerIn?.element_type,
              pout_id: playerOut?.id,
              pout_web_name: playerOut?.web_name,
              pout_team: playerOut?.team,
              pout_team_code: playerOut?.team_code,
              pout_element_type: playerOut?.element_type
            };
          });
        }
      } catch (err) {
        console.error('[Transfers] FPL API fetch failed, falling back to database:', err);
        // Fall back to database on error
        const fallbackResult = await db.query(`
          SELECT
            mt.event,
            mt.transfer_time as time,
            mt.player_in as element_in,
            mt.player_out as element_out,
            mt.player_in_cost as element_in_cost,
            mt.player_out_cost as element_out_cost,
            pin.id as pin_id,
            pin.web_name as pin_web_name,
            pin.team_id as pin_team,
            pin.team_code as pin_team_code,
            pin.element_type as pin_element_type,
            pout.id as pout_id,
            pout.web_name as pout_web_name,
            pout.team_id as pout_team,
            pout.team_code as pout_team_code,
            pout.element_type as pout_element_type
          FROM manager_transfers mt
          JOIN players pin ON pin.id = mt.player_in
          JOIN players pout ON pout.id = mt.player_out
          WHERE mt.entry_id = $1
          ORDER BY mt.event DESC, mt.transfer_time DESC
        `, [parseInt(teamId)]);
        transfers = fallbackResult.rows;
      }
    } else {
      // Completed GW → Use database (K-27 cache)

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
          pin.team_id as pin_team,
          pin.team_code as pin_team_code,
          pin.element_type as pin_element_type,
          pout.id as pout_id,
          pout.web_name as pout_web_name,
          pout.team_id as pout_team,
          pout.team_code as pout_team_code,
          pout.element_type as pout_element_type
        FROM manager_transfers mt
        JOIN players pin ON pin.id = mt.player_in
        JOIN players pout ON pout.id = mt.player_out
        WHERE mt.entry_id = $1
        ORDER BY mt.event DESC, mt.transfer_time DESC
      `, [parseInt(teamId)]);

      transfers = transfersResult.rows;
    }

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
