import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';

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

    // K-109 Phase 3: Use K-108c for all managers (single source of truth)
    console.log(`[K-109 Phase 3] Calculating GW${gw} rankings using K-108c...`);

    // Get all managers in the league
    const managersResult = await db.query(`
      SELECT m.entry_id, m.player_name, m.team_name
      FROM managers m
      JOIN league_standings ls ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
      ORDER BY m.player_name ASC
    `, [leagueId]);

    console.log(`[K-109 Phase 3] Calculating scores for ${managersResult.rows.length} managers`);

    // Calculate scores for all managers using K-108c in parallel
    const managerScoresPromises = managersResult.rows.map(async (manager: any) => {
      try {
        const result = await calculateTeamGameweekScore(manager.entry_id, gw);
        console.log(`[K-109 Phase 3] ${manager.player_name}: ${result.points.net_total} pts`);
        return {
          entry_id: manager.entry_id,
          player_name: manager.player_name,
          team_name: manager.team_name,
          points: result.points.net_total
        };
      } catch (error: any) {
        console.error(`[K-109 Phase 3] Error for ${manager.entry_id}:`, error.message);
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

    console.log(`[K-109 Phase 3] Rankings calculated: ${rankings.length} managers`);

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
