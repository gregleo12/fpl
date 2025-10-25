import { LiveMatchData } from '@/types/liveMatch';

export async function getLiveMatchData(
  entryId1: number,
  entryId2: number,
  gameweek: number,
  manager1: string,
  team1: string,
  manager2: string,
  team2: string,
  leagueId: string
): Promise<LiveMatchData> {
  try {
    // Call our backend API to fetch FPL data (avoids CORS issues)
    const response = await fetch(
      `/api/league/${leagueId}/fixtures/${gameweek}/live?entry1=${entryId1}&entry2=${entryId2}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch live data from backend');
    }

    const data = await response.json();
    const picks1Data = data.picks1;
    const picks2Data = data.picks2;
    const liveData = data.live;
    const bootstrapData = data.bootstrap;

    // Calculate live stats for both teams
    const player1Data = calculateLiveStats(picks1Data, liveData, bootstrapData, entryId1, manager1, team1);
    const player2Data = calculateLiveStats(picks2Data, liveData, bootstrapData, entryId2, manager2, team2);

    return {
      gameweek,
      player1: player1Data,
      player2: player2Data,
    };
  } catch (error) {
    console.error('Error fetching live match data:', error);
    throw error;
  }
}

function calculateLiveStats(
  picksData: any,
  liveData: any,
  bootstrapData: any,
  entryId: number,
  manager: string,
  team: string
) {
  const picks = picksData.picks;

  console.log('Calculating stats for:', manager);
  console.log('Active chip:', picksData.active_chip);

  // Use official score from FPL (includes auto-subs)
  const currentScore = picksData.entry_history?.points || 0;
  console.log(`Official score for ${manager}: ${currentScore}`);

  // Find captain
  const captainPick = picks.find((p: any) => p.is_captain);
  const captainElement = bootstrapData.elements.find((e: any) => e.id === captainPick?.element);
  const captainLive = liveData.elements[captainPick?.element];

  // Captain points calculation
  let captainMultiplier = 2; // Standard captain
  if (picksData.active_chip === '3xc') {
    captainMultiplier = 3; // Triple captain
  }
  const rawCaptainPoints = captainLive?.stats?.total_points || 0;
  const captainPoints = rawCaptainPoints * captainMultiplier;

  console.log(`Captain: ${captainElement?.web_name}, Raw points: ${rawCaptainPoints}, Multiplier: ${captainMultiplier}, Total: ${captainPoints}`);

  // Calculate stats (players played, bench points, etc.)
  let playersPlayed = 0;
  let playersRemaining = 0;
  let benchPoints = 0;

  picks.forEach((pick: any) => {
    const liveElement = liveData.elements[pick.element];
    const bootstrapElement = bootstrapData.elements.find((e: any) => e.id === pick.element);
    const rawPoints = liveElement?.stats?.total_points || 0;

    if (pick.position <= 11) {
      // Starting 11
      console.log(`${bootstrapElement?.web_name} (Pos ${pick.position}): ${rawPoints} pts`);

      // Check if player has played or fixture is finished
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      if (hasPlayed || fixtureFinished) {
        playersPlayed++;
      } else {
        playersRemaining++;
      }
    } else {
      // Bench (positions 12-15)
      benchPoints += rawPoints;
      console.log(`BENCH ${bootstrapElement?.web_name}: ${rawPoints} pts`);
    }
  });

  console.log(`Players: ${playersPlayed} played, ${playersRemaining} remaining`);

  return {
    entryId,
    manager,
    team,
    currentScore,
    playersPlayed,
    playersRemaining,
    captain: {
      name: captainElement?.web_name || 'Unknown',
      points: captainPoints,
      isPlaying: captainLive?.stats?.minutes > 0,
    },
    chipActive: picksData.active_chip,
    benchPoints,
  };
}
