import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateSeasonLuckIndex } from '@/lib/luckCalculator';

export const dynamic = 'force-dynamic';

interface Manager {
  entry_id: number;
  player_name: string;
  team_name: string;
}

interface Award {
  title: string;
  winner: Manager;
  winner_value: number;
  runner_up?: Manager;
  runner_up_value?: number;
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

    const categories: AwardCategory[] = [];

    // ==========================================
    // 🏆 THE BIG ONES
    // ==========================================
    const bigOnesAwards: Award[] = [];

    // 1. League Winner (H2H standings)
    const leagueWinner = await db.query(
      `SELECT ls.entry_id, ls.rank, ls.total, m.player_name, m.team_name
       FROM league_standings ls
       JOIN managers m ON m.entry_id = ls.entry_id
       WHERE ls.league_id = $1
       ORDER BY ls.rank ASC
       LIMIT 2`,
      [leagueId]
    );

    if (leagueWinner.rows.length > 0) {
      bigOnesAwards.push({
        title: 'League Winner',
        winner: {
          entry_id: leagueWinner.rows[0].entry_id,
          player_name: leagueWinner.rows[0].player_name,
          team_name: leagueWinner.rows[0].team_name
        },
        winner_value: leagueWinner.rows[0].total,
        runner_up: leagueWinner.rows[1] ? {
          entry_id: leagueWinner.rows[1].entry_id,
          player_name: leagueWinner.rows[1].player_name,
          team_name: leagueWinner.rows[1].team_name
        } : undefined,
        runner_up_value: leagueWinner.rows[1]?.total,
        unit: 'H2H pts',
        description: 'Most points in head-to-head standings'
      });
    }

    // 2. Top Scorer (Classic FPL total points) - FIXED
    const topScorer = await db.query(
      `SELECT h.entry_id, SUM(h.points - h.event_transfers_cost) as total_points,
              m.player_name, m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       GROUP BY h.entry_id, m.player_name, m.team_name
       ORDER BY total_points DESC
       LIMIT 2`,
      [leagueId]
    );

    if (topScorer.rows.length > 0) {
      bigOnesAwards.push({
        title: 'Top Scorer',
        winner: {
          entry_id: topScorer.rows[0].entry_id,
          player_name: topScorer.rows[0].player_name,
          team_name: topScorer.rows[0].team_name
        },
        winner_value: parseInt(topScorer.rows[0].total_points),
        runner_up: topScorer.rows[1] ? {
          entry_id: topScorer.rows[1].entry_id,
          player_name: topScorer.rows[1].player_name,
          team_name: topScorer.rows[1].team_name
        } : undefined,
        runner_up_value: topScorer.rows[1] ? parseInt(topScorer.rows[1].total_points) : undefined,
        unit: 'pts',
        description: 'Highest total FPL points (GW1-19)'
      });
    }

    // 3. Biggest Climber
    const climbers = await db.query(
      `WITH FirstLast AS (
        SELECT entry_id,
               FIRST_VALUE(rank) OVER (PARTITION BY entry_id ORDER BY event ASC) as first_rank,
               FIRST_VALUE(rank) OVER (PARTITION BY entry_id ORDER BY event DESC) as last_rank
        FROM manager_gw_history
        WHERE league_id = $1 AND event <= 19
      )
      SELECT DISTINCT fl.entry_id,
             fl.first_rank,
             fl.last_rank,
             (fl.first_rank - fl.last_rank) as rank_change,
             m.player_name,
             m.team_name
      FROM FirstLast fl
      JOIN managers m ON m.entry_id = fl.entry_id
      ORDER BY rank_change DESC
      LIMIT 2`,
      [leagueId]
    );

    if (climbers.rows.length > 0 && climbers.rows[0].rank_change > 0) {
      bigOnesAwards.push({
        title: 'Biggest Climber',
        winner: {
          entry_id: climbers.rows[0].entry_id,
          player_name: climbers.rows[0].player_name,
          team_name: climbers.rows[0].team_name
        },
        winner_value: climbers.rows[0].rank_change,
        runner_up: climbers.rows[1] ? {
          entry_id: climbers.rows[1].entry_id,
          player_name: climbers.rows[1].player_name,
          team_name: climbers.rows[1].team_name
        } : undefined,
        runner_up_value: climbers.rows[1]?.rank_change,
        unit: 'places',
        description: `Climbed from ${climbers.rows[0].first_rank} to ${climbers.rows[0].last_rank}`
      });
    }

    // 4. Best Gameweek - FIXED (add manager name)
    const bestGW = await db.query(
      `SELECT h.entry_id, h.event, h.points, m.player_name, m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       ORDER BY h.points DESC
       LIMIT 2`,
      [leagueId]
    );

