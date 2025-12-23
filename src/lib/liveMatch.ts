import { LiveMatchData } from '@/types/liveMatch';
import {
  Squad,
  Player,
  Position,
  getPosition,
  createSquadFromPicks,
  applyAutoSubstitutions,
  calculateLivePoints,
  getPointsBreakdown
} from './fpl-calculations';

// K-63d: Helper function to get bonus info for a player (extracted for reuse)
function getBonusInfo(playerId: number, liveElement: any, officialBonus: number, fixturesData: any[]) {
  // Calculate provisional bonus from fixtures data with BPS for all 22 players in each match

  // Find which fixture this player played in
  const playerExplain = liveElement?.explain || [];
  if (playerExplain.length === 0) {
    // Player didn't play, use official bonus (0)
    return { bonusPoints: officialBonus };
  }

  // Get the first fixture (most players only play in one fixture per gameweek)
  const fixtureId = playerExplain[0].fixture;
  const fixture = fixturesData.find((f: any) => f.id === fixtureId);

  if (!fixture || !fixture.player_stats) {
    // No fixture data, use official bonus
    return { bonusPoints: officialBonus };
  }

  // If fixture is finished, use official bonus
  if (fixture.finished) {
    return { bonusPoints: officialBonus };
  }

  // Calculate provisional bonus from BPS ranking
  const playerStats = fixture.player_stats;
  const playerData = playerStats.find((p: any) => p.id === playerId);

  if (!playerData) {
    return { bonusPoints: officialBonus };
  }

  // Sort players by BPS (descending)
  const sortedByBPS = [...playerStats].sort((a: any, b: any) => b.bps - a.bps);

  // Assign provisional bonus: top 3 BPS get 3, 2, 1 bonus (ties handled)
  const playerBPS = playerData.bps;
  const rank = sortedByBPS.findIndex((p: any) => p.id === playerId);

  let provisionalBonus = 0;
  if (rank === 0) provisionalBonus = 3;
  else if (rank === 1) provisionalBonus = 2;
  else if (rank === 2) provisionalBonus = 1;

  // Handle ties: if multiple players have same BPS as top 3, they share bonus
  const bpsAtRank = sortedByBPS[rank]?.bps || 0;
  const playersWithSameBPS = sortedByBPS.filter((p: any) => p.bps === bpsAtRank).length;

  if (playersWithSameBPS > 1 && rank < 3) {
    // Simplified tie handling - just use the rank-based bonus
    // (Full tie logic would be more complex, but this is close enough)
  }

  return { bonusPoints: provisionalBonus };
}

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
    const fixturesData = data.fixtures || [];

    // Calculate live stats for both teams (now with fixtures data for auto-sub timing and provisional bonus)
    const { stats: player1Data, autoSubResult: autoSubs1 } = calculateLiveStats(picks1Data, liveData, bootstrapData, fixturesData, entryId1, manager1, team1);
    const { stats: player2Data, autoSubResult: autoSubs2 } = calculateLiveStats(picks2Data, liveData, bootstrapData, fixturesData, entryId2, manager2, team2);

    // Calculate differentials (pass auto-sub results and fixtures data for provisional bonus)
    const { player1Differentials, player2Differentials } = calculateDifferentials(
      picks1Data,
      picks2Data,
      liveData,
      bootstrapData,
      fixturesData,
      autoSubs1,
      autoSubs2
    );

    // Calculate common players
    const commonPlayers = calculateCommonPlayers(
      picks1Data,
      picks2Data,
      liveData,
      bootstrapData,
      fixturesData,
      autoSubs1,
      autoSubs2
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

function calculateLiveStats(
  picksData: any,
  liveData: any,
  bootstrapData: any,
  fixturesData: any[],
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

  // K-109 Phase 7: FPL API total_points ALREADY includes bonus - don't add again!
  // Just multiply the total points by captain multiplier
  const captainPoints = rawCaptainPoints * captainMultiplier;

  // Get bonus info for display purposes only (don't add to points - already included!)
  const captainOfficialBonus = captainLive?.stats?.bonus || 0;
  const captainBonusInfo = getBonusInfo(
    captainPick?.element || 0,
    captainLive,
    captainOfficialBonus,
    fixturesData
  );

  console.log(`[K-109 Phase 7] Captain: ${captainElement?.web_name}, Raw points: ${rawCaptainPoints} (includes ${captainOfficialBonus} bonus), Multiplier: ${captainMultiplier}, Total: ${captainPoints}`);

  // Calculate stats (players played, bench points, etc.)
  const isBenchBoost = picksData.active_chip === 'bboost';
  const totalPlayers = isBenchBoost ? 15 : 11;
  let playersPlayed = 0;
  let playersRemaining = 0;
  let benchPoints = 0;
  let liveScore = 0; // Calculate live score from individual players
  const benchPlayers: any[] = []; // Collect bench player details

  // Apply auto-substitutions if Bench Boost is NOT active (with fixture status for timing)
  let autoSubResult = null;
  if (!isBenchBoost) {
    const squad = createSquadFromPicks(picksData, liveData, bootstrapData, fixturesData);
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

      // Collect bench player details
      benchPlayers.push({
        name: bootstrapElement?.web_name || 'Unknown',
        position: getPosition(bootstrapElement?.element_type),
        points: rawPoints,
      });

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

  // Use auto-substitution adjusted score if available (with provisional bonus from fixtures data)
  let finalLiveScore = liveScore;

  // Always use calculateLivePointsWithBonus for accurate scoring (handles both auto-subs and Bench Boost)
  const squad = createSquadFromPicks(picksData, liveData, bootstrapData, fixturesData);
  const { calculateLivePointsWithBonus } = require('./fpl-calculations');
  const result = calculateLivePointsWithBonus(squad, fixturesData, picksData.active_chip);
  finalLiveScore = result.totalPoints;

  if (result.provisionalBonus > 0) {
    console.log(`Provisional bonus for ${manager}: +${result.provisionalBonus} pts`);
  }

  if (autoSubResult && !isBenchBoost && autoSubResult.substitutions.length > 0) {
    console.log(`Score with auto-subs and bonus: ${finalLiveScore} (${autoSubResult.substitutions.length} subs)`);
  } else if (isBenchBoost) {
    console.log(`Score with Bench Boost and bonus: ${finalLiveScore} (all 15 players count)`);
  }

  // Calculate final live score (subtract hits - API returns positive values)
  const currentScore = finalLiveScore - Math.abs(transferCost);
  console.log(`Live calculated score for ${manager}: ${currentScore} (${finalLiveScore} from players - ${Math.abs(transferCost)} from hits)`);

  console.log(`Players: ${playersPlayed} played, ${playersRemaining} remaining (total: ${totalPlayers})`);

  // K-63e: Bonus info already calculated earlier (before multiplier applied)

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
        bonusPoints: captainBonusInfo.bonusPoints,
      },
      chipActive: picksData.active_chip,
      benchPoints,
      bench: benchPlayers,
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
  fixturesData: any[],
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

  // Helper function to get replacement player's points
  const getReplacementPoints = (playerId: number, autoSubs: any) => {
    if (!autoSubs || !autoSubs.substitutions) return undefined;
    const sub = autoSubs.substitutions.find((s: any) => s.playerOut.id === playerId);
    return sub ? sub.playerIn.points : undefined;
  };

  // K-63d: getBonusInfo is now a standalone function at the top of the file

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
      let totalPoints = liveElement?.stats?.total_points || 0;
      let officialBonus = liveElement?.stats?.bonus || 0;

      // K-63: Check if fixture has started before using points
      const fixtureId = liveElement?.explain?.[0]?.fixture;
      if (fixtureId && fixturesData.length > 0) {
        const fixture = fixturesData.find((f: any) => f.id === fixtureId);
        if (fixture && !fixture.started) {
          // Fixture hasn't started yet, don't show any points
          totalPoints = 0;
          officialBonus = 0;
        }
      }

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // Get bonus info (provisional or official)
      const bonusInfo = getBonusInfo(pick.element, liveElement, officialBonus, fixturesData);
      const bonus = bonusInfo.bonusPoints;

      // Calculate base points (total_points already includes official bonus, so subtract it)
      const basePointsWithoutBonus = totalPoints - officialBonus;

      // Apply captain multiplier if this is the captain
      const multiplier = pick.is_captain ? (picks1Data.active_chip === '3xc' ? 3 : 2) : 1;
      const finalBasePoints = basePointsWithoutBonus * multiplier;
      const finalBonusPoints = bonus * multiplier;
      const finalTotalPoints = finalBasePoints + finalBonusPoints;

      return {
        name: element?.web_name || 'Unknown',
        points: finalTotalPoints,
        basePoints: finalBasePoints,
        bonusPoints: finalBonusPoints > 0 ? finalBonusPoints : undefined,
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
      let basePoints = liveElement?.stats?.total_points || 0;

      // K-63: Check if fixture has started before using points
      const fixtureId = liveElement?.explain?.[0]?.fixture;
      if (fixtureId && fixturesData.length > 0) {
        const fixture = fixturesData.find((f: any) => f.id === fixtureId);
        if (fixture && !fixture.started) {
          // Fixture hasn't started yet, don't show any points
          basePoints = 0;
        }
      }

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
      let totalPoints = liveElement?.stats?.total_points || 0;
      let officialBonus = liveElement?.stats?.bonus || 0;

      // K-63: Check if fixture has started before using points
      const fixtureId = liveElement?.explain?.[0]?.fixture;
      if (fixtureId && fixturesData.length > 0) {
        const fixture = fixturesData.find((f: any) => f.id === fixtureId);
        if (fixture && !fixture.started) {
          // Fixture hasn't started yet, don't show any points
          totalPoints = 0;
          officialBonus = 0;
        }
      }

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // Get bonus info (provisional or official)
      const bonusInfo = getBonusInfo(pick.element, liveElement, officialBonus, fixturesData);
      const bonus = bonusInfo.bonusPoints;

      // Calculate base points (total_points already includes official bonus, so subtract it)
      const basePointsWithoutBonus = totalPoints - officialBonus;

      // Apply captain multiplier if this is the captain
      const multiplier = pick.is_captain ? (picks1Data.active_chip === '3xc' ? 3 : 2) : 1;
      const finalBasePoints = basePointsWithoutBonus * multiplier;
      const finalBonusPoints = bonus * multiplier;
      const finalTotalPoints = finalBasePoints + finalBonusPoints;

      return {
        name: element?.web_name || 'Unknown',
        points: finalTotalPoints,
        basePoints: finalBasePoints,
        bonusPoints: finalBonusPoints > 0 ? finalBonusPoints : undefined,
        position: pick.position,
        isCaptain: pick.is_captain,
        hasPlayed: hasPlayed || fixtureFinished || false,
        wasAutoSubbedIn: wasSubbedIn(pick.element, autoSubs1),
        wasAutoSubbedOut: wasSubbedOut(pick.element, autoSubs1),
        replacedBy: getReplacementName(pick.element, autoSubs1),
      };
    });

  // Combine all differentials for player 1
  let player1Differentials = [...player1PureDifferentials, ...player1CaptainDifferentials, ...player1PositionDifferentials];

  // Post-process: Update points for subbed-out players and remove duplicate bench players
  if (autoSubs1 && autoSubs1.substitutions) {
    const subbedInIds = new Set(autoSubs1.substitutions.map((s: any) => s.playerIn.id));

    player1Differentials = player1Differentials
      .map((diff: any) => {
        // If this player was subbed out, update their points to show the replacement's points
        if (diff.wasAutoSubbedOut) {
          // Find the element ID for this player
          const element = bootstrapData.elements.find((e: any) => e.web_name === diff.name);
          if (element) {
            const replacementPoints = getReplacementPoints(element.id, autoSubs1);
            if (replacementPoints !== undefined) {
              return {
                ...diff,
                points: replacementPoints * (diff.isCaptain ? (picks1Data.active_chip === '3xc' ? 3 : 2) : 1),
              };
            }
          }
        }
        return diff;
      })
      .filter((diff: any) => {
        // Remove bench players who came in as substitutes (they're shown in the subbed-out player's row)
        const element = bootstrapData.elements.find((e: any) => e.web_name === diff.name);
        return !(diff.wasAutoSubbedIn && element && subbedInIds.has(element.id));
      });
  }

  player1Differentials.sort((a: any, b: any) => b.points - a.points);

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
      let totalPoints = liveElement?.stats?.total_points || 0;
      let officialBonus = liveElement?.stats?.bonus || 0;

      // K-63: Check if fixture has started before using points
      const fixtureId = liveElement?.explain?.[0]?.fixture;
      if (fixtureId && fixturesData.length > 0) {
        const fixture = fixturesData.find((f: any) => f.id === fixtureId);
        if (fixture && !fixture.started) {
          // Fixture hasn't started yet, don't show any points
          totalPoints = 0;
          officialBonus = 0;
        }
      }

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // Get bonus info (provisional or official)
      const bonusInfo = getBonusInfo(pick.element, liveElement, officialBonus, fixturesData);
      const bonus = bonusInfo.bonusPoints;

      // Calculate base points (total_points already includes official bonus, so subtract it)
      const basePointsWithoutBonus = totalPoints - officialBonus;

      // Apply captain multiplier if this is the captain
      const multiplier = pick.is_captain ? (picks2Data.active_chip === '3xc' ? 3 : 2) : 1;
      const finalBasePoints = basePointsWithoutBonus * multiplier;
      const finalBonusPoints = bonus * multiplier;
      const finalTotalPoints = finalBasePoints + finalBonusPoints;

      return {
        name: element?.web_name || 'Unknown',
        points: finalTotalPoints,
        basePoints: finalBasePoints,
        bonusPoints: finalBonusPoints > 0 ? finalBonusPoints : undefined,
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
      let basePoints = liveElement?.stats?.total_points || 0;

      // K-63: Check if fixture has started before using points
      const fixtureId = liveElement?.explain?.[0]?.fixture;
      if (fixtureId && fixturesData.length > 0) {
        const fixture = fixturesData.find((f: any) => f.id === fixtureId);
        if (fixture && !fixture.started) {
          // Fixture hasn't started yet, don't show any points
          basePoints = 0;
        }
      }

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
      let totalPoints = liveElement?.stats?.total_points || 0;
      let officialBonus = liveElement?.stats?.bonus || 0;

      // K-63: Check if fixture has started before using points
      const fixtureId = liveElement?.explain?.[0]?.fixture;
      if (fixtureId && fixturesData.length > 0) {
        const fixture = fixturesData.find((f: any) => f.id === fixtureId);
        if (fixture && !fixture.started) {
          // Fixture hasn't started yet, don't show any points
          totalPoints = 0;
          officialBonus = 0;
        }
      }

      // Check if player has played
      const hasPlayed = liveElement?.stats?.minutes > 0;
      const fixtureFinished = liveElement?.explain?.some((exp: any) => exp.fixture_finished);

      // Get bonus info (provisional or official)
      const bonusInfo = getBonusInfo(pick.element, liveElement, officialBonus, fixturesData);
      const bonus = bonusInfo.bonusPoints;

      // Calculate base points (total_points already includes official bonus, so subtract it)
      const basePointsWithoutBonus = totalPoints - officialBonus;

      // Apply captain multiplier if this is the captain
      const multiplier = pick.is_captain ? (picks2Data.active_chip === '3xc' ? 3 : 2) : 1;
      const finalBasePoints = basePointsWithoutBonus * multiplier;
      const finalBonusPoints = bonus * multiplier;
      const finalTotalPoints = finalBasePoints + finalBonusPoints;

      return {
        name: element?.web_name || 'Unknown',
        points: finalTotalPoints,
        basePoints: finalBasePoints,
        bonusPoints: finalBonusPoints > 0 ? finalBonusPoints : undefined,
        position: pick.position,
        isCaptain: pick.is_captain,
        hasPlayed: hasPlayed || fixtureFinished || false,
        wasAutoSubbedIn: wasSubbedIn(pick.element, autoSubs2),
        wasAutoSubbedOut: wasSubbedOut(pick.element, autoSubs2),
        replacedBy: getReplacementName(pick.element, autoSubs2),
      };
    });

  // Combine all differentials for player 2
  let player2Differentials = [...player2PureDifferentials, ...player2CaptainDifferentials, ...player2PositionDifferentials];

  // Post-process: Update points for subbed-out players and remove duplicate bench players
  if (autoSubs2 && autoSubs2.substitutions) {
    const subbedInIds = new Set(autoSubs2.substitutions.map((s: any) => s.playerIn.id));

    player2Differentials = player2Differentials
      .map((diff: any) => {
        // If this player was subbed out, update their points to show the replacement's points
        if (diff.wasAutoSubbedOut) {
          // Find the element ID for this player
          const element = bootstrapData.elements.find((e: any) => e.web_name === diff.name);
          if (element) {
            const replacementPoints = getReplacementPoints(element.id, autoSubs2);
            if (replacementPoints !== undefined) {
              return {
                ...diff,
                points: replacementPoints * (diff.isCaptain ? (picks2Data.active_chip === '3xc' ? 3 : 2) : 1),
              };
            }
          }
        }
        return diff;
      })
      .filter((diff: any) => {
        // Remove bench players who came in as substitutes (they're shown in the subbed-out player's row)
        const element = bootstrapData.elements.find((e: any) => e.web_name === diff.name);
        return !(diff.wasAutoSubbedIn && element && subbedInIds.has(element.id));
      });
  }

  player2Differentials.sort((a: any, b: any) => b.points - a.points);

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
  bootstrapData: any,
  fixturesData: any[],
  autoSubs1?: any,
  autoSubs2?: any
) {
  const picks1 = picks1Data.picks;
  const picks2 = picks2Data.picks;

  // Helper: Get substitute for a player
  const getSubstitute = (playerId: number, autoSubs: any) => {
    if (!autoSubs || !autoSubs.substitutions) return null;
    const sub = autoSubs.substitutions.find((s: any) => s.playerOut.id === playerId);
    return sub ? sub.playerIn : null;
  };

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
  const commonPlayers = commonElementIds
    .map((elementId: any) => {
      const element = bootstrapData.elements.find((e: any) => e.id === elementId);
      const liveElement = liveData.elements.find((e: any) => e.id === elementId);
      const basePoints = liveElement?.stats?.total_points || 0;

      // Check if either player captained this player
      const pick1 = picks1.find((p: any) => p.element === elementId);
      const pick2 = picks2.find((p: any) => p.element === elementId);

      const player1Captain = pick1?.is_captain || false;
      const player2Captain = pick2?.is_captain || false;

      // Check if player was auto-subbed in both teams
      const sub1 = getSubstitute(elementId, autoSubs1);
      const sub2 = getSubstitute(elementId, autoSubs2);

      // If player was subbed out in BOTH teams
      if (sub1 && sub2) {
        // If SAME substitute → Keep in common, show substitute's points
        if (sub1.id === sub2.id) {
          const subElement = bootstrapData.elements.find((e: any) => e.id === sub1.id);
          const subLiveElement = liveData.elements.find((e: any) => e.id === sub1.id);
          const subBasePoints = subLiveElement?.stats?.total_points || 0;

          // Calculate points for each team (with captain multipliers if applicable)
          let player1Points = subBasePoints;
          let player2Points = subBasePoints;

          if (player1Captain) {
            const multiplier = picks1Data.active_chip === '3xc' ? 3 : 2;
            player1Points = subBasePoints * multiplier;
          }

          if (player2Captain) {
            const multiplier = picks2Data.active_chip === '3xc' ? 3 : 2;
            player2Points = subBasePoints * multiplier;
          }

          // K-63d: Calculate bonus info for substitute
          const subOfficialBonus = subLiveElement?.stats?.bonus || 0;
          const subBonusInfo = getBonusInfo(sub1.id, subLiveElement, subOfficialBonus, fixturesData);

          return {
            name: subElement?.web_name || 'Unknown',
            points: subBasePoints,
            player1Points,
            player2Points,
            player1Captain,
            player2Captain,
            isAutoSub: true,
            originalName: element?.web_name || 'Unknown',
            bonusPoints: subBonusInfo.bonusPoints,
          };
        } else {
          // DIFFERENT substitutes → Keep in common, show each team's substitute
          const sub1Element = bootstrapData.elements.find((e: any) => e.id === sub1.id);
          const sub1LiveElement = liveData.elements.find((e: any) => e.id === sub1.id);
          const sub1Points = sub1LiveElement?.stats?.total_points || 0;

          const sub2Element = bootstrapData.elements.find((e: any) => e.id === sub2.id);
          const sub2LiveElement = liveData.elements.find((e: any) => e.id === sub2.id);
          const sub2Points = sub2LiveElement?.stats?.total_points || 0;

          // Calculate points for each team (with captain multipliers if applicable)
          let player1Points = sub1Points;
          let player2Points = sub2Points;

          if (player1Captain) {
            const multiplier = picks1Data.active_chip === '3xc' ? 3 : 2;
            player1Points = sub1Points * multiplier;
          }

          if (player2Captain) {
            const multiplier = picks2Data.active_chip === '3xc' ? 3 : 2;
            player2Points = sub2Points * multiplier;
          }

          // K-63d: Original player didn't play, so bonus is 0
          return {
            name: element?.web_name || 'Unknown',
            points: basePoints,  // Original player's points (0)
            player1Points,
            player2Points,
            player1Captain,
            player2Captain,
            isAutoSub: true,
            player1SubName: sub1Element?.web_name || 'Unknown',
            player2SubName: sub2Element?.web_name || 'Unknown',
            bonusPoints: 0,
          };
        }
      }

      // Player wasn't subbed or only subbed in one team - use original points

      // K-109 Phase 7 Extended: FPL API total_points ALREADY includes bonus - don't add again!
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

      // Get bonus info for display purposes only (don't add to points - already included!)
      const officialBonus = liveElement?.stats?.bonus || 0;
      const bonusInfo = getBonusInfo(elementId, liveElement, officialBonus, fixturesData);

      return {
        name: element?.web_name || 'Unknown',
        points: basePoints,
        player1Points,
        player2Points,
        player1Captain,
        player2Captain,
        bonusPoints: bonusInfo.bonusPoints, // For display only
      };
    })
    .filter((player): player is Exclude<typeof player, null> => player !== null);

  return commonPlayers.sort((a: any, b: any) => b.points - a.points);
}
