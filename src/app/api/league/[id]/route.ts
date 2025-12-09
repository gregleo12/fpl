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

    // Store standings and managers (including AVERAGE for odd leagues)
    console.log(`[League ${leagueId}] Processing ${league.standings.results.length} standings...`);
    let averageCount = 0;

    for (const standing of league.standings.results) {
      // Handle AVERAGE entry for odd-numbered leagues
      // AVERAGE has null entry_id and is used for the bye team each gameweek
      const isAverage = !standing.entry && standing.player_name === 'AVERAGE';
      const entryId = isAverage ? -1 : standing.entry;

      if (!entryId || entryId === null || entryId === undefined) {
        // Skip only truly corrupted data (not AVERAGE)
        if (!isAverage) {
          console.warn(`[League ${leagueId}] Skipping corrupted standing:`, {
            rank: standing.rank,
            player_name: standing.player_name,
            entry_name: standing.entry_name
          });
          continue;
        }
      }

      if (isAverage) {
        averageCount++;
        console.log(`[League ${leagueId}] Found AVERAGE entry - this is an odd-numbered league`);
      }

      // Store manager info (use -1 for AVERAGE)
      await db.query(`
        INSERT INTO managers (entry_id, player_name, team_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (entry_id) DO UPDATE SET player_name = $2, team_name = $3
      `, [entryId, standing.player_name, standing.entry_name]);

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
        entryId,
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

    if (averageCount > 0) {
      console.log(`[League ${leagueId}] Odd-numbered league detected - included AVERAGE entry`);
    }

    // Store basic match data (including matches vs AVERAGE for odd leagues)
    console.log(`[League ${leagueId}] Processing ${allMatches.length} matches...`);
    let averageMatches = 0;

    for (const match of allMatches) {
      // Handle matches vs AVERAGE (null entry_id means AVERAGE opponent)
      const entry1Id = match.entry_1_entry || -1;
      const entry2Id = match.entry_2_entry || -1;

      // Skip only if both are null (truly corrupted)
      if (entry1Id === -1 && entry2Id === -1) {
        console.warn(`[League ${leagueId}] Skipping match with both entries null:`, {
          event: match.event
        });
        continue;
      }

      if (entry1Id === -1 || entry2Id === -1) {
        averageMatches++;
      }

      // Calculate winner based on points
      let winner = null;
      if (match.entry_1_points > match.entry_2_points) {
        winner = entry1Id;
      } else if (match.entry_2_points > match.entry_1_points) {
        winner = entry2Id;
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
        entry1Id,
        match.entry_1_points,
        entry2Id,
        match.entry_2_points,
        winner
      ]);
    }

    if (averageMatches > 0) {
      console.log(`[League ${leagueId}] Stored ${averageMatches} matches vs AVERAGE`);
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
