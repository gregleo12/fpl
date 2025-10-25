import { CompletedMatchData } from '@/types/completedMatch';

export async function getCompletedMatchData(
  entryId1: number,
  entryId2: number,
  gameweek: number,
  manager1: string,
  team1: string,
  manager2: string,
  team2: string,
  leagueId: string
): Promise<CompletedMatchData> {
  try {
    // Call our backend API to fetch FPL data (avoids CORS issues)
    const response = await fetch(
      `/api/league/${leagueId}/fixtures/${gameweek}/completed?entry1=${entryId1}&entry2=${entryId2}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch completed match data from backend');
    }

    const data = await response.json();
    const picks1Data = data.picks1;
    const picks2Data = data.picks2;
    const liveData = data.live;
    const bootstrapData = data.bootstrap;

    // Calculate stats for both teams
    const player1Data = calculateCompletedStats(picks1Data, liveData, bootstrapData, entryId1, manager1, team1);
    const player2Data = calculateCompletedStats(picks2Data, liveData, bootstrapData, entryId2, manager2, team2);

    // Determine winner
    let winner: 'player1' | 'player2' | 'draw';
    if (player1Data.finalScore > player2Data.finalScore) {
      winner = 'player1';
    } else if (player2Data.finalScore > player1Data.finalScore) {
      winner = 'player2';
    } else {
      winner = 'draw';
    }

    const margin = Math.abs(player1Data.finalScore - player2Data.finalScore);

    return {
      gameweek,
      player1: player1Data,
      player2: player2Data,
      winner,
      margin,
    };
  } catch (error) {
    console.error('Error fetching completed match data:', error);
    throw error;
  }
}

function calculateCompletedStats(
  picksData: any,
  liveData: any,
  bootstrapData: any,
  entryId: number,
  manager: string,
  team: string
) {
  const picks = picksData.picks;
  const entryHistory = picksData.entry_history;

  // Use FPL's official score (includes auto-subs)
  const finalScore = entryHistory.points;

  console.log(`Final score for ${manager}: ${finalScore}`);

  // Find captain
  const captainPick = picks.find((p: any) => p.is_captain);
  const captainElement = bootstrapData.elements.find((e: any) => e.id === captainPick?.element);
  const captainLive = liveData.elements[captainPick?.element];

  // Get captain points from live data
  const captainMultiplier = picksData.active_chip === '3xc' ? 3 : 2;
  const captainBasePoints = captainLive?.stats?.total_points || 0;
  const captainPoints = captainBasePoints * captainMultiplier;

  // Get top performers (top 3 by points) - only from starting 11
  const performers = picks
    .filter((p: any) => p.position <= 11) // Starting 11 only
    .map((p: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === p.element);
      const liveElement = liveData.elements[p.element];
      const basePoints = liveElement?.stats?.total_points || 0;
      let multiplier = 1;
      if (p.is_captain) {
        multiplier = picksData.active_chip === '3xc' ? 3 : 2;
      }
      const points = basePoints * multiplier;

      return {
        name: element?.web_name || 'Unknown',
        points: points,
        isCaptain: p.is_captain,
      };
    })
    .sort((a: any, b: any) => b.points - a.points)
    .slice(0, 3);

  // Calculate bench points
  const benchPoints = picks
    .filter((p: any) => p.position > 11) // Bench (positions 12-15)
    .reduce((sum: number, p: any) => {
      const liveElement = liveData.elements[p.element];
      return sum + (liveElement?.stats?.total_points || 0);
    }, 0);

  console.log(`Bench points for ${manager}: ${benchPoints}`);

  return {
    entryId,
    manager,
    team,
    finalScore,
    captain: {
      name: captainElement?.web_name || 'Unknown',
      points: captainPoints,
    },
    topPerformers: performers,
    benchPoints,
    transferCost: entryHistory.event_transfers_cost || 0,
    chipUsed: picksData.active_chip || null,
  };
}
