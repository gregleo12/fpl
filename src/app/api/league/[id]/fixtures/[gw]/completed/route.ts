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

    // Fetch picks for both entries and bootstrap data in parallel
    const [picks1Response, picks2Response, bootstrapResponse] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/entry/${entryId1}/event/${gw}/picks/`),
      fetch(`https://fantasy.premierleague.com/api/entry/${entryId2}/event/${gw}/picks/`),
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
    ]);

    if (!picks1Response.ok || !picks2Response.ok || !bootstrapResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch data from FPL' },
        { status: 500 }
      );
    }

    const [picks1Data, picks2Data, bootstrapData] = await Promise.all([
      picks1Response.json(),
      picks2Response.json(),
      bootstrapResponse.json(),
    ]);

    return NextResponse.json({
      picks1: picks1Data,
      picks2: picks2Data,
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
