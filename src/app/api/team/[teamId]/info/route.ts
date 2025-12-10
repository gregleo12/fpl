import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;

    // Fetch entry info
    const entryResponse = await fetch(
      `https://fantasy.premierleague.com/api/entry/${teamId}/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    );

    if (!entryResponse.ok) {
      throw new Error(`Failed to fetch entry info: ${entryResponse.status}`);
    }

    const entryData = await entryResponse.json();

    return NextResponse.json({
      overallPoints: entryData.summary_overall_points || 0,
      overallRank: entryData.summary_overall_rank || 0,
      teamValue: entryData.last_deadline_value || 0,
      bank: entryData.last_deadline_bank || 0
    });
  } catch (error: any) {
    console.error('Error fetching team info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team info' },
      { status: 500 }
    );
  }
}
