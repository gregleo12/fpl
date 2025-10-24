import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { fplApi } from '@/lib/fpl-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'gameweek';

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    const db = await getDatabase();

    // Get current gameweek
    const bootstrapData = await fplApi.getBootstrapData();
    const currentEvent = bootstrapData.events.find((e: any) => e.is_current || e.is_next);
    const currentGW = currentEvent?.id || 1;

    let awardsData;

    if (view === 'gameweek') {
      awardsData = await calculateGameweekAwards(db, leagueId, currentGW - 1); // Last completed GW
    } else if (view === 'monthly') {
      awardsData = await calculateMonthlyAwards(db, leagueId, currentGW);
    } else if (view === 'season') {
      awardsData = await calculateSeasonAwards(db, leagueId);
    }

    return NextResponse.json({
      [view]: awardsData
    });
  } catch (error: any) {
    console.error('Error fetching awards:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch awards' },
      { status: 500 }
    );
  }
}

async function calculateGameweekAwards(db: any, leagueId: number, gameweek: number) {
  // Get all matches for the gameweek
  const matchesResult = await db.query(`
    SELECT
      hm.*,
      m1.player_name as entry_1_player,
      m1.team_name as entry_1_team,
      m2.player_name as entry_2_player,
      m2.team_name as entry_2_team
    FROM h2h_matches hm
    JOIN managers m1 ON hm.entry_1_id = m1.entry_id
    JOIN managers m2 ON hm.entry_2_id = m2.entry_id
    WHERE hm.league_id = $1 AND hm.event = $2
  `, [leagueId, gameweek]);

  const matches = matchesResult.rows;

  // Get all managers
  const managersResult = await db.query(`
    SELECT *
    FROM managers
    WHERE league_id = $1
  `, [leagueId]);

  const managers = managersResult.rows;

  // Calculate various awards
  const topGun = calculateTopGun(matches, gameweek);
  const toughWeek = calculateToughWeek(matches, gameweek);
  const comebackKid = await calculateComebackKid(db, leagueId, matches, gameweek);
  const rankCrasher = await calculateRankCrasher(db, leagueId, matches, gameweek);
  const chipMaster = calculateChipMaster(matches);
  const captainFantastic = calculateCaptainFantastic(matches);
  const benchDisaster = calculateBenchDisaster(matches);
  const captainFlop = calculateCaptainFlop(matches);

  return {
    topGun,
    toughWeek,
    comebackKid,
    rankCrasher,
    chipMaster,
    captainFantastic,
    benchDisaster,
    captainFlop
  };
}

async function calculateMonthlyAwards(db: any, leagueId: number, currentGW: number) {
  // For simplicity, we'll use last 3-4 GWs as "this month"
  const startGW = Math.max(1, currentGW - 3);

  const matchesResult = await db.query(`
    SELECT
      hm.*,
      m1.player_name as entry_1_player,
      m1.team_name as entry_1_team,
      m2.player_name as entry_2_player,
      m2.team_name as entry_2_team
    FROM h2h_matches hm
    JOIN managers m1 ON hm.entry_1_id = m1.entry_id
    JOIN managers m2 ON hm.entry_2_id = m2.entry_id
    WHERE hm.league_id = $1 AND hm.event >= $2 AND hm.event < $3
  `, [leagueId, startGW, currentGW]);

  const matches = matchesResult.rows;

  const monthMVP = calculateMonthMVP(matches);
  const monthFaller = calculateMonthFaller(matches);
  const monthHighest = calculateMonthHighest(matches);
  const monthToughest = calculateMonthToughest(matches);
  const captainOfMonth = calculateCaptainOfMonth(matches);
  const benchWaste = calculateBenchWaste(matches);

  return {
    monthMVP,
    monthFaller,
    monthHighest,
    monthToughest,
    captainOfMonth,
    benchWaste
  };
}

