import { NextResponse } from 'next/server';
import { syncPlayers } from '@/lib/sync/playerSync';

export async function POST() {
  try {
    console.log('[Admin] Starting player sync...');

    const result = await syncPlayers();

    console.log('[Admin] Player sync completed:', {
      playersUpdated: result.playersUpdated,
      errors: result.errors.length
    });

    return NextResponse.json({
      success: result.errors.length === 0,
      playersUpdated: result.playersUpdated,
      gameweekStatsUpdated: result.gameweekStatsUpdated,
      errors: result.errors
    });

  } catch (error) {
    console.error('[Admin] Player sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      },
      { status: 500 }
    );
  }
}
