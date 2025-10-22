import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

interface MatchResult {
  result: 'W' | 'D' | 'L';
  event: number;
}

async function calculateFormAndStreak(entryId: number, leagueId: number, db: any) {
  // Get all completed matches for this manager, ordered by event DESC (most recent first)
  const result = await db.query(`
    SELECT
      event,
      entry_1_id,
      entry_1_points,
      entry_2_id,
      entry_2_points,
      winner
    FROM h2h_matches
    WHERE league_id = $1
      AND (entry_1_id = $2 OR entry_2_id = $2)
      AND (entry_1_points > 0 OR entry_2_points > 0)
    ORDER BY event DESC
  `, [leagueId, entryId]);

  const matches = result.rows;

  if (matches.length === 0) {
    return {
      form: '',
      formArray: [],
      streak: ''
    };
  }

  // Calculate result for each match from manager's perspective
  const results: MatchResult[] = matches.map((match: any) => {
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
  // Get the most recent completed gameweek
  const lastGwResult = await db.query(`
    SELECT MAX(event) as last_gw
    FROM h2h_matches
    WHERE league_id = $1
      AND (entry_1_points > 0 OR entry_2_points > 0)
  `, [leagueId]);

  const lastGw = lastGwResult.rows[0]?.last_gw;

  if (!lastGw) {
    return { rankChange: 0, previousRank: currentRank };
  }

  // Get all standings data
  const allStandingsResult = await db.query(`
    SELECT entry_id, total, matches_won, matches_drawn, matches_lost, points_for
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
    let adjustedTotal = parseInt(standing.total);
    let adjustedWins = parseInt(standing.matches_won);
    let adjustedDraws = parseInt(standing.matches_drawn);
    let adjustedLosses = parseInt(standing.matches_lost);
    let adjustedPointsFor = parseInt(standing.points_for);

    // Find matches for this entry in last GW
    for (const match of lastGwMatches) {
      const entry1Id = parseInt(match.entry_1_id);
      const entry2Id = parseInt(match.entry_2_id);
      const winner = match.winner ? parseInt(match.winner) : null;
      const entryIdNum = parseInt(standing.entry_id);

      if (entry1Id === entryIdNum) {
        // This entry was entry_1
        adjustedPointsFor -= parseInt(match.entry_1_points);
        if (winner === entryIdNum) {
          adjustedTotal -= 3;
          adjustedWins -= 1;
        } else if (winner === null) {
          adjustedTotal -= 1;
          adjustedDraws -= 1;
        } else {
          adjustedLosses -= 1;
        }
      } else if (entry2Id === entryIdNum) {
        // This entry was entry_2
        adjustedPointsFor -= parseInt(match.entry_2_points);
        if (winner === entryIdNum) {
          adjustedTotal -= 3;
          adjustedWins -= 1;
        } else if (winner === null) {
          adjustedTotal -= 1;
          adjustedDraws -= 1;
        } else {
          adjustedLosses -= 1;
        }
      }
    }

    return {
      entry_id: standing.entry_id,
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

  // Find previous rank
  const previousRank = previousStandings.findIndex((s: any) => parseInt(s.entry_id) === entryId) + 1;
  const rankChange = previousRank - currentRank; // Positive = moved up, negative = moved down

  return { rankChange, previousRank };
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

    const db = await getDatabase();

    // Get current standings
    const standingsResult = await db.query(`
      SELECT
        ls.*,
        m.player_name,
        m.team_name
      FROM league_standings ls
      JOIN managers m ON ls.entry_id = m.entry_id
      WHERE ls.league_id = $1
      ORDER BY ls.rank ASC
    `, [leagueId]);

    const standings = standingsResult.rows;

    // Calculate form, streak, and rank change for each manager
    const standingsWithForm = await Promise.all(
      standings.map(async (standing: any) => {
        const formData = await calculateFormAndStreak(standing.entry_id, leagueId, db);
        const rankData = await calculateRankChange(standing.entry_id, leagueId, standing.rank, db);
        return {
          ...standing,
          ...formData,
          ...rankData
        };
      })
    );

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
      recentMatches
    });
  } catch (error: any) {
    console.error('Error fetching league stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch league stats' },
      { status: 500 }
    );
  }
}
