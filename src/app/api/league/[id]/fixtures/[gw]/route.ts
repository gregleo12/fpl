import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

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

    // Determine status
    let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';

    if (matches.length > 0) {
      const hasScores = matches.some((m: any) =>
        (m.entry_1_points && m.entry_1_points > 0) ||
        (m.entry_2_points && m.entry_2_points > 0)
      );

      if (hasScores) {
        // Check if all matches have scores
        const allComplete = matches.every((m: any) =>
          (m.entry_1_points !== null && m.entry_1_points >= 0) &&
          (m.entry_2_points !== null && m.entry_2_points >= 0)
        );
        status = allComplete ? 'completed' : 'in_progress';
      }
    }

    // For in-progress gameweeks, fetch fresh scores from FPL H2H matches API
    let liveScoresMap: Map<string, { entry1: number; entry2: number }> | null = null;
    if (status === 'in_progress') {
      try {
        liveScoresMap = await fetchLiveH2HScores(leagueId, gw);
      } catch (error) {
        console.error('Error fetching live H2H scores:', error);
        // Fall back to database scores if live fetch fails
      }
    }

    // Format matches for response
    const formattedMatches = matches.map((match: any) => {
      // Use live scores from FPL H2H API if available, otherwise use database scores
      const matchKey = `${match.entry_1_id}_${match.entry_2_id}`;
      const liveScores = liveScoresMap?.get(matchKey);

      const entry1Score = liveScores?.entry1 ?? match.entry_1_points ?? 0;
      const entry2Score = liveScores?.entry2 ?? match.entry_2_points ?? 0;

      return {
        id: match.id,
        event: match.event,
        entry_1: {
          id: match.entry_1_id,
          player_name: match.entry_1_player,
          team_name: match.entry_1_team,
          score: entry1Score,
          chip: match.active_chip_1 || null,
          captain: match.entry_1_captain || null
        },
        entry_2: {
          id: match.entry_2_id,
          player_name: match.entry_2_player,
          team_name: match.entry_2_team,
          score: entry2Score,
          chip: match.active_chip_2 || null,
          captain: match.entry_2_captain || null
        },
        winner: match.winner ? parseInt(match.winner) : null
      };
    });

    return NextResponse.json({
      event: gw,
      status,
      matches: formattedMatches
    });
  } catch (error: any) {
    console.error('Error fetching fixtures:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fixtures' },
      { status: 500 }
    );
  }
}

// Helper function to fetch live scores from FPL's H2H matches endpoint
async function fetchLiveH2HScores(
  leagueId: number,
  gw: number
): Promise<Map<string, { entry1: number; entry2: number }>> {
  const scoresMap = new Map<string, { entry1: number; entry2: number }>();

  // Fetch from FPL's H2H matches API (this includes auto-subs and is the official score)
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/leagues-h2h-matches/league/${leagueId}/?page=${page}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch H2H matches from FPL');
    }

    const data = await response.json();

    // Filter matches for this specific gameweek
    for (const match of data.results) {
      if (match.event === gw) {
        const key = `${match.entry_1_entry}_${match.entry_2_entry}`;
        scoresMap.set(key, {
          entry1: match.entry_1_points,
          entry2: match.entry_2_points,
        });
      }
    }

    // Stop if we've found all matches for this GW or no more pages
    hasMore = data.has_next;
    page++;

    // Safety: stop after 10 pages to avoid infinite loops
    if (page > 10) break;
  }

  return scoresMap;
}
