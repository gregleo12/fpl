import { NextRequest, NextResponse } from 'next/server';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';
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

    console.log(`[K-109 Phase 2] Fetching team data for entry ${entryId}, GW${gameweek}...`);

    // K-109 Phase 2: Use K-108c for accurate score calculation
    const teamScore = await calculateTeamGameweekScore(entryId, gameweek);
    console.log(`[K-109 Phase 2] K-108c score: ${teamScore.points.net_total} pts, status: ${teamScore.status}`);

    const db = await getDatabase();

    // Get manager picks from database
    const picksResult = await db.query(
      `SELECT player_id, position, multiplier, is_captain, is_vice_captain
       FROM manager_picks
       WHERE entry_id = $1 AND event = $2
       ORDER BY position`,
      [entryId, gameweek]
    );

    if (picksResult.rows.length === 0) {
      return NextResponse.json({ error: 'No picks found' }, { status: 404 });
    }

    const picks = picksResult.rows;
    const playerIds = picks.map((p: any) => p.player_id);

    // Get player data from database (K-108 calculated points)
    const playersResult = await db.query(
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

    // Fetch FPL API data for fixtures and teams
    const [bootstrapResponse, entryResponse, fixturesResponse] = await Promise.all([
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
      fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/`),
      fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gameweek}`)
    ]);

    const bootstrapData = bootstrapResponse.ok ? await bootstrapResponse.json() : null;
    const entryData = entryResponse.ok ? await entryResponse.json() : null;
    const fixturesData = fixturesResponse.ok ? await fixturesResponse.json() : [];

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

    // K-109 Phase 3: Create auto-sub lookup from K-108c data
    const autoSubLookup: { [key: number]: { is_sub_in?: boolean; is_sub_out?: boolean } } = {};
    teamScore.auto_subs.forEach(sub => {
      autoSubLookup[sub.in] = { is_sub_in: true };
      autoSubLookup[sub.out] = { is_sub_out: true };
    });

    console.log(`[K-109 Phase 3] Auto-subs: ${teamScore.auto_subs.length} substitutions`);

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
      autoSubs: teamScore.auto_subs.map(sub => ({
        playerOut: {
          id: sub.out,
          name: sub.out_name
        },
        playerIn: {
          id: sub.in,
          name: sub.in_name,
          points: sub.points_gained
        }
      })),
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
