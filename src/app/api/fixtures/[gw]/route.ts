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

    // Fetch fixtures for this gameweek
    const fixturesResponse = await fetch(
      `https://fantasy.premierleague.com/api/fixtures/?event=${gw}`
    );

    if (!fixturesResponse.ok) {
      throw new Error('Failed to fetch fixtures from FPL API');
    }

    const fixtures = await fixturesResponse.json();

    // Fetch bootstrap-static for team names and details
    const bootstrapResponse = await fetch(
      'https://fantasy.premierleague.com/api/bootstrap-static/'
    );

    if (!bootstrapResponse.ok) {
      throw new Error('Failed to fetch bootstrap data from FPL API');
    }

    const bootstrapData = await bootstrapResponse.json();

    // Create team lookup map
    const teamsMap = new Map<number, any>();
    bootstrapData.teams.forEach((team: any) => {
      teamsMap.set(team.id, team);
    });

    // Process fixtures
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
          score: fixture.team_h_score,
        },
        away_team: {
          id: fixture.team_a,
          name: awayTeam?.name || 'Unknown',
          short_name: awayTeam?.short_name || 'UNK',
          score: fixture.team_a_score,
        },
        status,
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
