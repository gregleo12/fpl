import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

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

    // Fetch all data in parallel
    const [captainData, chipsData, scoresData, managersData] = await Promise.all([
      fetchCaptainPicks(db, leagueId, gw),
      fetchChipsPlayed(db, leagueId, gw),
      fetchScores(db, leagueId, gw),
      fetchManagers(db, leagueId),
    ]);

    // Fetch FPL API data needed for stats
    const [bootstrapData, liveData, picksData] = await Promise.all([
      fetchBootstrapData(),
      fetchLiveData(gw),
      fetchAllPicks(managersData, gw),
    ]);

    // Calculate hits statistics
    const hitsData = calculateHits(picksData);

    // Calculate winners/losers
    const winnersData = calculateWinners(scoresData);

    // Calculate differentials
    const differentialsData = calculateDifferentials(
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
      differentials: differentialsData,
    });
  } catch (error: any) {
    console.error('Error fetching gameweek stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gameweek stats' },
      { status: 500 }
    );
  }
}

// Fetch captain picks from database
async function fetchCaptainPicks(db: any, leagueId: number, gw: number) {
  const result = await db.query(`
    SELECT
      ec.captain_name as player_name,
      COUNT(*) as count,
      SUM(ec.captain_points) as total_points
    FROM entry_captains ec
    JOIN managers m ON ec.entry_id = m.entry_id
    WHERE ec.event = $1
    GROUP BY ec.captain_name
    ORDER BY count DESC, total_points DESC
    LIMIT 5
  `, [gw]);

  const totalManagers = await db.query(`
    SELECT COUNT(DISTINCT entry_id) as count
    FROM entry_captains
    WHERE event = $1
  `, [gw]);

  const total = totalManagers.rows[0]?.count || 1;

  return result.rows.map((row: any) => ({
    player_id: 0, // Not available from DB
    player_name: row.player_name,
    team_name: '', // Not available from DB
    count: parseInt(row.count),
    percentage: (parseInt(row.count) / total) * 100,
    avg_points: parseFloat(row.total_points) / parseInt(row.count),
  }));
}

// Fetch chips played directly from FPL API (like My Team does)
async function fetchChipsPlayed(db: any, leagueId: number, gw: number) {
  // Get all managers in the league
  const managers = await fetchManagers(db, leagueId);

  console.log(`Fetching chip history from FPL API for ${managers.length} managers in GW${gw}...`);

  // Fetch chip history from FPL API for each manager
  const chipPromises = managers.map(async (manager: any) => {
    try {
      const response = await fetch(
        `https://fantasy.premierleague.com/api/entry/${manager.entry_id}/history/`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      // Filter chips for this specific gameweek
      return (data.chips || []).filter((chip: any) => chip.event === gw);
    } catch (error) {
      console.error(`Failed to fetch chips for entry ${manager.entry_id}:`, error);
      return [];
    }
  });

  const allChipsArrays = await Promise.all(chipPromises);
  const allChips = allChipsArrays.flat();

  console.log(`Found ${allChips.length} chips played in GW${gw}`);

  // Count chips by type
  const chipCounts: Record<string, number> = {};
  allChips.forEach((chip: any) => {
    const chipName = chip.name; // "wildcard", "bboost", "3xc", "freehit"
    chipCounts[chipName] = (chipCounts[chipName] || 0) + 1;
  });

  const CHIP_NAMES: Record<string, string> = {
    'bboost': 'Bench Boost',
    '3xc': 'Triple Captain',
    'freehit': 'Free Hit',
    'wildcard': 'Wildcard',
  };

  return Object.entries(chipCounts).map(([chip, count]) => ({
    chip_name: chip,
    chip_display: CHIP_NAMES[chip] || chip,
    count: count,
  }));
}

// Fetch scores from h2h_matches
async function fetchScores(db: any, leagueId: number, gw: number) {
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
    SELECT entry_id, player_name, team_name
    FROM managers
    ORDER BY entry_id
  `);

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
  console.log(`Fetching picks for ${managers.length} managers in GW${gw}...`);

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
  const totalManagers = picksData.length;
  const managersWithHits = picksData.filter((p) => p.transfer_cost > 0).length;
  const totalHitCost = picksData.reduce((sum, p) => sum + p.transfer_cost, 0);
  const maxHit = Math.max(...picksData.map((p) => p.transfer_cost), 0);
  const avgHitCost = managersWithHits > 0 ? totalHitCost / managersWithHits : 0;

  return {
    total_managers: totalManagers,
    managers_with_hits: managersWithHits,
    percentage_with_hits: (managersWithHits / totalManagers) * 100,
    total_hit_cost: totalHitCost,
    avg_hit_cost: avgHitCost,
    max_hit: maxHit,
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

// Calculate differentials (low-owned players with high points)
function calculateDifferentials(
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

  // Find players with ownership < 25% and points >= 7
  const differentials: any[] = [];

  Object.entries(playerOwnership).forEach(([playerIdStr, count]) => {
    const playerId = parseInt(playerIdStr);
    const ownershipPercentage = (count / totalManagers) * 100;

    // Only include if ownership < 25%
    if (ownershipPercentage >= 25) return;

    // Find player in bootstrap data
    const player = bootstrapData.elements?.find((e: any) => e.id === playerId);
    if (!player) return;

    // Find player points in live data
    const livePlayer = liveData.elements?.find((e: any) => e.id === playerId);
    const points = livePlayer?.stats?.total_points || 0;

    // Only include if points >= 7
    if (points < 7) return;

    // Find team name
    const team = bootstrapData.teams?.find((t: any) => t.id === player.team);

    differentials.push({
      player_id: playerId,
      player_name: player.web_name,
      team_name: team?.short_name || '',
      ownership_percentage: ownershipPercentage,
      avg_points: points,
      selected_by_count: count,
    });
  });

  // Sort by points descending, then by ownership ascending
  differentials.sort((a, b) => {
    if (b.avg_points !== a.avg_points) {
      return b.avg_points - a.avg_points;
    }
    return a.ownership_percentage - b.ownership_percentage;
  });

  // Return top 10
  return differentials.slice(0, 10);
}
