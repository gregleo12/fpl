import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

interface MatchResult {
  result: 'W' | 'D' | 'L';
  event: number;
}

function calculateFormAndStreak(entryId: number, leagueId: number, db: any) {
  // Get all completed matches for this manager, ordered by event DESC (most recent first)
  const matches = db.prepare(`
    SELECT
      event,
      entry_1_id,
      entry_1_points,
      entry_2_id,
      entry_2_points,
      winner
    FROM h2h_matches
    WHERE league_id = ?
      AND (entry_1_id = ? OR entry_2_id = ?)
      AND (entry_1_points > 0 OR entry_2_points > 0)
    ORDER BY event DESC
  `).all(leagueId, entryId, entryId);

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

    if (match.winner === null) {
      result = 'D';
    } else if (match.winner === entryId) {
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    const db = getDatabase();

    // Get current standings
    const standings = db.prepare(`
      SELECT
        ls.*,
        m.player_name,
        m.team_name
      FROM league_standings ls
      JOIN managers m ON ls.entry_id = m.entry_id
      WHERE ls.league_id = ?
      ORDER BY ls.rank ASC
    `).all(leagueId);

    // Calculate form and streak for each manager
    const standingsWithForm = standings.map((standing: any) => {
      const formData = calculateFormAndStreak(standing.entry_id, leagueId, db);
      return {
        ...standing,
        ...formData
      };
    });

    // Get recent matches (only show completed matches where points were scored)
    const recentMatches = db.prepare(`
      SELECT
        hm.*,
        m1.player_name as entry_1_player,
        m1.team_name as entry_1_team,
        m2.player_name as entry_2_player,
        m2.team_name as entry_2_team
      FROM h2h_matches hm
      JOIN managers m1 ON hm.entry_1_id = m1.entry_id
      JOIN managers m2 ON hm.entry_2_id = m2.entry_id
      WHERE hm.league_id = ?
        AND (hm.entry_1_points > 0 OR hm.entry_2_points > 0)
      ORDER BY hm.event DESC
      LIMIT 20
    `).all(leagueId);

    // Get league info
    const league = db.prepare('SELECT * FROM leagues WHERE id = ?').get(leagueId);

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
