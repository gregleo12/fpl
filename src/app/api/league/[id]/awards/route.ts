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
  third_place?: Manager;
  third_place_value?: number;
  unit: string;
  description: string;
}

interface AwardCategory {
  category: string;
  icon: string;
  awards: Award[];
}

// Helper function for ordinal suffixes (1st, 2nd, 3rd, etc.)
function getSuffix(rank: number): string {
  const j = rank % 10;
  const k = rank % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
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
       LIMIT 3`,
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
        third_place: leagueWinner.rows[2] ? {
          entry_id: leagueWinner.rows[2].entry_id,
          player_name: leagueWinner.rows[2].player_name,
          team_name: leagueWinner.rows[2].team_name
        } : undefined,
        third_place_value: leagueWinner.rows[2]?.total,
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
       LIMIT 3`,
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
        third_place: topScorer.rows[2] ? {
          entry_id: topScorer.rows[2].entry_id,
          player_name: topScorer.rows[2].player_name,
          team_name: topScorer.rows[2].team_name
        } : undefined,
        third_place_value: topScorer.rows[2] ? parseInt(topScorer.rows[2].total_points) : undefined,
        unit: 'pts',
        description: 'Highest total FPL points (GW1-19)'
      });
    }

    // 3. Biggest Climber (NEW: Peak upward swing GW5-19)
    // Calculate H2H league standings at each GW from 5-19
    const calculateH2HRank = async (upToGW: number) => {
      const standings = await db.query(
        `SELECT ls.entry_id, ls.total
         FROM league_standings ls
         WHERE ls.league_id = $1`,
        [leagueId]
      );

      // Get matches up to the specified GW
      const matches = await db.query(
        `SELECT entry_1_id, entry_2_id, entry_1_points, entry_2_points, winner
         FROM h2h_matches
         WHERE league_id = $1 AND event <= $2
         ORDER BY event`,
        [leagueId, upToGW]
      );

      // Calculate points for each manager
      const points = new Map<number, number>();
      standings.rows.forEach((s: any) => points.set(s.entry_id, 0));

      matches.rows.forEach((m: any) => {
        const p1 = points.get(m.entry_1_id) || 0;
        const p2 = points.get(m.entry_2_id) || 0;

        if (m.winner === m.entry_1_id) {
          points.set(m.entry_1_id, p1 + 3);
        } else if (m.winner === m.entry_2_id) {
          points.set(m.entry_2_id, p2 + 3);
        } else if (m.winner === null) {
          // Draw
          points.set(m.entry_1_id, p1 + 1);
          points.set(m.entry_2_id, p2 + 1);
        }
      });

      // Rank by points (descending)
      const ranked = Array.from(points.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([entry_id], index) => ({ entry_id, rank: index + 1 }));

      return new Map(ranked.map(r => [r.entry_id, r.rank]));
    };

    // Get all managers
    const allLeagueManagers = await db.query(
      `SELECT m.entry_id, m.player_name, m.team_name
       FROM managers m
       JOIN league_standings ls ON ls.entry_id = m.entry_id
       WHERE ls.league_id = $1`,
      [leagueId]
    );

    // Calculate rank history for each GW (5-19)
    const rankHistory = new Map<number, Array<{ gw: number; rank: number }>>();
    for (let gw = 5; gw <= 19; gw++) {
      const gwRanks = await calculateH2HRank(gw);
      allLeagueManagers.rows.forEach((m: any) => {
        const rank = gwRanks.get(m.entry_id) || 999;
        if (!rankHistory.has(m.entry_id)) {
          rankHistory.set(m.entry_id, []);
        }
        rankHistory.get(m.entry_id)!.push({ gw, rank });
      });
    }

    // Find biggest climber (peak upward swing)
    let bestClimb = { entry_id: 0, climb: 0, fromRank: 0, toRank: 0, fromGW: 0, toGW: 0, player_name: '', team_name: '' };

    allLeagueManagers.rows.forEach((manager: any) => {
      const ranks = rankHistory.get(manager.entry_id) || [];

      // For each position, find the worst rank up to that point
      for (let i = 0; i < ranks.length; i++) {
        const lowPoint = ranks[i]; // potential worst rank

        // Look for best rank AFTER this point
        for (let j = i + 1; j < ranks.length; j++) {
          const highPoint = ranks[j];

          // Climb = went from lowPoint.rank to highPoint.rank
          // Example: 17th → 5th = climb of 12 (17 - 5 = 12)
          const climb = lowPoint.rank - highPoint.rank;

          if (climb > bestClimb.climb) {
            bestClimb = {
              entry_id: manager.entry_id,
              climb: climb,
              fromRank: lowPoint.rank,
              toRank: highPoint.rank,
              fromGW: lowPoint.gw,
              toGW: highPoint.gw,
              player_name: manager.player_name,
              team_name: manager.team_name
            };
          }
        }
      }
    });

    // Find runner-up climber
    let runnerUpClimb = { entry_id: 0, climb: 0, fromRank: 0, toRank: 0, fromGW: 0, toGW: 0, player_name: '', team_name: '' };

    allLeagueManagers.rows.forEach((manager: any) => {
      if (manager.entry_id === bestClimb.entry_id) return; // Skip winner

      const ranks = rankHistory.get(manager.entry_id) || [];

      for (let i = 0; i < ranks.length; i++) {
        const lowPoint = ranks[i];
        for (let j = i + 1; j < ranks.length; j++) {
          const highPoint = ranks[j];
          const climb = lowPoint.rank - highPoint.rank;

          if (climb > runnerUpClimb.climb) {
            runnerUpClimb = {
              entry_id: manager.entry_id,
              climb: climb,
              fromRank: lowPoint.rank,
              toRank: highPoint.rank,
              fromGW: lowPoint.gw,
              toGW: highPoint.gw,
              player_name: manager.player_name,
              team_name: manager.team_name
            };
          }
        }
      }
    });

    if (bestClimb.climb > 0) {
      bigOnesAwards.push({
        title: 'Biggest Climber',
        winner: {
          entry_id: bestClimb.entry_id,
          player_name: bestClimb.player_name,
          team_name: bestClimb.team_name
        },
        winner_value: bestClimb.climb,
        runner_up: runnerUpClimb.climb > 0 ? {
          entry_id: runnerUpClimb.entry_id,
          player_name: runnerUpClimb.player_name,
          team_name: runnerUpClimb.team_name
        } : undefined,
        runner_up_value: runnerUpClimb.climb > 0 ? runnerUpClimb.climb : undefined,
        unit: 'places',
        description: `${bestClimb.fromRank}${getSuffix(bestClimb.fromRank)} → ${bestClimb.toRank}${getSuffix(bestClimb.toRank)} (GW${bestClimb.fromGW}-${bestClimb.toGW})`
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

    // 1. Best Average (FIXED: use NET points)
    const bestAverage = await db.query(
      `SELECT h.entry_id,
              AVG(h.points - h.event_transfers_cost) as avg_points,
              m.player_name,
              m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       GROUP BY h.entry_id, m.player_name, m.team_name
       ORDER BY avg_points DESC
       LIMIT 3`,
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
        third_place: bestAverage.rows[2] ? {
          entry_id: bestAverage.rows[2].entry_id,
          player_name: bestAverage.rows[2].player_name,
          team_name: bestAverage.rows[2].team_name
        } : undefined,
        third_place_value: bestAverage.rows[2] ? parseFloat(parseFloat(bestAverage.rows[2].avg_points).toFixed(1)) : undefined,
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

    // Fetch manager names for all entry_ids
    const entryIds = allManagers.rows.map((m: any) => m.entry_id);
    const managers = await db.query(
      `SELECT entry_id, player_name, team_name
       FROM managers
       WHERE entry_id = ANY($1)`,
      [entryIds]
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

      const managerInfo = managers.rows.find((m: any) => parseInt(m.entry_id) === parseInt(manager.entry_id));
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
        third_place: hotStreaks[2] ? {
          entry_id: hotStreaks[2].entry_id,
          player_name: hotStreaks[2].player_name,
          team_name: hotStreaks[2].team_name
        } : undefined,
        third_place_value: hotStreaks[2]?.max_streak,
        unit: 'consecutive GWs',
        description: 'Longest streak above league average'
      });
    }

    // 3. Best Captain Picks (NEW)
    const bestCaptainPicks = await db.query(
      `SELECT
        mp.entry_id,
        SUM(pgs.calculated_points * (mp.multiplier - 1)) as captain_bonus_points,
        m.player_name,
        m.team_name
      FROM manager_picks mp
      JOIN player_gameweek_stats pgs ON pgs.player_id = mp.player_id AND pgs.gameweek = mp.gameweek
      JOIN managers m ON m.entry_id = mp.entry_id
      WHERE mp.league_id = $1
        AND mp.gameweek <= 19
        AND mp.is_captain = true
      GROUP BY mp.entry_id, m.player_name, m.team_name
      ORDER BY captain_bonus_points DESC
      LIMIT 3`,
      [leagueId]
    );

    if (bestCaptainPicks.rows.length > 0) {
      performanceAwards.push({
        title: 'Best Captain Picks',
        winner: {
          entry_id: bestCaptainPicks.rows[0].entry_id,
          player_name: bestCaptainPicks.rows[0].player_name,
          team_name: bestCaptainPicks.rows[0].team_name
        },
        winner_value: parseInt(bestCaptainPicks.rows[0].captain_bonus_points),
        runner_up: bestCaptainPicks.rows[1] ? {
          entry_id: bestCaptainPicks.rows[1].entry_id,
          player_name: bestCaptainPicks.rows[1].player_name,
          team_name: bestCaptainPicks.rows[1].team_name
        } : undefined,
        runner_up_value: bestCaptainPicks.rows[1] ? parseInt(bestCaptainPicks.rows[1].captain_bonus_points) : undefined,
        third_place: bestCaptainPicks.rows[2] ? {
          entry_id: bestCaptainPicks.rows[2].entry_id,
          player_name: bestCaptainPicks.rows[2].player_name,
          team_name: bestCaptainPicks.rows[2].team_name
        } : undefined,
        third_place_value: bestCaptainPicks.rows[2] ? parseInt(bestCaptainPicks.rows[2].captain_bonus_points) : undefined,
        unit: 'pts',
        description: 'Most points from captain choices'
      });
    }

    // 4. Best Gameweek (moved from Big Ones)
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
      performanceAwards.push({
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

    // 5. Biggest Faller (NEW: Peak downward swing GW5-19)
    // Reuse rankHistory from Biggest Climber calculation
    let biggestFall = { entry_id: 0, fall: 0, fromRank: 0, toRank: 0, fromGW: 0, toGW: 0, player_name: '', team_name: '' };

    allLeagueManagers.rows.forEach((manager: any) => {
      const ranks = rankHistory.get(manager.entry_id) || [];

      // For each position, find the best rank up to that point
      for (let i = 0; i < ranks.length; i++) {
        const highPoint = ranks[i]; // potential best rank (low number)

        // Look for worst rank AFTER this point
        for (let j = i + 1; j < ranks.length; j++) {
          const lowPoint = ranks[j];

          // Fall = went from highPoint.rank to lowPoint.rank
          // Example: 3rd → 15th = fall of 12 (15 - 3 = 12)
          const fall = lowPoint.rank - highPoint.rank;

          if (fall > biggestFall.fall) {
            biggestFall = {
              entry_id: manager.entry_id,
              fall: fall,
              fromRank: highPoint.rank,
              toRank: lowPoint.rank,
              fromGW: highPoint.gw,
              toGW: lowPoint.gw,
              player_name: manager.player_name,
              team_name: manager.team_name
            };
          }
        }
      }
    });

    // Find runner-up faller
    let runnerUpFall = { entry_id: 0, fall: 0, fromRank: 0, toRank: 0, fromGW: 0, toGW: 0, player_name: '', team_name: '' };

    allLeagueManagers.rows.forEach((manager: any) => {
      if (manager.entry_id === biggestFall.entry_id) return; // Skip winner

      const ranks = rankHistory.get(manager.entry_id) || [];

      for (let i = 0; i < ranks.length; i++) {
        const highPoint = ranks[i];
        for (let j = i + 1; j < ranks.length; j++) {
          const lowPoint = ranks[j];
          const fall = lowPoint.rank - highPoint.rank;

          if (fall > runnerUpFall.fall) {
            runnerUpFall = {
              entry_id: manager.entry_id,
              fall: fall,
              fromRank: highPoint.rank,
              toRank: lowPoint.rank,
              fromGW: highPoint.gw,
              toGW: lowPoint.gw,
              player_name: manager.player_name,
              team_name: manager.team_name
            };
          }
        }
      }
    });

    if (biggestFall.fall > 0) {
      performanceAwards.push({
        title: 'Biggest Faller',
        winner: {
          entry_id: biggestFall.entry_id,
          player_name: biggestFall.player_name,
          team_name: biggestFall.team_name
        },
        winner_value: biggestFall.fall,
        runner_up: runnerUpFall.fall > 0 ? {
          entry_id: runnerUpFall.entry_id,
          player_name: runnerUpFall.player_name,
          team_name: runnerUpFall.team_name
        } : undefined,
        runner_up_value: runnerUpFall.fall > 0 ? runnerUpFall.fall : undefined,
        unit: 'places',
        description: `${biggestFall.fromRank}${getSuffix(biggestFall.fromRank)} → ${biggestFall.toRank}${getSuffix(biggestFall.toRank)} (GW${biggestFall.fromGW}-${biggestFall.toGW})`
      });
    }

    // 6. Slow Starter (NEW)
    const currentStandings = await db.query(
      `SELECT entry_id, rank FROM league_standings WHERE league_id = $1`,
      [leagueId]
    );
    const topHalfIds = currentStandings.rows.filter((s: any) => s.rank <= 10).map((s: any) => s.entry_id);

    const slowStarters = await db.query(
      `SELECT
        h.entry_id,
        SUM(h.points - h.event_transfers_cost) as early_points,
        m.player_name,
        m.team_name
      FROM manager_gw_history h
      JOIN managers m ON m.entry_id = h.entry_id
      WHERE h.league_id = $1
        AND h.event <= 5
        AND h.entry_id = ANY($2)
      GROUP BY h.entry_id, m.player_name, m.team_name
      ORDER BY early_points ASC
      LIMIT 3`,
      [leagueId, topHalfIds]
    );

    if (slowStarters.rows.length > 0) {
      performanceAwards.push({
        title: 'Slow Starter',
        winner: {
          entry_id: slowStarters.rows[0].entry_id,
          player_name: slowStarters.rows[0].player_name,
          team_name: slowStarters.rows[0].team_name
        },
        winner_value: parseInt(slowStarters.rows[0].early_points),
        runner_up: slowStarters.rows[1] ? {
          entry_id: slowStarters.rows[1].entry_id,
          player_name: slowStarters.rows[1].player_name,
          team_name: slowStarters.rows[1].team_name
        } : undefined,
        runner_up_value: slowStarters.rows[1] ? parseInt(slowStarters.rows[1].early_points) : undefined,
        third_place: slowStarters.rows[2] ? {
          entry_id: slowStarters.rows[2].entry_id,
          player_name: slowStarters.rows[2].player_name,
          team_name: slowStarters.rows[2].team_name
        } : undefined,
        third_place_value: slowStarters.rows[2] ? parseInt(slowStarters.rows[2].early_points) : undefined,
        unit: 'pts (GW1-5)',
        description: 'Worst start, now top 10'
      });
    }

    // 7. Second Half Surge (NEW)
    const secondHalfSurge = await db.query(
      `SELECT
        h.entry_id,
        SUM(h.points - h.event_transfers_cost) as second_half_points,
        m.player_name,
        m.team_name
      FROM manager_gw_history h
      JOIN managers m ON m.entry_id = h.entry_id
      WHERE h.league_id = $1 AND h.event >= 10 AND h.event <= 19
      GROUP BY h.entry_id, m.player_name, m.team_name
      ORDER BY second_half_points DESC
      LIMIT 3`,
      [leagueId]
    );

    if (secondHalfSurge.rows.length > 0) {
      performanceAwards.push({
        title: 'Second Half Surge',
        winner: {
          entry_id: secondHalfSurge.rows[0].entry_id,
          player_name: secondHalfSurge.rows[0].player_name,
          team_name: secondHalfSurge.rows[0].team_name
        },
        winner_value: parseInt(secondHalfSurge.rows[0].second_half_points),
        runner_up: secondHalfSurge.rows[1] ? {
          entry_id: secondHalfSurge.rows[1].entry_id,
          player_name: secondHalfSurge.rows[1].player_name,
          team_name: secondHalfSurge.rows[1].team_name
        } : undefined,
        runner_up_value: secondHalfSurge.rows[1] ? parseInt(secondHalfSurge.rows[1].second_half_points) : undefined,
        third_place: secondHalfSurge.rows[2] ? {
          entry_id: secondHalfSurge.rows[2].entry_id,
          player_name: secondHalfSurge.rows[2].player_name,
          team_name: secondHalfSurge.rows[2].team_name
        } : undefined,
        third_place_value: secondHalfSurge.rows[2] ? parseInt(secondHalfSurge.rows[2].second_half_points) : undefined,
        unit: 'pts',
        description: 'Best record GW10-19'
      });
    }

    // 8. Best GW Rank (Best FPL overall GW rank achieved)
    const bestGWRank = await db.query(
      `SELECT h.entry_id, h.event, h.rank, m.player_name, m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.rank IS NOT NULL AND h.rank > 0 AND h.event <= 19
       ORDER BY h.rank ASC
       LIMIT 2`,
      [leagueId]
    );

    if (bestGWRank.rows.length > 0) {
      performanceAwards.push({
        title: 'Best GW Rank',
        winner: {
          entry_id: bestGWRank.rows[0].entry_id,
          player_name: bestGWRank.rows[0].player_name,
          team_name: bestGWRank.rows[0].team_name
        },
        winner_value: bestGWRank.rows[0].rank,
        runner_up: bestGWRank.rows[1] ? {
          entry_id: bestGWRank.rows[1].entry_id,
          player_name: bestGWRank.rows[1].player_name,
          team_name: bestGWRank.rows[1].team_name
        } : undefined,
        runner_up_value: bestGWRank.rows[1]?.rank,
        unit: `in GW${bestGWRank.rows[0].event}`,
        description: 'Best FPL rank in a single GW'
      });
    }

    // 8. Worst GW Rank (Worst FPL overall GW rank achieved)
    const worstGWRank = await db.query(
      `SELECT h.entry_id, h.event, h.rank, m.player_name, m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.rank IS NOT NULL AND h.rank > 0 AND h.event <= 19
       ORDER BY h.rank DESC
       LIMIT 2`,
      [leagueId]
    );

    if (worstGWRank.rows.length > 0) {
      performanceAwards.push({
        title: 'Worst GW Rank',
        winner: {
          entry_id: worstGWRank.rows[0].entry_id,
          player_name: worstGWRank.rows[0].player_name,
          team_name: worstGWRank.rows[0].team_name
        },
        winner_value: worstGWRank.rows[0].rank,
        runner_up: worstGWRank.rows[1] ? {
          entry_id: worstGWRank.rows[1].entry_id,
          player_name: worstGWRank.rows[1].player_name,
          team_name: worstGWRank.rows[1].team_name
        } : undefined,
        runner_up_value: worstGWRank.rows[1]?.rank,
        unit: `in GW${worstGWRank.rows[0].event}`,
        description: 'Worst FPL rank in a single GW'
      });
    }

    // 8. Most Consistent (moved from position 1)
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

    // 11. Bench Warmer (NEW)
    const benchWarmer = await db.query(
      `SELECT
        h.entry_id,
        SUM(h.points_on_bench) as total_bench_points,
        m.player_name,
        m.team_name
      FROM manager_gw_history h
      JOIN managers m ON m.entry_id = h.entry_id
      WHERE h.league_id = $1 AND h.event <= 19
      GROUP BY h.entry_id, m.player_name, m.team_name
      ORDER BY total_bench_points DESC
      LIMIT 3`,
      [leagueId]
    );

    if (benchWarmer.rows.length > 0) {
      performanceAwards.push({
        title: 'Bench Warmer',
        winner: {
          entry_id: benchWarmer.rows[0].entry_id,
          player_name: benchWarmer.rows[0].player_name,
          team_name: benchWarmer.rows[0].team_name
        },
        winner_value: parseInt(benchWarmer.rows[0].total_bench_points),
        runner_up: benchWarmer.rows[1] ? {
          entry_id: benchWarmer.rows[1].entry_id,
          player_name: benchWarmer.rows[1].player_name,
          team_name: benchWarmer.rows[1].team_name
        } : undefined,
        runner_up_value: benchWarmer.rows[1] ? parseInt(benchWarmer.rows[1].total_bench_points) : undefined,
        third_place: benchWarmer.rows[2] ? {
          entry_id: benchWarmer.rows[2].entry_id,
          player_name: benchWarmer.rows[2].player_name,
          team_name: benchWarmer.rows[2].team_name
        } : undefined,
        third_place_value: benchWarmer.rows[2] ? parseInt(benchWarmer.rows[2].total_bench_points) : undefined,
        unit: 'pts',
        description: 'Most points left on bench'
      });
    }

    // 12. Mr. Average (NEW)
    const allTotals = await db.query(
      `SELECT
        h.entry_id,
        SUM(h.points - h.event_transfers_cost) as total_points,
        m.player_name,
        m.team_name
      FROM manager_gw_history h
      JOIN managers m ON m.entry_id = h.entry_id
      WHERE h.league_id = $1 AND h.event <= 19
      GROUP BY h.entry_id, m.player_name, m.team_name`,
      [leagueId]
    );

    const leagueAverage = allTotals.rows.reduce((sum: number, m: any) => sum + parseInt(m.total_points), 0) / allTotals.rows.length;

    const mrAverageList = allTotals.rows
      .map((m: any) => ({
        ...m,
        deviation: Math.abs(parseInt(m.total_points) - leagueAverage),
        total_points: parseInt(m.total_points)
      }))
      .sort((a: any, b: any) => a.deviation - b.deviation)
      .slice(0, 3);

    if (mrAverageList.length > 0) {
      performanceAwards.push({
        title: 'Mr. Average',
        winner: {
          entry_id: mrAverageList[0].entry_id,
          player_name: mrAverageList[0].player_name,
          team_name: mrAverageList[0].team_name
        },
        winner_value: mrAverageList[0].total_points,
        runner_up: mrAverageList[1] ? {
          entry_id: mrAverageList[1].entry_id,
          player_name: mrAverageList[1].player_name,
          team_name: mrAverageList[1].team_name
        } : undefined,
        runner_up_value: mrAverageList[1]?.total_points,
        third_place: mrAverageList[2] ? {
          entry_id: mrAverageList[2].entry_id,
          player_name: mrAverageList[2].player_name,
          team_name: mrAverageList[2].team_name
        } : undefined,
        third_place_value: mrAverageList[2]?.total_points,
        unit: 'pts',
        description: 'Closest to league average'
      });
    }

    // 13. Rollercoaster (moved to after Most Consistent)
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

    // 4. Best Non-Chip Week - NEW AWARD
    // Get all chip usage
    const allChips = await db.query(
      `SELECT entry_id, event FROM manager_chips WHERE league_id = $1`,
      [leagueId]
    );

    const chipWeeks = new Set(allChips.rows.map((c: any) => `${c.entry_id}-${c.event}`));

    // Get all GW scores, filter out chip weeks
    const allGWScores = await db.query(
      `SELECT h.entry_id, h.event, h.points, m.player_name, m.team_name
       FROM manager_gw_history h
       JOIN managers m ON m.entry_id = h.entry_id
       WHERE h.league_id = $1 AND h.event <= 19
       ORDER BY h.points DESC`,
      [leagueId]
    );

    // Find highest scores that weren't chip weeks
    const nonChipScores = allGWScores.rows
      .filter((s: any) => !chipWeeks.has(`${s.entry_id}-${s.event}`))
      .slice(0, 2);

    if (nonChipScores.length > 0) {
      strategyAwards.push({
        title: 'Best Non-Chip Week',
        winner: {
          entry_id: nonChipScores[0].entry_id,
          player_name: nonChipScores[0].player_name,
          team_name: nonChipScores[0].team_name
        },
        winner_value: nonChipScores[0].points,
        runner_up: nonChipScores[1] ? {
          entry_id: nonChipScores[1].entry_id,
          player_name: nonChipScores[1].player_name,
          team_name: nonChipScores[1].team_name
        } : undefined,
        runner_up_value: nonChipScores[1]?.points,
        unit: `pts in GW${nonChipScores[0].event}`,
        description: 'Highest score without using a chip'
      });
    }

    // 5. Hit Taker - FIXED
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

    // 5. Longest Winning Streak
    const allH2HManagerIds = allLeagueManagers.rows.map((m: any) => m.entry_id);
    const winningStreaks = new Map<number, { current: number; max: number; startGW: number; endGW: number; player_name: string; team_name: string }>();

    allLeagueManagers.rows.forEach((m: any) => {
      winningStreaks.set(parseInt(m.entry_id), { current: 0, max: 0, startGW: 0, endGW: 0, player_name: m.player_name, team_name: m.team_name });
    });

    for (let gw = 1; gw <= 19; gw++) {
      const gwMatches = allH2HMatches.rows.filter((m: any) => m.event === gw);

      gwMatches.forEach((match: any) => {
        const entry1 = parseInt(match.entry_1_id);
        const entry2 = parseInt(match.entry_2_id);
        const winner = match.winner ? parseInt(match.winner) : null;

        if (winner === entry1) {
          const s = winningStreaks.get(entry1)!;
          s.current++;
          if (s.current > s.max) {
            s.max = s.current;
            s.endGW = gw;
            s.startGW = gw - s.max + 1;
          }
          winningStreaks.get(entry2)!.current = 0;
        } else if (winner === entry2) {
          const s = winningStreaks.get(entry2)!;
          s.current++;
          if (s.current > s.max) {
            s.max = s.current;
            s.endGW = gw;
            s.startGW = gw - s.max + 1;
          }
          winningStreaks.get(entry1)!.current = 0;
        } else {
          // Draw - reset both streaks
          winningStreaks.get(entry1)!.current = 0;
          winningStreaks.get(entry2)!.current = 0;
        }
      });
    }

    const bestWinStreak = Array.from(winningStreaks.entries())
      .sort((a, b) => b[1].max - a[1].max)
      .slice(0, 2);

    if (bestWinStreak.length > 0 && bestWinStreak[0][1].max > 0) {
      h2hAwards.push({
        title: 'Longest Winning Streak',
        winner: {
          entry_id: bestWinStreak[0][0],
          player_name: bestWinStreak[0][1].player_name,
          team_name: bestWinStreak[0][1].team_name
        },
        winner_value: bestWinStreak[0][1].max,
        runner_up: bestWinStreak[1] && bestWinStreak[1][1].max > 0 ? {
          entry_id: bestWinStreak[1][0],
          player_name: bestWinStreak[1][1].player_name,
          team_name: bestWinStreak[1][1].team_name
        } : undefined,
        runner_up_value: bestWinStreak[1] && bestWinStreak[1][1].max > 0 ? bestWinStreak[1][1].max : undefined,
        unit: 'wins',
        description: `GW${bestWinStreak[0][1].startGW}-${bestWinStreak[0][1].endGW}`
      });
    }

    // 6. Longest Losing Streak
    const losingStreaks = new Map<number, { current: number; max: number; startGW: number; endGW: number; player_name: string; team_name: string }>();

    allLeagueManagers.rows.forEach((m: any) => {
      losingStreaks.set(parseInt(m.entry_id), { current: 0, max: 0, startGW: 0, endGW: 0, player_name: m.player_name, team_name: m.team_name });
    });

    for (let gw = 1; gw <= 19; gw++) {
      const gwMatches = allH2HMatches.rows.filter((m: any) => m.event === gw);

      gwMatches.forEach((match: any) => {
        const entry1 = parseInt(match.entry_1_id);
        const entry2 = parseInt(match.entry_2_id);
        const winner = match.winner ? parseInt(match.winner) : null;

        if (winner === entry1) {
          // entry2 loses
          const s = losingStreaks.get(entry2)!;
          s.current++;
          if (s.current > s.max) {
            s.max = s.current;
            s.endGW = gw;
            s.startGW = gw - s.max + 1;
          }
          losingStreaks.get(entry1)!.current = 0;
        } else if (winner === entry2) {
          // entry1 loses
          const s = losingStreaks.get(entry1)!;
          s.current++;
          if (s.current > s.max) {
            s.max = s.current;
            s.endGW = gw;
            s.startGW = gw - s.max + 1;
          }
          losingStreaks.get(entry2)!.current = 0;
        } else {
          // Draw - reset both streaks
          losingStreaks.get(entry1)!.current = 0;
          losingStreaks.get(entry2)!.current = 0;
        }
      });
    }

    const worstLoseStreak = Array.from(losingStreaks.entries())
      .sort((a, b) => b[1].max - a[1].max)
      .slice(0, 2);

    if (worstLoseStreak.length > 0 && worstLoseStreak[0][1].max > 0) {
      h2hAwards.push({
        title: 'Longest Losing Streak',
        winner: {
          entry_id: worstLoseStreak[0][0],
          player_name: worstLoseStreak[0][1].player_name,
          team_name: worstLoseStreak[0][1].team_name
        },
        winner_value: worstLoseStreak[0][1].max,
        runner_up: worstLoseStreak[1] && worstLoseStreak[1][1].max > 0 ? {
          entry_id: worstLoseStreak[1][0],
          player_name: worstLoseStreak[1][1].player_name,
          team_name: worstLoseStreak[1][1].team_name
        } : undefined,
        runner_up_value: worstLoseStreak[1] && worstLoseStreak[1][1].max > 0 ? worstLoseStreak[1][1].max : undefined,
        unit: 'losses',
        description: `GW${worstLoseStreak[0][1].startGW}-${worstLoseStreak[0][1].endGW}`
      });
    }

    // 7. Heartbreaker (NEW)
    const heartbreakers = allManagers.rows.map((manager: any) => {
      const matches = allH2HMatches.rows.filter(
        (m: any) => m.entry_1_id === manager.entry_id || m.entry_2_id === manager.entry_id
      );

      const narrowLosses = matches.filter((match: any) => {
        const isEntry1 = match.entry_1_id === manager.entry_id;
        const myPoints = isEntry1 ? match.entry_1_points : match.entry_2_points;
        const oppPoints = isEntry1 ? match.entry_2_points : match.entry_1_points;
        const margin = Math.abs(myPoints - oppPoints);
        return margin <= 5 && match.winner !== manager.entry_id && match.winner !== null;
      }).length;

      const managerInfo = managers.rows.find((m: any) => m.entry_id === manager.entry_id);
      return {
        entry_id: manager.entry_id,
        narrow_losses: narrowLosses,
        player_name: managerInfo?.player_name || 'Unknown',
        team_name: managerInfo?.team_name || 'Unknown'
      };
    }).sort((a: any, b: any) => b.narrow_losses - a.narrow_losses);

    if (heartbreakers.length > 0 && heartbreakers[0].narrow_losses > 0) {
      h2hAwards.push({
        title: 'Heartbreaker',
        winner: {
          entry_id: heartbreakers[0].entry_id,
          player_name: heartbreakers[0].player_name,
          team_name: heartbreakers[0].team_name
        },
        winner_value: heartbreakers[0].narrow_losses,
        runner_up: heartbreakers[1] ? {
          entry_id: heartbreakers[1].entry_id,
          player_name: heartbreakers[1].player_name,
          team_name: heartbreakers[1].team_name
        } : undefined,
        runner_up_value: heartbreakers[1]?.narrow_losses,
        third_place: heartbreakers[2] ? {
          entry_id: heartbreakers[2].entry_id,
          player_name: heartbreakers[2].player_name,
          team_name: heartbreakers[2].team_name
        } : undefined,
        third_place_value: heartbreakers[2]?.narrow_losses,
        unit: 'narrow losses',
        description: 'Most H2H losses by ≤5 pts'
      });
    }

    categories.push({
      category: 'H2H Battle',
      icon: '⚔️',
      awards: h2hAwards
    });

    // Fun section removed - awards based on FPL overall rank not meaningful for H2H league

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
