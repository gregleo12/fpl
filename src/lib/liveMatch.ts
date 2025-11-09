import { LiveMatchData } from '@/types/liveMatch';
import {
  Squad,
  Player,
  Position,
  applyAutoSubstitutions,
  calculateLivePoints,
  getPointsBreakdown
} from './fpl-calculations';

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

    // Calculate live stats for both teams (now returns auto-sub results too)
    const { stats: player1Data, autoSubResult: autoSubs1 } = calculateLiveStats(picks1Data, liveData, bootstrapData, entryId1, manager1, team1);
    const { stats: player2Data, autoSubResult: autoSubs2 } = calculateLiveStats(picks2Data, liveData, bootstrapData, entryId2, manager2, team2);

    // Calculate differentials (pass auto-sub results to mark substituted players)
    const { player1Differentials, player2Differentials } = calculateDifferentials(
      picks1Data,
      picks2Data,
      liveData,
      bootstrapData,
      autoSubs1,
      autoSubs2
    );

    // Calculate common players
    const commonPlayers = calculateCommonPlayers(
      picks1Data,
      picks2Data,
      liveData,
      bootstrapData
    );

    return {
      gameweek,
      player1: { ...player1Data, differentials: player1Differentials },
      player2: { ...player2Data, differentials: player2Differentials },
      commonPlayers,
    };
  } catch (error) {
    console.error('Error fetching live match data:', error);
    throw error;
  }
}

/**
 * Convert FPL element_type to Position
 */
function getPosition(elementType: number): Position {
  switch (elementType) {
    case 1: return 'GK';
    case 2: return 'DEF';
    case 3: return 'MID';
    case 4: return 'FWD';
    default: return 'MID';
  }
}

/**
 * Convert FPL picks data to Squad format for auto-substitutions
 */
function createSquadFromPicks(
  picksData: any,
  liveData: any,
  bootstrapData: any
): Squad {
  const picks = picksData.picks;
  const starting11: Player[] = [];
  const bench: Player[] = [];

  // Get captain multiplier
  const captainMultiplier = picksData.active_chip === '3xc' ? 3 : 2;

  picks.forEach((pick: any) => {
    const element = bootstrapData.elements.find((e: any) => e.id === pick.element);
    const liveElement = liveData.elements.find((e: any) => e.id === pick.element);

    if (!element) return;

    const player: Player = {
      id: pick.element,
      name: element.web_name,
      position: getPosition(element.element_type),
      minutes: liveElement?.stats?.minutes || 0,
      points: liveElement?.stats?.total_points || 0,
      multiplier: pick.is_captain ? captainMultiplier : 1,
    };

    if (pick.position <= 11) {
      starting11.push(player);
    } else if (pick.position <= 14) {
      // Bench positions 12-14 (15 is typically not used for auto-subs)
      bench.push(player);
    }
  });

  // Sort bench by position to maintain order (12, 13, 14 = 1st, 2nd, 3rd bench)
  bench.sort((a, b) => {
    const posA = picks.find((p: any) => p.element === a.id)?.position || 0;
    const posB = picks.find((p: any) => p.element === b.id)?.position || 0;
    return posA - posB;
  });

  return { starting11, bench };
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

  // Find captain
  const captainPick = picks.find((p: any) => p.is_captain);
  const captainElement = bootstrapData.elements.find((e: any) => e.id === captainPick?.element);
  const captainLive = liveData.elements.find((e: any) => e.id === captainPick?.element);

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
  let liveScore = 0; // Calculate live score from individual players

  // Apply auto-substitutions if Bench Boost is NOT active
  let autoSubResult = null;
  if (!isBenchBoost) {
    const squad = createSquadFromPicks(picksData, liveData, bootstrapData);
    autoSubResult = applyAutoSubstitutions(squad);

    if (autoSubResult.substitutions.length > 0) {
      console.log(`Auto-substitutions for ${manager}:`, autoSubResult.substitutions.map(s =>
        `${s.playerOut.name} (0 min) → ${s.playerIn.name} (+${s.playerIn.points} pts)`
      ));
    }
  }

  picks.forEach((pick: any) => {
    const liveElement = liveData.elements.find((e: any) => e.id === pick.element);
    const bootstrapElement = bootstrapData.elements.find((e: any) => e.id === pick.element);
    const rawPoints = liveElement?.stats?.total_points || 0;

    // Check if player has played or fixture is finished
    const hasPlayed = liveElement?.stats?.minutes > 0;
    const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

    if (pick.position <= 11) {
      // Starting 11
      console.log(`${bootstrapElement?.web_name} (Pos ${pick.position}): ${rawPoints} pts`);

      // Add to live score (with captain multiplier)
      if (pick.is_captain) {
        liveScore += rawPoints * captainMultiplier;
      } else {
        liveScore += rawPoints;
      }

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
        liveScore += rawPoints;

        if (hasPlayed || fixtureFinished) {
          playersPlayed++;
        } else {
          playersRemaining++;
        }
      }
    }
  });

  // Get transfer cost (hits)
  const transferCost = picksData.entry_history?.event_transfers_cost || 0;
  console.log(`Transfer cost from API: ${transferCost}`);

  // Use auto-substitution adjusted score if available
  let finalLiveScore = liveScore;
  if (autoSubResult && !isBenchBoost) {
    // Calculate score with auto-subs
    finalLiveScore = autoSubResult.squad.starting11.reduce((sum, player) => {
      return sum + (player.points * player.multiplier);
    }, 0);
    console.log(`Score with auto-subs: ${finalLiveScore} (gained ${autoSubResult.pointsGained} from ${autoSubResult.substitutions.length} substitutions)`);
  }

  // Calculate final live score (subtract hits - API returns positive values)
  const currentScore = finalLiveScore - Math.abs(transferCost);
  console.log(`Live calculated score for ${manager}: ${currentScore} (${finalLiveScore} from players - ${Math.abs(transferCost)} from hits)`);

  console.log(`Players: ${playersPlayed} played, ${playersRemaining} remaining (total: ${totalPlayers})`);

  return {
    stats: {
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
    },
    autoSubResult,
  };
}

