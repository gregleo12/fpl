import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateTeamGameweekScore } from '@/lib/teamCalculator';
import { calculateManagerLiveScore } from '@/lib/scoreCalculator';
import { checkDatabaseHasGWData } from '@/lib/k142-auto-sync';

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
        // K-142: Check database validity for completed GWs
        if (currentEvent.finished) {
          const hasValidData = await checkDatabaseHasGWData(leagueId, gw);
          if (hasValidData) {
            status = 'completed';
          } else {
            status = 'in_progress';
          }
        } else if (currentEvent.is_current || currentEvent.data_checked) {
          status = 'in_progress';
        }
      }
    }


    // Fetch remaining data in parallel
    const [captainData, chipsData, scoresData, liveData, picksData, hitsData, benchData] = await Promise.all([
      fetchCaptainPicks(db, leagueId, gw, managersData, status),
      fetchChipsPlayed(db, leagueId, gw, status),
      fetchScores(db, leagueId, gw, managersData, status),
      fetchLiveData(gw),
      fetchAllPicks(managersData, gw, status),
      fetchHitsFromDatabase(db, leagueId, gw, managersData, status),
      fetchBenchPointsFromDatabase(db, leagueId, gw, status),
    ]);

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
      pointsOnBench: benchData,
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

// Fetch captain picks - uses database for completed GWs, FPL API for live/upcoming
async function fetchCaptainPicks(
  db: any,
  leagueId: number,
  gw: number,
  managers: any[],
  status: 'completed' | 'in_progress' | 'upcoming'
) {
  // For completed gameweeks, use database
  if (status === 'completed') {

    const result = await db.query(`
      SELECT
        ec.captain_element_id as player_id,
        ec.captain_name as player_name,
        COUNT(*) as manager_count,
        ROUND(AVG(ec.captain_points), 1) as avg_points
      FROM entry_captains ec
      INNER JOIN league_standings ls ON ls.entry_id = ec.entry_id
      WHERE ls.league_id = $1 AND ec.event = $2
      GROUP BY ec.captain_element_id, ec.captain_name
      ORDER BY manager_count DESC
      LIMIT 10
    `, [leagueId, gw]);


    return result.rows.map((row: any) => ({
      player_id: row.player_id,
      player_name: row.player_name,
      team_name: '', // Not needed
      count: parseInt(row.manager_count),
      percentage: (parseInt(row.manager_count) / managers.length) * 100,
      avg_points: parseFloat(row.avg_points) || 0,
    }));
  }

  // For live/upcoming GWs, use FPL API

  // Fetch live data once for this gameweek
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

// Fetch chips played - uses database for completed GWs, FPL API for live GWs
async function fetchChipsPlayed(
  db: any,
  leagueId: number,
  gw: number,
  status: 'completed' | 'in_progress' | 'upcoming'
) {
  const CHIP_NAMES: Record<string, string> = {
    'bboost': 'BB',
    '3xc': 'TC',
    'freehit': 'FH',
    'wildcard': 'WC',
  };

  // For completed GWs, use database
  if (status === 'completed') {
    try {
      const result = await db.query(`
        SELECT
          mc.entry_id,
          m.player_name,
          mc.chip_name
        FROM manager_chips mc
        JOIN managers m ON m.entry_id = mc.entry_id
        WHERE mc.league_id = $1 AND mc.event = $2
      `, [leagueId, gw]);

      if (process.env.NODE_ENV === 'development') {
      }

      return result.rows.map((row: any) => ({
        entry_id: row.entry_id,
        player_name: row.player_name,
        chip_name: row.chip_name,
        chip_display: CHIP_NAMES[row.chip_name] || row.chip_name,
      }));
    } catch (error) {
      console.error('[fetchChipsPlayed] Database error, falling back to FPL API:', error);
      // Fall through to FPL API
    }
  }

  // For live/upcoming GWs or database fallback, use FPL API
  const managers = await fetchManagers(db, leagueId);

  if (process.env.NODE_ENV === 'development') {
  }

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
  }

  return managersWithChips;
}