async function calculateSeasonAwards(db: any, leagueId: number) {
  // Get all matches
  const matchesResult = await db.query(`
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
  `, [leagueId]);

  const matches = matchesResult.rows;

  // Get standings
  const standingsResult = await db.query(`
    SELECT
      ls.*,
      m.player_name,
      m.team_name
    FROM league_standings ls
    JOIN managers m ON ls.entry_id = m.entry_id
    WHERE ls.league_id = $1
    ORDER BY ls.rank ASC
  `, [leagueId]);

  const standings = standingsResult.rows;

  const seasonLeader = standings[0] ? {
    manager: standings[0].player_name,
    team: standings[0].team_name,
    value: `Rank ${standings[0].rank} (${standings[0].total} pts)`
  } : null;

  const hottestStreak = calculateHottestStreak(matches);
  const highestPeak = calculateHighestPeak(matches);
  const mostWins = calculateMostWins(standings);
  const consistencyKing = calculateConsistencyKing(matches);
  const richestSquad = { manager: 'N/A', team: 'N/A', value: 'Coming soon' };
  const pointsMachine = calculatePointsMachine(standings);
  const losingStreak = calculateLosingStreak(matches);
  const totalBenchWaste = calculateTotalBenchWaste(matches);
  const wildestRide = calculateWildestRide(matches);
  const hitParade = { manager: 'N/A', team: 'N/A', value: 'Coming soon' };
  const worstLoss = calculateWorstLoss(matches);

  return {
    seasonLeader,
    hottestStreak,
    highestPeak,
    mostWins,
    consistencyKing,
    richestSquad,
    pointsMachine,
    losingStreak,
    totalBenchWaste,
    wildestRide,
    hitParade,
    worstLoss
  };
}

// ===== HELPER FUNCTIONS =====

function calculateTopGun(matches: any[], gameweek: number) {
  let topScore = 0;
  let winner: any = null;

  for (const match of matches) {
    if (match.entry_1_points > topScore) {
      topScore = match.entry_1_points;
      winner = { manager: match.entry_1_player, team: match.entry_1_team };
    }
    if (match.entry_2_points > topScore) {
      topScore = match.entry_2_points;
      winner = { manager: match.entry_2_player, team: match.entry_2_team };
    }
  }

  return winner ? {
    ...winner,
    value: `${topScore} pts`
  } : null;
}

function calculateToughWeek(matches: any[], gameweek: number) {
  let lowestScore = Infinity;
  let loser: any = null;

  for (const match of matches) {
    if (match.entry_1_points < lowestScore) {
      lowestScore = match.entry_1_points;
      loser = { manager: match.entry_1_player, team: match.entry_1_team };
    }
    if (match.entry_2_points < lowestScore) {
      lowestScore = match.entry_2_points;
      loser = { manager: match.entry_2_player, team: match.entry_2_team };
    }
  }

  return loser ? {
    ...loser,
    value: `${lowestScore} pts`
  } : null;
}

async function calculateComebackKid(db: any, leagueId: number, matches: any[], gameweek: number) {
  // For now, return placeholder
  return { manager: 'N/A', team: 'N/A', value: 'Coming soon' };
}

async function calculateRankCrasher(db: any, leagueId: number, matches: any[], gameweek: number) {
  // For now, return placeholder
  return { manager: 'N/A', team: 'N/A', value: 'Coming soon' };
}

function calculateChipMaster(matches: any[]) {
  let bestChipScore = 0;
  let winner: any = null;
  let chipUsed = '';

  for (const match of matches) {
    if (match.entry_1_chip && match.entry_1_points > bestChipScore) {
      bestChipScore = match.entry_1_points;
      winner = { manager: match.entry_1_player, team: match.entry_1_team };
      chipUsed = match.entry_1_chip;
    }
    if (match.entry_2_chip && match.entry_2_points > bestChipScore) {
      bestChipScore = match.entry_2_points;
      winner = { manager: match.entry_2_player, team: match.entry_2_team };
      chipUsed = match.entry_2_chip;
    }
  }

  return winner ? {
    ...winner,
    value: `${chipUsed}, ${bestChipScore} pts`
  } : null;
}

function calculateCaptainFantastic(matches: any[]) {
  let bestPercentage = 0;
  let winner: any = null;
  let captainName = '';
  let totalPoints = 0;

  for (const match of matches) {
    if (match.entry_1_captain_points && match.entry_1_points > 0) {
      const percentage = (match.entry_1_captain_points / match.entry_1_points) * 100;
      if (percentage > bestPercentage && percentage >= 50) {
        bestPercentage = percentage;
        winner = { manager: match.entry_1_player, team: match.entry_1_team };
        captainName = match.entry_1_captain || 'Unknown';
        totalPoints = match.entry_1_points;
      }
    }
    if (match.entry_2_captain_points && match.entry_2_points > 0) {
      const percentage = (match.entry_2_captain_points / match.entry_2_points) * 100;
      if (percentage > bestPercentage && percentage >= 50) {
        bestPercentage = percentage;
        winner = { manager: match.entry_2_player, team: match.entry_2_team };
        captainName = match.entry_2_captain || 'Unknown';
        totalPoints = match.entry_2_points;
      }
    }
  }

  return winner ? {
    ...winner,
    value: `${Math.round(bestPercentage)}% (${captainName})`
  } : null;
}

