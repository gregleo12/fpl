import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';
import { calculateManagerLiveScore } from '@/lib/scoreCalculator';
import { detectFPLError } from '@/lib/fpl-errors';
import { calculateGWLuck } from '@/lib/luckCalculator'; // K-163: Correct luck formula

// Force dynamic rendering - prevent caching and static generation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface MatchResult {
  result: 'W' | 'D' | 'L';
  event: number;
}

function calculateFormAndStreakFromMatches(entryId: number, matches: any[], upToGW: number) {
  // Filter matches for this manager up to the specified GW
  const managerMatches = matches
    .filter((match: any) => {
      const entry1 = Number(match.entry_1_id);
      const entry2 = Number(match.entry_2_id);
      return (entry1 === entryId || entry2 === entryId) && Number(match.event) <= upToGW;
    })
    .sort((a: any, b: any) => Number(b.event) - Number(a.event)); // Most recent first

  if (managerMatches.length === 0) {
    return {
      form: '',
      formArray: [],
      streak: ''
    };
  }

  // Calculate result for each match from manager's perspective
  const results: MatchResult[] = managerMatches.map((match: any) => {
    let result: 'W' | 'D' | 'L';

    // Convert winner to number for comparison (PostgreSQL returns BIGINT as string)
    const winner = match.winner ? parseInt(match.winner) : null;

    if (winner === null) {
      result = 'D';
    } else if (winner === entryId) {
      result = 'W';
    } else {
      result = 'L';
    }

    return { result, event: match.event };
  });

  // Get last 5 for form
  const last5 = results.slice(0, 5);
  const formArray = last5.map(r => r.result).reverse(); // Oldest to newest (left to right)
  const form = formArray.join('-');

  // Calculate streak (consecutive same results from most recent)
  let streak = '';
  if (results.length > 0) {
    const mostRecent = results[0].result;
    let count = 1;

    for (let i = 1; i < results.length; i++) {
      if (results[i].result === mostRecent) {
        count++;
      } else {
        break;
      }
    }

    streak = `${mostRecent}${count}`;
  }

  return {
    form,
    formArray,
    streak
  };
}

async function calculateRankChange(entryId: number, leagueId: number, currentRank: number, db: any) {
  // Convert entryId to number in case it comes as string from PostgreSQL BIGINT
  const entryIdNum = Number(entryId);

  // Get the most recent completed gameweek
  const lastGwResult = await db.query(`
    SELECT MAX(event) as last_gw
    FROM h2h_matches
    WHERE league_id = $1
      AND (entry_1_points > 0 OR entry_2_points > 0)
  `, [leagueId]);

  const lastGw = lastGwResult.rows[0]?.last_gw;

  if (!lastGw || lastGw === null) {
    return { rankChange: 0, previousRank: currentRank };
  }

  // Get all standings data
  const allStandingsResult = await db.query(`
    SELECT entry_id, total, points_for
    FROM league_standings
    WHERE league_id = $1
  `, [leagueId]);

  const allStandings = allStandingsResult.rows;

  // Get last gameweek matches
  const lastGwMatchesResult = await db.query(`
    SELECT entry_1_id, entry_2_id, entry_1_points, entry_2_points, winner
    FROM h2h_matches
    WHERE league_id = $1 AND event = $2
  `, [leagueId, lastGw]);

  const lastGwMatches = lastGwMatchesResult.rows;

  // Calculate standings before last gameweek
  const previousStandings = allStandings.map((standing: any) => {
    // Convert to numbers (PostgreSQL BIGINT comes as string)
    const standingEntryId = Number(standing.entry_id);
    let adjustedTotal = Number(standing.total);
    let adjustedPointsFor = Number(standing.points_for);

    // Find this team's match in the last gameweek
    for (const match of lastGwMatches) {
      const entry1Id = Number(match.entry_1_id);
      const entry2Id = Number(match.entry_2_id);
      const winner = match.winner ? Number(match.winner) : null;

      if (entry1Id === standingEntryId) {
        // This team was entry_1 - subtract their points scored
        adjustedPointsFor -= Number(match.entry_1_points);

        // Subtract league points earned
        if (winner === standingEntryId) {
          adjustedTotal -= 3; // Win
        } else if (winner === null) {
          adjustedTotal -= 1; // Draw
        }
        // Loss = 0 points, so no subtraction needed
        break; // Found their match, stop looking
      } else if (entry2Id === standingEntryId) {
        // This team was entry_2 - subtract their points scored
        adjustedPointsFor -= Number(match.entry_2_points);

        // Subtract league points earned
        if (winner === standingEntryId) {
          adjustedTotal -= 3; // Win
        } else if (winner === null) {
          adjustedTotal -= 1; // Draw
        }
        // Loss = 0 points, so no subtraction needed
        break; // Found their match, stop looking
      }
    }

    return {
      entry_id: standingEntryId, // Store as number for comparison
      adjustedTotal,
      adjustedPointsFor
    };
  });

  // Sort by adjusted total (desc), then by adjusted points for (desc)
  previousStandings.sort((a: any, b: any) => {
    if (b.adjustedTotal !== a.adjustedTotal) {
      return b.adjustedTotal - a.adjustedTotal;
    }
    return b.adjustedPointsFor - a.adjustedPointsFor;
  });

  // Find previous rank (entry_id is now stored as number)
  const previousRank = previousStandings.findIndex((s: any) => s.entry_id === entryIdNum) + 1;

  if (previousRank === 0) {
    // Not found - shouldn't happen, but return safe default
    return { rankChange: 0, previousRank: currentRank };
  }

  const rankChange = previousRank - currentRank; // Positive = moved up, negative = moved down

  return { rankChange, previousRank };
}

