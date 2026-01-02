/**
 * K-200b Phase 3: Template Cores API
 *
 * GET /api/ownership/templates?tier=top10k&gw=19
 *
 * Returns most common cross-team player combinations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TemplatePlayer {
  id: number;
  name: string;
  team: string;
  ownership: number;
}

interface TemplateCore {
  players: TemplatePlayer[];
  count: number;
  percent: number;
}

interface TemplatesResponse {
  gameweek: number;
  lastUpdated: string;
  sampleSize: number;
  topOwned: TemplatePlayer[];
  cores3: TemplateCore[];
  cores4: TemplateCore[];
  cores5: TemplateCore[];
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

    // Step 1: Get all players with their ownership
    const ownershipResult = await db.query(
      `SELECT p.id, p.web_name as name, t.short_name as team, COUNT(DISTINCT ep.entry_id) as count
       FROM elite_picks ep
       JOIN players p ON ep.player_id = p.id
       JOIN teams t ON p.team_id = t.id
       WHERE ep.gameweek = $1 AND ep.sample_tier = $2
       GROUP BY p.id, p.web_name, t.short_name
       ORDER BY count DESC`,
      [gameweek, tier]
    );

    const allPlayers = ownershipResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      team: row.team,
      count: parseInt(row.count),
      ownership: (parseInt(row.count) / sampleSize) * 100,
    }));

    // Step 2: Identify template players (>15% ownership)
    const templatePlayers = allPlayers.filter(p => p.ownership > 15);
    const templatePlayerIds = templatePlayers.map(p => p.id);

    console.log(`[Templates] Found ${templatePlayers.length} template players (>15% ownership)`);

    // Step 3: Get each manager's template players
    const managersResult = await db.query(
      `SELECT entry_id, array_agg(player_id ORDER BY player_id) as players
       FROM elite_picks
       WHERE gameweek = $1
         AND sample_tier = $2
         AND player_id = ANY($3::int[])
       GROUP BY entry_id`,
      [gameweek, tier, templatePlayerIds]
    );

    console.log(`[Templates] Processing ${managersResult.rows.length} managers`);

    // Step 4: Generate and count combinations
    const cores3Map: Record<string, number> = {};
    const cores4Map: Record<string, number> = {};
    const cores5Map: Record<string, number> = {};

    managersResult.rows.forEach((row) => {
      const players: number[] = row.players;

      // Generate 3-player combinations
      if (players.length >= 3) {
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            for (let k = j + 1; k < players.length; k++) {
              const key = [players[i], players[j], players[k]].sort((a, b) => a - b).join('-');
              cores3Map[key] = (cores3Map[key] || 0) + 1;
            }
          }
        }
      }

      // Generate 4-player combinations
      if (players.length >= 4) {
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            for (let k = j + 1; k < players.length; k++) {
              for (let l = k + 1; l < players.length; l++) {
                const key = [players[i], players[j], players[k], players[l]].sort((a, b) => a - b).join('-');
                cores4Map[key] = (cores4Map[key] || 0) + 1;
              }
            }
          }
        }
      }

      // Generate 5-player combinations
      if (players.length >= 5) {
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            for (let k = j + 1; k < players.length; k++) {
              for (let l = k + 1; l < players.length; l++) {
                for (let m = l + 1; m < players.length; m++) {
                  const key = [players[i], players[j], players[k], players[l], players[m]].sort((a, b) => a - b).join('-');
                  cores5Map[key] = (cores5Map[key] || 0) + 1;
                }
              }
            }
          }
        }
      }
    });

    console.log(`[Templates] Generated ${Object.keys(cores3Map).length} 3-player cores`);
    console.log(`[Templates] Generated ${Object.keys(cores4Map).length} 4-player cores`);
    console.log(`[Templates] Generated ${Object.keys(cores5Map).length} 5-player cores`);

    // Step 5: Format and sort results
    const formatCores = (coresMap: Record<string, number>, topN: number): TemplateCore[] => {
      return Object.entries(coresMap)
        .map(([key, count]) => {
          const playerIds = key.split('-').map(Number);
          const players = playerIds.map(id => {
            const player = templatePlayers.find(p => p.id === id);
            return {
              id,
              name: player?.name || 'Unknown',
              team: player?.team || '?',
              ownership: player?.ownership || 0,
            };
          });
          return {
            players,
            count,
            percent: (count / sampleSize) * 100,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
    };

    const cores3 = formatCores(cores3Map, 10);
    const cores4 = formatCores(cores4Map, 10);
    const cores5 = formatCores(cores5Map, 5);

    // Top 5 most owned players
    const topOwned = allPlayers.slice(0, 5).map(p => ({
      id: p.id,
      name: p.name,
      team: p.team,
      ownership: p.ownership,
    }));

    const response: TemplatesResponse = {
      gameweek: gameweek || 19,
      lastUpdated: lastUpdated || new Date().toISOString(),
      sampleSize,
      topOwned,
      cores3,
      cores4,
      cores5,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
