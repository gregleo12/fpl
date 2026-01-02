/**
 * K-200: Ownership Combinations API
 *
 * GET /api/ownership/combinations?team={teamId}&tier=top500&gw=19
 *
 * Returns popular player combinations from elite managers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Player {
  id: number;
  name: string;
  team_id: number;
}

interface Combination {
  players: {
    id: number;
    name: string;
    ownership: number;
  }[];
  count: number;
  percentOfStackers: number;  // % of managers with 2+ (or 3+) from this team
  percentOfAll: number;        // % of all managers in sample
}

interface SingleOwnership {
  id: number;
  name: string;
  count: number;
  percentage: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamIdParam = searchParams.get('team');
  const tier = searchParams.get('tier') || 'top500';
  const gwParam = searchParams.get('gw');

  if (!teamIdParam) {
    return NextResponse.json({ error: 'team parameter is required' }, { status: 400 });
  }

  const teamId = parseInt(teamIdParam);

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

    // Get team info
    const teamResult = await db.query(
      'SELECT id, name, short_name FROM teams WHERE id = $1',
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const team = teamResult.rows[0];

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

    // Get all players from this team
    const playersResult = await db.query(
      'SELECT id, web_name as name FROM players WHERE team_id = $1',
      [teamId]
    );
    const teamPlayers: Player[] = playersResult.rows.map(r => ({
      id: r.id,
      name: r.name,
      team_id: teamId,
    }));
    const playerIds = teamPlayers.map(p => p.id);

    // Get all picks for this team's players
    const picksResult = await db.query(
      `SELECT entry_id, array_agg(player_id ORDER BY player_id) as players
       FROM elite_picks
       WHERE gameweek = $1
         AND sample_tier = $2
         AND player_id = ANY($3::int[])
       GROUP BY entry_id`,
      [gameweek, tier, playerIds]
    );

    // Calculate single ownership
    const singleOwnership: Record<number, number> = {};
    picksResult.rows.forEach(row => {
      row.players.forEach((playerId: number) => {
        singleOwnership[playerId] = (singleOwnership[playerId] || 0) + 1;
      });
    });

    const singles: SingleOwnership[] = Object.entries(singleOwnership)
      .map(([playerId, count]) => {
        const player = teamPlayers.find(p => p.id === parseInt(playerId));
        return {
          id: parseInt(playerId),
          name: player?.name || 'Unknown',
          count,
          percentage: (count / sampleSize) * 100,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Filter to only managers with 2+ players from this team
    const multiOwners = picksResult.rows.filter(row => row.players.length >= 2);

    // Calculate double combinations
    const doubleCombos: Record<string, number> = {};
    multiOwners.forEach(row => {
      const players = row.players;
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const key = [players[i], players[j]].sort((a, b) => a - b).join('-');
          doubleCombos[key] = (doubleCombos[key] || 0) + 1;
        }
      }
    });

    // Calculate triple combinations
    const tripleOwners = picksResult.rows.filter(row => row.players.length >= 3);
    const tripleCombos: Record<string, number> = {};
    tripleOwners.forEach(row => {
      const players = row.players;
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          for (let k = j + 1; k < players.length; k++) {
            const key = [players[i], players[j], players[k]].sort((a, b) => a - b).join('-');
            tripleCombos[key] = (tripleCombos[key] || 0) + 1;
          }
        }
      }
    });

    // Format doubles
    const doubles: Combination[] = Object.entries(doubleCombos)
      .map(([key, count]) => {
        const playerIds = key.split('-').map(Number);
        const players = playerIds.map(id => {
          const player = teamPlayers.find(p => p.id === id);
          return {
            id,
            name: player?.name || 'Unknown',
            ownership: ((singleOwnership[id] || 0) / sampleSize) * 100,
          };
        });
        return {
          players,
          count,
          percentOfStackers: multiOwners.length > 0 ? (count / multiOwners.length) * 100 : 0,
          percentOfAll: (count / sampleSize) * 100,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    // Format triples
    const triples: Combination[] = Object.entries(tripleCombos)
      .map(([key, count]) => {
        const playerIds = key.split('-').map(Number);
        const players = playerIds.map(id => {
          const player = teamPlayers.find(p => p.id === id);
          return {
            id,
            name: player?.name || 'Unknown',
            ownership: ((singleOwnership[id] || 0) / sampleSize) * 100,
          };
        });
        return {
          players,
          count,
          percentOfStackers: tripleOwners.length > 0 ? (count / tripleOwners.length) * 100 : 0,
          percentOfAll: (count / sampleSize) * 100,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        short_name: team.short_name,
      },
      gameweek,
      sample_tier: tier,
      sample_size: sampleSize,
      last_updated: lastUpdated,
      multi_owners: {
        doubles: multiOwners.length,
        triples: tripleOwners.length,
      },
      triples,
      doubles,
      singles,
    });
  } catch (error) {
    console.error('Error fetching combinations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch combinations' },
      { status: 500 }
    );
  }
}
