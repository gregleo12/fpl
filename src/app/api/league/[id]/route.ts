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
    const allMatches = await fplApi.getAllH2HMatches(leagueId);
    const bootstrap = await fplApi.getBootstrapData();

    // Filter to only include FINISHED gameweeks
    const finishedGameweeks = bootstrap.events
      .filter(event => event.finished)
      .map(event => event.id);
    const matches = allMatches.filter(match => finishedGameweeks.includes(match.event));

    console.log(`Total matches: ${allMatches.length}, Finished matches: ${matches.length}`);

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

    // Check which entries have been processed (chips data fetched, even if NULL)
    // If h2h_match exists with entry_1_points, it means we've fetched picks for that entry
    const processedEntries = await db.query(`
      SELECT entry_1_id as entry_id, event
      FROM h2h_matches
      WHERE league_id = $1
      AND entry_1_points IS NOT NULL

      UNION

      SELECT entry_2_id as entry_id, event
      FROM h2h_matches
      WHERE league_id = $1
      AND entry_2_points IS NOT NULL
    `, [leagueId]);

    const chipsCache = new Set(
      processedEntries.rows.map((r: any) => `${r.entry_id}_${r.event}`)
    );

    // Collect all picks we need to fetch (fetch if EITHER captain OR chips missing)
    const picksToFetch: Array<{entryId: number, event: number}> = [];
    for (const match of matches) {
      const key1 = `${match.entry_1_entry}_${match.event}`;
      const key2 = `${match.entry_2_entry}_${match.event}`;

      // Fetch if captain missing OR chips missing
      if (!captainCache.has(key1) || !chipsCache.has(key1)) {
        picksToFetch.push({ entryId: match.entry_1_entry, event: match.event });
      }
      if (!captainCache.has(key2) || !chipsCache.has(key2)) {
        picksToFetch.push({ entryId: match.entry_2_entry, event: match.event });
      }
    }

    // Fetch all picks in parallel (much faster!)
    console.log(`Fetching ${picksToFetch.length} picks in parallel...`);
    const picksResults = await Promise.allSettled(
      picksToFetch.map(({entryId, event}) =>
        fplApi.getEntryPicks(entryId, event)
          .then(data => ({ entryId, event, data }))
      )
    );

    // Fetch live event data for all unique gameweeks to get actual player points
    // Since we filtered matches to only finished ones, all picks should be from finished GWs
    const uniqueEvents = Array.from(new Set(picksToFetch.map(p => p.event)));
    console.log(`Fetching live data for ${uniqueEvents.length} finished gameweeks:`, uniqueEvents);

    const liveDataMap = new Map<number, Map<number, number>>(); // event -> (elementId -> points)

    await Promise.all(
      uniqueEvents.map(async (event) => {
        try {
          const liveData = await fplApi.getEventLive(event);
          console.log(`GW${event}: Live data structure:`, {
            hasElements: !!liveData.elements,
            elementsLength: liveData.elements?.length,
            keys: Object.keys(liveData).slice(0, 10)
          });

          const playerPointsMap = new Map<number, number>();

          // Map each player's ID to their total points for this gameweek
          if (liveData.elements && Array.isArray(liveData.elements)) {
            for (const element of liveData.elements) {
              playerPointsMap.set(element.id, element.stats.total_points);
            }
          }

          liveDataMap.set(event, playerPointsMap);
          console.log(`GW${event}: Loaded points for ${playerPointsMap.size} players`);
        } catch (error) {
          console.error(`Failed to fetch live data for GW${event}:`, error);
        }
      })
    );

    // Store captain data and manager history with actual points
    const captainInserts: Array<any> = [];
    const historyInserts: Array<any> = [];

    for (const result of picksResults) {
      if (result.status === 'fulfilled') {
        const { entryId, event, data } = result.value;
        const playerPoints = liveDataMap.get(event);

        // Store captain with actual points
        const captain = data.picks.find((p: any) => p.is_captain);
        if (captain && playerPoints) {
          const captainName = playerMap.get(captain.element) || 'Unknown';
          const captainBasePoints = playerPoints.get(captain.element) || 0;
          const captainPoints = captain.multiplier * captainBasePoints;
          captainInserts.push([entryId, event, captain.element, captainName, captainPoints]);
        }

        // Store manager history with actual bench points
        if (data.entry_history && playerPoints) {
          const eh = data.entry_history;
          const benchPoints = data.picks
            .filter((p: any) => p.position > 11)
            .reduce((sum: number, p: any) => {
              const points = playerPoints.get(p.element) || 0;
              return sum + points;
            }, 0);

          historyInserts.push([
            entryId,
            event,
            eh.points || 0,
            eh.total_points || 0,
            eh.rank || null,
            eh.rank_sort || null,
            eh.overall_rank || null,
            eh.bank || 0,
            eh.value || 0,
            eh.event_transfers || 0,
            eh.event_transfers_cost || 0,
            benchPoints
          ]);
        }
      }
    }

    // Batch insert captains with points
    for (const [entryId, event, captainElementId, captainName, captainPoints] of captainInserts) {
      await db.query(`
        INSERT INTO entry_captains (entry_id, event, captain_element_id, captain_name, captain_points)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (entry_id, event) DO UPDATE SET captain_points = $5
      `, [entryId, event, captainElementId, captainName, captainPoints]);
    }

    // Batch insert manager history (without rank for now - will calculate after)
    for (const historyData of historyInserts) {
      const [entryId, event, points, totalPoints, rank, rankSort, overallRank, bank, value, eventTransfers, eventTransfersCost, benchPoints] = historyData;

      await db.query(`
        INSERT INTO manager_history
        (entry_id, event, points, total_points, rank, rank_sort, overall_rank, bank, value,
         event_transfers, event_transfers_cost, points_on_bench, rank_change)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
        ON CONFLICT (entry_id, event) DO UPDATE SET
          points = $3,
          total_points = $4,
          rank = $5,
          rank_sort = $6,
          overall_rank = $7,
          bank = $8,
          value = $9,
          event_transfers = $10,
          event_transfers_cost = $11,
          points_on_bench = $12
      `, [entryId, event, points, totalPoints, rank, rankSort, overallRank, bank, value,
          eventTransfers, eventTransfersCost, benchPoints]);
    }

    // Store matches (with chips from picks data)
    const chipsMap = new Map<string, string | null>();
    for (const result of picksResults) {
      if (result.status === 'fulfilled') {
        const { entryId, event, data } = result.value;
        chipsMap.set(`${entryId}_${event}`, data.active_chip || null);
      }
    }

    // Store ALL matches (including future ones) but chip data only for finished matches
    for (const match of allMatches) {
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

    // TODO: Optimize rank calculation - currently too slow for production
    // For now, we'll skip calculating historical H2H ranks to avoid 3+ minute hangs
    // Comeback Kid and Rank Crasher awards won't work until this is optimized

    console.log('League data fetch completed successfully');

    return NextResponse.json({
      league: league.league,
      standings: league.standings.results,
      matches: allMatches
    });
  } catch (error: any) {
    console.error('Error fetching league data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch league data' },
      { status: 500 }
    );
  }
}
