import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

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

    // Fetch GW points for all managers in the league
    const result = await db.query(`
      SELECT
        mh.entry_id,
        m.player_name,
        m.team_name,
        mh.points
      FROM manager_gw_history mh
      JOIN managers m ON m.entry_id = mh.entry_id
      WHERE mh.league_id = $1 AND mh.event = $2
      ORDER BY mh.points DESC, m.player_name ASC
    `, [leagueId, gw]);

    // Add rank to each entry, handling ties
    const rankings = [];
    let currentRank = 1;
    let previousPoints = null;
    let rankOffset = 0;

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];

      // If points changed, update rank
      if (previousPoints !== null && row.points !== previousPoints) {
        currentRank = i + 1;
        rankOffset = 0;
      } else if (previousPoints === row.points) {
        // Tie - multiple people have same rank
        rankOffset++;
      }

      rankings.push({
        rank: currentRank,
        entry_id: row.entry_id,
        player_name: row.player_name,
        team_name: row.team_name,
        points: row.points,
      });

      previousPoints = row.points;
    }

    return NextResponse.json({
      event: gw,
      rankings,
      total_managers: rankings.length,
    });
  } catch (error: any) {
    console.error('Error fetching GW rankings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GW rankings' },
      { status: 500 }
    );
  }
}
