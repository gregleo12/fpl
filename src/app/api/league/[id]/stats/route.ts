import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

interface MatchResult {
  result: 'W' | 'D' | 'L';
  event: number;
}

function calculateFormAndStreakFromMatches(entryId: number, matches: any[], upToGW: number) {
  // Filter matches for this manager up to the specified GW
  const managerMatches = matches
    .filter((match: any) => {
      const entry1 = Number(match.entry_1_id);
      const entry2 = Number(match.entry_2_id);
      return (entry1 === entryId || entry2 === entryId) && Number(match.event) <= upToGW;
    })
    .sort((a: any, b: any) => Number(b.event) - Number(a.event)); // Most recent first

  if (managerMatches.length === 0) {
    return {
      form: '',
      formArray: [],
      streak: ''
    };
  }

  // Calculate result for each match from manager's perspective
  const results: MatchResult[] = managerMatches.map((match: any) => {
    let result: 'W' | 'D' | 'L';

    // Convert winner to number for comparison (PostgreSQL returns BIGINT as string)
    const winner = match.winner ? parseInt(match.winner) : null;

    if (winner === null) {
      result = 'D';
    } else if (winner === entryId) {
      result = 'W';
    } else {
      result = 'L';
    }

    return { result, event: match.event };
  });

  // Get last 5 for form
  const last5 = results.slice(0, 5);
  const formArray = last5.map(r => r.result);
  const form = formArray.join('-');

  // Calculate streak (consecutive same results from most recent)
  let streak = '';
  if (results.length > 0) {
    const mostRecent = results[0].result;
    let count = 1;

    for (let i = 1; i < results.length; i++) {
      if (results[i].result === mostRecent) {
        count++;
      } else {
        break;
      }
    }

    streak = `${mostRecent}${count}`;
  }

  return {
    form,
    formArray,
    streak
  };
}

async function calculateRankChange(entryId: number, leagueId: number, currentRank: number, db: any) {
  // Convert entryId to number in case it comes as string from PostgreSQL BIGINT
  const entryIdNum = Number(entryId);

  // Get the most recent completed gameweek
  const lastGwResult = await db.query(`
    SELECT MAX(event) as last_gw
    FROM h2h_matches
    WHERE league_id = $1
      AND (entry_1_points > 0 OR entry_2_points > 0)
  `, [leagueId]);

  const lastGw = lastGwResult.rows[0]?.last_gw;

  if (!lastGw || lastGw === null) {
    return { rankChange: 0, previousRank: currentRank };
  }

  // Get all standings data
  const allStandingsResult = await db.query(`
    SELECT entry_id, total, points_for
    FROM league_standings
    WHERE league_id = $1
  `, [leagueId]);

  const allStandings = allStandingsResult.rows;

  // Get last gameweek matches
  const lastGwMatchesResult = await db.query(`
    SELECT entry_1_id, entry_2_id, entry_1_points, entry_2_points, winner
    FROM h2h_matches
    WHERE league_id = $1 AND event = $2
  `, [leagueId, lastGw]);

  const lastGwMatches = lastGwMatchesResult.rows;

  // Calculate standings before last gameweek
  const previousStandings = allStandings.map((standing: any) => {
    // Convert to numbers (PostgreSQL BIGINT comes as string)
    const standingEntryId = Number(standing.entry_id);
    let adjustedTotal = Number(standing.total);
    let adjustedPointsFor = Number(standing.points_for);

    // Find this team's match in the last gameweek
    for (const match of lastGwMatches) {
      const entry1Id = Number(match.entry_1_id);
      const entry2Id = Number(match.entry_2_id);
      const winner = match.winner ? Number(match.winner) : null;

      if (entry1Id === standingEntryId) {
        // This team was entry_1 - subtract their points scored
        adjustedPointsFor -= Number(match.entry_1_points);

        // Subtract league points earned
        if (winner === standingEntryId) {
          adjustedTotal -= 3; // Win
        } else if (winner === null) {
          adjustedTotal -= 1; // Draw
        }
        // Loss = 0 points, so no subtraction needed
        break; // Found their match, stop looking
      } else if (entry2Id === standingEntryId) {
        // This team was entry_2 - subtract their points scored
        adjustedPointsFor -= Number(match.entry_2_points);

        // Subtract league points earned
        if (winner === standingEntryId) {
          adjustedTotal -= 3; // Win
        } else if (winner === null) {
          adjustedTotal -= 1; // Draw
        }
        // Loss = 0 points, so no subtraction needed
        break; // Found their match, stop looking
      }
    }

    return {
      entry_id: standingEntryId, // Store as number for comparison
      adjustedTotal,
      adjustedPointsFor
    };
  });

  // Sort by adjusted total (desc), then by adjusted points for (desc)
  previousStandings.sort((a: any, b: any) => {
    if (b.adjustedTotal !== a.adjustedTotal) {
      return b.adjustedTotal - a.adjustedTotal;
    }
    return b.adjustedPointsFor - a.adjustedPointsFor;
  });

  // Find previous rank (entry_id is now stored as number)
  const previousRank = previousStandings.findIndex((s: any) => s.entry_id === entryIdNum) + 1;

  if (previousRank === 0) {
    // Not found - shouldn't happen, but return safe default
    return { rankChange: 0, previousRank: currentRank };
  }

  const rankChange = previousRank - currentRank; // Positive = moved up, negative = moved down

  return { rankChange, previousRank };
}

