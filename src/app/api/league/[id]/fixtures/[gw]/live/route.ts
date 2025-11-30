import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; gw: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const gw = parseInt(params.gw);
    const { searchParams } = new URL(request.url);
    const entryId1 = searchParams.get('entry1');
    const entryId2 = searchParams.get('entry2');

    if (!entryId1 || !entryId2) {
      return NextResponse.json(
        { error: 'Missing entry IDs' },
        { status: 400 }
      );
    }

    // Fetch data from FPL API in parallel (including fixtures for auto-sub timing and provisional bonus)
    const [picks1Response, picks2Response, liveResponse, bootstrapResponse, fixturesResponse] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/entry/${entryId1}/event/${gw}/picks/`),
      fetch(`https://fantasy.premierleague.com/api/entry/${entryId2}/event/${gw}/picks/`),
      fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`),
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
      fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`),
    ]);

    if (!picks1Response.ok || !picks2Response.ok || !liveResponse.ok || !bootstrapResponse.ok) {
      throw new Error('Failed to fetch FPL data');
    }

    const [picks1Data, picks2Data, liveData, bootstrapData] = await Promise.all([
      picks1Response.json(),
      picks2Response.json(),
      liveResponse.json(),
      bootstrapResponse.json(),
    ]);

    // Process fixtures data to include status (for auto-sub timing and provisional bonus)
    let fixturesData: any[] = [];
    if (fixturesResponse.ok) {
      const fplFixtures = await fixturesResponse.json();

      // Map fixtures to include started/finished status and player stats with BPS
      fixturesData = fplFixtures.map((fixture: any) => {
        // Get all players who played in this fixture from liveData
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
          started: fixture.started ?? false,
          finished: fixture.finished ?? fixture.finished_provisional ?? false,
          player_stats: playerStats,
        };
      });

      console.log(`[Live Modal] Processed ${fixturesData.length} fixtures with status and BPS data`);
    }

    return NextResponse.json({
      picks1: picks1Data,
      picks2: picks2Data,
      live: liveData,
      bootstrap: bootstrapData,
      fixtures: fixturesData,
    });
  } catch (error: any) {
    console.error('Error fetching live match data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch live match data' },
      { status: 500 }
    );
  }
}
