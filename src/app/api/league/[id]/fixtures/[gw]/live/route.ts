import { NextRequest, NextResponse } from 'next/server';
import { calculateScoreFromData } from '@/lib/scoreCalculator';

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
          // Use finished_provisional for live auto-subs (triggers when match ends, not when GW ends)
          finished: fixture.finished_provisional ?? fixture.finished ?? false,
          player_stats: playerStats,
        };
      });

      console.log(`[Live Modal] Processed ${fixturesData.length} fixtures with status and BPS data`);
    }

    // Calculate scores using shared calculator for consistency
    // K-164: Use 'live' status for consistency with new GW status logic
    const score1 = calculateScoreFromData(
      parseInt(entryId1),
      picks1Data,
      liveData,
      bootstrapData,
      fixturesData,
      'live'
    );

    const score2 = calculateScoreFromData(
      parseInt(entryId2),
      picks2Data,
      liveData,
      bootstrapData,
      fixturesData,
      'live'
    );

    return NextResponse.json({
      picks1: picks1Data,
      picks2: picks2Data,
      live: liveData,
      bootstrap: bootstrapData,
      fixtures: fixturesData,
      // NEW: Pre-calculated scores from single source of truth
      calculatedScores: {
        entry1: {
          score: score1.score,
          breakdown: score1.breakdown,
          captain: score1.captain,
          chip: score1.chip,
          autoSubs: score1.autoSubs,
        },
        entry2: {
          score: score2.score,
          breakdown: score2.breakdown,
          captain: score2.captain,
          chip: score2.chip,
          autoSubs: score2.autoSubs,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching live match data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch live match data' },
      { status: 500 }
    );
  }
}
