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

    // Fetch all picks in parallel (much faster!)
    console.log(`Fetching ${picksToFetch.length} picks in parallel...`);
    const picksResults = await Promise.allSettled(
      picksToFetch.map(({entryId, event}) =>
        fplApi.getEntryPicks(entryId, event)
          .then(data => ({ entryId, event, data }))
      )
    );

    // Store captain data from successful picks (with points)
    const captainInserts: Array<any> = [];
    const historyInserts: Array<any> = [];

    // Debug: Log first pick response to see data structure
    if (picksResults.length > 0 && picksResults[0].status === 'fulfilled') {
      const firstPick = (picksResults[0] as any).value.data;
      console.log('Sample picks data structure:', {
        has_entry_history: !!firstPick.entry_history,
        entry_history_points: firstPick.entry_history?.points,
        first_pick: firstPick.picks?.[0],
        active_chip: firstPick.active_chip
      });
    }

    for (const result of picksResults) {
      if (result.status === 'fulfilled') {
        const { entryId, event, data } = result.value;
        const captain = data.picks.find((p: any) => p.is_captain);
        if (captain) {
          const captainName = playerMap.get(captain.element) || 'Unknown';
          const captainPoints = captain.multiplier * captain.points;
          console.log(`Captain for entry ${entryId} GW${event}: ${captainName}, points: ${captain.points}, multiplier: ${captain.multiplier}, total: ${captainPoints}`);
          captainInserts.push([entryId, event, captain.element, captainName, captainPoints]);
        }

        // Store manager history with bench points
        if (data.entry_history) {
          const eh = data.entry_history;
          const benchPoints = data.picks
            .filter((p: any) => p.position > 11)
            .reduce((sum: number, p: any) => sum + p.points, 0);
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

    // TODO: Optimize rank calculation - currently too slow for production
    // For now, we'll skip calculating historical H2H ranks to avoid 3+ minute hangs
    // Comeback Kid and Rank Crasher awards won't work until this is optimized

    console.log('League data fetch completed successfully');

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
