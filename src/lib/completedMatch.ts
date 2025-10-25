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

  // Find captain
  const captainPick = picks.find((p: any) => p.is_captain);
  const captainElement = bootstrapData.elements.find((e: any) => e.id === captainPick?.element);

  // For completed matches, captain points are already included in the final score
  // We just need to show the captain name
  const captainName = captainElement?.web_name || 'Unknown';

  return {
    entryId,
    manager,
    team,
    finalScore,
    captain: captainName,
    transferCost: entryHistory.event_transfers_cost || 0,
    chipUsed: picksData.active_chip || null,
  };
}
