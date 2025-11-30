import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateMultipleManagerScores } from '@/lib/scoreCalculator';

// Force dynamic rendering and disable caching for live scores
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; gw: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const gw = parseInt(params.gw);

    if (isNaN(leagueId) || isNaN(gw)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get matches for this gameweek with captain data
    const matchesResult = await db.query(`
      SELECT
        hm.*,
        m1.player_name as entry_1_player,
        m1.team_name as entry_1_team,
        m2.player_name as entry_2_player,
        m2.team_name as entry_2_team,
        c1.captain_name as entry_1_captain,
        c2.captain_name as entry_2_captain
      FROM h2h_matches hm
      JOIN managers m1 ON hm.entry_1_id = m1.entry_id
      JOIN managers m2 ON hm.entry_2_id = m2.entry_id
      LEFT JOIN entry_captains c1 ON hm.entry_1_id = c1.entry_id AND hm.event = c1.event
      LEFT JOIN entry_captains c2 ON hm.entry_2_id = c2.entry_id AND hm.event = c2.event
      WHERE hm.league_id = $1 AND hm.event = $2
      ORDER BY hm.id
    `, [leagueId, gw]);

    const matches = matchesResult.rows;

    // Determine status by checking FPL API for actual gameweek status
    let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';

    try {
      // Fetch bootstrap-static to get current gameweek status
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const events = bootstrapData.events;
        const currentEvent = events.find((e: any) => e.id === gw);

        if (currentEvent) {
          // Check if gameweek has finished
          if (currentEvent.finished) {
            status = 'completed';
          }
          // Check if gameweek is currently in progress (started but not finished)
          else if (currentEvent.is_current || currentEvent.data_checked) {
            status = 'in_progress';
          }
          // Otherwise it's upcoming
          else {
            status = 'upcoming';
          }
        }
      }
    } catch (error) {
      console.error('Error determining gameweek status:', error);
      // Fall back to database-based detection if FPL API fails
      if (matches.length > 0) {
        const hasScores = matches.some((m: any) =>
          (m.entry_1_points && m.entry_1_points > 0) ||
          (m.entry_2_points && m.entry_2_points > 0)
        );

        if (hasScores) {
          const allComplete = matches.every((m: any) =>
            (m.entry_1_points !== null && m.entry_1_points >= 0) &&
            (m.entry_2_points !== null && m.entry_2_points >= 0)
          );
          status = allComplete ? 'completed' : 'in_progress';
        }
      }
    }

    // For in-progress and completed gameweeks, fetch picks data for chips, hits, and captains
    let liveScoresMap: Map<number, { score: number; hit: number; chip: string | null; captain: string | null }> | null = null;
    if (status === 'in_progress' || status === 'completed') {
      try {
        console.log(`GW${gw} is ${status.toUpperCase()} - fetching picks data from FPL API...`);
        liveScoresMap = await fetchLiveScoresFromPicks(matches, gw, status);
        console.log(`Fetched picks data for ${liveScoresMap.size} entries`);
      } catch (error) {
        console.error('Error fetching picks data:', error);
        // Fall back to database scores if live fetch fails
      }
    } else {
      console.log(`GW${gw} status: ${status} - using database scores`);
    }

    // Format matches for response
    const formattedMatches = matches.map((match: any) => {
      // Use live scores from picks data if available, otherwise use database scores
      const entry1Data = liveScoresMap?.get(match.entry_1_id);
      const entry2Data = liveScoresMap?.get(match.entry_2_id);

      const entry1Score = entry1Data?.score ?? match.entry_1_points ?? 0;
      const entry2Score = entry2Data?.score ?? match.entry_2_points ?? 0;
      // Only include hit if it's actually negative (don't include 0)
      const entry1Hit = entry1Data?.hit && entry1Data.hit < 0 ? entry1Data.hit : undefined;
      const entry2Hit = entry2Data?.hit && entry2Data.hit < 0 ? entry2Data.hit : undefined;
      // Use live chip data if available, otherwise use database chip data
      const entry1Chip = entry1Data?.chip ?? match.active_chip_1 ?? null;
      const entry2Chip = entry2Data?.chip ?? match.active_chip_2 ?? null;
      // Use live captain data if available, otherwise use database captain data
      const entry1Captain = entry1Data?.captain ?? match.entry_1_captain ?? null;
      const entry2Captain = entry2Data?.captain ?? match.entry_2_captain ?? null;

      if (liveScoresMap) {
        console.log(`Match ${match.entry_1_player} vs ${match.entry_2_player}: ${entry1Score} - ${entry2Score} (live: ${liveScoresMap.has(match.entry_1_id)}, db: ${match.entry_1_points})`);
      }

      const entry1 = {
        id: match.entry_1_id,
        player_name: match.entry_1_player,
        team_name: match.entry_1_team,
        score: entry1Score,
        chip: entry1Chip,
        captain: entry1Captain,
        ...(entry1Hit !== undefined && { hit: entry1Hit })
      };

      const entry2 = {
        id: match.entry_2_id,
        player_name: match.entry_2_player,
        team_name: match.entry_2_team,
        score: entry2Score,
        chip: entry2Chip,
        captain: entry2Captain,
        ...(entry2Hit !== undefined && { hit: entry2Hit })
      };

      return {
        id: match.id,
        event: match.event,
        entry_1: entry1,
        entry_2: entry2,
        winner: match.winner ? parseInt(match.winner) : null
      };
    });

    const response = NextResponse.json({
      event: gw,
      status,
      matches: formattedMatches
    });

    // Add cache control headers - no caching for in_progress gameweeks
    if (status === 'in_progress') {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    } else {
      // Allow caching for completed/upcoming gameweeks (5 minutes)
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    }

    return response;
  } catch (error: any) {
    console.error('Error fetching fixtures:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fixtures' },
      { status: 500 }
    );
  }
}

