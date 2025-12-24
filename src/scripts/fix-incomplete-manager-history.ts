#!/usr/bin/env tsx

/**
 * K-116: Fix Incomplete Manager History
 *
 * Problem: 17 leagues have managers with picks but missing manager_gw_history.
 * This causes "Failed to fetch" errors when K-108c tries to calculate scores.
 *
 * Solution: Re-sync these 17 leagues to populate missing manager_gw_history.
 *
 * Runtime: ~15-20 minutes (17 leagues × 30-60s each)
 */

import { getDatabase } from '../lib/db';
import { syncLeagueData } from '../lib/leagueSync';

const DELAY_BETWEEN_LEAGUES_MS = 30000; // 30 seconds

interface IncompleteLeague {
  league_id: number;
  league_name: string;
  manager_count: number;
  managers_with_history: number;
  missing_history: number;
}

async function fixIncompleteManagerHistory() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║      K-116: Fix Incomplete Manager History Data              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const db = await getDatabase();

  try {
    // Step 1: Find leagues with incomplete manager history
    console.log('[1/4] Identifying leagues with incomplete manager history...\n');

    const result = await db.query<IncompleteLeague>(`
      SELECT
        l.id as league_id,
        l.name as league_name,
        ls.manager_count,
        COALESCE(mgh.managers_with_history, 0) as managers_with_history,
        ls.manager_count - COALESCE(mgh.managers_with_history, 0) as missing_history
      FROM leagues l
      LEFT JOIN (
        SELECT league_id, COUNT(DISTINCT entry_id) as manager_count
        FROM league_standings
        GROUP BY league_id
      ) ls ON ls.league_id = l.id
      LEFT JOIN (
        SELECT league_id, COUNT(DISTINCT entry_id) as managers_with_history
        FROM manager_gw_history
        GROUP BY league_id
      ) mgh ON mgh.league_id = l.id
      WHERE ls.manager_count > COALESCE(mgh.managers_with_history, 0)
      ORDER BY (ls.manager_count - COALESCE(mgh.managers_with_history, 0)) DESC, l.id
    `);

    const incompleteLeagues = result.rows;

    if (incompleteLeagues.length === 0) {
      console.log('✅ All leagues have complete manager history data!\n');
      return;
    }

    console.log(`❗Found ${incompleteLeagues.length} leagues with incomplete data:\n`);

    incompleteLeagues.forEach((league, index) => {
      console.log(`  ${index + 1}. ${league.league_name} (ID: ${league.league_id})`);
      console.log(`     Managers: ${league.manager_count}, With History: ${league.managers_with_history}, Missing: ${league.missing_history}`);
    });

    console.log(`\n⏱️  Estimated runtime: ~${Math.ceil(incompleteLeagues.length * 45 / 60)} minutes\n`);

    // Step 2: Re-sync each league
    console.log('[2/4] Re-syncing leagues...\n');

    let successCount = 0;
    let failureCount = 0;
    const failures: { league: IncompleteLeague; error: string }[] = [];

    for (let i = 0; i < incompleteLeagues.length; i++) {
      const league = incompleteLeagues[i];
      const progress = `[${i + 1}/${incompleteLeagues.length}]`;
      const percentage = Math.round(((i + 1) / incompleteLeagues.length) * 100);

      console.log(`${progress} (${percentage}%) Syncing: ${league.league_name} (ID: ${league.league_id})`);
      console.log(`  Missing ${league.missing_history} manager histories...`);

      try {
        // Force full sync to ensure all data is populated
        await syncLeagueData(league.league_id, true); // forceClear = true

        successCount++;
        console.log(`${progress} ✅ Success: ${league.league_name}\n`);
      } catch (error: any) {
        failureCount++;
        const errorMsg = error.message || 'Unknown error';
        console.error(`${progress} ❌ Failed: ${league.league_name}`);
        console.error(`  Error: ${errorMsg}\n`);
        failures.push({ league, error: errorMsg });
      }

      // Rate limiting (except for last league)
      if (i < incompleteLeagues.length - 1) {
        console.log(`${progress} ⏳ Waiting 30s before next league...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LEAGUES_MS));
      }
    }

    // Step 3: Verification
    console.log('\n[3/4] Verifying fix...\n');

    const verifyResult = await db.query<IncompleteLeague>(`
      SELECT
        l.id as league_id,
        l.name as league_name,
        ls.manager_count,
        COALESCE(mgh.managers_with_history, 0) as managers_with_history,
        ls.manager_count - COALESCE(mgh.managers_with_history, 0) as missing_history
      FROM leagues l
      LEFT JOIN (
        SELECT league_id, COUNT(DISTINCT entry_id) as manager_count
        FROM league_standings
        GROUP BY league_id
      ) ls ON ls.league_id = l.id
      LEFT JOIN (
        SELECT league_id, COUNT(DISTINCT entry_id) as managers_with_history
        FROM manager_gw_history
        GROUP BY league_id
      ) mgh ON mgh.league_id = l.id
      WHERE ls.manager_count > COALESCE(mgh.managers_with_history, 0)
      ORDER BY (ls.manager_count - COALESCE(mgh.managers_with_history, 0)) DESC
    `);

    const stillIncomplete = verifyResult.rows;

    // Step 4: Summary
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                        SYNC COMPLETE                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Success: ${successCount}/${incompleteLeagues.length}`);
    console.log(`❌ Failed: ${failureCount}/${incompleteLeagues.length}`);
    console.log(`📊 Still Incomplete: ${stillIncomplete.length} leagues\n`);

    if (failures.length > 0) {
      console.log('Failed leagues:');
      failures.forEach(({ league, error }) => {
        console.log(`  - ${league.league_name} (ID: ${league.league_id})`);
        console.log(`    Error: ${error}`);
      });
      console.log('');
    }

    if (stillIncomplete.length > 0) {
      console.log('Leagues still incomplete after sync:');
      stillIncomplete.forEach(league => {
        console.log(`  - ${league.league_name} (ID: ${league.league_id})`);
        console.log(`    Missing: ${league.missing_history} manager histories`);
      });
      console.log('');
      console.log('💡 These may be inactive managers or late joiners (expected)');
    } else {
      console.log('🎉 All leagues now have complete manager history data!');
    }

  } catch (error: any) {
    console.error('❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run if executed directly
if (require.main === module) {
  fixIncompleteManagerHistory()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { fixIncompleteManagerHistory };
