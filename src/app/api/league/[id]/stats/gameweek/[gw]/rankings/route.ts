import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateManagerLiveScore } from '@/lib/scoreCalculator';

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

    // K-66: Determine gameweek status (completed vs live/upcoming)
    let status: 'upcoming' | 'in_progress' | 'completed' = 'in_progress';
    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const currentEvent = bootstrapData.events.find((e: any) => e.id === gw);
        if (currentEvent) {
          if (currentEvent.finished) {
            status = 'completed';
          } else if (!currentEvent.is_current && !currentEvent.data_checked) {
            status = 'upcoming';
          }
        }
      }
    } catch (error) {
      console.error('Error determining gameweek status:', error);
    }

    // K-66: For live/upcoming GWs, calculate live scores
    if (status === 'in_progress' || status === 'upcoming') {
      console.log(`[K-66] GW ${gw} is ${status}, calculating live scores for all managers`);

      // Get all managers in the league
      const managersResult = await db.query(`
        SELECT entry_id, player_name, team_name
        FROM managers
        WHERE league_id = $1
        ORDER BY player_name ASC
      `, [leagueId]);

      // Calculate live score for each manager in parallel
      const liveScoresPromises = managersResult.rows.map(async (manager: any) => {
        try {
          const scoreResult = await calculateManagerLiveScore(manager.entry_id, gw, status);
          return {
            entry_id: manager.entry_id,
            player_name: manager.player_name,
            team_name: manager.team_name,
            points: scoreResult.score
          };
        } catch (error) {
          console.error(`Error calculating live score for manager ${manager.entry_id}:`, error);
          return {
            entry_id: manager.entry_id,
            player_name: manager.player_name,
            team_name: manager.team_name,
            points: 0
          };
        }
      });

      const liveScores = await Promise.all(liveScoresPromises);

      // Sort by points descending
      liveScores.sort((a, b) => b.points - a.points);

      // Add ranks
      const rankings = [];
      let currentRank = 1;
      let previousPoints = null;

      for (let i = 0; i < liveScores.length; i++) {
        const manager = liveScores[i];

        if (previousPoints !== null && manager.points !== previousPoints) {
          currentRank = i + 1;
        }

        rankings.push({
          rank: currentRank,
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          points: manager.points,
        });

        previousPoints = manager.points;
      }

      return NextResponse.json({
        event: gw,
        rankings,
        total_managers: rankings.length,
        is_live: true
      });
    }

    // K-66: For completed GWs, use database (K-27 cache)
    console.log(`[K-66] GW ${gw} is completed, using database`);

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
      is_live: false
    });
  } catch (error: any) {
    console.error('Error fetching GW rankings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GW rankings' },
      { status: 500 }
    );
  }
}
