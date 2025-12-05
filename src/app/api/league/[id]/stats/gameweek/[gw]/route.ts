import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateMultipleManagerScores } from '@/lib/scoreCalculator';

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

    // Fetch managers and bootstrap data first to determine gameweek status
    const [managersData, bootstrapData] = await Promise.all([
      fetchManagers(db, leagueId),
      fetchBootstrapData(),
    ]);

    // Determine gameweek status from FPL API
    let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';
    if (bootstrapData && bootstrapData.events) {
      const currentEvent = bootstrapData.events.find((e: any) => e.id === gw);
      if (currentEvent) {
        if (currentEvent.finished) {
          status = 'completed';
        } else if (currentEvent.is_current || currentEvent.data_checked) {
          status = 'in_progress';
        }
      }
    }

    console.log(`GW${gw} status: ${status}`);

    // Fetch remaining data in parallel
    const [captainData, chipsData, scoresData, liveData, picksData] = await Promise.all([
      fetchCaptainPicks(db, leagueId, gw),
      fetchChipsPlayed(db, leagueId, gw),
      fetchScores(db, leagueId, gw, managersData, status),
      fetchLiveData(gw),
      fetchAllPicks(managersData, gw),
    ]);

    // Calculate hits statistics
    const hitsData = calculateHits(picksData);

    // Calculate winners/losers
    const winnersData = calculateWinners(scoresData);

    // Calculate top performers
    const topPerformersData = calculateTopPerformers(
      picksData,
      managersData.length,
      bootstrapData,
      liveData
    );

    return NextResponse.json({
      event: gw,
      captainPicks: captainData,
      chipsPlayed: chipsData,
      hitsTaken: hitsData,
      winners: winnersData,
      topPerformers: topPerformersData,
      totalManagers: managersData.length,
    });
  } catch (error: any) {
    console.error('Error fetching gameweek stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gameweek stats' },
      { status: 500 }
    );
  }
}

