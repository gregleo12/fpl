import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';
import { calculateManagerLiveScore } from '@/lib/scoreCalculator';
import { checkDatabaseHasGWData } from '@/lib/k142-auto-sync';
import { calculateGWLuck } from '@/lib/luckCalculator'; // K-163: Correct luck formula

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


    // Get all managers in the league
    const managersResult = await db.query(`
      SELECT m.entry_id, m.player_name, m.team_name
      FROM managers m
      JOIN league_standings ls ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
      ORDER BY m.player_name ASC
    `, [leagueId]);


    // Calculate scores for all managers in parallel - K-27: use appropriate calculator based on GW status
    const managerScoresPromises = managersResult.rows.map(async (manager: any) => {
      try {
        let points = 0;

        if (status === 'in_progress' || status === 'upcoming') {
          // K-27: Use FPL API for live/upcoming gameweeks
          const liveResult = await calculateManagerLiveScore(manager.entry_id, gw, status);
          points = liveResult.score;
        } else {
          // K-27: Use database for completed gameweeks
          const result = await calculateTeamGameweekScore(manager.entry_id, gw);
          points = result.points.net_total;
        }

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

    // K-163a Part 2: Calculate GW-specific luck using 3-component formula
    const luckMap: Record<number, number> = {};

    try {
      // Get all teams' points for this specific GW
      const pointsMap: Record<number, number> = {};
      managerScores.forEach(manager => {
        pointsMap[manager.entry_id] = manager.points;
      });

      // Get season averages for all managers up to this GW
      const seasonAvgsResult = await db.query(`
        SELECT entry_id, AVG(points) as avg_points
        FROM manager_gw_history
        WHERE league_id = $1 AND event <= $2
        GROUP BY entry_id
      `, [leagueId, gw]);

      const seasonAvgs: Record<number, number> = {};
      seasonAvgsResult.rows.forEach((row: any) => {
        seasonAvgs[row.entry_id] = parseFloat(row.avg_points);
      });

      // Get chip usage for this specific GW
      const chipsResult = await db.query(`
        SELECT entry_id, chip_name
        FROM manager_chips
        WHERE league_id = $1 AND event = $2
      `, [leagueId, gw]);

      const chipsPlayed: Set<number> = new Set();
      chipsResult.rows.forEach((row: any) => {
        chipsPlayed.add(row.entry_id);
      });

      // Get H2H matches for this specific GW with results
      const matchesResult = await db.query(`
        SELECT entry_1_id, entry_2_id, entry_1_points, entry_2_points, winner
        FROM h2h_matches
        WHERE league_id = $1 AND event = $2
      `, [leagueId, gw]);

      // Calculate luck for each manager in this GW
      matchesResult.rows.forEach((match: any) => {
        const entry1 = parseInt(match.entry_1_id);
        const entry2 = parseInt(match.entry_2_id);
        const entry1Points = parseInt(match.entry_1_points);
        const entry2Points = parseInt(match.entry_2_points);
        const winner = match.winner ? parseInt(match.winner) : null;

        // Get all OTHER teams' points for entry1
        const otherTeamsPointsForEntry1 = Object.entries(pointsMap)
          .filter(([id]) => parseInt(id) !== entry1)
          .map(([, pts]) => pts);

        // Get all OTHER teams' points for entry2
        const otherTeamsPointsForEntry2 = Object.entries(pointsMap)
          .filter(([id]) => parseInt(id) !== entry2)
          .map(([, pts]) => pts);

        // Determine match result from each manager's perspective
        const entry1Result: 'win' | 'draw' | 'loss' =
          winner === entry1 ? 'win' : winner === null ? 'draw' : 'loss';
        const entry2Result: 'win' | 'draw' | 'loss' =
          winner === entry2 ? 'win' : winner === null ? 'draw' : 'loss';

        // Get season averages
        const entry1Avg = seasonAvgs[entry1] || entry1Points;
        const entry2Avg = seasonAvgs[entry2] || entry2Points;

        // Check if opponent played chip
        const entry2PlayedChip = chipsPlayed.has(entry2);
        const entry1PlayedChip = chipsPlayed.has(entry1);

        // K-163a Part 2: Calculate luck using 3-component formula
        const entry1Luck = calculateGWLuck(
          entry1Points, otherTeamsPointsForEntry1,
          entry1Avg, entry2Avg, entry2Points, entry2PlayedChip,
          entry1Result
        );
        const entry2Luck = calculateGWLuck(
          entry2Points, otherTeamsPointsForEntry2,
          entry2Avg, entry1Avg, entry1Points, entry1PlayedChip,
          entry2Result
        );

        luckMap[entry1] = Math.round(entry1Luck);
        luckMap[entry2] = Math.round(entry2Luck);
      });
    } catch (error) {
      console.error('[K-163a] Error calculating GW luck:', error);
      // If luck calculation fails, all managers get 0 luck
    }

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
        gw_luck: luckMap[manager.entry_id] || 0 // K-150: Add GW-specific luck
      });

      previousPoints = manager.points;
    }


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