    if (bestGW.rows.length > 0) {
      bigOnesAwards.push({
        title: 'Best Gameweek',
        winner: {
          entry_id: bestGW.rows[0].entry_id,
          player_name: bestGW.rows[0].player_name,
          team_name: bestGW.rows[0].team_name
        },
        winner_value: bestGW.rows[0].points,
        runner_up: bestGW.rows[1] ? {
          entry_id: bestGW.rows[1].entry_id,
          player_name: bestGW.rows[1].player_name,
          team_name: bestGW.rows[1].team_name
        } : undefined,
        runner_up_value: bestGW.rows[1]?.points,
        unit: `pts in GW${bestGW.rows[0].event}`,
        description: 'Highest single gameweek score'
      });
    }

    categories.push({
      category: 'The Big Ones',
      icon: '🏆',
      awards: bigOnesAwards
    });

    // ==========================================
    // 📊 PERFORMANCE
    // ==========================================
    const performanceAwards: Award[] = [];

    // 1. Most Consistent (Lowest std dev)
    const consistency = await db.query(
      `SELECT h.entry_id,
              AVG(h.points) as avg_points,
              STDDEV(h.points) as std_dev,
              m.player_name,
              m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       GROUP BY h.entry_id, m.player_name, m.team_name
       HAVING COUNT(*) >= 5
       ORDER BY std_dev ASC
       LIMIT 2`,
      [leagueId]
    );

    if (consistency.rows.length > 0) {
      performanceAwards.push({
        title: 'Most Consistent',
        winner: {
          entry_id: consistency.rows[0].entry_id,
          player_name: consistency.rows[0].player_name,
          team_name: consistency.rows[0].team_name
        },
        winner_value: parseFloat(parseFloat(consistency.rows[0].std_dev).toFixed(1)),
        runner_up: consistency.rows[1] ? {
          entry_id: consistency.rows[1].entry_id,
          player_name: consistency.rows[1].player_name,
          team_name: consistency.rows[1].team_name
        } : undefined,
        runner_up_value: consistency.rows[1] ? parseFloat(parseFloat(consistency.rows[1].std_dev).toFixed(1)) : undefined,
        unit: 'σ std dev',
        description: 'Lowest standard deviation in GW scores'
      });
    }

    // 2. Best Average
    const bestAverage = await db.query(
      `SELECT h.entry_id,
              AVG(h.points) as avg_points,
              m.player_name,
              m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       GROUP BY h.entry_id, m.player_name, m.team_name
       ORDER BY avg_points DESC
       LIMIT 2`,
      [leagueId]
    );

    if (bestAverage.rows.length > 0) {
      performanceAwards.push({
        title: 'Best Average',
        winner: {
          entry_id: bestAverage.rows[0].entry_id,
          player_name: bestAverage.rows[0].player_name,
          team_name: bestAverage.rows[0].team_name
        },
        winner_value: parseFloat(parseFloat(bestAverage.rows[0].avg_points).toFixed(1)),
        runner_up: bestAverage.rows[1] ? {
          entry_id: bestAverage.rows[1].entry_id,
          player_name: bestAverage.rows[1].player_name,
          team_name: bestAverage.rows[1].team_name
        } : undefined,
        runner_up_value: bestAverage.rows[1] ? parseFloat(parseFloat(bestAverage.rows[1].avg_points).toFixed(1)) : undefined,
        unit: 'pts/GW',
        description: 'Highest average points per gameweek'
      });
    }

    // 3. Hot Streak - FIXED (consecutive GWs above average)
    const allManagers = await db.query(
      `SELECT DISTINCT entry_id FROM manager_gw_history WHERE league_id = $1`,
      [leagueId]
    );
    const allHistory = await db.query(
      `SELECT entry_id, event, points FROM manager_gw_history WHERE league_id = $1 AND event <= 19 ORDER BY entry_id, event`,
      [leagueId]
    );
    const managers = await db.query(
      `SELECT m.entry_id, m.player_name, m.team_name
       FROM managers m
       JOIN league_standings ls ON ls.entry_id = m.entry_id
       WHERE ls.league_id = $1`,
      [leagueId]
    );

    // Calculate league average for each GW
    const gwAverages = new Map<number, number>();
    for (let gw = 1; gw <= 19; gw++) {
      const gwPoints = allHistory.rows.filter((h: any) => h.event === gw);
      if (gwPoints.length > 0) {
        const avg = gwPoints.reduce((sum: number, h: any) => sum + h.points, 0) / gwPoints.length;
        gwAverages.set(gw, avg);
      }
    }

