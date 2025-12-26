import { NextRequest, NextResponse } from 'next/server';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';
import { calculateManagerLiveScore } from '@/lib/scoreCalculator';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * K-109 Phases 2-4: My Team Pitch View using K-108c
 *
 * Returns detailed team data for pitch view with:
 * - Accurate points from K-108c
 * - Auto-sub indicators
 * - Player stats and fixture info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string; gw: string } }
) {
  try {
    const { teamId, gw } = params;
    const entryId = parseInt(teamId);
    const gameweek = parseInt(gw);

    if (isNaN(entryId) || isNaN(gameweek)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    console.log(`[K-136] Fetching team data for entry ${entryId}, GW${gameweek}...`);

    // K-136: Determine GW status from FPL API FIRST
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!bootstrapResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch gameweek status' }, { status: 500 });
    }

    const bootstrapData = await bootstrapResponse.json();
    const currentEvent = bootstrapData.events.find((e: any) => e.id === gameweek);

    let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';
    if (currentEvent) {
      if (currentEvent.finished) {
        status = 'completed';
      } else if (currentEvent.is_current || currentEvent.data_checked) {
        status = 'in_progress';
      }
    }

    console.log(`[K-136] GW${gameweek} status: ${status}`);

    // Fetch entry data for overall stats
    const entryResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/`);
    const entryData = entryResponse.ok ? await entryResponse.json() : null;

    // K-136: Use appropriate calculator based on status
    let teamScore: any;
    let liveSquadData: any = null;

    if (status === 'in_progress' || status === 'upcoming') {
      console.log(`[K-136] Using FPL API for live/upcoming GW`);
      const liveResult = await calculateManagerLiveScore(entryId, gameweek, status);
      teamScore = {
        points: {
          starting_xi_total: 0, // Not available from live calculator
          captain_bonus: liveResult.breakdown.captainPoints,
          bench_boost_total: 0, // Not available from live calculator
          auto_sub_total: 0, // Not available from live calculator
          gross_total: liveResult.score + liveResult.breakdown.transferCost,
          transfer_cost: liveResult.breakdown.transferCost,
          net_total: liveResult.score
        },
        auto_subs: liveResult.autoSubs?.substitutions || [],
        status: status as 'in_progress'
      };
      liveSquadData = liveResult.squad;  // Use squad data from live calculation
    } else {
      console.log(`[K-136] Using database for completed GW`);
      teamScore = await calculateTeamGameweekScore(entryId, gameweek);
    }

    console.log(`[K-136] Score: ${teamScore.points.net_total} pts`);

    const db = await getDatabase();

    // K-136: For live GWs, we already have squad data from calculateManagerLiveScore
    // For completed GWs, we need to query database
    let picks: any[];
    let playersResult: any;
    let fixturesData: any[];

    if (liveSquadData) {
      // Use live data from calculateManagerLiveScore
      console.log(`[K-136] Building picks from live squad data`);
      const allPlayers = [...liveSquadData.starting11, ...liveSquadData.bench];
      picks = allPlayers.map((player: any, index: number) => ({
        player_id: player.id,
        position: index + 1,
        multiplier: player.multiplier,
        is_captain: player.isCaptain || false,
        is_vice_captain: player.isViceCaptain || false
      }));

      // For live GWs, player data comes from the squad
      playersResult = {
        rows: allPlayers.map((player: any) => ({
          id: player.id,
          web_name: player.name,
          team: player.team,
          team_code: player.teamCode || 0,
          element_type: player.position,
          event_points: player.points,
          minutes: player.minutes || 0,
          bps: player.bps || 0,
          bonus: player.bonus || 0
        }))
      };

      // Fetch fixtures for opponent info
      const fixturesResponse = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gameweek}`);
      fixturesData = fixturesResponse.ok ? await fixturesResponse.json() : [];
    } else {
      // Use database for completed GWs
      console.log(`[K-136] Querying database for completed GW`);
      const picksResult = await db.query(
        `SELECT DISTINCT ON (position, player_id)
           player_id, position, multiplier, is_captain, is_vice_captain
         FROM manager_picks
         WHERE entry_id = $1 AND event = $2
         ORDER BY position, player_id`,
        [entryId, gameweek]
      );

      if (picksResult.rows.length === 0) {
        return NextResponse.json({ error: 'No picks found' }, { status: 404 });
      }

      picks = picksResult.rows;
      const playerIds = picks.map((p: any) => p.player_id);

      playersResult = await db.query(
        `SELECT
          p.id,
          p.web_name,
          p.team_id as team,
          p.team_code,
          p.element_type,
          COALESCE(pgs.calculated_points, 0) as event_points,
          COALESCE(pgs.minutes, 0) as minutes,
          COALESCE(pgs.bps, 0) as bps,
          COALESCE(pgs.bonus, 0) as bonus
         FROM players p
         LEFT JOIN player_gameweek_stats pgs
           ON pgs.player_id = p.id AND pgs.gameweek = $1
         WHERE p.id = ANY($2)`,
        [gameweek, playerIds]
      );

      const fixturesResponse = await fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gameweek}`);
      fixturesData = fixturesResponse.ok ? await fixturesResponse.json() : [];
    }

    // Create team lookup
    const teamLookup: { [key: number]: any } = {};
    if (bootstrapData) {
      bootstrapData.teams.forEach((team: any) => {
        teamLookup[team.id] = team;
      });
    }

    // Create fixture lookup for each team
    const teamFixtureLookup: { [key: number]: any } = {};
    fixturesData.forEach((fixture: any) => {
      teamFixtureLookup[fixture.team_h] = {
        opponent_id: fixture.team_a,
        opponent_short: teamLookup[fixture.team_a]?.short_name || 'UNK',
        opponent_name: teamLookup[fixture.team_a]?.name || 'Unknown',
        was_home: true,
        kickoff_time: fixture.kickoff_time,
        started: fixture.started || false,
        finished: fixture.finished || false,
        finished_provisional: fixture.finished_provisional || false
      };
      teamFixtureLookup[fixture.team_a] = {
        opponent_id: fixture.team_h,
        opponent_short: teamLookup[fixture.team_h]?.short_name || 'UNK',
        opponent_name: teamLookup[fixture.team_h]?.name || 'Unknown',
        was_home: false,
        kickoff_time: fixture.kickoff_time,
        started: fixture.started || false,
        finished: fixture.finished || false,
        finished_provisional: fixture.finished_provisional || false
      };
    });

    // K-136: Create auto-sub lookup (handles both database and live format)
    const autoSubLookup: { [key: number]: { is_sub_in?: boolean; is_sub_out?: boolean } } = {};
    if (teamScore.auto_subs && teamScore.auto_subs.length > 0) {
      teamScore.auto_subs.forEach((sub: any) => {
        if (liveSquadData) {
          // Live format: { playerOut: {...}, playerIn: {...} }
          autoSubLookup[sub.playerIn.id] = { is_sub_in: true };
          autoSubLookup[sub.playerOut.id] = { is_sub_out: true };
        } else {
          // Database format: { in: id, out: id }
          autoSubLookup[sub.in] = { is_sub_in: true };
          autoSubLookup[sub.out] = { is_sub_out: true };
        }
      });
    }

    console.log(`[K-136] Auto-subs: ${teamScore.auto_subs?.length || 0} substitutions`);

    // Build player data lookup
    const playerLookup: { [key: number]: any } = {};
    playersResult.rows.forEach((player: any) => {
      const fixtureInfo = teamFixtureLookup[player.team] || null;
      const isLive = fixtureInfo?.started && !fixtureInfo?.finished && !fixtureInfo?.finished_provisional;
      const autoSubFlags = autoSubLookup[player.id] || {};

      playerLookup[player.id] = {
        id: player.id,
        web_name: player.web_name,
        team: player.team,
        team_code: player.team_code,
        element_type: player.element_type,
        event_points: player.event_points, // K-108 calculated points (100% accurate)
        bps: player.bps,
        bonus: player.bonus,
        minutes: player.minutes,
        // Fixture info
        opponent_short: fixtureInfo?.opponent_short || null,
        opponent_name: fixtureInfo?.opponent_name || null,
        was_home: fixtureInfo?.was_home ?? null,
        kickoff_time: fixtureInfo?.kickoff_time || null,
        fixture_started: fixtureInfo?.started || false,
        fixture_finished: fixtureInfo?.finished || false,
        isLive,
        // K-109 Phase 3: Auto-sub flags from K-108c
        is_sub_in: autoSubFlags.is_sub_in || false,
        is_sub_out: autoSubFlags.is_sub_out || false
      };
    });

    // Transform picks to match frontend format
    const transformedPicks = picks.map((pick: any) => ({
      element: pick.player_id,
      position: pick.position,
      multiplier: pick.multiplier,
      is_captain: pick.is_captain,
      is_vice_captain: pick.is_vice_captain
    }));

    console.log(`[K-109 Phase 2] Returning ${transformedPicks.length} picks with K-108c data`);

    // Return enriched data
    return NextResponse.json({
      picks: transformedPicks,
      playerData: playerLookup,
      // K-109 Phase 4: Include K-108c breakdown for modal
      gwPoints: teamScore.points.net_total,
      breakdown: {
        starting_xi_total: teamScore.points.starting_xi_total,
        captain_bonus: teamScore.points.captain_bonus,
        bench_boost_total: teamScore.points.bench_boost_total,
        auto_sub_total: teamScore.points.auto_sub_total,
        gross_total: teamScore.points.gross_total,
        transfer_cost: teamScore.points.transfer_cost,
        net_total: teamScore.points.net_total
      },
      autoSubs: (teamScore.auto_subs || []).map((sub: any) => {
        if (liveSquadData) {
          // Live format already matches frontend expectation
          return sub;
        } else {
          // Database format needs transformation
          return {
            playerOut: {
              id: sub.out,
              name: sub.out_name
            },
            playerIn: {
              id: sub.in,
              name: sub.in_name,
              points: sub.points_gained
            }
          };
        }
      }),
      chip: teamScore.active_chip,
      captain: {
        name: teamScore.captain_name
      },
      transfers: {
        count: 0, // Not available in K-108c
        cost: teamScore.points.transfer_cost
      },
      overallPoints: entryData?.summary_overall_points || 0,
      overallRank: entryData?.summary_overall_rank || 0
    });
  } catch (error: any) {
    console.error('[K-109 Phase 2] Error fetching gameweek data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gameweek data' },
      { status: 500 }
    );
  }
}