function calculateBenchDisaster(matches: any[]) {
  let worstBench = 0;
  let loser: any = null;

  for (const match of matches) {
    if (!match.entry_1_chip && match.entry_1_bench_points > worstBench && match.entry_1_bench_points >= 20) {
      worstBench = match.entry_1_bench_points;
      loser = { manager: match.entry_1_player, team: match.entry_1_team };
    }
    if (!match.entry_2_chip && match.entry_2_bench_points > worstBench && match.entry_2_bench_points >= 20) {
      worstBench = match.entry_2_bench_points;
      loser = { manager: match.entry_2_player, team: match.entry_2_team };
    }
  }

  return loser ? {
    ...loser,
    value: `${worstBench} pts on bench`
  } : null;
}

function calculateCaptainFlop(matches: any[]) {
  let worstCaptain = Infinity;
  let loser: any = null;
  let captainName = '';

  for (const match of matches) {
    if (match.entry_1_captain_points !== null && match.entry_1_captain_points < worstCaptain && match.entry_1_captain_points < 4) {
      worstCaptain = match.entry_1_captain_points;
      loser = { manager: match.entry_1_player, team: match.entry_1_team };
      captainName = match.entry_1_captain || 'Unknown';
    }
    if (match.entry_2_captain_points !== null && match.entry_2_captain_points < worstCaptain && match.entry_2_captain_points < 4) {
      worstCaptain = match.entry_2_captain_points;
      loser = { manager: match.entry_2_player, team: match.entry_2_team };
      captainName = match.entry_2_captain || 'Unknown';
    }
  }

  return loser ? {
    ...loser,
    value: `${captainName} (${worstCaptain} pts)`
  } : null;
}

// Monthly awards helpers
function calculateMonthMVP(matches: any[]) {
  const entryPoints: Record<string, { points: number, manager: string, team: string }> = {};

  for (const match of matches) {
    const winner = match.winner;
    if (winner) {
      const winnerId = winner.toString();
      if (!entryPoints[winnerId]) {
        const isEntry1 = winnerId === match.entry_1_id.toString();
        entryPoints[winnerId] = {
          points: 0,
          manager: isEntry1 ? match.entry_1_player : match.entry_2_player,
          team: isEntry1 ? match.entry_1_team : match.entry_2_team
        };
      }
      entryPoints[winnerId].points += 3; // 3 points for a win
    }
  }

  let bestEntry: any = null;
  let maxPoints = 0;

  for (const [id, data] of Object.entries(entryPoints)) {
    if (data.points > maxPoints) {
      maxPoints = data.points;
      bestEntry = data;
    }
  }

  return bestEntry ? {
    manager: bestEntry.manager,
    team: bestEntry.team,
    value: `${maxPoints} H2H pts`
  } : null;
}

function calculateMonthFaller(matches: any[]) {
  return { manager: 'N/A', team: 'N/A', value: 'Coming soon' };
}

function calculateMonthHighest(matches: any[]) {
  let highestScore = 0;
  let winner: any = null;

  for (const match of matches) {
    if (match.entry_1_points > highestScore) {
      highestScore = match.entry_1_points;
      winner = { manager: match.entry_1_player, team: match.entry_1_team };
    }
    if (match.entry_2_points > highestScore) {
      highestScore = match.entry_2_points;
      winner = { manager: match.entry_2_player, team: match.entry_2_team };
    }
  }

  return winner ? {
    ...winner,
    value: `${highestScore} pts`
  } : null;
}