// Fetch scores - uses FPL API for in-progress GWs, database for completed (K-27)
async function fetchScores(
  db: any,
  leagueId: number,
  gw: number,
  managersData: any[],
  status: 'completed' | 'in_progress' | 'upcoming'
) {
  // K-27: For in-progress or upcoming gameweeks, use FPL API
  if (status === 'in_progress' || status === 'upcoming') {

    try {
      // Calculate scores for all managers in parallel using live calculator
      const scoresPromises = managersData.map(async (manager: any) => {
        try {
          const liveResult = await calculateManagerLiveScore(manager.entry_id, gw, status);
          return {
            entry_id: manager.entry_id,
            player_name: manager.player_name,
            team_name: manager.team_name,
            score: liveResult.score,
          };
        } catch (error: any) {
          console.error(`[Stats/GW K-27] Error for ${manager.entry_id}:`, error.message);
          return {
            entry_id: manager.entry_id,
            player_name: manager.player_name,
            team_name: manager.team_name,
            score: 0,
          };
        }
      });

      const scoresData = await Promise.all(scoresPromises);
      return scoresData;
    } catch (error) {
      console.error('[Stats/GW K-27] Error calculating live scores:', error);
      // Fallback to database on error
    }
  }

  // For completed gameweeks, use database scores
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

// Fetch picks data from FPL API for all managers (for top performers calculation)
async function fetchAllPicks(managers: any[], gw: number, status: string) {
  if (process.env.NODE_ENV === 'development') {
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
      };
    } catch (error) {
      console.error(`Error fetching picks for entry ${manager.entry_id}:`, error);
      return null;
    }
  });

  const results = await Promise.all(pickPromises);
  return results.filter((r) => r !== null);
}

// Fetch hits from database (manager_gw_history) - falls back to FPL API for live GWs
async function fetchHitsFromDatabase(
  db: any,
  leagueId: number,
  gw: number,
  managers: any[],
  status: string
) {
  // For completed gameweeks, use database
  if (status === 'completed') {

    const result = await db.query(`
      SELECT
        mh.entry_id,
        m.player_name,
        mh.event_transfers_cost / 4 as hits_taken
      FROM manager_gw_history mh
      JOIN managers m ON m.entry_id = mh.entry_id
      WHERE mh.league_id = $1
        AND mh.event = $2
        AND mh.event_transfers_cost > 0
      ORDER BY mh.event_transfers_cost DESC
    `, [leagueId, gw]);

    return result.rows;
  }

  // For live/upcoming GWs, fall back to FPL API

  const hitsPromises = managers.map(async (manager: any) => {
    try {
      const response = await fetch(
        `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/event/${gw}/picks/`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const transferCost = data.entry_history?.event_transfers_cost || 0;

      if (transferCost === 0) {
        return null;
      }

      return {
        entry_id: manager.entry_id,
        player_name: manager.player_name,
        hits_taken: transferCost / 4,
      };
    } catch (error) {
      console.error(`Error fetching hits for entry ${manager.entry_id}:`, error);
      return null;
    }
  });

  const results = await Promise.all(hitsPromises);
  return results.filter((r) => r !== null).sort((a, b) => b.hits_taken - a.hits_taken);
}

// Fetch bench points from database (manager_gw_history) - falls back to FPL API for live GWs
async function fetchBenchPointsFromDatabase(
  db: any,
  leagueId: number,
  gw: number,
  status: string
) {
  // For completed gameweeks, use database
  if (status === 'completed') {

    const result = await db.query(`
      SELECT
        mh.entry_id,
        m.player_name,
        mh.points_on_bench
      FROM manager_gw_history mh
      JOIN managers m ON m.entry_id = mh.entry_id
      WHERE mh.league_id = $1
        AND mh.event = $2
        AND mh.points_on_bench > 0
      ORDER BY mh.points_on_bench DESC
    `, [leagueId, gw]);


    // Calculate totals
    const totalBenchPoints = result.rows.reduce((sum: number, row: any) => sum + row.points_on_bench, 0);
    const avgBenchPoints = result.rows.length > 0 ? totalBenchPoints / result.rows.length : 0;

    return {
      managers: result.rows,
      total: totalBenchPoints,
      average: avgBenchPoints,
    };
  }

  // For live/upcoming GWs, return empty data (bench points are complex to calculate live)
  return {
    managers: [],
    total: 0,
    average: 0,
  };
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
