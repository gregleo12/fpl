import { NextRequest, NextResponse } from 'next/server';
import { calculateManagerLiveScore } from '@/lib/scoreCalculator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string; gw: string } }
) {
  try {
    const { teamId, gw } = params;
    const entryId = parseInt(teamId);
    const gameweek = parseInt(gw);

    if (isNaN(entryId) || isNaN(gameweek)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Determine gameweek status
    let status: 'upcoming' | 'in_progress' | 'completed' = 'in_progress';
    try {
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const currentEvent = bootstrapData.events.find((e: any) => e.id === gameweek);
        if (currentEvent) {
          if (currentEvent.finished) {
            status = 'completed';
          } else if (!currentEvent.is_current && !currentEvent.data_checked) {
            status = 'upcoming';
          }
        }
      }
    } catch (error) {
      console.error('Error determining gameweek status:', error);
    }

    // Use shared score calculator - SINGLE SOURCE OF TRUTH
    const scoreResult = await calculateManagerLiveScore(entryId, gameweek, status);

    // Fetch bootstrap data for team info and entry info for overall stats
    const [bootstrapResponse, entryResponse] = await Promise.all([
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        next: { revalidate: 300 }
      }),
      fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })
    ]);

    const bootstrapData = bootstrapResponse.ok ? await bootstrapResponse.json() : null;
    const entryData = entryResponse.ok ? await entryResponse.json() : null;

    // Create element lookup for team info
    const elementLookup: { [key: number]: any } = {};
    if (bootstrapData) {
      bootstrapData.elements.forEach((el: any) => {
        elementLookup[el.id] = el;
      });
    }

    // Transform squad data to match frontend expectations
    const allPlayers = [...scoreResult.squad.starting11, ...scoreResult.squad.bench];
    const playerLookup: { [key: number]: any } = {};

    allPlayers.forEach(player => {
      const element = elementLookup[player.id];
      const positionMap: { [key: string]: number } = { GK: 1, DEF: 2, MID: 3, FWD: 4 };

      playerLookup[player.id] = {
        id: player.id,
        web_name: player.name,
        team: element?.team || 0,
        team_code: element?.team_code || 0,
        element_type: positionMap[player.position] || 0,
        event_points: player.points,
        bps: player.bps || 0,
        bonus: player.bonus || 0,
        minutes: player.minutes || 0,
        multiplier: player.multiplier
      };
    });

    // Transform picks to match original format - CORRECTLY assign positions
    // Starting 11 gets positions 1-11, bench gets positions 12-15
    const starting11Picks = scoreResult.squad.starting11.map((player, index) => ({
      element: player.id,
      position: index + 1, // Positions 1-11
      multiplier: player.multiplier,
      is_captain: player.multiplier === 2,
      is_vice_captain: false // Would need to be extracted from original picks if needed
    }));

    const benchPicks = scoreResult.squad.bench.map((player, index) => ({
      element: player.id,
      position: index + 12, // Positions 12-15
      multiplier: player.multiplier,
      is_captain: false, // Bench players can't be captain
      is_vice_captain: false
    }));

    const picks = [...starting11Picks, ...benchPicks];

    // Return enriched data with live stats, autosubs, and provisional bonus
    return NextResponse.json({
      picks,
      playerData: playerLookup,
      gwPoints: scoreResult.score,
      breakdown: scoreResult.breakdown,
      autoSubs: scoreResult.autoSubs,
      chip: scoreResult.chip,
      captain: scoreResult.captain,
      transfers: {
        count: 0, // Would need original picks data
        cost: scoreResult.breakdown.transferCost
      },
      overallPoints: entryData?.summary_overall_points || 0,
      overallRank: entryData?.summary_overall_rank || 0
    });
  } catch (error: any) {
    console.error('Error fetching gameweek data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gameweek data' },
      { status: 500 }
    );
  }
}
