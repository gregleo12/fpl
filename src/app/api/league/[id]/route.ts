import { NextRequest, NextResponse } from 'next/server';
import { fplApi } from '@/lib/fpl-api';
import { getDatabase } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    const league = await fplApi.getH2HLeague(leagueId);
    const matches = await fplApi.getAllH2HMatches(leagueId);

    const db = getDatabase();

    // Store league info
    db.prepare(`
      INSERT OR REPLACE INTO leagues (id, name, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(league.league.id, league.league.name);

    // Store standings
    const standingsStmt = db.prepare(`
      INSERT OR REPLACE INTO league_standings
      (league_id, entry_id, rank, matches_played, matches_won, matches_drawn,
       matches_lost, points_for, points_against, total, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    for (const standing of league.standings.results) {
      // Store manager info
      db.prepare(`
        INSERT OR IGNORE INTO managers (entry_id, player_name, team_name)
        VALUES (?, ?, ?)
      `).run(standing.entry, standing.player_name, standing.entry_name);

      // Store standing
      standingsStmt.run(
        leagueId,
        standing.entry,
        standing.rank,
        standing.matches_played,
        standing.matches_won,
        standing.matches_drawn,
        standing.matches_lost,
        standing.points_for,
        standing.points_against,
        standing.total
      );
    }

    // Store matches
    const matchStmt = db.prepare(`
      INSERT OR REPLACE INTO h2h_matches
      (league_id, event, entry_1_id, entry_1_points, entry_2_id, entry_2_points, winner)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const match of matches) {
      matchStmt.run(
        leagueId,
        match.event,
        match.entry_1_entry,
        match.entry_1_points,
        match.entry_2_entry,
        match.entry_2_points,
        match.winner
      );
    }

    return NextResponse.json({
      league: league.league,
      standings: league.standings.results,
      matches: matches
    });
  } catch (error: any) {
    console.error('Error fetching league data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch league data' },
      { status: 500 }
    );
  }
}