function calculateMonthToughest(matches: any[]) {
  const entryScores: Record<string, { total: number, count: number, manager: string, team: string }> = {};

  for (const match of matches) {
    const entry1Id = match.entry_1_id.toString();
    const entry2Id = match.entry_2_id.toString();

    if (!entryScores[entry1Id]) {
      entryScores[entry1Id] = {
        total: 0,
        count: 0,
        manager: match.entry_1_player,
        team: match.entry_1_team
      };
    }
    if (!entryScores[entry2Id]) {
      entryScores[entry2Id] = {
        total: 0,
        count: 0,
        manager: match.entry_2_player,
        team: match.entry_2_team
      };
    }

    entryScores[entry1Id].total += match.entry_1_points;
    entryScores[entry1Id].count++;
    entryScores[entry2Id].total += match.entry_2_points;
    entryScores[entry2Id].count++;
  }

  let lowestAvg = Infinity;
  let loser: any = null;

  for (const [id, data] of Object.entries(entryScores)) {
    const avg = data.total / data.count;
    if (avg < lowestAvg) {
      lowestAvg = avg;
      loser = data;
    }
  }

  return loser ? {
    manager: loser.manager,
    team: loser.team,
    value: `${lowestAvg.toFixed(1)} avg pts/GW`
  } : null;
}

function calculateCaptainOfMonth(matches: any[]) {
  return { manager: 'N/A', team: 'N/A', value: 'Coming soon' };
}

function calculateBenchWaste(matches: any[]) {
  const entryBench: Record<string, { total: number, manager: string, team: string }> = {};

  for (const match of matches) {
    const entry1Id = match.entry_1_id.toString();
    const entry2Id = match.entry_2_id.toString();

    if (!entryBench[entry1Id]) {
      entryBench[entry1Id] = {
        total: 0,
        manager: match.entry_1_player,
        team: match.entry_1_team
      };
    }
    if (!entryBench[entry2Id]) {
      entryBench[entry2Id] = {
        total: 0,
        manager: match.entry_2_player,
        team: match.entry_2_team
      };
    }

    entryBench[entry1Id].total += match.entry_1_bench_points || 0;
    entryBench[entry2Id].total += match.entry_2_bench_points || 0;
  }

  let mostBench = 0;
  let loser: any = null;

  for (const [id, data] of Object.entries(entryBench)) {
    if (data.total > mostBench) {
      mostBench = data.total;
      loser = data;
    }
  }

  return loser ? {
    manager: loser.manager,
    team: loser.team,
    value: `${mostBench} pts`
  } : null;
}