// Helper function to fetch live scores from picks data during live and completed gameweeks
async function fetchLiveScoresFromPicks(
  matches: any[],
  gw: number,
  status: 'in_progress' | 'completed'
): Promise<Map<number, { score: number; hit: number; chip: string | null; captain: string | null }>> {
  const scoresMap = new Map<number, { score: number; hit: number; chip: string | null; captain: string | null }>();

  // Get unique entry IDs from all matches
  const entryIds = Array.from(new Set(
    matches.flatMap((match: any) => [match.entry_1_id, match.entry_2_id])
  ));

  console.log(`Fetching picks data for ${entryIds.length} entries in GW${gw}...`);

  // Use the shared score calculator - this handles all calculation logic
  const scores = await calculateMultipleManagerScores(entryIds, gw, status);

  console.log(`Successfully calculated ${scores.size} scores using shared calculator`);

  // Build the scores map in the format expected by the calling code
  scores.forEach((scoreResult, entryId) => {
    // Extract transfer cost from breakdown
    const transferCost = scoreResult.breakdown.transferCost;
    const hit = transferCost > 0 ? -transferCost : 0;

    scoresMap.set(entryId, {
      score: scoreResult.score,
      hit,
      chip: scoreResult.chip,
      captain: scoreResult.captain?.name || null
    });

    // Log score details
    const logParts = [`Entry ${entryId}: ${scoreResult.score} pts`];
    if (transferCost > 0) {
      logParts.push(`(${scoreResult.score + transferCost} from players - ${transferCost} hits)`);
    }
    if (scoreResult.chip) {
      logParts.push(`chip: ${scoreResult.chip}`);
    }
    if (scoreResult.captain) {
      logParts.push(`captain: ${scoreResult.captain.name}`);
    }
    console.log(logParts.join(' '));

    // Log auto-subs if any
    if (scoreResult.autoSubs && scoreResult.autoSubs.substitutions.length > 0) {
      console.log(`Entry ${entryId}: Auto-subs applied - ${scoreResult.autoSubs.substitutions.map(s =>
        `${s.playerOut.name} → ${s.playerIn.name} (+${s.playerIn.points} pts)`
      ).join(', ')}`);
    }
  });

  return scoresMap;
}
