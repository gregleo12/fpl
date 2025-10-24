import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { fplApi } from '@/lib/fpl-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const matchId = parseInt(params.matchId);

    if (isNaN(leagueId) || isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get match details
    const matchResult = await db.query(`
      SELECT
        hm.*,
        m1.player_name as entry_1_player,
        m1.team_name as entry_1_team,
        m2.player_name as entry_2_player,
        m2.team_name as entry_2_team
      FROM h2h_matches hm
      JOIN managers m1 ON hm.entry_1_id = m1.entry_id
      JOIN managers m2 ON hm.entry_2_id = m2.entry_id
      WHERE hm.league_id = $1 AND hm.id = $2
      LIMIT 1
    `, [leagueId, matchId]);

    if (matchResult.rows.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const match = matchResult.rows[0];
    const entry1Id = match.entry_1_id;
    const entry2Id = match.entry_2_id;

    // Get current gameweek for chip calculations
    const bootstrapData = await fplApi.getBootstrapData();
    const currentEvent = bootstrapData.events.find(e => e.is_current || e.is_next);
    const currentGW = currentEvent?.id || 1;

    // Helper function to calculate remaining chips
    const calculateRemainingChips = (chipsUsed: any[], currentGW: number): string[] => {
      const remaining: string[] = [];
      const allChipTypes = ['wildcard', 'bboost', '3xc', 'freehit'];

      allChipTypes.forEach(chipType => {
        const uses = chipsUsed.filter((chip: any) => chip.name === chipType);

        if (uses.length === 0) {
          remaining.push(chipType);
        } else {
          const usedAfterGW19 = uses.some((use: any) => use.event >= 19);
          if (!usedAfterGW19 && currentGW >= 19) {
            remaining.push(chipType);
          }
        }
      });

      return remaining;
    };

    // Helper function to get player stats
    const getPlayerStats = async (entryId: number) => {
      // Get player's matches
      const matchesResult = await db.query(`
        SELECT
          event,
          CASE
            WHEN entry_1_id = $1 THEN entry_1_points
            ELSE entry_2_points
          END as points,
          CASE
            WHEN winner IS NULL THEN 'D'
            WHEN winner = $1 THEN 'W'
            ELSE 'L'
          END as result
        FROM h2h_matches
        WHERE league_id = $2
          AND (entry_1_id = $1 OR entry_2_id = $1)
          AND (entry_1_points > 0 OR entry_2_points > 0)
        ORDER BY event DESC
      `, [entryId, leagueId]);

      const matches = matchesResult.rows;

      // Calculate recent form (last 5)
      const last5 = matches.slice(0, 5);
      const recentForm = last5.map((m: any) => ({ result: m.result, event: m.event }));
      const avgPointsLast5 = last5.length > 0
        ? (last5.reduce((sum: number, m: any) => sum + (m.points || 0), 0) / last5.length).toFixed(1)
        : '0.0';

      // Get chip usage from FPL API
      let chipsRemaining: string[] = ['wildcard', 'bboost', '3xc', 'freehit'];
      try {
        const historyData = await fplApi.getEntryHistory(entryId);
        if (historyData && historyData.chips && Array.isArray(historyData.chips)) {
          chipsRemaining = calculateRemainingChips(historyData.chips, currentGW);
        }
      } catch (error) {
        console.log(`Could not fetch chips for entry ${entryId}:`, error);
      }

      // Calculate free transfers (simplified)
      let freeTransfers = 1; // Default
      try {
        const historyData = await fplApi.getEntryHistory(entryId);
        if (historyData && historyData.current && historyData.current.length > 0) {
          const lastGW = historyData.current[historyData.current.length - 1];
          const lastGWTransfers = lastGW.event_transfers || 0;

          if (lastGWTransfers === 0) {
            freeTransfers = 2; // Banked transfer
          } else {
            freeTransfers = 1;
          }
        }
      } catch (error) {
        console.log(`Could not fetch free transfers for entry ${entryId}:`, error);
      }

      return {
        recent_form: recentForm,
        avg_points_last_5: avgPointsLast5,
        chips_remaining: chipsRemaining,
        free_transfers: freeTransfers
      };
    };

    // Get stats for both players
    const [entry1Stats, entry2Stats] = await Promise.all([
      getPlayerStats(entry1Id),
      getPlayerStats(entry2Id)
    ]);

    // Get head-to-head record
    const h2hResult = await db.query(`
      SELECT
        event,
        CASE
          WHEN entry_1_id = $1 THEN entry_1_points
          ELSE entry_2_points
        END as entry1_score,
        CASE
          WHEN entry_1_id = $2 THEN entry_1_points
          ELSE entry_2_points
        END as entry2_score,
        winner
      FROM h2h_matches
      WHERE league_id = $3
        AND (
          (entry_1_id = $1 AND entry_2_id = $2) OR
          (entry_1_id = $2 AND entry_2_id = $1)
        )
        AND (entry_1_points > 0 OR entry_2_points > 0)
      ORDER BY event DESC
    `, [entry1Id, entry2Id, leagueId]);

    const h2hMatches = h2hResult.rows;
    const entry1Wins = h2hMatches.filter((m: any) => m.winner && parseInt(m.winner) === entry1Id).length;
    const entry2Wins = h2hMatches.filter((m: any) => m.winner && parseInt(m.winner) === entry2Id).length;
    const draws = h2hMatches.filter((m: any) => !m.winner).length;

    return NextResponse.json({
      match_id: matchId,
      entry_1: {
        id: entry1Id,
        player_name: match.entry_1_player,
        team_name: match.entry_1_team,
        ...entry1Stats
      },
      entry_2: {
        id: entry2Id,
        player_name: match.entry_2_player,
        team_name: match.entry_2_team,
        ...entry2Stats
      },
      head_to_head: {
        total_meetings: h2hMatches.length,
        entry_1_wins: entry1Wins,
        entry_2_wins: entry2Wins,
        draws,
        last_meeting: h2hMatches.length > 0 ? {
          event: h2hMatches[0].event,
          entry_1_score: h2hMatches[0].entry1_score,
          entry_2_score: h2hMatches[0].entry2_score
        } : null
      }
    });
  } catch (error: any) {
    console.error('Error fetching match details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch match details' },
      { status: 500 }
    );
  }
}
