import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface StandingsEntry {
  entry_id: string; // entry_id from database is string
  points: number;
  totalPointsFor: number;
  wins: number;
  draws: number;
  losses: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    if (!entryId) {
      return NextResponse.json({ error: 'Missing entryId parameter' }, { status: 400 });
    }

    // Validate entryId is numeric (but keep as string for DB comparison)
    if (!/^\d+$/.test(entryId)) {
      return NextResponse.json({ error: 'Invalid entryId' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get all completed gameweeks (where matches have been played)
    const gameweeksResult = await db.query(`
      SELECT DISTINCT event
      FROM h2h_matches
      WHERE league_id = $1
      AND entry_1_points IS NOT NULL
      AND entry_2_points IS NOT NULL
      AND (entry_1_points > 0 OR entry_2_points > 0)
      ORDER BY event ASC
    `, [leagueId]);

    const completedGameweeks = gameweeksResult.rows.map((r: any) => r.event);

    if (completedGameweeks.length === 0) {
      return NextResponse.json({
        positionHistory: [],
        currentGW: 0,
        totalTeams: 0
      });
    }

    // Get all teams in the league
    const teamsResult = await db.query(`
      SELECT DISTINCT entry_id
      FROM league_standings
      WHERE league_id = $1
    `, [leagueId]);

    const totalTeams = teamsResult.rows.length;

    // Calculate position after each gameweek
    const positionHistory: Array<{ gameweek: number; rank: number }> = [];

    for (const gw of completedGameweeks) {
      // Get all matches up to and including this gameweek
      const matchesResult = await db.query(`
        SELECT
          entry_1_id,
          entry_2_id,
          entry_1_points,
          entry_2_points
        FROM h2h_matches
        WHERE league_id = $1
        AND event <= $2
        AND entry_1_points IS NOT NULL
        AND entry_2_points IS NOT NULL
      `, [leagueId, gw]);

      // Calculate standings
      const standings: Map<number, StandingsEntry> = new Map();

      // Initialize all teams
      teamsResult.rows.forEach((row: any) => {
        standings.set(row.entry_id, {
          entry_id: row.entry_id,
          points: 0,
          totalPointsFor: 0,
          wins: 0,
          draws: 0,
          losses: 0
        });
      });

      // Process matches
      matchesResult.rows.forEach((match: any) => {
        const entry1 = standings.get(match.entry_1_id)!;
        const entry2 = standings.get(match.entry_2_id)!;

        entry1.totalPointsFor += match.entry_1_points;
        entry2.totalPointsFor += match.entry_2_points;

        if (match.entry_1_points > match.entry_2_points) {
          // Entry 1 wins
          entry1.points += 3;
          entry1.wins += 1;
          entry2.losses += 1;
        } else if (match.entry_1_points < match.entry_2_points) {
          // Entry 2 wins
          entry2.points += 3;
          entry2.wins += 1;
          entry1.losses += 1;
        } else {
          // Draw
          entry1.points += 1;
          entry2.points += 1;
          entry1.draws += 1;
          entry2.draws += 1;
        }
      });

      // Sort standings: first by points (desc), then by totalPointsFor (desc)
      const sortedStandings = Array.from(standings.values()).sort((a, b) => {
        if (a.points !== b.points) {
          return b.points - a.points;
        }
        return b.totalPointsFor - a.totalPointsFor;
      });

      // Find user's rank (compare as strings since entry_id from DB is string)
      const userRank = sortedStandings.findIndex(s => s.entry_id === entryId) + 1;

      if (userRank > 0) {
        positionHistory.push({
          gameweek: gw,
          rank: userRank
        });
      }
    }

    return NextResponse.json({
      positionHistory,
      currentGW: completedGameweeks[completedGameweeks.length - 1],
      totalTeams
    });

  } catch (error: any) {
    console.error('Error fetching position history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch position history' },
      { status: 500 }
    );
  }
}
