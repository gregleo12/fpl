import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import {
  Squad,
  Player,
  Position,
  applyAutoSubstitutions,
  calculateLivePointsWithBonus,
} from '@/lib/fpl-calculations';

// Force dynamic rendering and disable caching for live scores
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; gw: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const gw = parseInt(params.gw);

    if (isNaN(leagueId) || isNaN(gw)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get matches for this gameweek with captain data
    const matchesResult = await db.query(`
      SELECT
        hm.*,
        m1.player_name as entry_1_player,
        m1.team_name as entry_1_team,
        m2.player_name as entry_2_player,
        m2.team_name as entry_2_team,
        c1.captain_name as entry_1_captain,
        c2.captain_name as entry_2_captain
      FROM h2h_matches hm
      JOIN managers m1 ON hm.entry_1_id = m1.entry_id
      JOIN managers m2 ON hm.entry_2_id = m2.entry_id
      LEFT JOIN entry_captains c1 ON hm.entry_1_id = c1.entry_id AND hm.event = c1.event
      LEFT JOIN entry_captains c2 ON hm.entry_2_id = c2.entry_id AND hm.event = c2.event
      WHERE hm.league_id = $1 AND hm.event = $2
      ORDER BY hm.id
    `, [leagueId, gw]);

    const matches = matchesResult.rows;

    // Determine status by checking FPL API for actual gameweek status
    let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';

    try {
      // Fetch bootstrap-static to get current gameweek status
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        const events = bootstrapData.events;
        const currentEvent = events.find((e: any) => e.id === gw);

        if (currentEvent) {
          // Check if gameweek has finished
          if (currentEvent.finished) {
            status = 'completed';
          }
          // Check if gameweek is currently in progress (started but not finished)
          else if (currentEvent.is_current || currentEvent.data_checked) {
            status = 'in_progress';
          }
          // Otherwise it's upcoming
          else {
            status = 'upcoming';
          }
        }
      }
    } catch (error) {
      console.error('Error determining gameweek status:', error);
      // Fall back to database-based detection if FPL API fails
      if (matches.length > 0) {
        const hasScores = matches.some((m: any) =>
          (m.entry_1_points && m.entry_1_points > 0) ||
          (m.entry_2_points && m.entry_2_points > 0)
        );

        if (hasScores) {
          const allComplete = matches.every((m: any) =>
            (m.entry_1_points !== null && m.entry_1_points >= 0) &&
            (m.entry_2_points !== null && m.entry_2_points >= 0)
          );
          status = allComplete ? 'completed' : 'in_progress';
        }
      }
    }

    // For in-progress and completed gameweeks, fetch picks data for chips, hits, and captains
    let liveScoresMap: Map<number, { score: number; hit: number; chip: string | null; captain: string | null }> | null = null;
    if (status === 'in_progress' || status === 'completed') {
      try {
        console.log(`GW${gw} is ${status.toUpperCase()} - fetching picks data from FPL API...`);
        liveScoresMap = await fetchLiveScoresFromPicks(matches, gw, status);
        console.log(`Fetched picks data for ${liveScoresMap.size} entries`);
      } catch (error) {
        console.error('Error fetching picks data:', error);
        // Fall back to database scores if live fetch fails
      }
    } else {
      console.log(`GW${gw} status: ${status} - using database scores`);
    }

    // Format matches for response
    const formattedMatches = matches.map((match: any) => {
      // Use live scores from picks data if available, otherwise use database scores
      const entry1Data = liveScoresMap?.get(match.entry_1_id);
      const entry2Data = liveScoresMap?.get(match.entry_2_id);

      const entry1Score = entry1Data?.score ?? match.entry_1_points ?? 0;
      const entry2Score = entry2Data?.score ?? match.entry_2_points ?? 0;
      // Only include hit if it's actually negative (don't include 0)
      const entry1Hit = entry1Data?.hit && entry1Data.hit < 0 ? entry1Data.hit : undefined;
      const entry2Hit = entry2Data?.hit && entry2Data.hit < 0 ? entry2Data.hit : undefined;
      // Use live chip data if available, otherwise use database chip data
      const entry1Chip = entry1Data?.chip ?? match.active_chip_1 ?? null;
      const entry2Chip = entry2Data?.chip ?? match.active_chip_2 ?? null;
      // Use live captain data if available, otherwise use database captain data
      const entry1Captain = entry1Data?.captain ?? match.entry_1_captain ?? null;
      const entry2Captain = entry2Data?.captain ?? match.entry_2_captain ?? null;

      if (liveScoresMap) {
        console.log(`Match ${match.entry_1_player} vs ${match.entry_2_player}: ${entry1Score} - ${entry2Score} (live: ${liveScoresMap.has(match.entry_1_id)}, db: ${match.entry_1_points})`);
      }

      const entry1 = {
        id: match.entry_1_id,
        player_name: match.entry_1_player,
        team_name: match.entry_1_team,
        score: entry1Score,
        chip: entry1Chip,
        captain: entry1Captain,
        ...(entry1Hit !== undefined && { hit: entry1Hit })
      };

      const entry2 = {
        id: match.entry_2_id,
        player_name: match.entry_2_player,
        team_name: match.entry_2_team,
        score: entry2Score,
        chip: entry2Chip,
        captain: entry2Captain,
        ...(entry2Hit !== undefined && { hit: entry2Hit })
      };

      return {
        id: match.id,
        event: match.event,
        entry_1: entry1,
        entry_2: entry2,
        winner: match.winner ? parseInt(match.winner) : null
      };
    });

    const response = NextResponse.json({
      event: gw,
      status,
      matches: formattedMatches
    });

    // Add cache control headers - no caching for in_progress gameweeks
    if (status === 'in_progress') {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    } else {
      // Allow caching for completed/upcoming gameweeks (5 minutes)
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    }

    return response;
  } catch (error: any) {
    console.error('Error fetching fixtures:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fixtures' },
      { status: 500 }
    );
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
    const liveElement = liveData?.elements?.find((e: any) => e.id === pick.element);

    if (!element) return;

    const player: Player = {
      id: pick.element,
      name: element.web_name,
      position: getPosition(element.element_type),
      minutes: liveElement?.stats?.minutes || 0,
      points: liveElement?.stats?.total_points || 0,
      multiplier: pick.is_captain ? captainMultiplier : 1,
      bps: liveElement?.stats?.bps || 0,
      bonus: liveElement?.stats?.bonus || 0,
      fixtureId: liveElement?.explain?.[0]?.fixture || undefined,
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

// Helper function to fetch live scores from picks data during live and completed gameweeks
async function fetchLiveScoresFromPicks(
  matches: any[],
  gw: number,
  status: 'in_progress' | 'completed'
): Promise<Map<number, { score: number; hit: number; chip: string | null; captain: string | null }>> {
  const scoresMap = new Map<number, { score: number; hit: number; chip: string | null; captain: string | null }>();

  // Get unique entry IDs from all matches
  const entryIds = new Set<number>();
  matches.forEach((match: any) => {
    entryIds.add(match.entry_1_id);
    entryIds.add(match.entry_2_id);
  });

  console.log(`Fetching picks data for ${entryIds.size} entries in GW${gw}...`);

  // Fetch bootstrap data to get player names (for captain)
  let bootstrapData: any = null;
  try {
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (bootstrapResponse.ok) {
      bootstrapData = await bootstrapResponse.json();
      console.log(`Fetched bootstrap data for player names`);
    }
  } catch (error) {
    console.error('Error fetching bootstrap data:', error);
  }

  // Only fetch live player data for in-progress gameweeks
  let liveData: any = null;
  let fixturesData: any[] = [];
  if (status === 'in_progress') {
    try {
      const [liveResponse, fixturesResponse] = await Promise.all([
        fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`),
        fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`)
      ]);

      if (liveResponse.ok) {
        liveData = await liveResponse.json();
        console.log(`Fetched live data for GW${gw}`);
      }

      if (fixturesResponse.ok) {
        const fplFixtures = await fixturesResponse.json();

        // Process fixtures to extract player stats with BPS
        // Each fixture has stats property that we need to convert to player_stats
        fixturesData = fplFixtures.map((fixture: any) => {
          // Get all players who played in this fixture from liveData
          const playerStats = liveData?.elements
            ?.filter((el: any) => {
              const explain = el.explain || [];
              return explain.some((exp: any) => exp.fixture === fixture.id);
            })
            .map((el: any) => ({
              id: el.id,
              bps: el.stats.bps || 0,
              bonus: el.stats.bonus || 0,
            })) || [];

          return {
            id: fixture.id,
            player_stats: playerStats,
          };
        });

        console.log(`Processed ${fixturesData.length} fixtures with player BPS data`);
      }
    } catch (error) {
      console.error('Error fetching live player data:', error);
    }
  }

  // Fetch picks data for all entries in parallel
  const pickPromises = Array.from(entryIds).map(async (entryId) => {
    try {
      const url = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gw}/picks/`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Failed to fetch picks for entry ${entryId}: ${response.status}`);
        return null;
      }

      const picksData = await response.json();
      const picks = picksData.picks;
      const activeChip = picksData.active_chip || null;
      const transferCost = picksData.entry_history?.event_transfers_cost || 0;

      // Find captain
      const captainPick = picks.find((p: any) => p.is_captain);
      const captainElement = bootstrapData?.elements?.find((e: any) => e.id === captainPick?.element);
      const captainName = captainElement?.web_name || null;

      let liveScore = 0;

      // For completed gameweeks, use final score from entry_history
      // For in-progress gameweeks, calculate from live player data WITH AUTO-SUBS AND PROVISIONAL BONUS
      if (status === 'completed') {
        // Use the final score for completed gameweeks
        liveScore = picksData.entry_history?.points || 0;
      } else if (liveData && liveData.elements) {
        // Calculate score from individual players for live gameweeks
        const isBenchBoost = activeChip === 'bboost';

        // Apply auto-substitutions AND provisional bonus
        if (!isBenchBoost && bootstrapData) {
          const squad = createSquadFromPicks(picksData, liveData, bootstrapData);

          // Calculate score with auto-subs AND provisional bonus
          // Pass fixturesData for accurate provisional bonus calculation (all 22 players per match)
          const result = calculateLivePointsWithBonus(squad, fixturesData);
          liveScore = result.totalPoints;

          // Log provisional bonus if any
          if (result.provisionalBonus > 0) {
            console.log(`Entry ${entryId}: Provisional bonus: +${result.provisionalBonus} pts`);
            console.log(`Bonus breakdown:`, result.bonusBreakdown);
          }

          // Log auto-subs if any
          const autoSubResult = applyAutoSubstitutions(squad);
          if (autoSubResult.substitutions.length > 0) {
            console.log(`Entry ${entryId}: Auto-subs applied - ${autoSubResult.substitutions.map(s =>
              `${s.playerOut.name} → ${s.playerIn.name} (+${s.playerIn.points} pts)`
            ).join(', ')}`);
          }
        } else {
          // No auto-subs (Bench Boost active or bootstrap data unavailable)
          const isTripleCaptain = activeChip === '3xc';

          picks.forEach((pick: any) => {
            const liveElement = liveData.elements.find((e: any) => e.id === pick.element);
            const rawPoints = liveElement?.stats?.total_points || 0;

            if (pick.position <= 11) {
              // Starting 11
              if (pick.is_captain) {
                const multiplier = isTripleCaptain ? 3 : 2;
                liveScore += rawPoints * multiplier;
              } else {
                liveScore += rawPoints;
              }
            } else {
              // Bench (positions 12-15)
              if (isBenchBoost) {
                liveScore += rawPoints;
              }
            }
          });
        }
      } else {
        // Fallback to entry_history.points if live data unavailable
        liveScore = picksData.entry_history?.points || 0;
      }

      // Calculate final score (subtract transfer hits)
      const netScore = liveScore - transferCost;
      // Convert hit to negative for display
      const hit = transferCost > 0 ? -transferCost : 0;

      console.log(`Entry ${entryId}: ${netScore} pts (${liveScore} from players - ${transferCost} hits) chip: ${activeChip} captain: ${captainName}`);
      return { entryId, score: netScore, hit, chip: activeChip, captain: captainName };
    } catch (error) {
      console.error(`Error fetching picks for entry ${entryId}:`, error);
      return null;
    }
  });

  const results = await Promise.all(pickPromises);

  // Build the scores map
  results.forEach((result) => {
    if (result) {
      scoresMap.set(result.entryId, { score: result.score, hit: result.hit, chip: result.chip, captain: result.captain });
    }
  });

  console.log(`Successfully fetched ${scoresMap.size} live scores`);
  return scoresMap;
}
