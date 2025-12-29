import { NextRequest, NextResponse } from 'next/server';
import { checkForMissingGWs, syncMissingGWs } from '@/lib/leagueSync';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const leagueId = parseInt(params.id);

  if (isNaN(leagueId)) {
    return NextResponse.json({ success: false, error: 'Invalid league ID' }, { status: 400 });
  }

  try {

    // Check for missing GWs
    const missingGWs = await checkForMissingGWs(leagueId);

    if (missingGWs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Already up to date',
        synced: []
      });
    }


    // Sync missing GWs
    const result = await syncMissingGWs(leagueId, missingGWs);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Synced ${result.synced.length} gameweek(s)`,
        synced: result.synced
      });
    } else {
      return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
    }

  } catch (error) {
    console.error(`[Quick Sync API] Error:`, error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
