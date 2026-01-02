/**
 * K-200b: Ownership Summary API
 *
 * GET /api/ownership/summary?tier=top10k&gw=19
 *
 * Returns stacking summary for all 20 PL teams
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TeamStackingSummary {
  team: {
    id: number;
    name: string;
    short_name: string;
  };
  doubleUpCount: number;
  doubleUpPercent: number;
  tripleUpCount: number;
  tripleUpPercent: number;
  topCombo: {
    players: string[];
    count: number;
    percent: number;
  } | null;
}

interface SummaryResponse {
  gameweek: number;
  lastUpdated: string;
  sampleSize: number;
  teams: TeamStackingSummary[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tier = searchParams.get('tier') || 'top10k';
  const gwParam = searchParams.get('gw');

  try {
    const db = await getDatabase();

    // Get current gameweek if not specified
    let gameweek = gwParam ? parseInt(gwParam) : null;
    if (!gameweek) {
      const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      const fplData = await fplResponse.json();
      const currentEvent = fplData.events.find((e: any) => e.is_current);
      gameweek = currentEvent?.id || 19;
    }

    // Get sample size
    const sampleSizeResult = await db.query(
      'SELECT COUNT(DISTINCT entry_id) as count FROM elite_picks WHERE gameweek = $1 AND sample_tier = $2',
      [gameweek, tier]
    );
    const sampleSize = parseInt(sampleSizeResult.rows[0]?.count || '0');

    if (sampleSize === 0) {
      return NextResponse.json({
        error: `No data available for GW${gameweek}, ${tier}. Run sync:elite-picks first.`,
      }, { status: 404 });
    }

    // Get last updated time
    const syncStatusResult = await db.query(
      'SELECT completed_at FROM elite_sync_status WHERE gameweek = $1 AND sample_tier = $2 AND status = $3',
      [gameweek, tier, 'completed']
    );
    const lastUpdated = syncStatusResult.rows[0]?.completed_at;

    // Get all teams
    const teamsResult = await db.query('SELECT id, name, short_name FROM teams ORDER BY id');
    const teams = teamsResult.rows;

    // For each team, calculate stacking stats
    const teamSummaries: TeamStackingSummary[] = await Promise.all(
      teams.map(async (team) => {
        // Get all managers who own at least one player from this team
        const picksResult = await db.query(
          `SELECT entry_id, array_agg(player_id ORDER BY player_id) as players
           FROM elite_picks ep
           JOIN players p ON ep.player_id = p.id
           WHERE ep.gameweek = $1
             AND ep.sample_tier = $2
             AND p.team_id = $3
           GROUP BY entry_id`,
          [gameweek, tier, team.id]
        );

        // Count managers with 2+ and 3+ players
        const doubleOwners = picksResult.rows.filter(row => row.players.length >= 2);
        const tripleOwners = picksResult.rows.filter(row => row.players.length >= 3);

        const doubleUpCount = doubleOwners.length;
        const tripleUpCount = tripleOwners.length;

        // Find top double combination
        let topCombo: { players: string[]; count: number; percent: number } | null = null;

        if (doubleOwners.length > 0) {
          const doubleCombos: Record<string, number> = {};
          doubleOwners.forEach(row => {
            const players = row.players;
            for (let i = 0; i < players.length; i++) {
              for (let j = i + 1; j < players.length; j++) {
                const key = [players[i], players[j]].sort((a, b) => a - b).join('-');
                doubleCombos[key] = (doubleCombos[key] || 0) + 1;
              }
            }
          });

          // Find most common combo
          const sortedCombos = Object.entries(doubleCombos).sort((a, b) => b[1] - a[1]);
          if (sortedCombos.length > 0) {
            const [key, count] = sortedCombos[0];
            const playerIds = key.split('-').map(Number);

            // Get player names
            const playersResult = await db.query(
              'SELECT web_name FROM players WHERE id = ANY($1::int[]) ORDER BY id',
              [playerIds]
            );

            topCombo = {
              players: playersResult.rows.map(r => r.web_name),
              count,
              percent: (count / sampleSize) * 100,
            };
          }
        }

        return {
          team: {
            id: team.id,
            name: team.name,
            short_name: team.short_name,
          },
          doubleUpCount,
          doubleUpPercent: (doubleUpCount / sampleSize) * 100,
          tripleUpCount,
          tripleUpPercent: (tripleUpCount / sampleSize) * 100,
          topCombo,
        };
      })
    );

    // Sort by doubleUpPercent descending
    teamSummaries.sort((a, b) => b.doubleUpPercent - a.doubleUpPercent);

    const response: SummaryResponse = {
      gameweek: gameweek || 19,
      lastUpdated: lastUpdated || new Date().toISOString(),
      sampleSize,
      teams: teamSummaries,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}
