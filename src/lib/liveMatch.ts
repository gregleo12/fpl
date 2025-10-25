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

    // Calculate differentials
    const { player1Differentials, player2Differentials } = calculateDifferentials(
      picks1Data,
      picks2Data,
      liveData,
      bootstrapData
    );

    return {
      gameweek,
      player1: { ...player1Data, differentials: player1Differentials },
      player2: { ...player2Data, differentials: player2Differentials },
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
  const isBenchBoost = picksData.active_chip === 'bboost';
  const totalPlayers = isBenchBoost ? 15 : 11;
  let playersPlayed = 0;
  let playersRemaining = 0;
  let benchPoints = 0;

  picks.forEach((pick: any) => {
    const liveElement = liveData.elements[pick.element];
    const bootstrapElement = bootstrapData.elements.find((e: any) => e.id === pick.element);
    const rawPoints = liveElement?.stats?.total_points || 0;

    // Check if player has played or fixture is finished
    const hasPlayed = liveElement?.stats?.minutes > 0;
    const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

    if (pick.position <= 11) {
      // Starting 11
      console.log(`${bootstrapElement?.web_name} (Pos ${pick.position}): ${rawPoints} pts`);

      if (hasPlayed || fixtureFinished) {
        playersPlayed++;
      } else {
        playersRemaining++;
      }
    } else {
      // Bench (positions 12-15)
      benchPoints += rawPoints;
      console.log(`BENCH ${bootstrapElement?.web_name}: ${rawPoints} pts`);

      // If Bench Boost is active, count bench players towards total
      if (isBenchBoost) {
        if (hasPlayed || fixtureFinished) {
          playersPlayed++;
        } else {
          playersRemaining++;
        }
      }
    }
  });

  console.log(`Players: ${playersPlayed} played, ${playersRemaining} remaining (total: ${totalPlayers})`);

  // Get transfer cost (hits)
  const transferCost = picksData.entry_history?.event_transfers_cost || 0;
  console.log(`Transfer cost: ${transferCost}`);

  return {
    entryId,
    manager,
    team,
    currentScore,
    playersPlayed,
    playersRemaining,
    totalPlayers,
    captain: {
      name: captainElement?.web_name || 'Unknown',
      points: captainPoints,
      isPlaying: captainLive?.stats?.minutes > 0,
    },
    chipActive: picksData.active_chip,
    benchPoints,
    transferCost,
  };
}

function calculateDifferentials(
  picks1Data: any,
  picks2Data: any,
  liveData: any,
  bootstrapData: any
) {
  const picks1 = picks1Data.picks;
  const picks2 = picks2Data.picks;

  // Get element IDs for both teams
  const team1ElementIds = new Set(picks1.map((p: any) => p.element));
  const team2ElementIds = new Set(picks2.map((p: any) => p.element));

  // Find differentials for player 1 (players team1 has but team2 doesn't)
  const player1Differentials = picks1
    .filter((pick: any) => !team2ElementIds.has(pick.element))
    .map((pick: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === pick.element);
      const liveElement = liveData.elements[pick.element];
      const points = liveElement?.stats?.total_points || 0;

      // Apply captain multiplier if this is the captain
      let finalPoints = points;
      if (pick.is_captain) {
        const multiplier = picks1Data.active_chip === '3xc' ? 3 : 2;
        finalPoints = points * multiplier;
      }

      return {
        name: element?.web_name || 'Unknown',
        points: finalPoints,
        position: pick.position,
        isCaptain: pick.is_captain,
      };
    })
    // Sort by points descending
    .sort((a: any, b: any) => b.points - a.points);

  // Find differentials for player 2 (players team2 has but team1 doesn't)
  const player2Differentials = picks2
    .filter((pick: any) => !team1ElementIds.has(pick.element))
    .map((pick: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === pick.element);
      const liveElement = liveData.elements[pick.element];
      const points = liveElement?.stats?.total_points || 0;

      // Apply captain multiplier if this is the captain
      let finalPoints = points;
      if (pick.is_captain) {
        const multiplier = picks2Data.active_chip === '3xc' ? 3 : 2;
        finalPoints = points * multiplier;
      }

      return {
        name: element?.web_name || 'Unknown',
        points: finalPoints,
        position: pick.position,
        isCaptain: pick.is_captain,
      };
    })
    // Sort by points descending
    .sort((a: any, b: any) => b.points - a.points);

  return {
    player1Differentials,
    player2Differentials,
  };
}
