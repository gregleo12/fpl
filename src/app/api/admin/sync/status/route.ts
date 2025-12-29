import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { hasValidManagerHistory, hasValidPlayerStats } from '@/lib/dataValidation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueIdParam = searchParams.get('leagueId');

    const db = await getDatabase();

    // Get all leagues (or specific one)
    let leaguesQuery = 'SELECT id, name FROM leagues ORDER BY id';
    let leaguesParams: any[] = [];

    if (leagueIdParam) {
      leaguesQuery = 'SELECT id, name FROM leagues WHERE id = $1';
      leaguesParams = [parseInt(leagueIdParam)];
    }

    const leaguesResult = await db.query(leaguesQuery, leaguesParams);

    // Get manager counts per league
    const leagues = await Promise.all(
      leaguesResult.rows.map(async (league: any) => {
        const countResult = await db.query(
          'SELECT COUNT(DISTINCT entry_id) as count FROM league_standings WHERE league_id = $1',
          [league.id]
        );
        return {
          id: league.id,
          name: league.name,
          managerCount: parseInt(countResult.rows[0]?.count || '0')
        };
      })
    );

    // Fetch bootstrap for GW info
    const bootstrapResponse = await fetch(
      'https://fantasy.premierleague.com/api/bootstrap-static/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    );

    if (!bootstrapResponse.ok) {
      throw new Error('Failed to fetch bootstrap data');
    }

    const bootstrapData = await bootstrapResponse.json();

    const events = bootstrapData.events || [];
    const currentGW = events.find((e: any) => e.is_current)?.id || events.filter((e: any) => e.finished).length;
    const finishedGWs = events.filter((e: any) => e.finished).map((e: any) => e.id);

    // Get GW status for each league
    const gwStatus: Record<string, Record<string, string>> = {};

    for (const league of leagues) {
      gwStatus[league.id] = {};

      for (let gw = 1; gw <= currentGW; gw++) {
        if (!finishedGWs.includes(gw)) {
          gwStatus[league.id][gw] = 'not_finished';
          continue;
        }

        // Use K-144 validation functions
        const hasManagers = await hasValidManagerHistory(db, league.id, gw);
        const hasPlayers = await hasValidPlayerStats(db, gw);

        if (hasManagers && hasPlayers) {
          gwStatus[league.id][gw] = 'valid';
        } else {
          // Check if rows exist but are zero (invalid) vs no rows (missing)
          const rowCheck = await db.query(
            'SELECT COUNT(*) as count FROM manager_gw_history WHERE league_id = $1 AND event = $2',
            [league.id, gw]
          );

          if (parseInt(rowCheck.rows[0]?.count || '0') > 0) {
            gwStatus[league.id][gw] = 'invalid'; // Has rows, but zero data
          } else {
            gwStatus[league.id][gw] = 'missing'; // No rows at all
          }
        }
      }
    }

    return NextResponse.json({
      leagues,
      currentGW,
      finishedGWs,
      gwStatus
    });
  } catch (error: any) {
    console.error('[K-146] Error fetching sync status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