function calculateDifferentials(
  picks1Data: any,
  picks2Data: any,
  liveData: any,
  bootstrapData: any,
  autoSubs1: any,
  autoSubs2: any
) {
  const picks1 = picks1Data.picks;
  const picks2 = picks2Data.picks;

  // Helper function to check if a player was auto-subbed in
  const wasSubbedIn = (playerId: number, autoSubs: any) => {
    if (!autoSubs || !autoSubs.substitutions) return false;
    return autoSubs.substitutions.some((sub: any) => sub.playerIn.id === playerId);
  };

  // Helper function to check if a player was auto-subbed out
  const wasSubbedOut = (playerId: number, autoSubs: any) => {
    if (!autoSubs || !autoSubs.substitutions) return false;
    return autoSubs.substitutions.some((sub: any) => sub.playerOut.id === playerId);
  };

  // Helper function to get replacement player name
  const getReplacementName = (playerId: number, autoSubs: any) => {
    if (!autoSubs || !autoSubs.substitutions) return undefined;
    const sub = autoSubs.substitutions.find((s: any) => s.playerOut.id === playerId);
    return sub ? sub.playerIn.name : undefined;
  };

  // Get element IDs for both teams
  const team1ElementIds = new Set(picks1.map((p: any) => p.element));
  const team2ElementIds = new Set(picks2.map((p: any) => p.element));

  // Check if Bench Boost is active for each team
  const isBenchBoost1 = picks1Data.active_chip === 'bboost';
  const isBenchBoost2 = picks2Data.active_chip === 'bboost';

  // Create maps for captain lookups
  const team1Captain = picks1.find((p: any) => p.is_captain)?.element;
  const team2Captain = picks2.find((p: any) => p.is_captain)?.element;

  // Find pure differentials for player 1 (players team1 has but team2 doesn't)
  const player1PureDifferentials = picks1
    .filter((pick: any) => {
      // Must be a differential
      if (team2ElementIds.has(pick.element)) return false;

      // If on bench (position > 11), only include if Bench Boost is active
      if (pick.position > 11 && !isBenchBoost1) return false;

      return true;
    })
    .map((pick: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === pick.element);
      const liveElement = liveData.elements.find((e: any) => e.id === pick.element);
      const basePoints = liveElement?.stats?.total_points || 0;

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // Apply captain multiplier if this is the captain
      let finalPoints = basePoints;
      if (pick.is_captain) {
        const multiplier = picks1Data.active_chip === '3xc' ? 3 : 2;
        finalPoints = basePoints * multiplier;
      }

      return {
        name: element?.web_name || 'Unknown',
        points: finalPoints,
        position: pick.position,
        isCaptain: pick.is_captain,
        hasPlayed: hasPlayed || fixtureFinished || false,
        wasAutoSubbedIn: wasSubbedIn(pick.element, autoSubs1),
        wasAutoSubbedOut: wasSubbedOut(pick.element, autoSubs1),
        replacedBy: getReplacementName(pick.element, autoSubs1),
      };
    });

  // Find captain differentials for player 1 (both have player, but only player1 captained it)
  const player1CaptainDifferentials = picks1
    .filter((pick: any) => {
      // Must be captained by player1
      if (!pick.is_captain) return false;

      // Must also be in team2's squad
      if (!team2ElementIds.has(pick.element)) return false;

      // Must NOT be team2's captain (that would not be a differential)
      if (pick.element === team2Captain) return false;

      // If on bench for team1 (position > 11), only include if Bench Boost is active
      if (pick.position > 11 && !isBenchBoost1) return false;

      return true;
    })
    .map((pick: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === pick.element);
      const liveElement = liveData.elements.find((e: any) => e.id === pick.element);
      const basePoints = liveElement?.stats?.total_points || 0;

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // The differential is the EXTRA points from captaincy (1x base points for standard captain)
      const multiplier = picks1Data.active_chip === '3xc' ? 3 : 2;
      const captainBonus = basePoints * (multiplier - 1);

      return {
        name: element?.web_name || 'Unknown',
        points: captainBonus,
        position: pick.position,
        isCaptain: true,
        hasPlayed: hasPlayed || fixtureFinished || false,
      };
    });

  // Find position differentials for player 1 (both have player, player1 starting but player2 benched)
  const player1PositionDifferentials = picks1
    .filter((pick: any) => {
      // Must be in starting 11 for player1 (or benched with bench boost)
      const isPlayingForPlayer1 = pick.position <= 11 || isBenchBoost1;
      if (!isPlayingForPlayer1) return false;

      // Must also be in team2's squad
      if (!team2ElementIds.has(pick.element)) return false;

      // Find this player in team2's picks
      const team2Pick = picks2.find((p: any) => p.element === pick.element);
      if (!team2Pick) return false;

      // Must be benched for player2 (and player2 doesn't have bench boost)
      const isPlayingForPlayer2 = team2Pick.position <= 11 || isBenchBoost2;
      if (isPlayingForPlayer2) return false;

      // Don't double count if this is also a captain differential
      if (pick.is_captain && pick.element !== team2Captain) return false;

      return true;
    })
    .map((pick: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === pick.element);
      const liveElement = liveData.elements.find((e: any) => e.id === pick.element);
      const basePoints = liveElement?.stats?.total_points || 0;

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // Apply captain multiplier if this is the captain
      let finalPoints = basePoints;
      if (pick.is_captain) {
        const multiplier = picks1Data.active_chip === '3xc' ? 3 : 2;
        finalPoints = basePoints * multiplier;
      }

      return {
        name: element?.web_name || 'Unknown',
        points: finalPoints,
        position: pick.position,
        isCaptain: pick.is_captain,
        hasPlayed: hasPlayed || fixtureFinished || false,
        wasAutoSubbedIn: wasSubbedIn(pick.element, autoSubs1),
        wasAutoSubbedOut: wasSubbedOut(pick.element, autoSubs1),
        replacedBy: getReplacementName(pick.element, autoSubs1),
      };
    });

  // Combine all differentials for player 1
  const player1Differentials = [...player1PureDifferentials, ...player1CaptainDifferentials, ...player1PositionDifferentials]
    .sort((a: any, b: any) => b.points - a.points);

  // Find pure differentials for player 2 (players team2 has but team1 doesn't)
  const player2PureDifferentials = picks2
    .filter((pick: any) => {
      // Must be a differential
      if (team1ElementIds.has(pick.element)) return false;

      // If on bench (position > 11), only include if Bench Boost is active
      if (pick.position > 11 && !isBenchBoost2) return false;

      return true;
    })
    .map((pick: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === pick.element);
      const liveElement = liveData.elements.find((e: any) => e.id === pick.element);
      const basePoints = liveElement?.stats?.total_points || 0;

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // Apply captain multiplier if this is the captain
      let finalPoints = basePoints;
      if (pick.is_captain) {
        const multiplier = picks2Data.active_chip === '3xc' ? 3 : 2;
        finalPoints = basePoints * multiplier;
      }

      return {
        name: element?.web_name || 'Unknown',
        points: finalPoints,
        position: pick.position,
        isCaptain: pick.is_captain,
        hasPlayed: hasPlayed || fixtureFinished || false,
        wasAutoSubbedIn: wasSubbedIn(pick.element, autoSubs2),
        wasAutoSubbedOut: wasSubbedOut(pick.element, autoSubs2),
        replacedBy: getReplacementName(pick.element, autoSubs2),
      };
    });

  // Find captain differentials for player 2 (both have player, but only player2 captained it) (both have player, but only player2 captained it)
  const player2CaptainDifferentials = picks2
    .filter((pick: any) => {
      // Must be captained by player2
      if (!pick.is_captain) return false;

      // Must also be in team1's squad
      if (!team1ElementIds.has(pick.element)) return false;

      // Must NOT be team1's captain (that would not be a differential)
      if (pick.element === team1Captain) return false;

      // If on bench for team2 (position > 11), only include if Bench Boost is active
      if (pick.position > 11 && !isBenchBoost2) return false;

      return true;
    })
    .map((pick: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === pick.element);
      const liveElement = liveData.elements.find((e: any) => e.id === pick.element);
      const basePoints = liveElement?.stats?.total_points || 0;

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // The differential is the EXTRA points from captaincy (1x base points for standard captain)
      const multiplier = picks2Data.active_chip === '3xc' ? 3 : 2;
      const captainBonus = basePoints * (multiplier - 1);

      return {
        name: element?.web_name || 'Unknown',
        points: captainBonus,
        position: pick.position,
        isCaptain: true,
        hasPlayed: hasPlayed || fixtureFinished || false,
      };
    });

  // Find position differentials for player 2 (both have player, player2 starting but player1 benched)
  const player2PositionDifferentials = picks2
    .filter((pick: any) => {
      // Must be in starting 11 for player2 (or benched with bench boost)
      const isPlayingForPlayer2 = pick.position <= 11 || isBenchBoost2;
      if (!isPlayingForPlayer2) return false;

      // Must also be in team1's squad
      if (!team1ElementIds.has(pick.element)) return false;

      // Find this player in team1's picks
      const team1Pick = picks1.find((p: any) => p.element === pick.element);
      if (!team1Pick) return false;

      // Must be benched for player1 (and player1 doesn't have bench boost)
      const isPlayingForPlayer1 = team1Pick.position <= 11 || isBenchBoost1;
      if (isPlayingForPlayer1) return false;

      // Don't double count if this is also a captain differential
      if (pick.is_captain && pick.element !== team1Captain) return false;

      return true;
    })
    .map((pick: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === pick.element);
      const liveElement = liveData.elements.find((e: any) => e.id === pick.element);
      const basePoints = liveElement?.stats?.total_points || 0;

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // Apply captain multiplier if this is the captain
      let finalPoints = basePoints;
      if (pick.is_captain) {
        const multiplier = picks2Data.active_chip === '3xc' ? 3 : 2;
        finalPoints = basePoints * multiplier;
      }

      return {
        name: element?.web_name || 'Unknown',
        points: finalPoints,
        position: pick.position,
        isCaptain: pick.is_captain,
        hasPlayed: hasPlayed || fixtureFinished || false,
        wasAutoSubbedIn: wasSubbedIn(pick.element, autoSubs2),
        wasAutoSubbedOut: wasSubbedOut(pick.element, autoSubs2),
        replacedBy: getReplacementName(pick.element, autoSubs2),
      };
    });

  // Combine all differentials for player 2
  const player2Differentials = [...player2PureDifferentials, ...player2CaptainDifferentials, ...player2PositionDifferentials]
    .sort((a: any, b: any) => b.points - a.points);

  // Add transfer hits differential ONLY if there's a difference
  const hits1 = picks1Data.entry_history?.event_transfers_cost || 0;
  const hits2 = picks2Data.entry_history?.event_transfers_cost || 0;

  console.log(`Transfer hits - Player1: ${hits1}, Player2: ${hits2}`);

  // Only show transfer hit as a differential if one player has it and the other doesn't
  // Note: FPL API returns POSITIVE values for hits taken (e.g., 4, 8), 0 for no hits
  if (hits1 !== hits2) {
    // Determine which player took MORE hits (higher value = worse)
    if (hits1 > hits2) {
      // Player 1 took MORE hits (higher positive value)
      const diffPoints = -(hits1 - hits2); // Make it negative: -(4 - 0) = -4
      const numHits = (hits1 - hits2) / 4;
      console.log(`Adding ${diffPoints} pts transfer hit to player1 (${numHits} hits)`);
      player1Differentials.push({
        name: numHits === 1 ? 'Transfer Hit' : `Transfer Hits (${numHits}x)`,
        points: diffPoints,
        position: 0,
        isCaptain: false,
        hasPlayed: true,
      });
    } else {
      // Player 2 took MORE hits (higher positive value)
      const diffPoints = -(hits2 - hits1); // Make it negative: -(4 - 0) = -4
      const numHits = (hits2 - hits1) / 4;
      console.log(`Adding ${diffPoints} pts transfer hit to player2 (${numHits} hits)`);
      player2Differentials.push({
        name: numHits === 1 ? 'Transfer Hit' : `Transfer Hits (${numHits}x)`,
        points: diffPoints,
        position: 0,
        isCaptain: false,
        hasPlayed: true,
      });
    }
  }

  return {
    player1Differentials,
    player2Differentials,
  };
}

