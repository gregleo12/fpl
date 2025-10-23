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
    const bootstrap = await fplApi.getBootstrapData();

    const db = await getDatabase();

    // Create lookup maps for player data
    const playerMap = new Map();
    bootstrap.elements.forEach(player => {
      playerMap.set(player.id, player.web_name);
    });

    // Store league info
    await db.query(`
      INSERT INTO leagues (id, name, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET name = $2, updated_at = CURRENT_TIMESTAMP
    `, [league.league.id, league.league.name]);

    // Store standings and managers
    for (const standing of league.standings.results) {
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

    // Store matches and fetch captain/chip data
    for (const match of matches) {
      // Calculate winner based on points (don't trust API's winner field)
      let winner = null;
      if (match.entry_1_points > match.entry_2_points) {
        winner = match.entry_1_entry;
      } else if (match.entry_2_points > match.entry_1_points) {
        winner = match.entry_2_entry;
      }
      // If points are equal, winner stays null (draw)

      // Fetch picks for both entries to get captain and chip data
      let activeChip1 = null;
      let activeChip2 = null;

      try {
        const picks1 = await fplApi.getEntryPicks(match.entry_1_entry, match.event);
        activeChip1 = picks1.active_chip || null;

        // Find captain
        const captain1 = picks1.picks.find((p: any) => p.is_captain);
        if (captain1) {
          const captainName = playerMap.get(captain1.element) || 'Unknown';
          await db.query(`
            INSERT INTO entry_captains (entry_id, event, captain_element_id, captain_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (entry_id, event) DO UPDATE SET
              captain_element_id = $3,
              captain_name = $4
          `, [match.entry_1_entry, match.event, captain1.element, captainName]);
        }
      } catch (err) {
        console.error(`Failed to fetch picks for entry ${match.entry_1_entry}, event ${match.event}:`, err);
      }

      try {
        const picks2 = await fplApi.getEntryPicks(match.entry_2_entry, match.event);
        activeChip2 = picks2.active_chip || null;

        // Find captain
        const captain2 = picks2.picks.find((p: any) => p.is_captain);
        if (captain2) {
          const captainName = playerMap.get(captain2.element) || 'Unknown';
          await db.query(`
            INSERT INTO entry_captains (entry_id, event, captain_element_id, captain_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (entry_id, event) DO UPDATE SET
              captain_element_id = $3,
              captain_name = $4
          `, [match.entry_2_entry, match.event, captain2.element, captainName]);
        }
      } catch (err) {
        console.error(`Failed to fetch picks for entry ${match.entry_2_entry}, event ${match.event}:`, err);
      }

      await db.query(`
        INSERT INTO h2h_matches
        (league_id, event, entry_1_id, entry_1_points, entry_2_id, entry_2_points, winner, active_chip_1, active_chip_2)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (league_id, event, entry_1_id, entry_2_id) DO UPDATE SET
          entry_1_points = $4,
          entry_2_points = $6,
          winner = $7,
          active_chip_1 = $8,
          active_chip_2 = $9
      `, [
        leagueId,
        match.event,
        match.entry_1_entry,
        match.entry_1_points,
        match.entry_2_entry,
        match.entry_2_points,
        winner,
        activeChip1,
        activeChip2
      ]);
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
