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

    // Check which captain data we already have
    const existingCaptains = await db.query(`
      SELECT entry_id, event FROM entry_captains
    `);
    const captainCache = new Set(
      existingCaptains.rows.map((r: any) => `${r.entry_id}_${r.event}`)
    );

    // Collect all picks we need to fetch (in parallel)
    const picksToFetch: Array<{entryId: number, event: number}> = [];
    for (const match of matches) {
      const key1 = `${match.entry_1_entry}_${match.event}`;
      const key2 = `${match.entry_2_entry}_${match.event}`;

      if (!captainCache.has(key1)) {
        picksToFetch.push({ entryId: match.entry_1_entry, event: match.event });
      }
      if (!captainCache.has(key2)) {
        picksToFetch.push({ entryId: match.entry_2_entry, event: match.event });
      }
    }

    // Fetch picks sequentially with delays to avoid rate limiting
    console.log(`Fetching ${picksToFetch.length} picks sequentially with rate limiting...`);
    const DELAY_BETWEEN_REQUESTS = 300; // 300ms between each request
    const picksResults: Array<PromiseSettledResult<{ entryId: number; event: number; data: any }>> = [];

    for (let i = 0; i < picksToFetch.length; i++) {
      const {entryId, event} = picksToFetch[i];

      if (i > 0 && i % 10 === 0) {
        console.log(`Fetched ${i}/${picksToFetch.length} picks...`);
      }

      try {
        const data = await fplApi.getEntryPicks(entryId, event);
        picksResults.push({
          status: 'fulfilled',
          value: { entryId, event, data }
        });
      } catch (error) {
        picksResults.push({
          status: 'rejected',
          reason: error
        });
      }

      // Delay between requests
      if (i < picksToFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }

    console.log(`Completed fetching picks: ${picksResults.filter(r => r.status === 'fulfilled').length}/${picksToFetch.length} successful`);

    // Store captain data from successful picks
    const captainInserts: Array<any> = [];
    for (const result of picksResults) {
      if (result.status === 'fulfilled') {
        const { entryId, event, data } = result.value;
        const captain = data.picks.find((p: any) => p.is_captain);
        if (captain) {
          const captainName = playerMap.get(captain.element) || 'Unknown';
          captainInserts.push([entryId, event, captain.element, captainName]);
        }
      }
    }

    // Batch insert captains
    for (const [entryId, event, captainElementId, captainName] of captainInserts) {
      await db.query(`
        INSERT INTO entry_captains (entry_id, event, captain_element_id, captain_name)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (entry_id, event) DO NOTHING
      `, [entryId, event, captainElementId, captainName]);
    }

    // Store matches (with chips from picks data)
    const chipsMap = new Map<string, string | null>();
    for (const result of picksResults) {
      if (result.status === 'fulfilled') {
        const { entryId, event, data } = result.value;
        chipsMap.set(`${entryId}_${event}`, data.active_chip || null);
      }
    }

    for (const match of matches) {
      // Calculate winner based on points
      let winner = null;
      if (match.entry_1_points > match.entry_2_points) {
        winner = match.entry_1_entry;
      } else if (match.entry_2_points > match.entry_1_points) {
        winner = match.entry_2_entry;
      }

      const activeChip1 = chipsMap.get(`${match.entry_1_entry}_${match.event}`) || null;
      const activeChip2 = chipsMap.get(`${match.entry_2_entry}_${match.event}`) || null;

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
    console.error('Error stack:', error.stack);

    // Provide more specific error messages
    let errorMessage = 'Failed to fetch league data';
    if (error.response?.status === 404) {
      errorMessage = 'League not found. Please check the league ID.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Cannot connect to FPL API. Please try again later.';
    } else if (error.message?.includes('database') || error.code?.startsWith('PG')) {
      errorMessage = 'Database error. Please try again later.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: error.response?.status || 500 }
    );
  }
}
