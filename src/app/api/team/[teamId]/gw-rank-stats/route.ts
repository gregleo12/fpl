import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;

    // Fetch entry history from FPL API
    const [entryResponse, historyResponse, bootstrapResponse] = await Promise.all([
      fetch(
        `https://fantasy.premierleague.com/api/entry/${teamId}/`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        }
      ),
      fetch(
        `https://fantasy.premierleague.com/api/entry/${teamId}/history/`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        }
      ),
      fetch(
        'https://fantasy.premierleague.com/api/bootstrap-static/',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          next: { revalidate: 300 }
        }
      )
    ]);

    if (!entryResponse.ok || !historyResponse.ok || !bootstrapResponse.ok) {
      throw new Error('Failed to fetch data from FPL API');
    }

    const entryData = await entryResponse.json();
    const historyData = await historyResponse.json();
    const bootstrapData = await bootstrapResponse.json();

    // Get current GW and total players
    const currentGW = entryData.current_event || 1;
    const totalPlayers = bootstrapData.total_players || 1;

    // Get all GW history
    const gwHistory = historyData.current || [];

    if (gwHistory.length === 0) {
      return NextResponse.json({
        currentRank: 0,
        topPercent: 0,
        bestRank: { rank: 0, gw: 0 },
        worstRank: { rank: 0, gw: 0 },
        averageRank: 0,
        topMillionCount: { count: 0, total: 0 }
      });
    }

    // Find current GW entry
    const currentGWEntry = gwHistory.find((h: any) => h.event === currentGW);
    const currentRank = currentGWEntry?.overall_rank || entryData.summary_overall_rank || 0;

    // Calculate top %
    const topPercent = (currentRank / totalPlayers) * 100;

    // K-167: Include current live GW rank in calculations
    // FPL history endpoint only has completed GWs, need to add live GW manually
    const allRanks = [...gwHistory];

    // If current GW rank exists but isn't in history yet (live GW), add it
    if (currentRank > 0 && !currentGWEntry) {
      allRanks.push({
        event: currentGW,
        overall_rank: currentRank
      });
    }

    // Find best (lowest) and worst (highest) GW ranks
    let bestRank = { rank: Infinity, gw: 0 };
    let worstRank = { rank: 0, gw: 0 };
    let totalRank = 0;
    let topMillionCount = 0;

    allRanks.forEach((h: any) => {
      const rank = h.overall_rank;
      const gw = h.event;

      // Best rank (lowest number)
      if (rank < bestRank.rank) {
        bestRank = { rank, gw };
      }

      // Worst rank (highest number)
      if (rank > worstRank.rank) {
        worstRank = { rank, gw };
      }

      // Sum for average
      totalRank += rank;

      // Count GWs in top 1M
      if (rank < 1000000) {
        topMillionCount++;
      }
    });

    // Calculate average rank
    const averageRank = Math.round(totalRank / allRanks.length);

    return NextResponse.json({
      currentRank: currentRank,
      topPercent: topPercent,
      bestRank: bestRank,
      worstRank: worstRank,
      averageRank: averageRank,
      topMillionCount: {
        count: topMillionCount,
        total: allRanks.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching GW rank stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GW rank stats' },
      { status: 500 }
    );
  }
}
