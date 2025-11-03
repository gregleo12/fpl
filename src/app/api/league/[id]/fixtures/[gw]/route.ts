import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

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

    // For in-progress gameweeks, fetch real-time scores from picks data
    let liveScoresMap: Map<number, { score: number; hit: number; chip: string | null }> | null = null;
    if (status === 'in_progress') {
      try {
        console.log(`GW${gw} is IN_PROGRESS - fetching live scores from FPL API...`);
        liveScoresMap = await fetchLiveScoresFromPicks(matches, gw);
        console.log(`Fetched live scores for ${liveScoresMap.size} entries`);
      } catch (error) {
        console.error('Error fetching live scores:', error);
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

      if (liveScoresMap) {
        console.log(`Match ${match.entry_1_player} vs ${match.entry_2_player}: ${entry1Score} - ${entry2Score} (live: ${liveScoresMap.has(match.entry_1_id)}, db: ${match.entry_1_points})`);
      }

      const entry1 = {
        id: match.entry_1_id,
        player_name: match.entry_1_player,
        team_name: match.entry_1_team,
        score: entry1Score,
        chip: entry1Chip,
        captain: match.entry_1_captain || null,
        ...(entry1Hit !== undefined && { hit: entry1Hit })
      };

      const entry2 = {
        id: match.entry_2_id,
        player_name: match.entry_2_player,
        team_name: match.entry_2_team,
        score: entry2Score,
        chip: entry2Chip,
        captain: match.entry_2_captain || null,
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

// Helper function to fetch live scores from picks data during live gameweeks
async function fetchLiveScoresFromPicks(
  matches: any[],
  gw: number
): Promise<Map<number, { score: number; hit: number; chip: string | null }>> {
  const scoresMap = new Map<number, { score: number; hit: number; chip: string | null }>();

  // Get unique entry IDs from all matches
  const entryIds = new Set<number>();
  matches.forEach((match: any) => {
    entryIds.add(match.entry_1_id);
    entryIds.add(match.entry_2_id);
  });

  console.log(`Fetching live scores for ${entryIds.size} entries in GW${gw}...`);

  // Fetch live player data once for all entries
  let liveData: any = null;
  try {
    const liveResponse = await fetch(
      `https://fantasy.premierleague.com/api/event/${gw}/live/`
    );
    if (liveResponse.ok) {
      liveData = await liveResponse.json();
      console.log(`Fetched live data for GW${gw}`);
    }
  } catch (error) {
    console.error('Error fetching live player data:', error);
  }

  // Fetch picks data for all entries in parallel
  const pickPromises = Array.from(entryIds).map(async (entryId) => {
    try {
      const url = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gw}/picks/`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Failed to fetch picks for entry ${entryId}: ${response.status}`);
        return null;
      }

      const picksData = await response.json();
      const picks = picksData.picks;
      const activeChip = picksData.active_chip || null;
      const transferCost = picksData.entry_history?.event_transfers_cost || 0;

      let liveScore = 0;

      // Calculate score from individual players (like liveMatch.ts does)
      if (liveData && liveData.elements) {
        const isBenchBoost = activeChip === 'bboost';
        const isTripleCaptain = activeChip === '3xc';

        picks.forEach((pick: any) => {
          const liveElement = liveData.elements.find((e: any) => e.id === pick.element);
          const rawPoints = liveElement?.stats?.total_points || 0;

          if (pick.position <= 11) {
            // Starting 11
            if (pick.is_captain) {
              const multiplier = isTripleCaptain ? 3 : 2;
              liveScore += rawPoints * multiplier;
            } else {
              liveScore += rawPoints;
            }
          } else {
            // Bench (positions 12-15)
            if (isBenchBoost) {
              liveScore += rawPoints;
            }
          }
        });
      } else {
        // Fallback to entry_history.points if live data unavailable
        liveScore = picksData.entry_history?.points || 0;
      }

      // Calculate final score (subtract transfer hits)
      const netScore = liveScore - transferCost;
      // Convert hit to negative for display
      const hit = transferCost > 0 ? -transferCost : 0;

      console.log(`Entry ${entryId}: ${netScore} pts (${liveScore} from players - ${transferCost} hits) chip: ${activeChip}`);
      return { entryId, score: netScore, hit, chip: activeChip };
    } catch (error) {
      console.error(`Error fetching picks for entry ${entryId}:`, error);
      return null;
    }
  });

  const results = await Promise.all(pickPromises);

  // Build the scores map
  results.forEach((result) => {
    if (result) {
      scoresMap.set(result.entryId, { score: result.score, hit: result.hit, chip: result.chip });
    }
  });

  console.log(`Successfully fetched ${scoresMap.size} live scores`);
  return scoresMap;
}