    // Calculate hot streaks for each manager
    const hotStreaks = allManagers.rows.map((manager: any) => {
      const history = allHistory.rows.filter((h: any) => h.entry_id === manager.entry_id).sort((a: any, b: any) => a.event - b.event);
      let maxStreak = 0;
      let currentStreak = 0;

      history.forEach((gw: any) => {
        const avg = gwAverages.get(gw.event) || 0;
        if (gw.points > avg) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      const managerInfo = managers.rows.find((m: any) => m.entry_id === manager.entry_id);
      return {
        entry_id: manager.entry_id,
        max_streak: maxStreak,
        player_name: managerInfo?.player_name || 'Unknown',
        team_name: managerInfo?.team_name || 'Unknown'
      };
    }).sort((a: any, b: any) => b.max_streak - a.max_streak);

    if (hotStreaks.length > 0 && hotStreaks[0].max_streak > 0) {
      performanceAwards.push({
        title: 'Hot Streak',
        winner: {
          entry_id: hotStreaks[0].entry_id,
          player_name: hotStreaks[0].player_name,
          team_name: hotStreaks[0].team_name
        },
        winner_value: hotStreaks[0].max_streak,
        runner_up: hotStreaks[1] ? {
          entry_id: hotStreaks[1].entry_id,
          player_name: hotStreaks[1].player_name,
          team_name: hotStreaks[1].team_name
        } : undefined,
        runner_up_value: hotStreaks[1]?.max_streak,
        unit: 'consecutive GWs',
        description: 'Longest streak above league average'
      });
    }

    // 4. Worst Gameweek - FIXED (add manager name)
    const worstGW = await db.query(
      `SELECT h.entry_id, h.event, h.points, m.player_name, m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       ORDER BY h.points ASC
       LIMIT 2`,
      [leagueId]
    );

    if (worstGW.rows.length > 0) {
      performanceAwards.push({
        title: 'Worst Gameweek',
        winner: {
          entry_id: worstGW.rows[0].entry_id,
          player_name: worstGW.rows[0].player_name,
          team_name: worstGW.rows[0].team_name
        },
        winner_value: worstGW.rows[0].points,
        runner_up: worstGW.rows[1] ? {
          entry_id: worstGW.rows[1].entry_id,
          player_name: worstGW.rows[1].player_name,
          team_name: worstGW.rows[1].team_name
        } : undefined,
        runner_up_value: worstGW.rows[1]?.points,
        unit: `pts in GW${worstGW.rows[0].event}`,
        description: 'Lowest single gameweek score'
      });
    }

    // 5. Biggest Faller
    const fallers = await db.query(
      `WITH FirstLast AS (
        SELECT entry_id,
               FIRST_VALUE(rank) OVER (PARTITION BY entry_id ORDER BY event ASC) as first_rank,
               FIRST_VALUE(rank) OVER (PARTITION BY entry_id ORDER BY event DESC) as last_rank
        FROM manager_gw_history
        WHERE league_id = $1 AND event <= 19
      )
      SELECT DISTINCT fl.entry_id,
             fl.first_rank,
             fl.last_rank,
             (fl.last_rank - fl.first_rank) as rank_change,
             m.player_name,
             m.team_name
      FROM FirstLast fl
      JOIN managers m ON m.entry_id = fl.entry_id
      ORDER BY rank_change DESC
      LIMIT 2`,
      [leagueId]
    );

    if (fallers.rows.length > 0 && fallers.rows[0].rank_change > 0) {
      performanceAwards.push({
        title: 'Biggest Faller',
        winner: {
          entry_id: fallers.rows[0].entry_id,
          player_name: fallers.rows[0].player_name,
          team_name: fallers.rows[0].team_name
        },
        winner_value: fallers.rows[0].rank_change,
        runner_up: fallers.rows[1] ? {
          entry_id: fallers.rows[1].entry_id,
          player_name: fallers.rows[1].player_name,
          team_name: fallers.rows[1].team_name
        } : undefined,
        runner_up_value: fallers.rows[1]?.rank_change,
        unit: 'places',
        description: `Fell from ${fallers.rows[0].first_rank} to ${fallers.rows[0].last_rank}`
      });
    }

    // 6. Rollercoaster - FIXED (use std dev)
    const volatility = await db.query(
      `SELECT h.entry_id,
              STDDEV(h.points) as std_dev,
              m.player_name,
              m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       GROUP BY h.entry_id, m.player_name, m.team_name
       HAVING COUNT(*) >= 5
       ORDER BY std_dev DESC
       LIMIT 2`,
      [leagueId]
    );

    if (volatility.rows.length > 0) {
      performanceAwards.push({
        title: 'Rollercoaster',
        winner: {
          entry_id: volatility.rows[0].entry_id,
          player_name: volatility.rows[0].player_name,
          team_name: volatility.rows[0].team_name
        },
        winner_value: parseFloat(parseFloat(volatility.rows[0].std_dev).toFixed(1)),
        runner_up: volatility.rows[1] ? {
          entry_id: volatility.rows[1].entry_id,
          player_name: volatility.rows[1].player_name,
          team_name: volatility.rows[1].team_name
        } : undefined,
        runner_up_value: volatility.rows[1] ? parseFloat(parseFloat(volatility.rows[1].std_dev).toFixed(1)) : undefined,
        unit: 'σ variance',
        description: 'Most volatile weekly scores'
      });
    }

    categories.push({
      category: 'Performance',
      icon: '📊',
      awards: performanceAwards
    });

    // ==========================================
    // 🎯 STRATEGY
    // ==========================================
    const strategyAwards: Award[] = [];

    // 1. Transfer King/Queen - FIXED
    const transferKing = await db.query(
      `SELECT h.entry_id, SUM(h.event_transfers) as total_transfers, m.player_name, m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       GROUP BY h.entry_id, m.player_name, m.team_name
       ORDER BY total_transfers DESC
       LIMIT 2`,
      [leagueId]
    );

    if (transferKing.rows.length > 0) {
      strategyAwards.push({
        title: 'Transfer King/Queen',
        winner: {
          entry_id: transferKing.rows[0].entry_id,
          player_name: transferKing.rows[0].player_name,
          team_name: transferKing.rows[0].team_name
        },
        winner_value: parseInt(transferKing.rows[0].total_transfers),
        runner_up: transferKing.rows[1] ? {
          entry_id: transferKing.rows[1].entry_id,
          player_name: transferKing.rows[1].player_name,
          team_name: transferKing.rows[1].team_name
        } : undefined,
        runner_up_value: transferKing.rows[1] ? parseInt(transferKing.rows[1].total_transfers) : undefined,
        unit: 'transfers',
        description: 'Most transfers made'
      });
    }

    // 2. Set and Forget - FIXED
    const setAndForget = await db.query(
      `SELECT h.entry_id, SUM(h.event_transfers) as total_transfers, m.player_name, m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       GROUP BY h.entry_id, m.player_name, m.team_name
       ORDER BY total_transfers ASC
       LIMIT 2`,
      [leagueId]
    );

    if (setAndForget.rows.length > 0) {
      strategyAwards.push({
        title: 'Set and Forget',
        winner: {
          entry_id: setAndForget.rows[0].entry_id,
          player_name: setAndForget.rows[0].player_name,
          team_name: setAndForget.rows[0].team_name
        },
        winner_value: parseInt(setAndForget.rows[0].total_transfers),
        runner_up: setAndForget.rows[1] ? {
          entry_id: setAndForget.rows[1].entry_id,
          player_name: setAndForget.rows[1].player_name,
          team_name: setAndForget.rows[1].team_name
        } : undefined,
        runner_up_value: setAndForget.rows[1] ? parseInt(setAndForget.rows[1].total_transfers) : undefined,
        unit: 'transfers',
        description: 'Fewest transfers made'
      });
    }

    // 3. Best Chip Week - CHANGED from Chip Master
    const bestChipWeek = await db.query(
      `SELECT c.entry_id, c.chip_name, c.event, h.points, m.player_name, m.team_name
       FROM manager_chips c
       JOIN manager_gw_history h ON h.entry_id = c.entry_id AND h.event = c.event AND h.league_id = c.league_id
       JOIN managers m ON m.entry_id = c.entry_id
       WHERE c.league_id = $1 AND c.event <= 19
       ORDER BY h.points DESC
       LIMIT 2`,
      [leagueId]
    );

    if (bestChipWeek.rows.length > 0) {
      const chipNames: any = {
        'bboost': 'Bench Boost',
        '3xc': 'Triple Captain',
        'freehit': 'Free Hit',
        'wildcard': 'Wildcard'
      };

      strategyAwards.push({
        title: 'Best Chip Week',
        winner: {
          entry_id: bestChipWeek.rows[0].entry_id,
          player_name: bestChipWeek.rows[0].player_name,
          team_name: bestChipWeek.rows[0].team_name
        },
        winner_value: bestChipWeek.rows[0].points,
        runner_up: bestChipWeek.rows[1] ? {
          entry_id: bestChipWeek.rows[1].entry_id,
          player_name: bestChipWeek.rows[1].player_name,
          team_name: bestChipWeek.rows[1].team_name
        } : undefined,
        runner_up_value: bestChipWeek.rows[1]?.points,
        unit: `pts (${chipNames[bestChipWeek.rows[0].chip_name]} GW${bestChipWeek.rows[0].event})`,
        description: 'Highest score in a chip gameweek'
      });
    }

    // 4. Hit Taker - FIXED
    const hitTaker = await db.query(
      `SELECT h.entry_id, SUM(h.event_transfers_cost) as total_hits, m.player_name, m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       GROUP BY h.entry_id, m.player_name, m.team_name
       ORDER BY total_hits DESC
       LIMIT 2`,
      [leagueId]
    );

    if (hitTaker.rows.length > 0) {
      strategyAwards.push({
        title: 'Hit Taker',
        winner: {
          entry_id: hitTaker.rows[0].entry_id,
          player_name: hitTaker.rows[0].player_name,
          team_name: hitTaker.rows[0].team_name
        },
        winner_value: parseInt(hitTaker.rows[0].total_hits),
        runner_up: hitTaker.rows[1] ? {
          entry_id: hitTaker.rows[1].entry_id,
          player_name: hitTaker.rows[1].player_name,
          team_name: hitTaker.rows[1].team_name
        } : undefined,
        runner_up_value: hitTaker.rows[1] ? parseInt(hitTaker.rows[1].total_hits) : undefined,
        unit: 'pts lost to hits',
        description: 'Most points lost to transfer hits'
      });
    }

    categories.push({
      category: 'Strategy',
      icon: '🎯',
      awards: strategyAwards
    });

    // ==========================================
    // 🍀 LUCK - SIMPLIFIED TO 2 AWARDS
    // ==========================================
    const luckAwards: Award[] = [];

    // Use consolidated luck calculator from K-163N
    const luckResults = await calculateSeasonLuckIndex(leagueId, db);
    const sortedLuck = Array.from(luckResults.values())
      .sort((a, b) => b.season_luck_index - a.season_luck_index);

    if (sortedLuck.length >= 2) {
      // 1. Luckiest Manager
      const luckiest = sortedLuck[0];
      const secondLuckiest = sortedLuck[1];
      luckAwards.push({
        title: 'Luckiest Manager',
        winner: {
          entry_id: luckiest.entry_id,
          player_name: luckiest.name,
          team_name: luckiest.team_name
        },
        winner_value: parseFloat((luckiest.season_luck_index * 10).toFixed(1)),
        runner_up: {
          entry_id: secondLuckiest.entry_id,
          player_name: secondLuckiest.name,
          team_name: secondLuckiest.team_name
        },
        runner_up_value: parseFloat((secondLuckiest.season_luck_index * 10).toFixed(1)),
        unit: 'luck index',
        description: 'Highest season luck index'
      });

      // 2. Unluckiest Manager
      const unluckiest = sortedLuck[sortedLuck.length - 1];
      const secondUnluckiest = sortedLuck[sortedLuck.length - 2];
      luckAwards.push({
        title: 'Unluckiest Manager',
        winner: {
          entry_id: unluckiest.entry_id,
          player_name: unluckiest.name,
          team_name: unluckiest.team_name
        },
        winner_value: parseFloat((unluckiest.season_luck_index * 10).toFixed(1)),
        runner_up: {
          entry_id: secondUnluckiest.entry_id,
          player_name: secondUnluckiest.name,
          team_name: secondUnluckiest.team_name
        },
        runner_up_value: parseFloat((secondUnluckiest.season_luck_index * 10).toFixed(1)),
        unit: 'luck index',
        description: 'Lowest season luck index'
      });
    }

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
    const allH2HMatches = await db.query(
      `SELECT entry_1_id, entry_2_id, entry_1_points, entry_2_points, event, winner
       FROM h2h_matches
       WHERE league_id = $1 AND event <= 19
       ORDER BY entry_1_id, event`,
      [leagueId]
    );

    const winStreaks = allManagers.rows.map((manager: any) => {
      const matches = allH2HMatches.rows
        .filter((m: any) => m.entry_1_id === manager.entry_id || m.entry_2_id === manager.entry_id)
        .sort((a: any, b: any) => a.event - b.event);

      let maxStreak = 0;
      let currentStreak = 0;

      matches.forEach((match: any) => {
        if (match.winner === manager.entry_id) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      const managerInfo = managers.rows.find((m: any) => m.entry_id === manager.entry_id);
      return {
        entry_id: manager.entry_id,
        max_streak: maxStreak,
        player_name: managerInfo?.player_name || 'Unknown',
        team_name: managerInfo?.team_name || 'Unknown'
      };
    }).sort((a: any, b: any) => b.max_streak - a.max_streak);

    if (winStreaks.length > 0 && winStreaks[0].max_streak > 0) {
      h2hAwards.push({
        title: 'Win Streak',
        winner: {
          entry_id: winStreaks[0].entry_id,
          player_name: winStreaks[0].player_name,
          team_name: winStreaks[0].team_name
        },
        winner_value: winStreaks[0].max_streak,
        runner_up: winStreaks[1] ? {
          entry_id: winStreaks[1].entry_id,
          player_name: winStreaks[1].player_name,
          team_name: winStreaks[1].team_name
        } : undefined,
        runner_up_value: winStreaks[1]?.max_streak,
        unit: 'consecutive wins',
        description: 'Longest consecutive win streak'
      });
    }

    // 2. Giant Slayer - CLARIFIED (wins vs opponents with more cumulative points)
    const cumulativePoints = new Map<number, Map<number, number>>();
    allHistory.rows.forEach((h: any) => {
      if (!cumulativePoints.has(h.entry_id)) {
        cumulativePoints.set(h.entry_id, new Map());
      }
      const prevGW = h.event - 1;
      const prevCumulative = prevGW > 0 ? (cumulativePoints.get(h.entry_id)?.get(prevGW) || 0) : 0;
      cumulativePoints.get(h.entry_id)!.set(h.event, prevCumulative + h.points);
    });

    const giantSlayers = allManagers.rows.map((manager: any) => {
      const matches = allH2HMatches.rows.filter(
        (m: any) => m.entry_1_id === manager.entry_id || m.entry_2_id === manager.entry_id
      );

      let upsets = 0;
      matches.forEach((match: any) => {
        const isEntry1 = match.entry_1_id === manager.entry_id;
        const myPoints = isEntry1 ? match.entry_1_points : match.entry_2_points;
        const oppPoints = isEntry1 ? match.entry_2_points : match.entry_1_points;
        const oppId = isEntry1 ? match.entry_2_id : match.entry_1_id;

        // Did I win?
        if (myPoints > oppPoints) {
          // Get cumulative points BEFORE this GW
          const myCumulativeBefore = cumulativePoints.get(manager.entry_id)?.get(match.event - 1) || 0;
          const oppCumulativeBefore = cumulativePoints.get(oppId)?.get(match.event - 1) || 0;

          // Upset = won but had fewer total points going in
          if (myCumulativeBefore < oppCumulativeBefore) {
            upsets++;
          }
        }
      });

      const managerInfo = managers.rows.find((m: any) => m.entry_id === manager.entry_id);
      return {
        entry_id: manager.entry_id,
        upsets,
        player_name: managerInfo?.player_name || 'Unknown',
        team_name: managerInfo?.team_name || 'Unknown'
      };
    }).sort((a: any, b: any) => b.upsets - a.upsets);

    if (giantSlayers.length > 0 && giantSlayers[0].upsets > 0) {
      h2hAwards.push({
        title: 'Giant Slayer',
        winner: {
          entry_id: giantSlayers[0].entry_id,
          player_name: giantSlayers[0].player_name,
          team_name: giantSlayers[0].team_name
        },
        winner_value: giantSlayers[0].upsets,
        runner_up: giantSlayers[1] ? {
          entry_id: giantSlayers[1].entry_id,
          player_name: giantSlayers[1].player_name,
          team_name: giantSlayers[1].team_name
        } : undefined,
        runner_up_value: giantSlayers[1]?.upsets,
        unit: 'upset wins',
        description: 'Wins vs higher-ranked opponents'
      });
    }

    // 3. Biggest Victory
    let biggestVictory: any = null;
    let secondBiggest: any = null;
    let maxMargin = 0;
    let secondMargin = 0;

    allH2HMatches.rows.forEach((match: any) => {
      const margin = Math.abs(match.entry_1_points - match.entry_2_points);
      const winnerId = match.entry_1_points > match.entry_2_points ? match.entry_1_id : match.entry_2_id;
      const loserId = match.entry_1_points > match.entry_2_points ? match.entry_2_id : match.entry_1_id;
      const loser = managers.rows.find((m: any) => m.entry_id === loserId);

      if (margin > maxMargin) {
        secondMargin = maxMargin;
        secondBiggest = biggestVictory;
        maxMargin = margin;
        const winner = managers.rows.find((m: any) => m.entry_id === winnerId);
        biggestVictory = {
          entry_id: winnerId,
          player_name: winner?.player_name || 'Unknown',
          team_name: winner?.team_name || 'Unknown',
          margin,
          opponent: loser?.team_name || 'Unknown',
          event: match.event
        };
      } else if (margin > secondMargin) {
        secondMargin = margin;
        const winner = managers.rows.find((m: any) => m.entry_id === winnerId);
        secondBiggest = {
          entry_id: winnerId,
          player_name: winner?.player_name || 'Unknown',
          team_name: winner?.team_name || 'Unknown',
          margin,
          opponent: loser?.team_name || 'Unknown',
          event: match.event
        };
      }
    });

    if (biggestVictory) {
      h2hAwards.push({
        title: 'Biggest Victory',
        winner: {
          entry_id: biggestVictory.entry_id,
          player_name: biggestVictory.player_name,
          team_name: biggestVictory.team_name
        },
        winner_value: biggestVictory.margin,
        runner_up: secondBiggest ? {
          entry_id: secondBiggest.entry_id,
          player_name: secondBiggest.player_name,
          team_name: secondBiggest.team_name
        } : undefined,
        runner_up_value: secondBiggest?.margin,
        unit: `pts vs ${biggestVictory.opponent}`,
        description: `GW${biggestVictory.event} demolition`
      });
    }

    // 4. Close Call King
    const closeCallCounts = allManagers.rows.map((manager: any) => {
      const matches = allH2HMatches.rows.filter(
        (m: any) => m.entry_1_id === manager.entry_id || m.entry_2_id === manager.entry_id
      );

      const closeCalls = matches.filter((match: any) => {
        const isEntry1 = match.entry_1_id === manager.entry_id;
        const myPoints = isEntry1 ? match.entry_1_points : match.entry_2_points;
        const oppPoints = isEntry1 ? match.entry_2_points : match.entry_1_points;
        const margin = Math.abs(myPoints - oppPoints);
        return margin <= 5 && match.winner === manager.entry_id;
      }).length;

      const managerInfo = managers.rows.find((m: any) => m.entry_id === manager.entry_id);
      return {
        entry_id: manager.entry_id,
        close_calls: closeCalls,
        player_name: managerInfo?.player_name || 'Unknown',
        team_name: managerInfo?.team_name || 'Unknown'
      };
    }).sort((a: any, b: any) => b.close_calls - a.close_calls);

    if (closeCallCounts.length > 0 && closeCallCounts[0].close_calls > 0) {
      h2hAwards.push({
        title: 'Close Call King',
        winner: {
          entry_id: closeCallCounts[0].entry_id,
          player_name: closeCallCounts[0].player_name,
          team_name: closeCallCounts[0].team_name
        },
        winner_value: closeCallCounts[0].close_calls,
        runner_up: closeCallCounts[1] ? {
          entry_id: closeCallCounts[1].entry_id,
          player_name: closeCallCounts[1].player_name,
          team_name: closeCallCounts[1].team_name
        } : undefined,
        runner_up_value: closeCallCounts[1]?.close_calls,
        unit: 'narrow wins',
        description: 'Most wins by ≤5 points'
      });
    }

    categories.push({
      category: 'H2H Battle',
      icon: '⚔️',
      awards: h2hAwards
    });

    // ==========================================
    // 🎭 FUN
    // ==========================================
    const funAwards: Award[] = [];

    // Fetch all managers in league for name lookups
    const funManagers = await db.query(
      `SELECT m.entry_id, m.player_name, m.team_name
       FROM managers m
       JOIN league_standings ls ON ls.entry_id = m.entry_id
       WHERE ls.league_id = $1`,
      [leagueId]
    );

    // Get all rank history for Fun awards
    const allRankHistory = await db.query(
      `SELECT entry_id, event, rank
       FROM manager_gw_history
       WHERE league_id = $1 AND event <= 19
       ORDER BY entry_id, event`,
      [leagueId]
    );

    // 1. The Phoenix (greatest recovery from worst rank)
    const phoenixResults = allManagers.rows.map((manager: any) => {
      const rankHistory = allRankHistory.rows
        .filter((h: any) => h.entry_id === manager.entry_id)
        .sort((a: any, b: any) => a.event - b.event);

      if (rankHistory.length < 5) return null;

      let worstRank = 1;
      let worstGW = 0;
      rankHistory.forEach((gw: any) => {
        if (gw.rank > worstRank) {
          worstRank = gw.rank;
          worstGW = gw.event;
        }
      });

      const finalRank = rankHistory[rankHistory.length - 1]?.rank || worstRank;
      const recovery = worstRank - finalRank;

      const managerInfo = funManagers.rows.find((m: any) => m.entry_id === manager.entry_id);
      return {
        entry_id: manager.entry_id,
        recovery,
        worst_rank: worstRank,
        final_rank: finalRank,
        worst_gw: worstGW,
        player_name: managerInfo?.player_name || 'Unknown',
        team_name: managerInfo?.team_name || 'Unknown'
      };
    }).filter(Boolean).sort((a: any, b: any) => b.recovery - a.recovery);

    if (phoenixResults.length > 0 && phoenixResults[0]! && phoenixResults[0]!.recovery > 0) {
      const winner = phoenixResults[0]!;
      const runnerUp = phoenixResults[1];
      funAwards.push({
        title: 'The Phoenix',
        winner: {
          entry_id: winner.entry_id,
          player_name: winner.player_name,
          team_name: winner.team_name
        },
        winner_value: winner.recovery,
        runner_up: runnerUp ? {
          entry_id: runnerUp.entry_id,
          player_name: runnerUp.player_name,
          team_name: runnerUp.team_name
        } : undefined,
        runner_up_value: runnerUp?.recovery,
        unit: 'places',
        description: `Rose from ${winner.worst_rank} to ${winner.final_rank}`
      });
    }

    // 2. The Underachiever (biggest decline from best rank)
    const underachieverResults = allManagers.rows.map((manager: any) => {
      const rankHistory = allRankHistory.rows
        .filter((h: any) => h.entry_id === manager.entry_id)
        .sort((a: any, b: any) => a.event - b.event);

      if (rankHistory.length < 5) return null;

      let bestRank = 999;
      let bestGW = 0;
      rankHistory.forEach((gw: any) => {
        if (gw.rank < bestRank) {
          bestRank = gw.rank;
          bestGW = gw.event;
        }
      });

      const finalRank = rankHistory[rankHistory.length - 1]?.rank || bestRank;
      const decline = finalRank - bestRank;

      const managerInfo = funManagers.rows.find((m: any) => m.entry_id === manager.entry_id);
      return {
        entry_id: manager.entry_id,
        decline,
        best_rank: bestRank,
        final_rank: finalRank,
        best_gw: bestGW,
        player_name: managerInfo?.player_name || 'Unknown',
        team_name: managerInfo?.team_name || 'Unknown'
      };
    }).filter(Boolean).sort((a: any, b: any) => b.decline - a.decline);

    if (underachieverResults.length > 0 && underachieverResults[0]! && underachieverResults[0]!.decline > 0) {
      const winner = underachieverResults[0]!;
      const runnerUp = underachieverResults[1];
      funAwards.push({
        title: 'The Underachiever',
        winner: {
          entry_id: winner.entry_id,
          player_name: winner.player_name,
          team_name: winner.team_name
        },
        winner_value: winner.decline,
        runner_up: runnerUp ? {
          entry_id: runnerUp.entry_id,
          player_name: runnerUp.player_name,
          team_name: runnerUp.team_name
        } : undefined,
        runner_up_value: runnerUp?.decline,
        unit: 'places',
        description: `Dropped from ${winner.best_rank} to ${winner.final_rank}`
      });
    }

    // 3. The Wildcard (biggest week-to-week swing)
    const wildcardCandidates = allManagers.rows.map((manager: any) => {
      const history = allHistory.rows
        .filter((h: any) => h.entry_id === manager.entry_id)
        .sort((a: any, b: any) => a.event - b.event);

      if (history.length < 2) return null;

      let maxSwing = 0;
      for (let i = 1; i < history.length; i++) {
        const swing = Math.abs(history[i].points - history[i - 1].points);
        maxSwing = Math.max(maxSwing, swing);
      }

      const managerInfo = funManagers.rows.find((m: any) => m.entry_id === manager.entry_id);
      return {
        entry_id: manager.entry_id,
        max_swing: maxSwing,
        player_name: managerInfo?.player_name || 'Unknown',
        team_name: managerInfo?.team_name || 'Unknown'
      };
    }).filter(Boolean).sort((a: any, b: any) => b.max_swing - a.max_swing);

    if (wildcardCandidates.length > 0 && wildcardCandidates[0]! && wildcardCandidates[0]!.max_swing > 0) {
      const winner = wildcardCandidates[0]!;
      const runnerUp = wildcardCandidates[1];

      funAwards.push({
        title: 'The Wildcard',
        winner: {
          entry_id: winner.entry_id,
          player_name: winner.player_name,
          team_name: winner.team_name
        },
        winner_value: winner.max_swing,
        runner_up: runnerUp ? {
          entry_id: runnerUp.entry_id,
          player_name: runnerUp.player_name,
          team_name: runnerUp.team_name
        } : undefined,
        runner_up_value: runnerUp?.max_swing,
        unit: 'pts swing',
        description: 'Biggest week-to-week points swing'
      });
    }

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