// Season awards helpers
function calculateHottestStreak(matches: any[]) {
  // Group matches by entry and calculate winning streaks
  const entryMatches: Record<string, any[]> = {};

  for (const match of matches) {
    const entry1Id = match.entry_1_id.toString();
    const entry2Id = match.entry_2_id.toString();

    if (!entryMatches[entry1Id]) entryMatches[entry1Id] = [];
    if (!entryMatches[entry2Id]) entryMatches[entry2Id] = [];

    entryMatches[entry1Id].push({
      event: match.event,
      won: match.winner && match.winner.toString() === entry1Id,
      manager: match.entry_1_player,
      team: match.entry_1_team
    });

    entryMatches[entry2Id].push({
      event: match.event,
      won: match.winner && match.winner.toString() === entry2Id,
      manager: match.entry_2_player,
      team: match.entry_2_team
    });
  }

  let longestStreak = 0;
  let winner: any = null;

  for (const [id, entryMatchList] of Object.entries(entryMatches)) {
    entryMatchList.sort((a, b) => b.event - a.event);

    let currentStreak = 0;
    let maxStreak = 0;

    for (const match of entryMatchList) {
      if (match.won) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    if (maxStreak > longestStreak) {
      longestStreak = maxStreak;
      winner = { manager: entryMatchList[0].manager, team: entryMatchList[0].team };
    }
  }

  return winner ? {
    ...winner,
    value: `W${longestStreak} streak`
  } : null;
}

function calculateHighestPeak(matches: any[]) {
  let highestScore = 0;
  let winner: any = null;
  let gameweek = 0;

  for (const match of matches) {
    if (match.entry_1_points > highestScore) {
      highestScore = match.entry_1_points;
      winner = { manager: match.entry_1_player, team: match.entry_1_team };
      gameweek = match.event;
    }
    if (match.entry_2_points > highestScore) {
      highestScore = match.entry_2_points;
      winner = { manager: match.entry_2_player, team: match.entry_2_team };
      gameweek = match.event;
    }
  }

  return winner ? {
    ...winner,
    value: `${highestScore} pts (GW${gameweek})`
  } : null;
}

function calculateMostWins(standings: any[]) {
  let mostWins = 0;
  let winner: any = null;

  for (const standing of standings) {
    if (standing.matches_won > mostWins) {
      mostWins = standing.matches_won;
      winner = { manager: standing.player_name, team: standing.team_name };
    }
  }

  return winner ? {
    ...winner,
    value: `${mostWins} wins`
  } : null;
}

function calculateConsistencyKing(matches: any[]) {
  return { manager: 'N/A', team: 'N/A', value: 'Coming soon' };
}

function calculatePointsMachine(standings: any[]) {
  let mostPoints = 0;
  let winner: any = null;

  for (const standing of standings) {
    if (standing.points_for > mostPoints) {
      mostPoints = standing.points_for;
      winner = { manager: standing.player_name, team: standing.team_name };
    }
  }

  return winner ? {
    ...winner,
    value: `${mostPoints} total pts`
  } : null;
}

function calculateLosingStreak(matches: any[]) {
  const entryMatches: Record<string, any[]> = {};

  for (const match of matches) {
    const entry1Id = match.entry_1_id.toString();
    const entry2Id = match.entry_2_id.toString();

    if (!entryMatches[entry1Id]) entryMatches[entry1Id] = [];
    if (!entryMatches[entry2Id]) entryMatches[entry2Id] = [];

    entryMatches[entry1Id].push({
      event: match.event,
      lost: match.winner && match.winner.toString() !== entry1Id && match.winner !== null,
      manager: match.entry_1_player,
      team: match.entry_1_team
    });

    entryMatches[entry2Id].push({
      event: match.event,
      lost: match.winner && match.winner.toString() !== entry2Id && match.winner !== null,
      manager: match.entry_2_player,
      team: match.entry_2_team
    });
  }

  let longestStreak = 0;
  let loser: any = null;

  for (const [id, entryMatchList] of Object.entries(entryMatches)) {
    entryMatchList.sort((a, b) => b.event - a.event);

    let currentStreak = 0;
    let maxStreak = 0;

    for (const match of entryMatchList) {
      if (match.lost) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    if (maxStreak > longestStreak) {
      longestStreak = maxStreak;
      loser = { manager: entryMatchList[0].manager, team: entryMatchList[0].team };
    }
  }

  return loser && longestStreak > 0 ? {
    ...loser,
    value: `L${longestStreak} streak`
  } : null;
}

function calculateTotalBenchWaste(matches: any[]) {
  const entryBench: Record<string, { total: number, manager: string, team: string }> = {};

  for (const match of matches) {
    const entry1Id = match.entry_1_id.toString();
    const entry2Id = match.entry_2_id.toString();

    if (!entryBench[entry1Id]) {
      entryBench[entry1Id] = {
        total: 0,
        manager: match.entry_1_player,
        team: match.entry_1_team
      };
    }
    if (!entryBench[entry2Id]) {
      entryBench[entry2Id] = {
        total: 0,
        manager: match.entry_2_player,
        team: match.entry_2_team
      };
    }

    entryBench[entry1Id].total += match.entry_1_bench_points || 0;
    entryBench[entry2Id].total += match.entry_2_bench_points || 0;
  }

  let mostBench = 0;
  let loser: any = null;

  for (const [id, data] of Object.entries(entryBench)) {
    if (data.total > mostBench) {
      mostBench = data.total;
      loser = data;
    }
  }

  return loser ? {
    manager: loser.manager,
    team: loser.team,
    value: `${mostBench} total pts`
  } : null;
}

function calculateWildestRide(matches: any[]) {
  return { manager: 'N/A', team: 'N/A', value: 'Coming soon' };
}

function calculateWorstLoss(matches: any[]) {
  let worstMargin = 0;
  let loser: any = null;
  let opponentName = '';
  let scores = '';

  for (const match of matches) {
    const margin = Math.abs(match.entry_1_points - match.entry_2_points);

    if (margin > worstMargin) {
      worstMargin = margin;
      if (match.entry_1_points < match.entry_2_points) {
        loser = { manager: match.entry_1_player, team: match.entry_1_team };
        opponentName = match.entry_2_player;
        scores = `${match.entry_1_points}-${match.entry_2_points}`;
      } else {
        loser = { manager: match.entry_2_player, team: match.entry_2_team };
        opponentName = match.entry_1_player;
        scores = `${match.entry_2_points}-${match.entry_1_points}`;
      }
    }
  }

  return loser ? {
    ...loser,
    value: `Lost ${scores} (-${worstMargin})`
  } : null;
}
