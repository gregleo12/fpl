import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for fresh fixture data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { gw: string } }
) {
  try {
    const gw = parseInt(params.gw);

    if (isNaN(gw)) {
      return NextResponse.json({ error: 'Invalid gameweek' }, { status: 400 });
    }

    // Fetch fixtures for this gameweek and live player data in parallel
    const [fixturesResponse, bootstrapResponse, liveResponse] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`),
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
      fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`)
    ]);

    if (!fixturesResponse.ok) {
      throw new Error('Failed to fetch fixtures from FPL API');
    }

    if (!bootstrapResponse.ok) {
      throw new Error('Failed to fetch bootstrap data from FPL API');
    }

    const fixtures = await fixturesResponse.json();
    const bootstrapData = await bootstrapResponse.json();

    // Live data might not be available for upcoming gameweeks
    let liveData = null;
    if (liveResponse.ok) {
      liveData = await liveResponse.json();
    }

    // Create team lookup map
    const teamsMap = new Map<number, any>();
    bootstrapData.teams.forEach((team: any) => {
      teamsMap.set(team.id, team);
    });

    // Create player lookup map
    const playersMap = new Map<number, any>();
    bootstrapData.elements.forEach((player: any) => {
      playersMap.set(player.id, player);
    });

    // Process fixtures with player stats
    const processedFixtures = fixtures.map((fixture: any) => {
      const homeTeam = teamsMap.get(fixture.team_h);
      const awayTeam = teamsMap.get(fixture.team_a);

      // Determine match status
      let status: 'finished' | 'live' | 'not_started' = 'not_started';
      if (fixture.finished) {
        status = 'finished';
      } else if (fixture.started && !fixture.finished) {
        status = 'live';
      }

      // Get player stats for this fixture (if live data available)
      let playerStats = null;
      if (liveData && fixture.started) {
        // Filter players who played in this fixture
        const fixturePlayers = liveData.elements
          .filter((el: any) => {
            const explain = el.explain || [];
            return explain.some((exp: any) => exp.fixture === fixture.id);
          })
          .map((el: any) => {
            const player = playersMap.get(el.id);
            const fixtureExplain = el.explain.find((exp: any) => exp.fixture === fixture.id);
            const stats = fixtureExplain?.stats || [];

            return {
              id: el.id,
              name: player?.web_name || 'Unknown',
              team_id: player?.team || 0,
              bps: el.stats.bps || 0,
              bonus: el.stats.bonus || 0,
              goals_scored: stats.find((s: any) => s.identifier === 'goals_scored')?.value || 0,
              assists: stats.find((s: any) => s.identifier === 'assists')?.value || 0,
              yellow_cards: stats.find((s: any) => s.identifier === 'yellow_cards')?.value || 0,
              red_cards: stats.find((s: any) => s.identifier === 'red_cards')?.value || 0,
              saves: stats.find((s: any) => s.identifier === 'saves')?.value || 0,
              minutes: el.stats.minutes || 0,
              clean_sheets: stats.find((s: any) => s.identifier === 'clean_sheets')?.value || 0,
              goals_conceded: stats.find((s: any) => s.identifier === 'goals_conceded')?.value || 0,
              own_goals: stats.find((s: any) => s.identifier === 'own_goals')?.value || 0,
              penalties_saved: stats.find((s: any) => s.identifier === 'penalties_saved')?.value || 0,
              penalties_missed: stats.find((s: any) => s.identifier === 'penalties_missed')?.value || 0,
            };
          })
          .sort((a: any, b: any) => b.bps - a.bps); // Sort by BPS desc

        playerStats = fixturePlayers;
      }

      return {
        id: fixture.id,
        kickoff_time: fixture.kickoff_time,
        event: fixture.event,
        started: fixture.started,
        finished: fixture.finished,
        minutes: fixture.minutes,
        home_team: {
          id: fixture.team_h,
          name: homeTeam?.name || 'Unknown',
          short_name: homeTeam?.short_name || 'UNK',
          code: homeTeam?.code || 0,
          score: fixture.team_h_score,
        },
        away_team: {
          id: fixture.team_a,
          name: awayTeam?.name || 'Unknown',
          short_name: awayTeam?.short_name || 'UNK',
          code: awayTeam?.code || 0,
          score: fixture.team_a_score,
        },
        status,
        player_stats: playerStats,
      };
    });

    const response = NextResponse.json({
      event: gw,
      fixtures: processedFixtures,
    });

    // No caching for live fixtures
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('Error fetching fixtures:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fixtures' },
      { status: 500 }
    );
  }
}
