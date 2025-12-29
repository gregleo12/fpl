import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';
import { calculateManagerLiveScore } from '@/lib/scoreCalculator';
import { checkDatabaseHasGWData } from '@/lib/k142-auto-sync';

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

    // K-27: Determine gameweek status from FPL API
    let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';
    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const currentEvent = bootstrapData.events?.find((e: any) => e.id === gw);
        if (currentEvent) {
          // K-142: Check database validity for completed GWs
          if (currentEvent.finished) {
            const hasValidData = await checkDatabaseHasGWData(leagueId, gw);
            if (hasValidData) {
              status = 'completed';
            } else {
              status = 'in_progress';
            }
          } else if (currentEvent.is_current || currentEvent.data_checked) {
            status = 'in_progress';
          }
        }
      }
    } catch (error) {
      console.error('[Rankings K-27] Error fetching bootstrap data:', error);
    }

    console.log(`[Rankings K-27] GW${gw} status: ${status}`);

    // Get all managers in the league
    const managersResult = await db.query(`
      SELECT m.entry_id, m.player_name, m.team_name
      FROM managers m
      JOIN league_standings ls ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
      ORDER BY m.player_name ASC
    `, [leagueId]);

    console.log(`[Rankings K-27] Calculating scores for ${managersResult.rows.length} managers`);

    // Calculate scores for all managers in parallel - K-27: use appropriate calculator based on GW status
    const managerScoresPromises = managersResult.rows.map(async (manager: any) => {
      try {
        let points = 0;

        if (status === 'in_progress' || status === 'upcoming') {
          // K-27: Use FPL API for live/upcoming gameweeks
          console.log(`[Rankings K-27] ${manager.player_name}: using live calculator`);
          const liveResult = await calculateManagerLiveScore(manager.entry_id, gw, status);
          points = liveResult.score;
        } else {
          // K-27: Use database for completed gameweeks
          console.log(`[Rankings K-27] ${manager.player_name}: using database calculator`);
          const result = await calculateTeamGameweekScore(manager.entry_id, gw);
          points = result.points.net_total;
        }

        console.log(`[Rankings K-27] ${manager.player_name}: ${points} pts`);
        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          points: points
        };
      } catch (error: any) {
        console.error(`[Rankings K-27] Error for ${manager.entry_id}:`, error.message);
        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          points: 0
        };
      }
    });

    const managerScores = await Promise.all(managerScoresPromises);

    // Sort by points descending
    managerScores.sort((a, b) => b.points - a.points);

    // Add ranks (handle ties - same points = same rank)
    const rankings = [];
    let currentRank = 1;
    let previousPoints: number | null = null;

    for (let i = 0; i < managerScores.length; i++) {
      const manager = managerScores[i];

      // If points changed, update rank to current position
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

    console.log(`[Rankings K-27] Rankings calculated: ${rankings.length} managers`);

    return NextResponse.json({
      event: gw,
      rankings,
      total_managers: rankings.length
    });
  } catch (error: any) {
    console.error('Error fetching GW rankings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GW rankings' },
      { status: 500 }
    );
  }
}
