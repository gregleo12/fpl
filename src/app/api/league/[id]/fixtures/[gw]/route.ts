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

    // For in-progress gameweeks, fetch live scores from FPL API
    let liveScores: Map<string, number> | null = null;
    if (status === 'in_progress') {
      try {
        liveScores = await fetchLiveScores(matches, gw);
      } catch (error) {
        console.error('Error fetching live scores:', error);
        // Fall back to database scores if live fetch fails
      }
    }

    // Format matches for response
    const formattedMatches = matches.map((match: any) => {
      // Use live scores if available, otherwise use database scores
      const entry1Score = liveScores?.get(`${match.entry_1_id}`) ?? match.entry_1_points ?? 0;
      const entry2Score = liveScores?.get(`${match.entry_2_id}`) ?? match.entry_2_points ?? 0;

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

// Helper function to fetch live scores for all entries
async function fetchLiveScores(matches: any[], gw: number): Promise<Map<string, number>> {
  // Collect unique entry IDs
  const entryIds = new Set<number>();
  matches.forEach((match: any) => {
    entryIds.add(match.entry_1_id);
    entryIds.add(match.entry_2_id);
  });

  // Fetch bootstrap and live data from FPL API
  const [bootstrapResponse, liveResponse] = await Promise.all([
    fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
    fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`),
  ]);

  if (!bootstrapResponse.ok || !liveResponse.ok) {
    throw new Error('Failed to fetch FPL live data');
  }

  const bootstrap = await bootstrapResponse.json();
  const liveData = await liveResponse.json();

  // Fetch picks for all entries in parallel
  const picksPromises = Array.from(entryIds).map(async (entryId) => {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gw}/picks/`
    );
    if (!response.ok) return { entryId, picks: null };
    const data = await response.json();
    return { entryId, picks: data };
  });

  const picksResults = await Promise.all(picksPromises);

  // Calculate scores for each entry
  const scores = new Map<string, number>();

  for (const { entryId, picks } of picksResults) {
    if (!picks) continue;

    let score = 0;
    const activeChip = picks.active_chip;

    picks.picks.forEach((pick: any) => {
      const liveElement = liveData.elements[pick.element];
      const rawPoints = liveElement?.stats?.total_points || 0;

      // Determine multiplier
      let multiplier = 1;
      if (pick.is_captain) {
        multiplier = activeChip === '3xc' ? 3 : 2;
      }

      const totalPoints = rawPoints * multiplier;

      // Only count starting 11
      if (pick.position <= 11) {
        score += totalPoints;
      } else if (activeChip === 'bboost') {
        // Bench boost adds bench points
        score += rawPoints;
      }
    });

    scores.set(`${entryId}`, score);
  }

  return scores;
}
