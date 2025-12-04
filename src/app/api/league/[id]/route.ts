import { NextRequest, NextResponse } from 'next/server';
import { fplApi } from '@/lib/fpl-api';
import { getDatabase } from '@/lib/db';
import { updateLeagueMetadata } from '@/lib/analytics';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    // Try to fetch H2H league data
    console.log(`[League ${leagueId}] Starting fetch...`);
    let league;
    try {
      console.log(`[League ${leagueId}] Fetching H2H league data...`);
      league = await fplApi.getH2HLeague(leagueId);
      console.log(`[League ${leagueId}] Successfully fetched league: ${league?.league?.name}`);
    } catch (error: any) {
      console.error(`[League ${leagueId}] Error fetching H2H league:`, {
        status: error.response?.status,
        message: error.message,
        code: error.code,
        fullError: error
      });

      // Check if this is a Classic league (404/not found in H2H endpoint)
      if (error.response?.status === 404 || error.message?.includes('404')) {
        return NextResponse.json(
          {
            error: 'classic_league',
            message: 'This is a Classic league. Only H2H leagues are supported.'
          },
          { status: 400 }
        );
      }
      // Other errors (network, etc)
      throw error;
    }

    // Validate it's actually an H2H league with standings
    if (!league.standings || !league.standings.results || league.standings.results.length === 0) {
      return NextResponse.json(
        {
          error: 'no_standings',
          message: 'This league has no H2H matches yet. Please try again after GW1.'
        },
        { status: 400 }
      );
    }

    console.log(`[League ${leagueId}] Fetching all H2H matches...`);
    let allMatches;
    try {
      allMatches = await fplApi.getAllH2HMatches(leagueId);
      console.log(`[League ${leagueId}] Fetched ${allMatches.length} total matches`);
    } catch (error: any) {
      console.error(`[League ${leagueId}] Error fetching matches:`, {
        status: error.response?.status,
        message: error.message,
        code: error.code
      });
      throw error;
    }

    const db = await getDatabase();

    // Store league info
    await db.query(`
      INSERT INTO leagues (id, name, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET name = $2, updated_at = CURRENT_TIMESTAMP
    `, [league.league.id, league.league.name]);

    // Track league metadata for analytics
    updateLeagueMetadata(
      league.league.id,
      league.league.name || `League ${league.league.id}`,
      league.standings.results.length
    ).catch(() => {}); // Silent fail

    // Store standings and managers (skip entries with null entry_id)
    console.log(`[League ${leagueId}] Processing ${league.standings.results.length} standings...`);
    let skippedCount = 0;

    for (const standing of league.standings.results) {
      // Skip entries with null/undefined entry_id (corrupted data from FPL)
      if (!standing.entry || standing.entry === null || standing.entry === undefined) {
        console.warn(`[League ${leagueId}] Skipping standing with null entry_id:`, {
          rank: standing.rank,
          player_name: standing.player_name,
          entry_name: standing.entry_name
        });
        skippedCount++;
        continue;
      }

      // Store manager info
      await db.query(`
        INSERT INTO managers (entry_id, player_name, team_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (entry_id) DO UPDATE SET player_name = $2, team_name = $3
      `, [standing.entry, standing.player_name, standing.entry_name]);

      // Store standing
      await db.query(`
        INSERT INTO league_standings
        (league_id, entry_id, rank, matches_played, matches_won, matches_drawn,
         matches_lost, points_for, points_against, total, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (league_id, entry_id) DO UPDATE SET
          rank = $3,
          matches_played = $4,
          matches_won = $5,
          matches_drawn = $6,
          matches_lost = $7,
          points_for = $8,
          points_against = $9,
          total = $10,
          updated_at = CURRENT_TIMESTAMP
      `, [
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
      ]);
    }

    if (skippedCount > 0) {
      console.warn(`[League ${leagueId}] Skipped ${skippedCount} standings with null entry_id`);
    }

    // Store basic match data (without chips or captain details for now)
    // This allows for quick initial load - detailed data can be fetched later
    console.log(`[League ${leagueId}] Processing ${allMatches.length} matches...`);
    let skippedMatches = 0;

    for (const match of allMatches) {
      // Skip matches with null entry_ids (corrupted data)
      if (!match.entry_1_entry || !match.entry_2_entry) {
        console.warn(`[League ${leagueId}] Skipping match with null entry_id:`, {
          event: match.event,
          entry_1: match.entry_1_entry,
          entry_2: match.entry_2_entry
        });
        skippedMatches++;
        continue;
      }

      // Calculate winner based on points
      let winner = null;
      if (match.entry_1_points > match.entry_2_points) {
        winner = match.entry_1_entry;
      } else if (match.entry_2_points > match.entry_1_points) {
        winner = match.entry_2_entry;
      }

      await db.query(`
        INSERT INTO h2h_matches
        (league_id, event, entry_1_id, entry_1_points, entry_2_id, entry_2_points, winner)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (league_id, event, entry_1_id, entry_2_id) DO UPDATE SET
          entry_1_points = $4,
          entry_2_points = $6,
          winner = $7
      `, [
        leagueId,
        match.event,
        match.entry_1_entry,
        match.entry_1_points,
        match.entry_2_entry,
        match.entry_2_points,
        winner
      ]);
    }

    if (skippedMatches > 0) {
      console.warn(`[League ${leagueId}] Skipped ${skippedMatches} matches with null entry_id`);
    }

    console.log('League data fetch completed successfully (minimal mode for fast loading)');

    // Return minimal data for team selection - detailed stats loaded on-demand later
    return NextResponse.json({
      league: {
        id: league.league.id,
        name: league.league.name
      },
      standings: league.standings.results
    });
  } catch (error: any) {
    console.error('Error fetching league data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch league data' },
      { status: 500 }
    );
  }
}
