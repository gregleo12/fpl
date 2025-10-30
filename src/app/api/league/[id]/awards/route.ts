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

    // Get last completed gameweek
    const bootstrapData = await fplApi.getBootstrapData();
    const lastFinishedEvent = bootstrapData.events
      .filter((e: any) => e.finished)
      .sort((a: any, b: any) => b.id - a.id)[0];
    const lastCompletedGW = lastFinishedEvent?.id || 1;
    const currentGW = lastCompletedGW;

    let awardsData;

    if (view === 'gameweek') {
      awardsData = await calculateGameweekAwards(db, leagueId, lastCompletedGW);
    } else if (view === 'monthly') {
      awardsData = await calculateMonthlyAwards(db, leagueId, currentGW);
    } else if (view === 'season') {
      awardsData = await calculateSeasonAwards(db, leagueId);
    }

    return NextResponse.json({
      [view]: awardsData,
      lastCompletedGW
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
  // Get all matches for the gameweek with captain and bench data
  const matchesResult = await db.query(`
    SELECT
      hm.*,
      m1.player_name as entry_1_player,
      m1.team_name as entry_1_team,
      m2.player_name as entry_2_player,
      m2.team_name as entry_2_team,
      ec1.captain_name as entry_1_captain,
      ec1.captain_points as entry_1_captain_points,
      ec2.captain_name as entry_2_captain,
      ec2.captain_points as entry_2_captain_points,
      mh1.points_on_bench as entry_1_bench_points,
      mh2.points_on_bench as entry_2_bench_points,
      hm.active_chip_1 as entry_1_chip,
      hm.active_chip_2 as entry_2_chip
    FROM h2h_matches hm
    JOIN managers m1 ON hm.entry_1_id = m1.entry_id
    JOIN managers m2 ON hm.entry_2_id = m2.entry_id
    LEFT JOIN entry_captains ec1 ON hm.entry_1_id = ec1.entry_id AND hm.event = ec1.event
    LEFT JOIN entry_captains ec2 ON hm.entry_2_id = ec2.entry_id AND hm.event = ec2.event
    LEFT JOIN manager_history mh1 ON hm.entry_1_id = mh1.entry_id AND hm.event = mh1.event
    LEFT JOIN manager_history mh2 ON hm.entry_2_id = mh2.entry_id AND hm.event = mh2.event
    WHERE hm.league_id = $1 AND hm.event = $2
  `, [leagueId, gameweek]);

  const matches = matchesResult.rows;

  console.log('GW Awards Debug - League:', leagueId, 'GW:', gameweek);
  console.log('Matches found:', matches.length);
  if (matches.length > 0) {
    console.log('Sample match data:', {
      entry_1_captain: matches[0].entry_1_captain,
      entry_1_captain_points: matches[0].entry_1_captain_points,
      entry_1_bench_points: matches[0].entry_1_bench_points,
      entry_1_chip: matches[0].entry_1_chip,
    });
  }

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
      m2.team_name as entry_2_team,
      ec1.captain_name as entry_1_captain,
      ec1.captain_points as entry_1_captain_points,
      ec2.captain_name as entry_2_captain,
      ec2.captain_points as entry_2_captain_points,
      mh1.points_on_bench as entry_1_bench_points,
      mh2.points_on_bench as entry_2_bench_points,
      hm.active_chip_1 as entry_1_chip,
      hm.active_chip_2 as entry_2_chip
    FROM h2h_matches hm
    JOIN managers m1 ON hm.entry_1_id = m1.entry_id
    JOIN managers m2 ON hm.entry_2_id = m2.entry_id
    LEFT JOIN entry_captains ec1 ON hm.entry_1_id = ec1.entry_id AND hm.event = ec1.event
    LEFT JOIN entry_captains ec2 ON hm.entry_2_id = ec2.entry_id AND hm.event = ec2.event
    LEFT JOIN manager_history mh1 ON hm.entry_1_id = mh1.entry_id AND hm.event = mh1.event
    LEFT JOIN manager_history mh2 ON hm.entry_2_id = mh2.entry_id AND hm.event = mh2.event
    WHERE hm.league_id = $1 AND hm.event >= $2 AND hm.event <= $3
  `, [leagueId, startGW, currentGW]);

  const matches = matchesResult.rows;

  const monthMVP = calculateMonthMVP(matches);
  const monthFaller = await calculateMonthFaller(db, leagueId, startGW, currentGW);
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
  // Get all matches with captain and bench data
  const matchesResult = await db.query(`
    SELECT
      hm.*,
      m1.player_name as entry_1_player,
      m1.team_name as entry_1_team,
      m2.player_name as entry_2_player,
      m2.team_name as entry_2_team,
      ec1.captain_name as entry_1_captain,
      ec1.captain_points as entry_1_captain_points,
      ec2.captain_name as entry_2_captain,
      ec2.captain_points as entry_2_captain_points,
      mh1.points_on_bench as entry_1_bench_points,
      mh2.points_on_bench as entry_2_bench_points,
      hm.active_chip_1 as entry_1_chip,
      hm.active_chip_2 as entry_2_chip
    FROM h2h_matches hm
    JOIN managers m1 ON hm.entry_1_id = m1.entry_id
    JOIN managers m2 ON hm.entry_2_id = m2.entry_id
    LEFT JOIN entry_captains ec1 ON hm.entry_1_id = ec1.entry_id AND hm.event = ec1.event
    LEFT JOIN entry_captains ec2 ON hm.entry_2_id = ec2.entry_id AND hm.event = ec2.event
    LEFT JOIN manager_history mh1 ON hm.entry_1_id = mh1.entry_id AND hm.event = mh1.event
    LEFT JOIN manager_history mh2 ON hm.entry_2_id = mh2.entry_id AND hm.event = mh2.event
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

  // Get manager history for team values and hits
  const historyResult = await db.query(`
    SELECT
      mh.*,
      m.player_name,
      m.team_name
    FROM manager_history mh
    JOIN managers m ON mh.entry_id = m.entry_id
    JOIN league_standings ls ON m.entry_id = ls.entry_id
    WHERE ls.league_id = $1
    ORDER BY mh.event DESC
  `, [leagueId]);

  const history = historyResult.rows;

  const seasonLeader = standings[0] ? {
    manager: standings[0].player_name,
    team: standings[0].team_name,
    value: `Rank ${standings[0].rank} (${standings[0].total} pts)`
  } : null;

  const hottestStreak = calculateHottestStreak(matches);
  const highestPeak = calculateHighestPeak(matches);
  const mostWins = calculateMostWins(standings);
  const consistencyKing = calculateConsistencyKing(matches);
  const richestSquad = calculateRichestSquad(history);
  const pointsMachine = calculatePointsMachine(standings);
  const losingStreak = calculateLosingStreak(matches);
  const totalBenchWaste = calculateTotalBenchWaste(matches);
  const wildestRide = calculateWildestRide(matches);
  const hitParade = calculateHitParade(history);
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
  if (gameweek < 2) return null; // Need at least 2 gameweeks to compare

  // Calculate H2H standings for current and previous gameweek
  const currentStandings = await calculateH2HStandingsForGameweek(db, leagueId, gameweek);
  const previousStandings = await calculateH2HStandingsForGameweek(db, leagueId, gameweek - 1);

  // Create maps for quick lookup
  const prevRankMap = new Map<number, number>();
  previousStandings.forEach((standing: any, index: number) => {
    prevRankMap.set(standing.entry_id, index + 1); // rank is 1-indexed
  });

  let biggestRise = 0;
  let winner: any = null;

  currentStandings.forEach((standing: any, index: number) => {
    const currentRank = index + 1;
    const previousRank = prevRankMap.get(standing.entry_id);

    if (previousRank) {
      const rankChange = previousRank - currentRank; // Positive means improved (5→3 = +2)
      if (rankChange > biggestRise) {
        biggestRise = rankChange;
        winner = { manager: standing.player_name, team: standing.team_name };
      }
    }
  });

  console.log('Comeback Kid result:', winner, 'Rise:', biggestRise);

  return winner ? {
    ...winner,
    value: `+${biggestRise} ranks`
  } : null;
}

async function calculateRankCrasher(db: any, leagueId: number, matches: any[], gameweek: number) {
  if (gameweek < 2) return null; // Need at least 2 gameweeks to compare

  // Calculate H2H standings for current and previous gameweek
  const currentStandings = await calculateH2HStandingsForGameweek(db, leagueId, gameweek);
  const previousStandings = await calculateH2HStandingsForGameweek(db, leagueId, gameweek - 1);

  // Create maps for quick lookup
  const prevRankMap = new Map<number, number>();
  previousStandings.forEach((standing: any, index: number) => {
    prevRankMap.set(standing.entry_id, index + 1); // rank is 1-indexed
  });

  let biggestFall = 0;
  let loser: any = null;

  currentStandings.forEach((standing: any, index: number) => {
    const currentRank = index + 1;
    const previousRank = prevRankMap.get(standing.entry_id);

    if (previousRank) {
      const rankChange = previousRank - currentRank; // Negative means worsened (3→5 = -2)
      if (rankChange < 0 && Math.abs(rankChange) > biggestFall) {
        biggestFall = Math.abs(rankChange);
        loser = { manager: standing.player_name, team: standing.team_name };
      }
    }
  });

  console.log('Rank Crasher result:', loser, 'Fall:', biggestFall);

  return loser ? {
    ...loser,
    value: `-${biggestFall} ranks`
  } : null;
}

function calculateChipMaster(matches: any[]) {
  let bestChipScore = 0;
  let winner: any = null;
  let chipUsed = '';

  console.log('Chip Master Debug - Checking', matches.length, 'matches');
  const chipsFound = matches.filter((m: any) => m.entry_1_chip || m.entry_2_chip);
  console.log('Matches with chips:', chipsFound.length, 'Examples:', chipsFound.slice(0, 2).map((m: any) => ({
    e1_chip: m.entry_1_chip,
    e2_chip: m.entry_2_chip
  })));

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

  console.log('Chip Master result:', winner, chipUsed, bestChipScore);

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

  console.log('Captain Fantastic Debug - Checking', matches.length, 'matches');
  const captainsFound = matches.filter((m: any) => m.entry_1_captain_points || m.entry_2_captain_points);
  console.log('Matches with captain data:', captainsFound.length, 'Examples:', captainsFound.slice(0, 2).map((m: any) => ({
    e1_cap: m.entry_1_captain,
    e1_cap_pts: m.entry_1_captain_points,
    e1_total: m.entry_1_points
  })));

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

  console.log('Captain Fantastic result:', winner, bestPercentage, captainName);

  return winner ? {
    ...winner,
    value: `${Math.round(bestPercentage)}% (${captainName})`
  } : null;
}

function calculateBenchDisaster(matches: any[]) {
  let worstBench = 0;
  let loser: any = null;

  console.log('Bench Disaster Debug - Checking', matches.length, 'matches');
  const benchData = matches.filter((m: any) => m.entry_1_bench_points || m.entry_2_bench_points);
  console.log('Matches with bench data:', benchData.length, 'Examples:', benchData.slice(0, 2).map((m: any) => ({
    e1_bench: m.entry_1_bench_points,
    e2_bench: m.entry_2_bench_points
  })));

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

  console.log('Bench Disaster result:', loser, worstBench);

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

async function calculateMonthFaller(db: any, leagueId: number, startGW: number, endGW: number) {
  // Get rank data for start and end of the month period
  const historyResult = await db.query(`
    SELECT
      mh.*,
      m.player_name,
      m.team_name
    FROM manager_history mh
    JOIN managers m ON mh.entry_id = m.entry_id
    JOIN league_standings ls ON m.entry_id = ls.entry_id
    WHERE ls.league_id = $1 AND (mh.event = $2 OR mh.event = $3)
    ORDER BY mh.entry_id, mh.event
  `, [leagueId, startGW, endGW - 1]);

  const history = historyResult.rows;

  // Group by entry to compare start and end ranks
  const entryRanks: Record<string, { startRank?: number, endRank?: number, manager: string, team: string }> = {};

  for (const entry of history) {
    const entryId = entry.entry_id.toString();

    if (!entryRanks[entryId]) {
      entryRanks[entryId] = {
        manager: entry.player_name,
        team: entry.team_name
      };
    }

    if (entry.event === startGW) {
      entryRanks[entryId].startRank = entry.overall_rank;
    } else if (entry.event === endGW - 1) {
      entryRanks[entryId].endRank = entry.overall_rank;
    }
  }

  let biggestFall = 0;
  let loser: any = null;

  for (const [id, data] of Object.entries(entryRanks)) {
    if (data.startRank && data.endRank) {
      const rankChange = data.endRank - data.startRank;
      if (rankChange > biggestFall) {
        biggestFall = rankChange;
        loser = data;
      }
    }
  }

  return loser ? {
    manager: loser.manager,
    team: loser.team,
    value: `-${biggestFall.toLocaleString()} ranks`
  } : null;
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
  const entryCaptainStats: Record<string, { total: number, count: number, manager: string, team: string }> = {};

  for (const match of matches) {
    const entry1Id = match.entry_1_id.toString();
    const entry2Id = match.entry_2_id.toString();

    if (!entryCaptainStats[entry1Id]) {
      entryCaptainStats[entry1Id] = {
        total: 0,
        count: 0,
        manager: match.entry_1_player,
        team: match.entry_1_team
      };
    }
    if (!entryCaptainStats[entry2Id]) {
      entryCaptainStats[entry2Id] = {
        total: 0,
        count: 0,
        manager: match.entry_2_player,
        team: match.entry_2_team
      };
    }

    if (match.entry_1_captain_points !== null) {
      entryCaptainStats[entry1Id].total += match.entry_1_captain_points;
      entryCaptainStats[entry1Id].count++;
    }
    if (match.entry_2_captain_points !== null) {
      entryCaptainStats[entry2Id].total += match.entry_2_captain_points;
      entryCaptainStats[entry2Id].count++;
    }
  }

  let bestAvg = 0;
  let winner: any = null;

  for (const [id, data] of Object.entries(entryCaptainStats)) {
    if (data.count > 0) {
      const avg = data.total / data.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        winner = data;
      }
    }
  }

  return winner ? {
    manager: winner.manager,
    team: winner.team,
    value: `${bestAvg.toFixed(1)} avg pts/GW`
  } : null;
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
  // Calculate variance for each entry's scores
  const entryScores: Record<string, { scores: number[], manager: string, team: string }> = {};

  for (const match of matches) {
    const entry1Id = match.entry_1_id.toString();
    const entry2Id = match.entry_2_id.toString();

    if (!entryScores[entry1Id]) {
      entryScores[entry1Id] = {
        scores: [],
        manager: match.entry_1_player,
        team: match.entry_1_team
      };
    }
    if (!entryScores[entry2Id]) {
      entryScores[entry2Id] = {
        scores: [],
        manager: match.entry_2_player,
        team: match.entry_2_team
      };
    }

    entryScores[entry1Id].scores.push(match.entry_1_points);
    entryScores[entry2Id].scores.push(match.entry_2_points);
  }

  let lowestVariance = Infinity;
  let winner: any = null;

  for (const [id, data] of Object.entries(entryScores)) {
    if (data.scores.length > 1) {
      const avg = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      const variance = data.scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / data.scores.length;
      const stdDev = Math.sqrt(variance);

      if (variance < lowestVariance) {
        lowestVariance = variance;
        winner = { ...data, stdDev };
      }
    }
  }

  return winner ? {
    manager: winner.manager,
    team: winner.team,
    value: `σ = ${winner.stdDev.toFixed(1)}`
  } : null;
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
  // Calculate variance for each entry's scores (opposite of Consistency King)
  const entryScores: Record<string, { scores: number[], manager: string, team: string }> = {};

  for (const match of matches) {
    const entry1Id = match.entry_1_id.toString();
    const entry2Id = match.entry_2_id.toString();

    if (!entryScores[entry1Id]) {
      entryScores[entry1Id] = {
        scores: [],
        manager: match.entry_1_player,
        team: match.entry_1_team
      };
    }
    if (!entryScores[entry2Id]) {
      entryScores[entry2Id] = {
        scores: [],
        manager: match.entry_2_player,
        team: match.entry_2_team
      };
    }

    entryScores[entry1Id].scores.push(match.entry_1_points);
    entryScores[entry2Id].scores.push(match.entry_2_points);
  }

  let highestVariance = 0;
  let winner: any = null;

  for (const [id, data] of Object.entries(entryScores)) {
    if (data.scores.length > 1) {
      const avg = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      const variance = data.scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / data.scores.length;
      const stdDev = Math.sqrt(variance);

      if (variance > highestVariance) {
        highestVariance = variance;
        winner = { ...data, stdDev };
      }
    }
  }

  return winner ? {
    manager: winner.manager,
    team: winner.team,
    value: `σ = ${winner.stdDev.toFixed(1)}`
  } : null;
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

function calculateRichestSquad(history: any[]) {
  // Find the manager with the highest team value (most recent data)
  const entryValues: Record<string, { value: number, manager: string, team: string }> = {};

  for (const entry of history) {
    const entryId = entry.entry_id.toString();

    if (!entryValues[entryId] && entry.value) {
      entryValues[entryId] = {
        value: entry.value,
        manager: entry.player_name,
        team: entry.team_name
      };
    }
  }

  let highestValue = 0;
  let winner: any = null;

  for (const [id, data] of Object.entries(entryValues)) {
    if (data.value > highestValue) {
      highestValue = data.value;
      winner = data;
    }
  }

  return winner ? {
    manager: winner.manager,
    team: winner.team,
    value: `£${(highestValue / 10).toFixed(1)}M`
  } : null;
}

function calculateHitParade(history: any[]) {
  // Sum up all transfer costs for each manager
  const entryHits: Record<string, { total: number, count: number, manager: string, team: string }> = {};

  for (const entry of history) {
    const entryId = entry.entry_id.toString();

    if (!entryHits[entryId]) {
      entryHits[entryId] = {
        total: 0,
        count: 0,
        manager: entry.player_name,
        team: entry.team_name
      };
    }

    if (entry.event_transfers_cost && entry.event_transfers_cost > 0) {
      entryHits[entryId].total += entry.event_transfers_cost;
      entryHits[entryId].count++;
    }
  }

  let mostHits = 0;
  let loser: any = null;

  for (const [id, data] of Object.entries(entryHits)) {
    if (data.total > mostHits) {
      mostHits = data.total;
      loser = data;
    }
  }

  return loser ? {
    manager: loser.manager,
    team: loser.team,
    value: `-${mostHits} pts (${loser.count} hits)`
  } : null;
}

// Helper function to calculate H2H standings for a specific gameweek
async function calculateH2HStandingsForGameweek(db: any, leagueId: number, gameweek: number) {
  // Get all matches up to and including the specified gameweek
  const result = await db.query(`
    WITH match_results AS (
      SELECT
        entry_1_id AS entry_id,
        CASE
          WHEN winner = entry_1_id THEN 3
          WHEN winner IS NULL THEN 1
          ELSE 0
        END AS points,
        entry_1_points AS points_for,
        entry_2_points AS points_against
      FROM h2h_matches
      WHERE league_id = $1 AND event <= $2

      UNION ALL

      SELECT
        entry_2_id AS entry_id,
        CASE
          WHEN winner = entry_2_id THEN 3
          WHEN winner IS NULL THEN 1
          ELSE 0
        END AS points,
        entry_2_points AS points_for,
        entry_1_points AS points_against
      FROM h2h_matches
      WHERE league_id = $1 AND event <= $2
    ),
    standings AS (
      SELECT
        mr.entry_id,
        SUM(mr.points) AS total_points,
        SUM(mr.points_for) AS total_points_for,
        SUM(mr.points_against) AS total_points_against
      FROM match_results mr
      GROUP BY mr.entry_id
    )
    SELECT
      s.*,
      m.player_name,
      m.team_name
    FROM standings s
    JOIN managers m ON s.entry_id = m.entry_id
    ORDER BY s.total_points DESC, s.total_points_for DESC, s.entry_id ASC
  `, [leagueId, gameweek]);

  return result.rows;
}