// K-163N: Calculate 4-component weighted season luck index (matches Luck API formula)
async function calculateSeasonLuckIndex(matches: any[], upToGW: number, db: any, leagueId: number) {
  // Step 1: Group points by gameweek
  const pointsByGW: Record<number, Record<number, number>> = {};
  const managerIds = new Set<number>();

  matches.forEach((match: any) => {
    if (match.event > upToGW) return;
    const gw = Number(match.event);
    const entry1 = Number(match.entry_1_id);
    const entry2 = Number(match.entry_2_id);
    const entry1Points = Number(match.entry_1_points);
    const entry2Points = Number(match.entry_2_points);

    if (!pointsByGW[gw]) pointsByGW[gw] = {};
    pointsByGW[gw][entry1] = entry1Points;
    pointsByGW[gw][entry2] = entry2Points;
    managerIds.add(entry1);
    managerIds.add(entry2);
  });

  // Step 2: Progressive season averages
  const seasonAvgsByGW: Record<number, Record<number, number>> = {};
  const getProgressiveAverage = (entryId: number, upToGw: number): number => {
    let total = 0;
    let count = 0;
    for (let g = 1; g <= upToGw; g++) {
      if (pointsByGW[g]?.[entryId] !== undefined) {
        total += pointsByGW[g][entryId];
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  };

  for (const gw of Object.keys(pointsByGW).map(Number).sort((a, b) => a - b)) {
    seasonAvgsByGW[gw] = {};
    for (const entryId of Array.from(managerIds)) {
      seasonAvgsByGW[gw][entryId] = getProgressiveAverage(entryId, gw);
    }
  }

  // Step 3: Get chip usage
  const chipsResult = await db.query(`
    SELECT entry_id, event
    FROM manager_chips
    WHERE league_id = $1 AND event <= $2
  `, [leagueId, upToGW]);

  const chipsByGW: Record<number, Set<number>> = {};
  const chipsByManager: Record<number, number> = {};
  chipsResult.rows.forEach((row: any) => {
    const gw = row.event;
    const entryId = Number(row.entry_id);
    if (!chipsByGW[gw]) chipsByGW[gw] = new Set();
    chipsByGW[gw].add(entryId);
    chipsByManager[entryId] = (chipsByManager[entryId] || 0) + 1;
  });

  // Step 4: Calculate 4 components for each manager
  const luckIndex: Record<number, number> = {};

  for (const entryId of Array.from(managerIds)) {
    const managerMatches = matches.filter((m: any) =>
      m.event <= upToGW && (Number(m.entry_1_id) === entryId || Number(m.entry_2_id) === entryId)
    );

    // 1. VARIANCE LUCK (totalVariance)
    let totalVariance = 0;
    for (const match of managerMatches) {
      const gw = match.event;
      const isEntry1 = Number(match.entry_1_id) === entryId;
      const yourPoints = isEntry1 ? match.entry_1_points : match.entry_2_points;
      const oppPoints = isEntry1 ? match.entry_2_points : match.entry_1_points;
      const oppId = Number(isEntry1 ? match.entry_2_id : match.entry_1_id);

      const yourAvg = seasonAvgsByGW[gw]?.[entryId] || yourPoints;
      const oppAvg = seasonAvgsByGW[gw]?.[oppId] || oppPoints;

      const varianceLuck = (yourPoints - yourAvg) - (oppPoints - oppAvg);
      totalVariance += varianceLuck;
    }

    // 2. RANK LUCK (totalRank)
    let totalRank = 0;
    for (const match of managerMatches) {
      const gw = match.event;
      const isEntry1 = Number(match.entry_1_id) === entryId;
      const yourPoints = isEntry1 ? match.entry_1_points : match.entry_2_points;
      const winner = match.winner ? Number(match.winner) : null;

      const gwPoints = pointsByGW[gw] || {};
      const sortedPoints = Object.entries(gwPoints)
        .map(([id, pts]) => ({ id: Number(id), pts: Number(pts) }))
        .sort((a, b) => b.pts - a.pts);

      const yourRank = sortedPoints.findIndex(p => p.id === entryId) + 1;
      const totalManagers = sortedPoints.length;

      const opponentsWouldBeat = totalManagers - yourRank;
      const expectedWin = totalManagers > 1 ? opponentsWouldBeat / (totalManagers - 1) : 0;

      let actualResult = 0.5;
      if (winner === entryId) actualResult = 1;
      else if (winner && winner !== entryId) actualResult = 0;

      const rankLuck = actualResult - expectedWin;
      totalRank += rankLuck;
    }

    // 3. SCHEDULE LUCK (scheduleLuck)
    let totalOppStrength = 0;
    let theoreticalTotal = 0;

    for (const match of managerMatches) {
      const gw = match.event;
      const isEntry1 = Number(match.entry_1_id) === entryId;
      const oppId = Number(isEntry1 ? match.entry_2_id : match.entry_1_id);

      // Opponent's progressive average at time of match
      const oppAvg = getProgressiveAverage(oppId, gw);
      totalOppStrength += oppAvg;

      // Theoretical: average of all OTHER managers' progressive averages
      let sumOfOtherAvgs = 0;
      let countOthers = 0;
      for (const otherId of Array.from(managerIds)) {
        if (otherId !== entryId) {
          sumOfOtherAvgs += getProgressiveAverage(otherId, gw);
          countOthers++;
        }
      }
      theoreticalTotal += countOthers > 0 ? sumOfOtherAvgs / countOthers : 0;
    }

    const avgOppStrength = managerMatches.length > 0 ? totalOppStrength / managerMatches.length : 0;
    const theoreticalOppAvg = managerMatches.length > 0 ? theoreticalTotal / managerMatches.length : 0;
    const scheduleLuck = (theoreticalOppAvg - avgOppStrength) * managerMatches.length;

    // 4. CHIP LUCK (chipLuck)
    const chipsFaced = managerMatches.filter(m => {
      const gw = m.event;
      const isEntry1 = Number(m.entry_1_id) === entryId;
      const oppId = Number(isEntry1 ? m.entry_2_id : m.entry_1_id);
      return chipsByGW[gw]?.has(oppId);
    }).length;

    const totalChips = Object.values(chipsByManager).reduce((sum, count) => sum + count, 0);
    const avgChipsFaced = managerIds.size > 0 ? totalChips / managerIds.size : 0;
    const chipLuck = (avgChipsFaced - chipsFaced) * 7;

    // SEASON LUCK INDEX: 4-component weighted formula
    const seasonLuck =
      0.4 * (totalVariance / 10) +
      0.3 * totalRank +
      0.2 * (scheduleLuck / 5) +
      0.1 * (chipLuck / 3);

    luckIndex[entryId] = seasonLuck;
  }

  return luckIndex;
}

function rebuildStandingsFromMatches(matches: any[], managers: any[], upToGW: number) {
  // Build standings from scratch using match results
  const standings: any = {};

  // Initialize all managers
  managers.forEach((manager: any) => {
    const entryId = Number(manager.entry_id);
    standings[entryId] = {
      entry_id: entryId,
      player_name: manager.player_name,
      team_name: manager.team_name,
      matches_played: 0,
      matches_won: 0,
      matches_drawn: 0,
      matches_lost: 0,
      points_for: 0,
      points_against: 0,
      total: 0
    };
  });

  // Process all matches up to the specified GW
  matches.forEach((match: any) => {
    if (match.event > upToGW) return;

    const entry1 = Number(match.entry_1_id);
    const entry2 = Number(match.entry_2_id);
    const entry1Points = Number(match.entry_1_points);
    const entry2Points = Number(match.entry_2_points);
    const winner = match.winner ? Number(match.winner) : null;

    if (!standings[entry1] || !standings[entry2]) return;

    // Update matches played and points
    standings[entry1].matches_played++;
    standings[entry2].matches_played++;
    standings[entry1].points_for += entry1Points;
    standings[entry2].points_for += entry2Points;
    standings[entry1].points_against += entry2Points;
    standings[entry2].points_against += entry1Points;

    // Update win/draw/loss and total points
    if (winner === entry1) {
      standings[entry1].matches_won++;
      standings[entry1].total += 3;
      standings[entry2].matches_lost++;
    } else if (winner === entry2) {
      standings[entry2].matches_won++;
      standings[entry2].total += 3;
      standings[entry1].matches_lost++;
    } else {
      standings[entry1].matches_drawn++;
      standings[entry2].matches_drawn++;
      standings[entry1].total += 1;
      standings[entry2].total += 1;
    }
  });

  // Convert to array and sort by total DESC, then points_for DESC
  const standingsArray = Object.values(standings);
  standingsArray.sort((a: any, b: any) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return b.points_for - a.points_for;
  });

  // Add ranks
  standingsArray.forEach((standing: any, index) => {
    standing.rank = index + 1;
  });

  return standingsArray;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    const db = await getDatabase();

    // Check FPL API first to determine if current gameweek is live
    // This helps us set smart defaults
    let isCurrentGWLive = false;
    let liveGameweekNumber = 0;
    try {
      const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (fplResponse.ok) {
        const fplData = await fplResponse.json();
        const currentEvent = fplData.events?.find((event: any) => event.is_current);

        if (currentEvent) {
          // Check if the current event is in progress
          // A gameweek is "live" if:
          // 1. It's marked as current AND not finished
          // 2. OR if the deadline has passed but it's not finished (matches ongoing)
          const now = new Date();
          const deadline = new Date(currentEvent.deadline_time);
          const deadlinePassed = now > deadline;

          isCurrentGWLive = currentEvent.is_current && !currentEvent.finished && deadlinePassed;
          liveGameweekNumber = currentEvent.id;

          console.log(`GW${currentEvent.id} status - is_current: ${currentEvent.is_current}, finished: ${currentEvent.finished}, deadline_passed: ${deadlinePassed}, result: ${isCurrentGWLive ? 'LIVE' : 'OFFICIAL'}`);
        }
      }
    } catch (error) {
      console.error('Error checking FPL gameweek status:', error);
      // Default to false if we can't determine
    }

    // Get GW and mode parameters from query string
    const { searchParams } = new URL(request.url);
    const gwParam = searchParams.get('gw');
    // Smart default: Show LIVE when GW is active, OFFICIAL when no GW is live
    const mode = searchParams.get('mode') || (isCurrentGWLive ? 'live' : 'official');

    // Get all managers in this league
    const managersResult = await db.query(`
      SELECT DISTINCT entry_id, player_name, team_name
      FROM managers m
      WHERE EXISTS (
        SELECT 1 FROM h2h_matches hm
        WHERE (hm.entry_1_id = m.entry_id OR hm.entry_2_id = m.entry_id)
        AND hm.league_id = $1
      )
    `, [leagueId]);

    const managers = managersResult.rows;

    // Get ALL matches for this league
    // For LIVE mode, include unscored matches from current GW
    // For OFFICIAL mode, only include completed/scored matches
    let matchQuery: string;
    let matchParams: any[];

    if (mode === 'live' && isCurrentGWLive && liveGameweekNumber > 0) {
      // Include all matches up to and including current GW (even if unscored)
      matchQuery = `
        SELECT event, entry_1_id, entry_1_points, entry_2_id, entry_2_points, winner
        FROM h2h_matches
        WHERE league_id = $1
          AND event <= $2
        ORDER BY event ASC
      `;
      matchParams = [leagueId, liveGameweekNumber];
    } else {
      // Only include scored matches
      matchQuery = `
        SELECT event, entry_1_id, entry_1_points, entry_2_id, entry_2_points, winner
        FROM h2h_matches
        WHERE league_id = $1
          AND (entry_1_points > 0 OR entry_2_points > 0)
        ORDER BY event ASC
      `;
      matchParams = [leagueId];
    }

    const allMatchesResult = await db.query(matchQuery, matchParams);
    const allMatches = allMatchesResult.rows;

    // Find max GW in database
    const maxGWInDatabase = allMatches.length > 0
      ? Math.max(...allMatches.map((m: any) => Number(m.event)))
      : 0;

    if (maxGWInDatabase === 0) {
      return NextResponse.json({ error: 'No completed matches found' }, { status: 404 });
    }

    // Determine the last FINISHED gameweek (not just last in DB)
    // If current GW is live, the last finished GW is one before it
    const maxCompletedGW = isCurrentGWLive && liveGameweekNumber > 0
      ? liveGameweekNumber - 1
      : maxGWInDatabase;

    // Max GW for navigation: current live GW or max GW in database
    // This prevents users from navigating to future gameweeks that haven't started
    const maxGW = (isCurrentGWLive && liveGameweekNumber > 0) ? liveGameweekNumber : maxGWInDatabase;

    // Determine which GW to show based on mode
    let currentGW: number;
    if (gwParam) {
      // If GW is explicitly specified, use it
      currentGW = Math.min(Math.max(1, parseInt(gwParam)), maxGW);
    } else if (mode === 'live' && isCurrentGWLive && liveGameweekNumber > 0) {
      // LIVE mode: Show the current live gameweek from FPL API
      currentGW = liveGameweekNumber;
    } else {
      // OFFICIAL mode: Show the last completed gameweek with database scores
      currentGW = maxCompletedGW;
    }

    // For live mode, fetch live scores and update match results for current GW
    let matchesWithLiveScores = [...allMatches];
    if (mode === 'live') {
      try {
        // Get all matches for the current GW
        const currentGWMatches = allMatches.filter((m: any) => m.event === currentGW);

        if (currentGWMatches.length > 0) {
          // Get unique entry IDs from current GW matches
          const entryIds = Array.from(new Set(
            currentGWMatches.flatMap((m: any) => [m.entry_1_id, m.entry_2_id])
          ));

          // Determine gameweek status for the calculator
          let status: 'upcoming' | 'live' | 'completed' = 'live';

          // Check if we have FPL data to determine status more accurately
          try {
            const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
            if (fplResponse.ok) {
              const fplData = await fplResponse.json();
              const gwData = fplData.events?.find((e: any) => e.id === currentGW);

              if (gwData?.finished) {
                status = 'completed';
              } else if (!gwData?.is_current) {
                status = 'upcoming';
              }
            }
          } catch (error) {
            // Default to in_progress if we can't determine
          }

          // K-137: Use appropriate calculator based on GW status
          const dataSource = status === 'completed' ? 'database (K-108c)' : 'FPL API (live)';

          const scoresPromises = entryIds.map(async (entryId: number) => {
            try {
              let score: number;

              if (status === 'live' || status === 'upcoming') {
                // K-137: Use FPL API for live/upcoming GWs
                const liveResult = await calculateManagerLiveScore(entryId, currentGW, status);
                score = liveResult.score;
              } else {
                // K-137: Use database for completed GWs
                const teamScore = await calculateTeamGameweekScore(entryId, currentGW);
                score = teamScore.points.net_total;
              }

              return { entryId, score };
            } catch (error: any) {
              console.error(`[K-137] Error for ${entryId}:`, error.message);
              return { entryId, score: 0 };
            }
          });

          const scoresResults = await Promise.all(scoresPromises);

          // Extract scores from results
          const liveScores = new Map<number, number>();
          scoresResults.forEach(({ entryId, score }) => {
            liveScores.set(entryId, score);
          });


          // Update matches with live scores
          matchesWithLiveScores = allMatches.map((match: any) => {
            if (match.event === currentGW && liveScores.size > 0) {
              const entry1Score = liveScores.get(match.entry_1_id);
              const entry2Score = liveScores.get(match.entry_2_id);

              if (entry1Score !== undefined && entry2Score !== undefined) {
                // Calculate winner from live scores
                let winner = null;
                if (entry1Score > entry2Score) {
                  winner = match.entry_1_id;
                } else if (entry2Score > entry1Score) {
                  winner = match.entry_2_id;
                }

                return {
                  ...match,
                  entry_1_points: entry1Score,
                  entry_2_points: entry2Score,
                  winner,
                };
              }
            }
            return match;
          });

        }
      } catch (error) {
        console.error('Error fetching live scores for rankings:', error);
        // Fall back to database scores if live fetch fails
      }
    }

    // Rebuild standings for the current GW
    const standings = rebuildStandingsFromMatches(matchesWithLiveScores, managers, currentGW);

    // K-163N: Calculate season luck index using 4-component weighted formula (matches Luck API)
    const luckIndexByManager = await calculateSeasonLuckIndex(matchesWithLiveScores, currentGW, db, leagueId);

    // Calculate form, streak, and rank change for each manager
    const standingsWithForm = standings.map((standing: any) => {
      const formData = calculateFormAndStreakFromMatches(standing.entry_id, matchesWithLiveScores, currentGW);

      // Calculate rank change from previous GW
      let rankChange = 0;
      if (currentGW > 1) {
        const prevStandings = rebuildStandingsFromMatches(allMatches, managers, currentGW - 1);
        const prevRank = prevStandings.findIndex((s: any) => s.entry_id === standing.entry_id) + 1;
        rankChange = prevRank - standing.rank;
      }

      return {
        ...standing,
        ...formData,
        rankChange,
        previousRank: standing.rank - rankChange,
        luck: Math.round((luckIndexByManager[standing.entry_id] || 0) * 10) // K-163N: Display season luck index ×10
      };
    });

    // Get recent matches (only show completed matches where points were scored)
    const recentMatchesResult = await db.query(`
      SELECT
        hm.*,
        m1.player_name as entry_1_player,
        m1.team_name as entry_1_team,
        m2.player_name as entry_2_player,
        m2.team_name as entry_2_team
      FROM h2h_matches hm
      JOIN managers m1 ON hm.entry_1_id = m1.entry_id
      JOIN managers m2 ON hm.entry_2_id = m2.entry_id
      WHERE hm.league_id = $1
        AND (hm.entry_1_points > 0 OR hm.entry_2_points > 0)
      ORDER BY hm.event DESC
      LIMIT 20
    `, [leagueId]);

    const recentMatches = recentMatchesResult.rows;

    // Get league info
    const leagueResult = await db.query('SELECT * FROM leagues WHERE id = $1', [leagueId]);
    const league = leagueResult.rows[0];

    // Determine the "active" GW (current or next upcoming)
    // Only show as active if gameweek is actually live
    const activeGW = isCurrentGWLive ? liveGameweekNumber : maxCompletedGW;

    const response = NextResponse.json({
      league,
      standings: standingsWithForm,
      recentMatches,
      currentGW,
      maxGW,
      activeGW,
      isCurrentGWLive, // NEW - actual live status from FPL API
      liveGameweekNumber, // NEW - which GW is live
      isLive: mode === 'live' // Keep for backwards compatibility
    });

    // Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('Error fetching league stats:', error);
    // K-130: Use K-61 FPL error detection for user-friendly messages
    const statusCode = error.response?.status || error.status || 500;
    const fplError = detectFPLError(error, statusCode);
    return NextResponse.json(
      { error: fplError },
      { status: statusCode }
    );
  }
}
