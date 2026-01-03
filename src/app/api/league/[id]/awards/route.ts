import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Award {
  title: string;
  winner: {
    entry_id: number;
    player_name: string;
    team_name: string;
  };
  value: number;
  unit: string;
  description: string;
}

interface AwardCategory {
  category: string;
  icon: string;
  awards: Award[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    const db = await getDatabase();

    // Fetch all necessary data
    const [managers, gwHistory, chips, matches, standings] = await Promise.all([
      // Get all managers in the league
      db.query(
        `SELECT m.entry_id, m.player_name, m.team_name
         FROM managers m
         JOIN league_standings ls ON ls.entry_id = m.entry_id
         WHERE ls.league_id = $1`,
        [leagueId]
      ),
      // Get all GW history (GW 1-19)
      db.query(
        `SELECT entry_id, event, points, total_points, rank, event_transfers, event_transfers_cost
         FROM manager_gw_history
         WHERE league_id = $1 AND event <= 19
         ORDER BY entry_id, event`,
        [leagueId]
      ),
      // Get all chip usage
      db.query(
        `SELECT entry_id, event, chip_name
         FROM manager_chips
         WHERE league_id = $1 AND event <= 19`,
        [leagueId]
      ),
      // Get all H2H matches
      db.query(
        `SELECT entry_1_id, entry_2_id, entry_1_points, entry_2_points, event, winner
         FROM h2h_matches
         WHERE league_id = $1 AND event <= 19`,
        [leagueId]
      ),
      // Get final standings after GW19
      db.query(
        `SELECT entry_id, rank, total
         FROM league_standings
         WHERE league_id = $1`,
        [leagueId]
      )
    ]);

    const managersData = managers.rows;
    const gwHistoryData = gwHistory.rows;
    const chipsData = chips.rows;
    const matchesData = matches.rows;
    const standingsData = standings.rows;

    // Helper function to get manager info
    const getManager = (entryId: number) => {
      return managersData.find((m: any) => m.entry_id === entryId);
    };

    // Helper function to get GW history for a manager
    const getGWHistory = (entryId: number) => {
      return gwHistoryData.filter((gw: any) => gw.entry_id === entryId);
    };

    // Helper function to get chips for a manager
    const getChips = (entryId: number) => {
      return chipsData.filter((c: any) => c.entry_id === entryId);
    };

    // Helper function to get matches for a manager
    const getMatches = (entryId: number) => {
      return matchesData.filter(
        (m: any) => m.entry_1_id === entryId || m.entry_2_id === entryId
      );
    };

    const categories: AwardCategory[] = [];

    // ==========================================
    // 🏆 THE BIG ONES
    // ==========================================
    const bigOnesAwards: Award[] = [];

    // 1. League Winner
    const winner = standingsData.find((s: any) => s.rank === 1);
    if (winner) {
      const manager = getManager(winner.entry_id);
      bigOnesAwards.push({
        title: 'League Winner',
        winner: {
          entry_id: winner.entry_id,
          player_name: manager?.player_name || 'Unknown',
          team_name: manager?.team_name || 'Unknown'
        },
        value: winner.total,
        unit: 'points',
        description: 'Most total points after 19 gameweeks'
      });
    }

    // 2. Top Scorer
    const topScorer = standingsData.reduce((max: any, current: any) =>
      current.total > max.total ? current : max
    );
    const topScorerManager = getManager(topScorer.entry_id);
    bigOnesAwards.push({
      title: 'Top Scorer',
      winner: {
        entry_id: topScorer.entry_id,
        player_name: topScorerManager?.player_name || 'Unknown',
        team_name: topScorerManager?.team_name || 'Unknown'
      },
      value: topScorer.total,
      unit: 'points',
      description: 'Highest total points in the league'
    });

    // 3. Biggest Climber
    const climbers = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id);
      if (history.length < 2) return null;
      const gw1Rank = history[0]?.rank || 999;
      const gw19Rank = history[history.length - 1]?.rank || 999;
      const rankChange = gw1Rank - gw19Rank;
      return { ...m, rankChange, gw1Rank, gw19Rank };
    }).filter(Boolean);

    if (climbers.length > 0) {
      const biggestClimber = climbers.reduce((max: any, current: any) =>
        current.rankChange > max.rankChange ? current : max
      );
      bigOnesAwards.push({
        title: 'Biggest Climber',
        winner: {
          entry_id: biggestClimber.entry_id,
          player_name: biggestClimber.player_name,
          team_name: biggestClimber.team_name
        },
        value: biggestClimber.rankChange,
        unit: 'places',
        description: `Climbed from ${biggestClimber.gw1Rank} to ${biggestClimber.gw19Rank}`
      });
    }

    // 4. Best Gameweek
    let bestGW = { entry_id: 0, player_name: '', team_name: '', points: 0, event: 0 };
    gwHistoryData.forEach((gw: any) => {
      if (gw.points > bestGW.points) {
        const manager = getManager(gw.entry_id);
        bestGW = {
          entry_id: gw.entry_id,
          player_name: manager?.player_name || 'Unknown',
          team_name: manager?.team_name || 'Unknown',
          points: gw.points,
          event: gw.event
        };
      }
    });
    bigOnesAwards.push({
      title: 'Best Gameweek',
      winner: {
        entry_id: bestGW.entry_id,
        player_name: bestGW.player_name,
        team_name: bestGW.team_name
      },
      value: bestGW.points,
      unit: `pts in GW${bestGW.event}`,
      description: 'Highest single gameweek score'
    });

    categories.push({
      category: 'The Big Ones',
      icon: '🏆',
      awards: bigOnesAwards
    });

    // ==========================================
    // 📊 PERFORMANCE
    // ==========================================
    const performanceAwards: Award[] = [];

    // 1. Most Consistent
    const consistencyScores = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id);
      if (history.length === 0) return null;
      const points = history.map((gw: any) => gw.points);
      const mean = points.reduce((sum: number, p: number) => sum + p, 0) / points.length;
      const variance = points.reduce((sum: number, p: number) => sum + Math.pow(p - mean, 2), 0) / points.length;
      const stdDev = Math.sqrt(variance);
      return { ...m, stdDev, mean };
    }).filter(Boolean);

    if (consistencyScores.length > 0) {
      const mostConsistent = consistencyScores.reduce((min: any, current: any) =>
        current.stdDev < min.stdDev ? current : min
      );
      performanceAwards.push({
        title: 'Most Consistent',
        winner: {
          entry_id: mostConsistent.entry_id,
          player_name: mostConsistent.player_name,
          team_name: mostConsistent.team_name
        },
        value: parseFloat(mostConsistent.stdDev.toFixed(1)),
        unit: 'std dev',
        description: 'Lowest standard deviation in GW scores'
      });
    }

    // 2. Best Average
    const averages = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id);
      if (history.length === 0) return null;
      const avg = history.reduce((sum: any, gw: any) => sum + gw.points, 0) / history.length;
      return { ...m, avg };
    }).filter(Boolean);

    if (averages.length > 0) {
      const bestAverage = averages.reduce((max: any, current: any) =>
        current.avg > max.avg ? current : max
      );
      performanceAwards.push({
        title: 'Best Average',
        winner: {
          entry_id: bestAverage.entry_id,
          player_name: bestAverage.player_name,
          team_name: bestAverage.team_name
        },
        value: parseFloat(bestAverage.avg.toFixed(1)),
        unit: 'pts/GW',
        description: 'Highest average points per gameweek'
      });
    }

    // 3. Hot Streak
    const streaks = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id).sort((a: any, b: any) => a.event - b.event);
      let maxStreak = 0;
      let currentStreak = 0;
      const leagueAvg = gwHistoryData.reduce((sum: any, gw: any) => sum + gw.points, 0) / gwHistoryData.length;

      history.forEach((gw: any) => {
        if (gw.points >= leagueAvg) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      return { ...m, maxStreak };
    });

    const hotStreak = streaks.reduce((max: any, current: any) =>
      current.maxStreak > max.maxStreak ? current : max
    );
    performanceAwards.push({
      title: 'Hot Streak',
      winner: {
        entry_id: hotStreak.entry_id,
        player_name: hotStreak.player_name,
        team_name: hotStreak.team_name
      },
      value: hotStreak.maxStreak,
      unit: 'GWs',
      description: 'Longest streak above league average'
    });

    // 4. Worst Gameweek
    let worstGW = { entry_id: 0, player_name: '', team_name: '', points: 999, event: 0 };
    gwHistoryData.forEach((gw: any) => {
      if (gw.points < worstGW.points) {
        const manager = getManager(gw.entry_id);
        worstGW = {
          entry_id: gw.entry_id,
          player_name: manager?.player_name || 'Unknown',
          team_name: manager?.team_name || 'Unknown',
          points: gw.points,
          event: gw.event
        };
      }
    });
    performanceAwards.push({
      title: 'Worst Gameweek',
      winner: {
        entry_id: worstGW.entry_id,
        player_name: worstGW.player_name,
        team_name: worstGW.team_name
      },
      value: worstGW.points,
      unit: `pts in GW${worstGW.event}`,
      description: 'Lowest single gameweek score'
    });

    // 5. Biggest Faller
    const fallers = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id);
      if (history.length < 2) return null;
      const gw1Rank = history[0]?.rank || 1;
      const gw19Rank = history[history.length - 1]?.rank || 1;
      const rankChange = gw19Rank - gw1Rank;
      return { ...m, rankChange, gw1Rank, gw19Rank };
    }).filter(Boolean);

    if (fallers.length > 0) {
      const biggestFaller = fallers.reduce((max: any, current: any) =>
        current.rankChange > max.rankChange ? current : max
      );
      performanceAwards.push({
        title: 'Biggest Faller',
        winner: {
          entry_id: biggestFaller.entry_id,
          player_name: biggestFaller.player_name,
          team_name: biggestFaller.team_name
        },
        value: biggestFaller.rankChange,
        unit: 'places',
        description: `Fell from ${biggestFaller.gw1Rank} to ${biggestFaller.gw19Rank}`
      });
    }

    // 6. Rollercoaster
    const volatility = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id).sort((a: any, b: any) => a.event - b.event);
      let totalRankChange = 0;

      for (let i = 1; i < history.length; i++) {
        totalRankChange += Math.abs(history[i].rank - history[i - 1].rank);
      }

      return { ...m, totalRankChange };
    });

    const rollercoaster = volatility.reduce((max: any, current: any) =>
      current.totalRankChange > max.totalRankChange ? current : max
    );
    performanceAwards.push({
      title: 'Rollercoaster',
      winner: {
        entry_id: rollercoaster.entry_id,
        player_name: rollercoaster.player_name,
        team_name: rollercoaster.team_name
      },
      value: rollercoaster.totalRankChange,
      unit: 'rank changes',
      description: 'Most volatile rank movement'
    });

    categories.push({
      category: 'Performance',
      icon: '📊',
      awards: performanceAwards
    });

    // ==========================================
    // 🎯 STRATEGY
    // ==========================================
    const strategyAwards: Award[] = [];

    // 1. Transfer King/Queen
    const transferCounts = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id);
      const totalTransfers = history.reduce((sum: any, gw: any) => sum + (gw.event_transfers || 0), 0);
      return { ...m, totalTransfers };
    });

    const transferKing = transferCounts.reduce((max: any, current: any) =>
      current.totalTransfers > max.totalTransfers ? current : max
    );
    strategyAwards.push({
      title: 'Transfer King/Queen',
      winner: {
        entry_id: transferKing.entry_id,
        player_name: transferKing.player_name,
        team_name: transferKing.team_name
      },
      value: transferKing.totalTransfers,
      unit: 'transfers',
      description: 'Most transfers made'
    });

    // 2. Set and Forget
    const setAndForget = transferCounts.reduce((min: any, current: any) =>
      current.totalTransfers < min.totalTransfers ? current : min
    );
    strategyAwards.push({
      title: 'Set and Forget',
      winner: {
        entry_id: setAndForget.entry_id,
        player_name: setAndForget.player_name,
        team_name: setAndForget.team_name
      },
      value: setAndForget.totalTransfers,
      unit: 'transfers',
      description: 'Fewest transfers made'
    });

    // 3. Chip Master
    const chipPoints = managersData.map((m: any) => {
      const managerChips = getChips(m.entry_id);
      let totalChipPoints = 0;

      managerChips.forEach((chip: any) => {
        const gw = gwHistoryData.find((g: any) => g.entry_id === m.entry_id && g.event === chip.event);
        if (gw) {
          // Estimate chip impact (simplified)
          if (chip.chip_name === 'bboost') totalChipPoints += Math.max(0, gw.points - 60);
          if (chip.chip_name === '3xc') totalChipPoints += Math.max(0, (gw.points / 3) - 60);
          if (chip.chip_name === 'freehit') totalChipPoints += Math.max(0, gw.points - 60);
        }
      });

      return { ...m, totalChipPoints, chipsUsed: managerChips.length };
    });

    const chipMaster = chipPoints.reduce((max: any, current: any) =>
      current.totalChipPoints > max.totalChipPoints ? current : max
    );
    strategyAwards.push({
      title: 'Chip Master',
      winner: {
        entry_id: chipMaster.entry_id,
        player_name: chipMaster.player_name,
        team_name: chipMaster.team_name
      },
      value: chipMaster.chipsUsed,
      unit: 'chips used',
      description: 'Best chip timing and value'
    });

    // 4. Hit Taker
    const hitCosts = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id);
      const totalHits = history.reduce((sum: any, gw: any) => sum + (gw.event_transfers_cost || 0), 0);
      return { ...m, totalHits };
    });

    const hitTaker = hitCosts.reduce((max: any, current: any) =>
      current.totalHits > max.totalHits ? current : max
    );
    strategyAwards.push({
      title: 'Hit Taker',
      winner: {
        entry_id: hitTaker.entry_id,
        player_name: hitTaker.player_name,
        team_name: hitTaker.team_name
      },
      value: hitTaker.totalHits,
      unit: 'points lost',
      description: 'Most points lost to transfer hits'
    });

    categories.push({
      category: 'Strategy',
      icon: '🎯',
      awards: strategyAwards
    });

    // ==========================================
    // 🍀 LUCK
    // ==========================================
    const luckAwards: Award[] = [];

    // Calculate luck based on points variance vs opponents
    const luckScores = managersData.map((m: any) => {
      const managerHistory = getGWHistory(m.entry_id);
      const managerMatches = getMatches(m.entry_id);

      let luckScore = 0;

      // Calculate luck based on close matches and upsets
      managerMatches.forEach((match: any) => {
        const opponentId = match.entry_1_id === m.entry_id ? match.entry_2_id : match.entry_1_id;
        const myPoints = match.entry_1_id === m.entry_id ? match.entry_1_points : match.entry_2_points;
        const oppPoints = match.entry_1_id === m.entry_id ? match.entry_2_points : match.entry_1_points;

        const margin = myPoints - oppPoints;

        // Lucky: Won by small margin (1-5 pts)
        if (margin > 0 && margin <= 5) luckScore += 2;
        // Unlucky: Lost by small margin
        if (margin < 0 && margin >= -5) luckScore -= 2;
        // Very lucky: Won when shouldn't have (based on rank)
        const myRank = standingsData.find((s: any) => s.entry_id === m.entry_id)?.rank || 999;
        const oppRank = standingsData.find((s: any) => s.entry_id === opponentId)?.rank || 999;
        if (match.winner === m.entry_id && oppRank < myRank) luckScore += 1;
        if (match.winner === opponentId && myRank < oppRank) luckScore -= 1;
      });

      return { ...m, luckScore };
    });

    // 1. Luckiest Manager
    const luckiest = luckScores.reduce((max: any, current: any) =>
      current.luckScore > max.luckScore ? current : max
    );
    luckAwards.push({
      title: 'Luckiest Manager',
      winner: {
        entry_id: luckiest.entry_id,
        player_name: luckiest.player_name,
        team_name: luckiest.team_name
      },
      value: Math.abs(luckiest.luckScore),
      unit: 'luck points',
      description: 'Most fortunate results'
    });

    // 2. Unluckiest Manager
    const unluckiest = luckScores.reduce((min: any, current: any) =>
      current.luckScore < min.luckScore ? current : min
    );
    luckAwards.push({
      title: 'Unluckiest Manager',
      winner: {
        entry_id: unluckiest.entry_id,
        player_name: unluckiest.player_name,
        team_name: unluckiest.team_name
      },
      value: Math.abs(unluckiest.luckScore),
      unit: 'luck points',
      description: 'Most unfortunate results'
    });

    // 3. Differential Master
    // This would require ownership data - for now use transfer activity as proxy
    const differential = transferCounts.reduce((max: any, current: any) =>
      current.totalTransfers > max.totalTransfers ? current : max
    );
    luckAwards.push({
      title: 'Differential Master',
      winner: {
        entry_id: differential.entry_id,
        player_name: differential.player_name,
        team_name: differential.team_name
      },
      value: differential.totalTransfers,
      unit: 'unique picks',
      description: 'Most unique team selections'
    });

    // 4. Template Team
    const template = transferCounts.reduce((min: any, current: any) =>
      current.totalTransfers < min.totalTransfers ? current : min
    );
    luckAwards.push({
      title: 'Template Team',
      winner: {
        entry_id: template.entry_id,
        player_name: template.player_name,
        team_name: template.team_name
      },
      value: template.totalTransfers,
      unit: 'template %',
      description: 'Most similar to league consensus'
    });

    categories.push({
      category: 'Luck',
      icon: '🍀',
      awards: luckAwards
    });

    // ==========================================
    // ⚔️ H2H BATTLE
    // ==========================================
    const h2hAwards: Award[] = [];

    // 1. Win Streak
    const winStreaks = managersData.map((m: any) => {
      const matches = getMatches(m.entry_id).sort((a: any, b: any) => a.event - b.event);
      let maxStreak = 0;
      let currentStreak = 0;

      matches.forEach((match: any) => {
        const isWin = match.winner === m.entry_id;
        if (isWin) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      return { ...m, maxStreak };
    });

    const winStreak = winStreaks.reduce((max: any, current: any) =>
      current.maxStreak > max.maxStreak ? current : max
    );
    h2hAwards.push({
      title: 'Win Streak',
      winner: {
        entry_id: winStreak.entry_id,
        player_name: winStreak.player_name,
        team_name: winStreak.team_name
      },
      value: winStreak.maxStreak,
      unit: 'wins',
      description: 'Longest consecutive win streak'
    });

    // 2. Giant Slayer
    const giantSlayers = managersData.map((m: any) => {
      const matches = getMatches(m.entry_id);
      let giantSlays = 0;

      matches.forEach((match: any) => {
        const opponentId = match.entry_1_id === m.entry_id ? match.entry_2_id : match.entry_1_id;
        const myRank = standingsData.find((s: any) => s.entry_id === m.entry_id)?.rank || 999;
        const opponentRank = standingsData.find((s: any) => s.entry_id === opponentId)?.rank || 999;

        if (match.winner === m.entry_id && opponentRank < myRank) {
          giantSlays++;
        }
      });

      return { ...m, giantSlays };
    });

    const giantSlayer = giantSlayers.reduce((max: any, current: any) =>
      current.giantSlays > max.giantSlays ? current : max
    );
    h2hAwards.push({
      title: 'Giant Slayer',
      winner: {
        entry_id: giantSlayer.entry_id,
        player_name: giantSlayer.player_name,
        team_name: giantSlayer.team_name
      },
      value: giantSlayer.giantSlays,
      unit: 'upsets',
      description: 'Most wins against higher-ranked opponents'
    });

    // 3. Biggest Victory
    let biggestVictory = { entry_id: 0, player_name: '', team_name: '', margin: 0, opponent: '', event: 0 };
    matchesData.forEach((match: any) => {
      const margin = Math.abs(match.entry_1_points - match.entry_2_points);
      if (margin > biggestVictory.margin) {
        const winnerId = match.entry_1_points > match.entry_2_points ? match.entry_1_id : match.entry_2_id;
        const loserId = match.entry_1_points > match.entry_2_points ? match.entry_2_id : match.entry_1_id;
        const winner = getManager(winnerId);
        const loser = getManager(loserId);
        biggestVictory = {
          entry_id: winnerId,
          player_name: winner?.player_name || 'Unknown',
          team_name: winner?.team_name || 'Unknown',
          margin,
          opponent: loser?.team_name || 'Unknown',
          event: match.event
        };
      }
    });
    h2hAwards.push({
      title: 'Biggest Victory',
      winner: {
        entry_id: biggestVictory.entry_id,
        player_name: biggestVictory.player_name,
        team_name: biggestVictory.team_name
      },
      value: biggestVictory.margin,
      unit: `pts vs ${biggestVictory.opponent}`,
      description: `GW${biggestVictory.event} demolition`
    });

    // 4. Close Call King
    const closeCallCounts = managersData.map((m: any) => {
      const matches = getMatches(m.entry_id);
      const closeCalls = matches.filter((match: any) => {
        const margin = Math.abs(match.entry_1_points - match.entry_2_points);
        return margin <= 5 && match.winner === m.entry_id;
      }).length;

      return { ...m, closeCalls };
    });

    const closeCallKing = closeCallCounts.reduce((max: any, current: any) =>
      current.closeCalls > max.closeCalls ? current : max
    );
    h2hAwards.push({
      title: 'Close Call King',
      winner: {
        entry_id: closeCallKing.entry_id,
        player_name: closeCallKing.player_name,
        team_name: closeCallKing.team_name
      },
      value: closeCallKing.closeCalls,
      unit: 'narrow wins',
      description: 'Most wins by 5 points or less'
    });

    categories.push({
      category: 'H2H Battle',
      icon: '⚔️',
      awards: h2hAwards
    });

    // ==========================================
    // 🎭 FUN
    // ==========================================
    const funAwards: Award[] = [];

    // 1. The Phoenix
    const phoenix = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id).sort((a: any, b: any) => a.event - b.event);
      if (history.length < 5) return null;

      let worstRank = 1;
      let worstGW = 0;
      history.forEach((gw: any) => {
        if (gw.rank > worstRank) {
          worstRank = gw.rank;
          worstGW = gw.event;
        }
      });

      const finalRank = history[history.length - 1]?.rank || worstRank;
      const recovery = worstRank - finalRank;

      return { ...m, recovery, worstRank, finalRank, worstGW };
    }).filter(Boolean);

    if (phoenix.length > 0) {
      const phoenixWinner = phoenix.reduce((max: any, current: any) =>
        current.recovery > max.recovery ? current : max
      );
      funAwards.push({
        title: 'The Phoenix',
        winner: {
          entry_id: phoenixWinner.entry_id,
          player_name: phoenixWinner.player_name,
          team_name: phoenixWinner.team_name
        },
        value: phoenixWinner.recovery,
        unit: 'places',
        description: `Rose from ${phoenixWinner.worstRank} to ${phoenixWinner.finalRank}`
      });
    }

    // 2. The Underachiever
    const underachievers = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id).sort((a: any, b: any) => a.event - b.event);
      if (history.length < 5) return null;

      let bestRank = 999;
      let bestGW = 0;
      history.forEach((gw: any) => {
        if (gw.rank < bestRank) {
          bestRank = gw.rank;
          bestGW = gw.event;
        }
      });

      const finalRank = history[history.length - 1]?.rank || bestRank;
      const decline = finalRank - bestRank;

      return { ...m, decline, bestRank, finalRank, bestGW };
    }).filter(Boolean);

    if (underachievers.length > 0) {
      const underachiever = underachievers.reduce((max: any, current: any) =>
        current.decline > max.decline ? current : max
      );
      funAwards.push({
        title: 'The Underachiever',
        winner: {
          entry_id: underachiever.entry_id,
          player_name: underachiever.player_name,
          team_name: underachiever.team_name
        },
        value: underachiever.decline,
        unit: 'places',
        description: `Dropped from ${underachiever.bestRank} to ${underachiever.finalRank}`
      });
    }

    // 3. The Wildcard
    const wildcards = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id).sort((a: any, b: any) => a.event - b.event);
      if (history.length < 2) return null;

      let maxSwing = 0;
      for (let i = 1; i < history.length; i++) {
        const swing = Math.abs(history[i].points - history[i - 1].points);
        maxSwing = Math.max(maxSwing, swing);
      }

      return { ...m, maxSwing };
    }).filter(Boolean);

    if (wildcards.length > 0) {
      const wildcard = wildcards.reduce((max: any, current: any) =>
        current.maxSwing > max.maxSwing ? current : max
      );
      funAwards.push({
        title: 'The Wildcard',
        winner: {
          entry_id: wildcard.entry_id,
          player_name: wildcard.player_name,
          team_name: wildcard.team_name
        },
        value: wildcard.maxSwing,
        unit: 'pts swing',
        description: 'Biggest week-to-week points swing'
      });
    }

    // 4. The Survivor
    const survivors = managersData.map((m: any) => {
      const history = getGWHistory(m.entry_id);
      const belowAvgWeeks = history.filter((gw: any) => {
        const leagueAvg = gwHistoryData
          .filter((g: any) => g.event === gw.event)
          .reduce((sum: any, g: any) => sum + g.points, 0) / managersData.length;
        return gw.points < leagueAvg * 0.8; // 20% below average
      }).length;

      return { ...m, belowAvgWeeks };
    });

    const survivor = survivors.reduce((max: any, current: any) =>
      current.belowAvgWeeks > max.belowAvgWeeks ? current : max
    );
    funAwards.push({
      title: 'The Survivor',
      winner: {
        entry_id: survivor.entry_id,
        player_name: survivor.player_name,
        team_name: survivor.team_name
      },
      value: survivor.belowAvgWeeks,
      unit: 'bad weeks',
      description: 'Still standing despite most below-average weeks'
    });

    categories.push({
      category: 'Fun',
      icon: '🎭',
      awards: funAwards
    });

    return NextResponse.json({
      success: true,
      data: {
        league_id: leagueId,
        period: 'GW1-19',
        categories
      }
    });

  } catch (error) {
    console.error('Error fetching awards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch awards data';
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
