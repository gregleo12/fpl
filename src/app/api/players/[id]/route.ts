import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { syncPlayerHistory } from '@/lib/sync/playerSync';

// Force dynamic rendering for fresh player data (K-63b)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to determine result from gameweek data
function getResult(h: any): string {
  if (h.team_goals === null || h.opponent_goals === null) return '-';
  if (h.team_goals > h.opponent_goals) return 'W';
  if (h.team_goals < h.opponent_goals) return 'L';
  return 'D';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playerId = parseInt(params.id);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get player
    const playerResult = await db.query(
      'SELECT * FROM players WHERE id = $1',
      [playerId]
    );

    if (playerResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    const player = playerResult.rows[0];

    // Get history (sync if empty)
    let historyResult = await db.query(`
      SELECT * FROM player_gameweek_stats
      WHERE player_id = $1
      ORDER BY gameweek DESC
    `, [playerId]);

    // If no history, sync it
    if (historyResult.rows.length === 0) {
      console.log(`[Player Detail] No history found for player ${playerId}, syncing...`);
      await syncPlayerHistory(playerId);
      historyResult = await db.query(`
        SELECT * FROM player_gameweek_stats
        WHERE player_id = $1
        ORDER BY gameweek DESC
      `, [playerId]);
    }

    const history = historyResult.rows;

    // Calculate per 90 stats
    const totalMinutes = player.minutes || 0;
    const per90Divisor = totalMinutes / 90;

    const per90 = per90Divisor > 0 ? {
      goals_scored: parseFloat((player.goals_scored / per90Divisor).toFixed(2)),
      assists: parseFloat((player.assists / per90Divisor).toFixed(2)),
      expected_goals: parseFloat((parseFloat(player.expected_goals) / per90Divisor).toFixed(2)),
      expected_assists: parseFloat((parseFloat(player.expected_assists) / per90Divisor).toFixed(2)),
      expected_goal_involvements: parseFloat((parseFloat(player.expected_goal_involvements) / per90Divisor).toFixed(2)),
      clean_sheets: parseFloat((player.clean_sheets / per90Divisor).toFixed(2)),
      goals_conceded: parseFloat((player.goals_conceded / per90Divisor).toFixed(2)),
      bps: parseFloat((player.bps / per90Divisor).toFixed(1))
    } : null;

    // K-63c: Fetch current gameweek from bootstrap-static
    let currentGW = 0;
    try {
      const bootstrapResponse = await fetch(
        'https://fantasy.premierleague.com/api/bootstrap-static/',
        { cache: 'no-store' }
      );
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const currentEvent = bootstrapData.events?.find((e: any) => e.is_current);
        currentGW = currentEvent?.id || 0;
      }
    } catch (error) {
      console.error('[Player Detail] Error fetching current GW:', error);
    }

    // K-63c: Fetch fixtures and live data for current gameweek (need live data for BPS)
    let currentGWFixtures: any[] = [];
    if (currentGW > 0) {
      try {
        const [fixturesResponse, liveResponse] = await Promise.all([
          fetch(
            `https://fantasy.premierleague.com/api/fixtures/?event=${currentGW}`,
            { cache: 'no-store' }
          ),
          fetch(
            `https://fantasy.premierleague.com/api/event/${currentGW}/live/`,
            { cache: 'no-store' }
          )
        ]);

        if (fixturesResponse.ok) {
          const fplFixtures = await fixturesResponse.json();
          const liveData = liveResponse.ok ? await liveResponse.json() : null;

          // Build fixtures with player_stats (like Rivals does)
          currentGWFixtures = fplFixtures.map((fixture: any) => {
            const playerStats = liveData?.elements
              ?.filter((el: any) => {
                const explain = el.explain || [];
                return explain.some((exp: any) => exp.fixture === fixture.id);
              })
              .map((el: any) => ({
                id: el.id,
                bps: el.stats.bps || 0,
                bonus: el.stats.bonus || 0,
              })) || [];

            return {
              id: fixture.id,
              team_h: fixture.team_h,
              team_a: fixture.team_a,
              started: fixture.started ?? false,
              finished: fixture.finished ?? false,
              player_stats: playerStats,  // Now includes BPS data
            };
          });
        }
      } catch (error) {
        console.error('[Player Detail] Error fetching current GW fixtures:', error);
      }
    }

    // Fetch past seasons, fixtures, and full history from FPL API (server-side to avoid CORS)
    let pastSeasons = [];
    let fixtures = [];
    let fplHistory = [];
    try {
      // K-63b-fix: Add cache busting to internal fetch for live BPS updates
      const fplResponse = await fetch(
        `https://fantasy.premierleague.com/api/element-summary/${playerId}/?t=${Date.now()}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          cache: 'no-store'
        }
      );
      if (fplResponse.ok) {
        const fplData = await fplResponse.json();
        pastSeasons = fplData.history_past || [];
        fixtures = fplData.fixtures || [];
        fplHistory = fplData.history || [];
      }
    } catch (error) {
      console.error('[Player Detail] Error fetching FPL data:', error);
      // Continue without FPL data
    }

    // K-63c: Calculate provisional bonus for current gameweek
    let provisionalBonus = 0;
    let isLive = false;

    if (currentGW > 0 && currentGWFixtures.length > 0) {
      // K-63e Fix #3: Find player's fixture directly by team (don't rely on explain data)
      const playerFixture = currentGWFixtures.find((f: any) =>
        (f.team_h === player.team || f.team_a === player.team) &&
        f.started &&
        !f.finished
      );

      if (playerFixture && playerFixture.player_stats && playerFixture.player_stats.length > 0) {
        isLive = true;

        // Calculate provisional bonus from BPS ranking
        const playerStats = playerFixture.player_stats;
        const playerData = playerStats.find((p: any) => p.id === playerId);

        if (playerData) {
          // Sort players by BPS (descending)
          const sortedByBPS = [...playerStats].sort((a: any, b: any) => b.bps - a.bps);
          const rank = sortedByBPS.findIndex((p: any) => p.id === playerId);

          // Assign provisional bonus: top 3 get 3, 2, 1
          if (rank === 0) provisionalBonus = 3;
          else if (rank === 1) provisionalBonus = 2;
          else if (rank === 2) provisionalBonus = 1;
        }
      }
    }

    return NextResponse.json({
      player: {
        ...player,
        price: `£${(player.now_cost / 10).toFixed(1)}m`
      },
      history: fplHistory.length > 0 ? fplHistory.map((h: any) => ({
        ...h,
        gameweek: h.round  // Map round to gameweek for consistency
      })) : history.map((h: any) => ({
        ...h,
        result: getResult(h)
      })),
      pastSeasons,
      fixtures,
      totals: {
        points: player.total_points,
        minutes: player.minutes,
        goals_scored: player.goals_scored,
        assists: player.assists,
        clean_sheets: player.clean_sheets,
        goals_conceded: player.goals_conceded,
        expected_goals: parseFloat(player.expected_goals),
        expected_assists: parseFloat(player.expected_assists),
        expected_goal_involvements: parseFloat(player.expected_goal_involvements),
        bonus: player.bonus,
        bps: player.bps
      },
      per90,
      provisionalBonus,  // K-63c: Provisional bonus for live games
      isLive             // K-63c: Whether game is currently live
    });

  } catch (error) {
    console.error('Error fetching player detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player detail' },
      { status: 500 }
    );
  }
}