function calculateCommonPlayers(
  picks1Data: any,
  picks2Data: any,
  liveData: any,
  bootstrapData: any
) {
  const picks1 = picks1Data.picks;
  const picks2 = picks2Data.picks;

  // Get element IDs for both teams (only starting 11 + bench boost)
  const isBenchBoost1 = picks1Data.active_chip === 'bboost';
  const isBenchBoost2 = picks1Data.active_chip === 'bboost';

  const team1ElementIds = new Set(
    picks1
      .filter((p: any) => p.position <= 11 || isBenchBoost1)
      .map((p: any) => p.element)
  );
  const team2ElementIds = new Set(
    picks2
      .filter((p: any) => p.position <= 11 || isBenchBoost2)
      .map((p: any) => p.element)
  );

  // Find common players
  const commonElementIds = Array.from(team1ElementIds).filter((id: any) =>
    team2ElementIds.has(id)
  );

  // Get details for common players
  const commonPlayers = commonElementIds.map((elementId: any) => {
    const element = bootstrapData.elements.find((e: any) => e.id === elementId);
    const liveElement = liveData.elements.find((e: any) => e.id === elementId);
    const basePoints = liveElement?.stats?.total_points || 0;

    // Check if either player captained this player
    const pick1 = picks1.find((p: any) => p.element === elementId);
    const pick2 = picks2.find((p: any) => p.element === elementId);

    const player1Captain = pick1?.is_captain || false;
    const player2Captain = pick2?.is_captain || false;

    // Calculate points for each team
    let player1Points = basePoints;
    let player2Points = basePoints;

    if (player1Captain) {
      const multiplier = picks1Data.active_chip === '3xc' ? 3 : 2;
      player1Points = basePoints * multiplier;
    }

    if (player2Captain) {
      const multiplier = picks2Data.active_chip === '3xc' ? 3 : 2;
      player2Points = basePoints * multiplier;
    }

    return {
      name: element?.web_name || 'Unknown',
      points: basePoints,
      player1Points,
      player2Points,
      player1Captain,
      player2Captain,
    };
  });

  return commonPlayers.sort((a: any, b: any) => b.points - a.points);
}
