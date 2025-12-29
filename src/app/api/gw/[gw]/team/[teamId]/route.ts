import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateTeamTotal, type ManagerPick, type PlayerData, type ChipType } from '@/lib/teamCalculator';
import { calculateManagerLiveScore } from '@/lib/scoreCalculator';

// Force dynamic rendering for fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * K-108c + K-136: Team Totals Calculation
 *
 * GET /api/gw/[gw]/team/[teamId]
 *
 * Calculates manager's gameweek total with full breakdown:
 * - Starting XI points
 * - Captain bonus
 * - Bench boost (if active)
 * - Auto-subs
 * - Transfer cost
 * - Verification against FPL official total
 *
 * K-136: Uses FPL API for live/upcoming GWs, database for completed GWs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { gw: string; teamId: string } }
) {
  try {
    const gameweek = parseInt(params.gw);
    const entry_id = parseInt(params.teamId);

    if (isNaN(gameweek) || gameweek < 1 || gameweek > 38) {
      return NextResponse.json({ error: 'Invalid gameweek' }, { status: 400 });
    }

    if (isNaN(entry_id)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    // K-136: Determine GW status from FPL API FIRST
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!bootstrapResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch gameweek status' }, { status: 500 });
    }

    const bootstrapData = await bootstrapResponse.json();
    const currentEvent = bootstrapData.events.find((e: any) => e.id === gameweek);

    let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';
    if (currentEvent) {
      // K-141: Only use database for truly completed GWs (finished AND next GW has started)
      if (currentEvent.finished && !currentEvent.is_current) {
        status = 'completed';
      } else if (currentEvent.is_current || currentEvent.data_checked) {
        status = 'in_progress';
      }
    }

    console.log(`[K-136] /api/gw/${gameweek}/team/${entry_id} - GW status: ${status}`);

    // K-136: For live/upcoming GWs, use FPL API
    if (status === 'in_progress' || status === 'upcoming') {
      console.log(`[K-136] Using FPL API for live/upcoming GW`);
      const liveResult = await calculateManagerLiveScore(entry_id, gameweek, status);

      console.log(`[K-136] Live score: ${liveResult.score} pts`);

      return NextResponse.json({
        gameweek,
        entry_id,
        status: status as 'in_progress',
        active_chip: liveResult.chip || null,
        picks: {
          starting_xi: liveResult.squad.starting11.map((p: any) => ({
            player_id: p.id,
            web_name: p.name,
            position: p.position,
            is_captain: p.multiplier > 1,
            is_vice_captain: false,
            multiplier: p.multiplier,
            points: p.points || 0,
            minutes: p.minutes || 0,
          })),
          bench: liveResult.squad.bench.map((p: any) => ({
            player_id: p.id,
            web_name: p.name,
            position: p.position,
            points: p.points || 0,
            minutes: p.minutes || 0,
            auto_subbed: false,
          })),
        },
        auto_subs: liveResult.autoSubs?.substitutions || [],
        points: {
          starting_xi_total: 0,
          captain_bonus: liveResult.breakdown.captainPoints,
          bench_boost_total: 0,
          auto_sub_total: 0,
          gross_total: liveResult.score + liveResult.breakdown.transferCost,
          transfer_cost: liveResult.breakdown.transferCost,
          net_total: liveResult.score,
          fpl_total: null,
          match: null,
        },
      });
    }

    // For completed GWs, use database (original K-108c logic)
    console.log(`[K-136] Using database for completed GW`);
    const db = await getDatabase();

    // 1. Get manager picks
    const picksResult = await db.query(
      `SELECT player_id, position, multiplier, is_captain, is_vice_captain
       FROM manager_picks
       WHERE entry_id = $1 AND event = $2
       ORDER BY position`,
      [entry_id, gameweek]
    );

    if (picksResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No picks found for this manager and gameweek' },
        { status: 404 }
      );
    }

    const picks: ManagerPick[] = picksResult.rows;

    // 2. Get player data from player_gameweek_stats (K-108)
    const playerIds = picks.map(p => p.player_id);

    const playersResult = await db.query(
      `SELECT
        p.id,
        p.web_name,
        p.element_type as position,
        COALESCE(pgs.calculated_points, 0) as points,
        COALESCE(pgs.minutes, 0) as minutes
       FROM players p
       LEFT JOIN player_gameweek_stats pgs
         ON pgs.player_id = p.id AND pgs.gameweek = $1
       WHERE p.id = ANY($2)`,
      [gameweek, playerIds]
    );

    const playerData = new Map<number, PlayerData>();
    for (const row of playersResult.rows) {
      playerData.set(row.id, {
        id: row.id,
        position: row.position,
        points: row.points,
        minutes: row.minutes,
        web_name: row.web_name,
      });
    }

    // 3. Get active chip
    const chipResult = await db.query(
      `SELECT chip_name
       FROM manager_chips
       WHERE entry_id = $1 AND event = $2`,
      [entry_id, gameweek]
    );

    const activeChip: ChipType = chipResult.rows[0]?.chip_name || null;

    // 4. Get transfer cost from manager_gw_history
    const historyResult = await db.query(
      `SELECT event_transfers_cost, points
       FROM manager_gw_history
       WHERE entry_id = $1 AND event = $2`,
      [entry_id, gameweek]
    );

    const transferCost = historyResult.rows[0]?.event_transfers_cost || 0;
    const fplTotal = historyResult.rows[0]?.points || null;

    // 5. Calculate team total
    const calculation = calculateTeamTotal(picks, playerData, activeChip, transferCost);

    // 6. Build response with full breakdown
    const startingXI = picks.filter(p => p.position <= 11).map(pick => {
      const player = playerData.get(pick.player_id);
      return {
        player_id: pick.player_id,
        web_name: player?.web_name || 'Unknown',
        position: pick.position,
        is_captain: pick.is_captain,
        is_vice_captain: pick.is_vice_captain,
        multiplier: pick.is_captain ? (activeChip === '3xc' ? 3 : 2) : 1,
        points: player?.points || 0,
        minutes: player?.minutes || 0,
      };
    });

    const benchPlayers = picks.filter(p => p.position >= 12).map(pick => {
      const player = playerData.get(pick.player_id);
      const wasSubbedIn = calculation.auto_subs.some(s => s.in === pick.player_id);
      return {
        player_id: pick.player_id,
        web_name: player?.web_name || 'Unknown',
        position: pick.position,
        points: player?.points || 0,
        minutes: player?.minutes || 0,
        auto_subbed: wasSubbedIn,
      };
    });

    return NextResponse.json({
      gameweek,
      entry_id,
      status: fplTotal !== null ? 'completed' : 'in_progress',
      active_chip: activeChip,
      picks: {
        starting_xi: startingXI,
        bench: benchPlayers,
      },
      auto_subs: calculation.auto_subs,
      points: {
        starting_xi_total: calculation.starting_xi_total,
        captain_bonus: calculation.captain_bonus,
        bench_boost_total: calculation.bench_boost_total,
        auto_sub_total: calculation.auto_sub_total,
        gross_total: calculation.gross_total,
        transfer_cost: calculation.transfer_cost,
        net_total: calculation.net_total,
        fpl_total: fplTotal,
        match: fplTotal !== null ? calculation.net_total === fplTotal : null,
      },
    });

  } catch (error: any) {
    console.error('[K-108c] Error calculating team total:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate team total' },
      { status: 500 }
    );
  }
}
