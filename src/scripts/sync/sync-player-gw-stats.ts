import { getDatabase } from '../../lib/db.js';
import { calculatePoints, type Position } from '../../lib/pointsCalculator.js';

const FPL_API = 'https://fantasy.premierleague.com/api';

/**
 * K-108: Sync Player Gameweek Stats
 *
 * Syncs player stats from FPL API and calculates points for ALL players.
 * Populates:
 *  - calculated_points (our calculation)
 *  - points_breakdown (JSON of how points were calculated)
 *  - All stat fields
 *  - Fixture info
 *
 * Usage:
 *  npm run sync:player-gw-stats [gameweek]
 *  npm run sync:player-gw-stats 17  # Sync only GW17
 *  npm run sync:player-gw-stats     # Sync all completed GWs
 */

async function syncPlayerGameweekStats(specificGW?: number) {
  const db = await getDatabase();

  try {
    // 1. Fetch bootstrap-static to get all players and current GW
    console.log('[K-108 Sync] Fetching bootstrap data...');
    const bootstrapResponse = await fetch(`${FPL_API}/bootstrap-static/`);
    if (!bootstrapResponse.ok) {
      throw new Error('Failed to fetch bootstrap data');
    }
    const bootstrapData = await bootstrapResponse.json();

    const players = bootstrapData.elements;
    const events = bootstrapData.events;
    const teams = bootstrapData.teams;

    // Build team lookup
    const teamLookup: { [key: number]: any } = {};
    teams.forEach((team: any) => {
      teamLookup[team.id] = team;
    });

    // Determine which GWs to sync
    const completedEvents = events.filter((e: any) => e.finished);
    const gameweeksToSync = specificGW
      ? [specificGW]
      : completedEvents.map((e: any) => e.id);

    console.log(`[K-108 Sync] Syncing ${gameweeksToSync.length} gameweek(s) for ${players.length} players...`);
    console.log(`[K-108 Sync] Gameweeks: ${gameweeksToSync.join(', ')}`);

    let totalRecords = 0;
    let totalMatches = 0;
    let totalMismatches = 0;
    let errors = 0;

    // 2. For each gameweek
    for (const gw of gameweeksToSync) {
      console.log(`\n[K-108 Sync] === Gameweek ${gw} ===`);

      // Fetch fixtures for this GW
      const fixturesResponse = await fetch(`${FPL_API}/fixtures/?event=${gw}`);
      if (!fixturesResponse.ok) {
        console.error(`[K-108 Sync] ✗ Failed to fetch fixtures for GW${gw}`);
        errors++;
        continue;
      }
      const fixtures = await fixturesResponse.json();

      // Build fixture lookup by team
      const fixturesByTeam: { [key: number]: any } = {};
      fixtures.forEach((fixture: any) => {
        fixturesByTeam[fixture.team_h] = {
          id: fixture.id,
          opponent_team_id: fixture.team_a,
          opponent_short: teamLookup[fixture.team_a]?.short_name || 'UNK',
          was_home: true,
          started: fixture.started || false,
          finished: fixture.finished || false,
        };
        fixturesByTeam[fixture.team_a] = {
          id: fixture.id,
          opponent_team_id: fixture.team_h,
          opponent_short: teamLookup[fixture.team_h]?.short_name || 'UNK',
          was_home: false,
          started: fixture.started || false,
          finished: fixture.finished || false,
        };
      });

      // Fetch live data for this GW
      console.log(`[K-108 Sync] Fetching live data for GW${gw}...`);
      const liveResponse = await fetch(`${FPL_API}/event/${gw}/live/`);
      if (!liveResponse.ok) {
        console.error(`[K-108 Sync] ✗ Failed to fetch live data for GW${gw}`);
        errors++;
        continue;
      }
      const liveData = await liveResponse.json();

      let gwRecords = 0;
      let gwMatches = 0;
      let gwMismatches = 0;

      // 3. For each player
      for (const player of players) {
        try {
          const liveElement = liveData.elements.find((e: any) => e.id === player.id);
          if (!liveElement) {
            // Player didn't play this GW, skip
            continue;
          }

          const stats = liveElement.stats;
          const fixture = fixturesByTeam[player.team];

          // Calculate points using our calculator
          const calculated = calculatePoints({
            minutes: stats.minutes || 0,
            goals_scored: stats.goals_scored || 0,
            assists: stats.assists || 0,
            clean_sheets: stats.clean_sheets || 0,
            goals_conceded: stats.goals_conceded || 0,
            own_goals: stats.own_goals || 0,
            penalties_saved: stats.penalties_saved || 0,
            penalties_missed: stats.penalties_missed || 0,
            yellow_cards: stats.yellow_cards || 0,
            red_cards: stats.red_cards || 0,
            saves: stats.saves || 0,
            bonus: stats.bonus || 0,
            defensive_contribution: stats.defensive_contribution || 0,
          }, player.element_type as Position);

          const fplTotal = stats.total_points || 0;
          const match = calculated.total === fplTotal;

          if (match) {
            gwMatches++;
          } else {
            gwMismatches++;
            console.log(`  [MISMATCH] ${player.web_name} (${player.id}): Calculated=${calculated.total}, FPL=${fplTotal}, Diff=${calculated.total - fplTotal}`);
          }

          // Insert/update database
          await db.query(`
            INSERT INTO player_gameweek_stats (
              player_id, gameweek,
              fixture_id, opponent_team_id, opponent_short, was_home,
              fixture_started, fixture_finished,
              minutes, goals_scored, assists, clean_sheets, goals_conceded,
              own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards,
              saves, bonus, bps, defensive_contribution,
              influence, creativity, threat, ict_index,
              expected_goals, expected_assists, expected_goal_involvements,
              total_points, calculated_points, points_breakdown,
              updated_at
            ) VALUES (
              $1, $2,
              $3, $4, $5, $6,
              $7, $8,
              $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18,
              $19, $20, $21, $22,
              $23, $24, $25, $26,
              $27, $28, $29,
              $30, $31, $32,
              NOW()
            )
            ON CONFLICT (player_id, gameweek)
            DO UPDATE SET
              fixture_id = EXCLUDED.fixture_id,
              opponent_team_id = EXCLUDED.opponent_team_id,
              opponent_short = EXCLUDED.opponent_short,
              was_home = EXCLUDED.was_home,
              fixture_started = EXCLUDED.fixture_started,
              fixture_finished = EXCLUDED.fixture_finished,
              minutes = EXCLUDED.minutes,
              goals_scored = EXCLUDED.goals_scored,
              assists = EXCLUDED.assists,
              clean_sheets = EXCLUDED.clean_sheets,
              goals_conceded = EXCLUDED.goals_conceded,
              own_goals = EXCLUDED.own_goals,
              penalties_saved = EXCLUDED.penalties_saved,
              penalties_missed = EXCLUDED.penalties_missed,
              yellow_cards = EXCLUDED.yellow_cards,
              red_cards = EXCLUDED.red_cards,
              saves = EXCLUDED.saves,
              bonus = EXCLUDED.bonus,
              bps = EXCLUDED.bps,
              defensive_contribution = EXCLUDED.defensive_contribution,
              influence = EXCLUDED.influence,
              creativity = EXCLUDED.creativity,
              threat = EXCLUDED.threat,
              ict_index = EXCLUDED.ict_index,
              expected_goals = EXCLUDED.expected_goals,
              expected_assists = EXCLUDED.expected_assists,
              expected_goal_involvements = EXCLUDED.expected_goal_involvements,
              total_points = EXCLUDED.total_points,
              calculated_points = EXCLUDED.calculated_points,
              points_breakdown = EXCLUDED.points_breakdown,
              updated_at = NOW()
          `, [
            player.id, gw,
            fixture?.id || null,
            fixture?.opponent_team_id || null,
            fixture?.opponent_short || null,
            fixture?.was_home || false,
            fixture?.started || false,
            fixture?.finished || false,
            stats.minutes || 0,
            stats.goals_scored || 0,
            stats.assists || 0,
            stats.clean_sheets || 0,
            stats.goals_conceded || 0,
            stats.own_goals || 0,
            stats.penalties_saved || 0,
            stats.penalties_missed || 0,
            stats.yellow_cards || 0,
            stats.red_cards || 0,
            stats.saves || 0,
            stats.bonus || 0,
            stats.bps || 0,
            stats.defensive_contribution || 0,
            stats.influence || '0.0',
            stats.creativity || '0.0',
            stats.threat || '0.0',
            stats.ict_index || '0.0',
            stats.expected_goals || '0.00',
            stats.expected_assists || '0.00',
            stats.expected_goal_involvements || '0.00',
            fplTotal,
            calculated.total,
            JSON.stringify(calculated.breakdown),
          ]);

          gwRecords++;
          totalRecords++;

        } catch (error) {
          console.error(`  [ERROR] Player ${player.id}:`, error);
          errors++;
        }
      }

      console.log(`[K-108 Sync] GW${gw} complete: ${gwRecords} records, ${gwMatches} matches, ${gwMismatches} mismatches`);
      totalMatches += gwMatches;
      totalMismatches += gwMismatches;

      // Rate limiting between GWs
      if (gw !== gameweeksToSync[gameweeksToSync.length - 1]) {
        console.log('[K-108 Sync] Rate limiting (1s)...');
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log('\n[K-108 Sync] === COMPLETE ===');
    console.log(`Total records synced: ${totalRecords}`);
    console.log(`Points matches: ${totalMatches} (${((totalMatches / totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Points mismatches: ${totalMismatches} (${((totalMismatches / totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Errors: ${errors}`);

    if (totalMismatches > 0) {
      console.log('\n[K-108 Sync] ⚠️ There are point mismatches.');
      console.log('[K-108 Sync] Run validation query to investigate:');
      console.log('  SELECT player_id, gameweek, calculated_points, total_points, (calculated_points - total_points) as diff');
      console.log('  FROM player_gameweek_stats');
      console.log('  WHERE calculated_points != total_points');
      console.log('  ORDER BY ABS(calculated_points - total_points) DESC;');
    }

    process.exit(errors > 0 ? 1 : 0);

  } catch (error) {
    console.error('[K-108 Sync] Fatal error:', error);
    process.exit(1);
  }
}

// Get GW from command line or sync all completed GWs
const gw = process.argv[2] ? parseInt(process.argv[2]) : undefined;

if (gw && (isNaN(gw) || gw < 1 || gw > 38)) {
  console.error('[K-108 Sync] Invalid gameweek. Must be 1-38.');
  process.exit(1);
}

console.log('[K-108 Sync] Starting player gameweek stats sync...');
if (gw) {
  console.log(`[K-108 Sync] Syncing GW${gw} only`);
}
syncPlayerGameweekStats(gw);