// Fetch captain picks from FPL API (same pattern as chips in v1.11.9)
async function fetchCaptainPicks(db: any, leagueId: number, gw: number) {
  // Get all managers in the league
  const managers = await fetchManagers(db, leagueId);

  if (process.env.NODE_ENV === 'development') {
    console.log(`Fetching captain picks from FPL API for ${managers.length} managers in GW${gw}...`);
  }

  // Fetch live data once for this gameweek (performance optimization)
  const liveResponse = await fetch(
    `https://fantasy.premierleague.com/api/event/${gw}/live/`
  );

  if (!liveResponse.ok) {
    console.error(`Failed to fetch live data for GW${gw}`);
    return [];
  }

  const liveData = await liveResponse.json();
  const playerPointsMap = new Map<number, number>();

  // Map player IDs to their points for this gameweek
  if (liveData.elements && Array.isArray(liveData.elements)) {
    for (const element of liveData.elements) {
      playerPointsMap.set(element.id, element.stats.total_points);
    }
  }

  // Fetch picks from FPL API for each manager
  const picksPromises = managers.map(async (manager: any) => {
    try {
      const response = await fetch(
        `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${gw}/picks/`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      // Find captain (multiplier >= 2: normal captain = 2, triple captain = 3)
      const captain = data.picks?.find((p: any) => p.multiplier >= 2);

      if (!captain) return null;

      const points = playerPointsMap.get(captain.element) || 0;

      return {
        captainId: captain.element,
        captainPoints: captain.multiplier * points,
      };
    } catch (error) {
      console.error(`Failed to fetch picks for entry ${manager.entry_id}:`, error);
      return null;
    }
  });

  const allPicks = (await Promise.all(picksPromises)).filter((p) => p !== null);

  if (process.env.NODE_ENV === 'development') {
    console.log(`Found ${allPicks.length} captain picks in GW${gw}`);
  }

  // Group by captain ID and calculate totals
  const captainMap = new Map<number, { count: number; totalPoints: number }>();

  for (const pick of allPicks) {
    if (!pick) continue;

    const current = captainMap.get(pick.captainId) || { count: 0, totalPoints: 0 };
    captainMap.set(pick.captainId, {
      count: current.count + 1,
      totalPoints: current.totalPoints + pick.captainPoints,
    });
  }

  // Fetch player names from FPL bootstrap-static
  const playersResponse = await fetch(
    'https://fantasy.premierleague.com/api/bootstrap-static/'
  );
  const playersData = await playersResponse.json();
  const playersMap = new Map(
    playersData.elements.map((p: any) => [p.id, p.web_name])
  );

  // Convert to array format expected by frontend
  const result = Array.from(captainMap.entries())
    .map(([captainId, data]) => ({
      player_id: captainId,
      player_name: playersMap.get(captainId) || 'Unknown',
      team_name: '', // Not needed for captain picks
      count: data.count,
      percentage: (data.count / managers.length) * 100,
      avg_points: data.totalPoints / data.count,
    }))
    .sort((a, b) => b.count - a.count) // Sort by popularity
    .slice(0, 10); // Top 10 captains

  return result;
}

// Fetch chips played directly from FPL API (like My Team does)
async function fetchChipsPlayed(db: any, leagueId: number, gw: number) {
  // Get all managers in the league
  const managers = await fetchManagers(db, leagueId);

  if (process.env.NODE_ENV === 'development') {
    console.log(`Fetching chip history from FPL API for ${managers.length} managers in GW${gw}...`);
  }

  const CHIP_NAMES: Record<string, string> = {
    'bboost': 'BB',
    '3xc': 'TC',
    'freehit': 'FH',
    'wildcard': 'WC',
  };

  // Fetch chip history from FPL API for each manager
  const chipPromises = managers.map(async (manager: any) => {
    try {
      const response = await fetch(
        `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/history/`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      // Filter chips for this specific gameweek
      const chipsThisGW = (data.chips || []).filter((chip: any) => chip.event === gw);

      if (chipsThisGW.length === 0) {
        return null;
      }

      // Return manager with their chip
      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        chip_name: chipsThisGW[0].name,
        chip_display: CHIP_NAMES[chipsThisGW[0].name] || chipsThisGW[0].name,
      };
    } catch (error) {
      console.error(`Failed to fetch chips for entry ${manager.entry_id}:`, error);
      return null;
    }
  });

  const allResults = await Promise.all(chipPromises);
  const managersWithChips = allResults.filter((r) => r !== null);

  if (process.env.NODE_ENV === 'development') {
    console.log(`Found ${managersWithChips.length} managers with chips played in GW${gw}`);
  }

  return managersWithChips;
}

// Fetch scores - uses live calculation for in-progress GWs, database for completed
async function fetchScores(
  db: any,
  leagueId: number,
  gw: number,
  managersData: any[],
  status: 'completed' | 'in_progress' | 'upcoming'
) {
  // For in-progress or upcoming gameweeks, calculate live scores
  if (status === 'in_progress' || status === 'upcoming') {
    console.log(`GW${gw} is ${status} - calculating live scores using shared calculator`);

    const entryIds = managersData.map((m: any) => m.entry_id);

    try {
      // Use shared score calculator for live scores
      const liveScores = await calculateMultipleManagerScores(entryIds, gw, status);

      // Convert to expected format
      const scoresData = Array.from(liveScores.entries()).map(([entryId, scoreResult]) => {
        const manager = managersData.find((m: any) => m.entry_id === entryId);
        return {
          entry_id: entryId,
          player_name: manager?.player_name || 'Unknown',
          team_name: manager?.team_name || 'Unknown',
          score: scoreResult.score,
        };
      });

      console.log(`Calculated ${scoresData.length} live scores`);
      return scoresData;
    } catch (error) {
      console.error('Error calculating live scores:', error);
      // Fallback to database on error
    }
  }

  // For completed gameweeks, use database scores
  console.log(`GW${gw} is completed - using database scores`);
  const result = await db.query(`
    SELECT
      m1.entry_id,
      m1.player_name,
      m1.team_name,
      hm.entry_1_points as score
    FROM h2h_matches hm
    JOIN managers m1 ON hm.entry_1_id = m1.entry_id
    WHERE hm.league_id = $1 AND hm.event = $2
    UNION ALL
    SELECT
      m2.entry_id,
      m2.player_name,
      m2.team_name,
      hm.entry_2_points as score
    FROM h2h_matches hm
    JOIN managers m2 ON hm.entry_2_id = m2.entry_id
    WHERE hm.league_id = $1 AND hm.event = $2
  `, [leagueId, gw]);

  return result.rows.map((row: any) => ({
    entry_id: row.entry_id,
    player_name: row.player_name,
    team_name: row.team_name,
    score: row.score || 0,
  }));
}

// Fetch managers in league
async function fetchManagers(db: any, leagueId: number) {
  const result = await db.query(`
    SELECT DISTINCT m.entry_id, m.player_name, m.team_name
    FROM managers m
    WHERE EXISTS (
      SELECT 1 FROM h2h_matches hm
      WHERE hm.league_id = $1
      AND (hm.entry_1_id = m.entry_id OR hm.entry_2_id = m.entry_id)
    )
    ORDER BY m.entry_id
  `, [leagueId]);

  return result.rows;
}

// Fetch bootstrap data from FPL API
async function fetchBootstrapData() {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching bootstrap data:', error);
    return null;
  }
}

