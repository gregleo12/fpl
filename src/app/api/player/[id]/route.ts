import { NextRequest, NextResponse } from 'next/server';
import { fplApi } from '@/lib/fpl-api';
import { getDatabase } from '@/lib/db';
import { detectFPLError } from '@/lib/fpl-errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entryId = parseInt(params.id);

    if (isNaN(entryId)) {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });
    }

    // Get leagueId from query params
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get basic entry info
    const entry = await fplApi.getEntry(entryId);

    // Get entry history (includes chip usage and GW-by-GW data)
    const history = await fplApi.getEntryHistory(entryId);

    // Get bootstrap data to check which gameweeks have started
    // Fallback to 38 if bootstrap fetch fails (include all GWs)
    let maxStartedGW = 38;
    try {
      const bootstrap = await fplApi.getBootstrapData();
      const events = bootstrap?.events || [];

      // Find the highest gameweek that has started (is_current or finished)
      const startedGameweeks = events.filter((e: any) => e.is_current || e.finished);
      if (startedGameweeks.length > 0) {
        maxStartedGW = Math.max(...startedGameweeks.map((e: any) => e.id));
      }
    } catch (error) {
    }

    // Get manager info from database
    const managerResult = await db.query(
      'SELECT * FROM managers WHERE entry_id = $1',
      [entryId]
    );
    const manager = managerResult.rows[0];

    if (!manager) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
    }

    // Get all matches for this player in this league
    // Include matches from gameweeks that have started (even if 0-0)
    // Exclude only future gameweeks that haven't started yet
    const matchesResult = await db.query(`
      SELECT
        hm.*,
        m1.player_name as opponent_name,
        m1.team_name as opponent_team
      FROM h2h_matches hm
      LEFT JOIN managers m1 ON (
        CASE
          WHEN hm.entry_1_id = $1 THEN hm.entry_2_id
          ELSE hm.entry_1_id
        END = m1.entry_id
      )
      WHERE (hm.entry_1_id = $1 OR hm.entry_2_id = $1)
        AND hm.league_id = $2
        AND hm.event <= $3
      ORDER BY hm.event ASC
    `, [entryId, leagueId, maxStartedGW]);

    const matches = matchesResult.rows;

    // Process matches to get detailed history
    const matchHistory = matches.map((match: any) => {
      const isEntry1 = Number(match.entry_1_id) === entryId;
      const playerPoints = isEntry1 ? Number(match.entry_1_points) : Number(match.entry_2_points);
      const opponentPoints = isEntry1 ? Number(match.entry_2_points) : Number(match.entry_1_points);
      const opponentId = isEntry1 ? Number(match.entry_2_id) : Number(match.entry_1_id);
      const winner = match.winner ? Number(match.winner) : null;

      let result: 'W' | 'D' | 'L';
      if (winner === null) {
        result = 'D';
      } else if (winner === entryId) {
        result = 'W';
      } else {
        result = 'L';
      }

      return {
        event: Number(match.event),
        opponentId,
        opponentName: match.opponent_name,
        opponentTeam: match.opponent_team,
        playerPoints,
        opponentPoints,
        result,
        margin: playerPoints - opponentPoints
      };
    });

    // Calculate season stats
    const scores = matchHistory.map(m => m.playerPoints);

    // K-95: Calculate median score
    let medianScore = 0;
    if (scores.length > 0) {
      const sortedScores = [...scores].sort((a, b) => a - b);
      const mid = Math.floor(sortedScores.length / 2);
      if (sortedScores.length % 2 === 0) {
        // Even length: average of two middle values
        medianScore = (sortedScores[mid - 1] + sortedScores[mid]) / 2;
      } else {
        // Odd length: middle value
        medianScore = sortedScores[mid];
      }
    }

    const stats = {
      matchesPlayed: matchHistory.length,
      wins: matchHistory.filter(m => m.result === 'W').length,
      draws: matchHistory.filter(m => m.result === 'D').length,
      losses: matchHistory.filter(m => m.result === 'L').length,
      totalPointsFor: scores.reduce((sum, p) => sum + p, 0),
      averagePoints: scores.length > 0 ? (scores.reduce((sum, p) => sum + p, 0) / scores.length).toFixed(1) : '0',
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      medianScore: medianScore, // K-95: New median stat
      biggestWin: matchHistory.length > 0 ? Math.max(...matchHistory.map(m => m.result === 'W' ? m.margin : 0)) : 0,
      biggestLoss: matchHistory.length > 0 ? Math.min(...matchHistory.map(m => m.result === 'L' ? m.margin : 0)) : 0,
    };

    // Get chips played (from history.chips)
    const chipsPlayed = history.chips || [];

    // Get chips faced against
    // We need to fetch chip data for opponents in matches this player played
    const chipsFaced: any[] = [];

    for (const match of matchHistory) {
      try {
        const opponentHistory = await fplApi.getEntryHistory(match.opponentId);
        const opponentChips = opponentHistory.chips || [];

        // Check if opponent used a chip in this GW
        const chipUsed = opponentChips.find((chip: any) => chip.event === match.event);

        if (chipUsed) {
          chipsFaced.push({
            event: match.event,
            opponentId: match.opponentId,
            opponentName: match.opponentName,
            chipName: chipUsed.name,
            opponentPoints: match.opponentPoints,
            result: match.result
          });
        }
      } catch (error) {
        // Skip if we can't fetch opponent data
      }
    }

    return NextResponse.json({
      manager,
      entry,
      stats,
      matchHistory,
      chipsPlayed,
      chipsFaced,
      gwHistory: history.current || []
    });
  } catch (error: any) {
    console.error('Error fetching player profile:', error);
    // K-130: Use K-61 FPL error detection for user-friendly messages
    const statusCode = error.response?.status || error.status || 500;
    const fplError = detectFPLError(error, statusCode);
    return NextResponse.json(
      { error: fplError },
      { status: statusCode }
    );
  }
}
