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

    // Format matches for response
    const formattedMatches = matches.map((match: any) => ({
      id: match.id,
      event: match.event,
      entry_1: {
        id: match.entry_1_id,
        player_name: match.entry_1_player,
        team_name: match.entry_1_team,
        score: match.entry_1_points || 0,
        chip: match.active_chip_1 || null,
        captain: match.entry_1_captain || null
      },
      entry_2: {
        id: match.entry_2_id,
        player_name: match.entry_2_player,
        team_name: match.entry_2_team,
        score: match.entry_2_points || 0,
        chip: match.active_chip_2 || null,
        captain: match.entry_2_captain || null
      },
      winner: match.winner ? parseInt(match.winner) : null
    }));

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