// Fetch live data for gameweek from FPL API
async function fetchLiveData(gw: number) {
  try {
    const response = await fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching live data:', error);
    return null;
  }
}

// Fetch picks data from FPL API for all managers
async function fetchAllPicks(managers: any[], gw: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Fetching picks for ${managers.length} managers in GW${gw}...`);
  }

  const pickPromises = managers.map(async (manager) => {
    try {
      const url = `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${gw}/picks/`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        picks: data.picks || [],
        active_chip: data.active_chip || null,
        transfer_cost: data.entry_history?.event_transfers_cost || 0,
        points: data.entry_history?.points || 0,
      };
    } catch (error) {
      console.error(`Error fetching picks for entry ${manager.entry_id}:`, error);
      return null;
    }
  });

  const results = await Promise.all(pickPromises);
  return results.filter((r) => r !== null);
}

// Calculate hits statistics
function calculateHits(picksData: any[]) {
  const managersWithHitsData = picksData
    .filter((p) => p.transfer_cost > 0)
    .map((p) => ({
      entry_id: p.entry_id,
      player_name: p.player_name,
      hits_taken: p.transfer_cost / 4, // Convert cost to number of hits
    }))
    .sort((a, b) => b.hits_taken - a.hits_taken); // Sort by most hits first

  return managersWithHitsData;
}

// Calculate winners/losers
function calculateWinners(scoresData: any[]) {
  if (scoresData.length === 0) {
    return {
      highest_score: null,
      lowest_score: null,
      average_score: 0,
    };
  }

  const sortedScores = scoresData.sort((a, b) => b.score - a.score);
  const totalScore = scoresData.reduce((sum, s) => sum + s.score, 0);

  return {
    highest_score: sortedScores[0],
    lowest_score: sortedScores[sortedScores.length - 1],
    average_score: totalScore / scoresData.length,
  };
}

// Calculate top performers (highest scoring players this gameweek)
function calculateTopPerformers(
  picksData: any[],
  totalManagers: number,
  bootstrapData: any,
  liveData: any
) {
  if (!bootstrapData || !liveData || totalManagers === 0) {
    return [];
  }

  // Aggregate player ownership
  const playerOwnership: Record<number, number> = {};

  picksData.forEach((entry) => {
    entry.picks.forEach((pick: any) => {
      const playerId = pick.element;
      playerOwnership[playerId] = (playerOwnership[playerId] || 0) + 1;
    });
  });

  // Find all players with their points
  const topPerformers: any[] = [];

  Object.entries(playerOwnership).forEach(([playerIdStr, count]) => {
    const playerId = parseInt(playerIdStr);
    const ownershipPercentage = (count / totalManagers) * 100;

    // Find player in bootstrap data
    const player = bootstrapData.elements?.find((e: any) => e.id === playerId);
    if (!player) return;

    // Find player points in live data
    const livePlayer = liveData.elements?.find((e: any) => e.id === playerId);
    const points = livePlayer?.stats?.total_points || 0;

    // Only include players who scored points
    if (points <= 0) return;

    topPerformers.push({
      player_id: playerId,
      player_name: player.web_name,
      points: points,
      ownership_count: count,
      ownership_percentage: ownershipPercentage,
    });
  });

  // Sort by points descending
  topPerformers.sort((a, b) => b.points - a.points);

  // Return top 10
  return topPerformers.slice(0, 10);
}