function rebuildStandingsFromMatches(matches: any[], managers: any[], upToGW: number) {
  // Build standings from scratch using match results
  const standings: any = {};

  // Initialize all managers
  managers.forEach((manager: any) => {
    const entryId = Number(manager.entry_id);
    standings[entryId] = {
      entry_id: entryId,
      player_name: manager.player_name,
      team_name: manager.team_name,
      matches_played: 0,
      matches_won: 0,
      matches_drawn: 0,
      matches_lost: 0,
      points_for: 0,
      points_against: 0,
      total: 0
    };
  });

  // Process all matches up to the specified GW
  matches.forEach((match: any) => {
    if (match.event > upToGW) return;

    const entry1 = Number(match.entry_1_id);
    const entry2 = Number(match.entry_2_id);
    const entry1Points = Number(match.entry_1_points);
    const entry2Points = Number(match.entry_2_points);
    const winner = match.winner ? Number(match.winner) : null;

    if (!standings[entry1] || !standings[entry2]) return;

    // Update matches played and points
    standings[entry1].matches_played++;
    standings[entry2].matches_played++;
    standings[entry1].points_for += entry1Points;
    standings[entry2].points_for += entry2Points;
    standings[entry1].points_against += entry2Points;
    standings[entry2].points_against += entry1Points;

    // Update win/draw/loss and total points
    if (winner === entry1) {
      standings[entry1].matches_won++;
      standings[entry1].total += 3;
      standings[entry2].matches_lost++;
    } else if (winner === entry2) {
      standings[entry2].matches_won++;
      standings[entry2].total += 3;
      standings[entry1].matches_lost++;
    } else {
      standings[entry1].matches_drawn++;
      standings[entry2].matches_drawn++;
      standings[entry1].total += 1;
      standings[entry2].total += 1;
    }
  });

  // Convert to array and sort by total DESC, then points_for DESC
  const standingsArray = Object.values(standings);
  standingsArray.sort((a: any, b: any) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return b.points_for - a.points_for;
  });

  // Add ranks
  standingsArray.forEach((standing: any, index) => {
    standing.rank = index + 1;
  });

  return standingsArray;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    // Get GW parameter from query string
    const { searchParams } = new URL(request.url);
    const gwParam = searchParams.get('gw');

    const db = await getDatabase();

    // Get all managers in this league
    const managersResult = await db.query(`
      SELECT DISTINCT entry_id, player_name, team_name
      FROM managers m
      WHERE EXISTS (
        SELECT 1 FROM h2h_matches hm
        WHERE (hm.entry_1_id = m.entry_id OR hm.entry_2_id = m.entry_id)
        AND hm.league_id = $1
      )
    `, [leagueId]);

    const managers = managersResult.rows;

    // Get ALL matches for this league
    const allMatchesResult = await db.query(`
      SELECT event, entry_1_id, entry_1_points, entry_2_id, entry_2_points, winner
      FROM h2h_matches
      WHERE league_id = $1
        AND (entry_1_points > 0 OR entry_2_points > 0)
      ORDER BY event ASC
    `, [leagueId]);

    const allMatches = allMatchesResult.rows;

    // Find max completed GW
    const maxGW = allMatches.length > 0
      ? Math.max(...allMatches.map((m: any) => Number(m.event)))
      : 0;

    if (maxGW === 0) {
      return NextResponse.json({ error: 'No completed matches found' }, { status: 404 });
    }

    // Determine which GW to show
    const requestedGW = gwParam ? parseInt(gwParam) : maxGW;
    const currentGW = Math.min(Math.max(1, requestedGW), maxGW);

    // Rebuild standings for the current GW
    const standings = rebuildStandingsFromMatches(allMatches, managers, currentGW);

    // Calculate form, streak, and rank change for each manager
    const standingsWithForm = standings.map((standing: any) => {
      const formData = calculateFormAndStreakFromMatches(standing.entry_id, allMatches, currentGW);

      // Calculate rank change from previous GW
      let rankChange = 0;
      if (currentGW > 1) {
        const prevStandings = rebuildStandingsFromMatches(allMatches, managers, currentGW - 1);
        const prevRank = prevStandings.findIndex((s: any) => s.entry_id === standing.entry_id) + 1;
        rankChange = prevRank - standing.rank;
      }

      return {
        ...standing,
        ...formData,
        rankChange,
        previousRank: standing.rank - rankChange
      };
    });

    // Get recent matches (only show completed matches where points were scored)
    const recentMatchesResult = await db.query(`
      SELECT
        hm.*,
        m1.player_name as entry_1_player,
        m1.team_name as entry_1_team,
        m2.player_name as entry_2_player,
        m2.team_name as entry_2_team
      FROM h2h_matches hm
      JOIN managers m1 ON hm.entry_1_id = m1.entry_id
      JOIN managers m2 ON hm.entry_2_id = m2.entry_id
      WHERE hm.league_id = $1
        AND (hm.entry_1_points > 0 OR hm.entry_2_points > 0)
      ORDER BY hm.event DESC
      LIMIT 20
    `, [leagueId]);

    const recentMatches = recentMatchesResult.rows;

    // Get league info
    const leagueResult = await db.query('SELECT * FROM leagues WHERE id = $1', [leagueId]);
    const league = leagueResult.rows[0];

    return NextResponse.json({
      league,
      standings: standingsWithForm,
      recentMatches,
      currentGW,
      maxGW
    });
  } catch (error: any) {
    console.error('Error fetching league stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch league stats' },
      { status: 500 }
    );
  }
}
