import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; gw: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId1 = searchParams.get('entry1');
    const entryId2 = searchParams.get('entry2');
    const gw = params.gw;

    if (!entryId1 || !entryId2) {
      return NextResponse.json(
        { error: 'Missing entry IDs' },
        { status: 400 }
      );
    }

    // Fetch picks, live data, and bootstrap data in parallel
    const [picks1Response, picks2Response, liveResponse, bootstrapResponse] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/entry/${entryId1}/event/${gw}/picks/`),
      fetch(`https://fantasy.premierleague.com/api/entry/${entryId2}/event/${gw}/picks/`),
      fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`),
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
    ]);

    if (!picks1Response.ok || !picks2Response.ok || !liveResponse.ok || !bootstrapResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch data from FPL' },
        { status: 500 }
      );
    }

    const [picks1Data, picks2Data, liveData, bootstrapData] = await Promise.all([
      picks1Response.json(),
      picks2Response.json(),
      liveResponse.json(),
      bootstrapResponse.json(),
    ]);

    return NextResponse.json({
      picks1: picks1Data,
      picks2: picks2Data,
      live: liveData,
      bootstrap: bootstrapData,
    });
  } catch (error: any) {
    console.error('Error fetching completed match data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch completed match data' },
      { status: 500 }
    );
  }
}
