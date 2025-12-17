import { checkForMissingGWs, syncMissingGWs } from '../lib/leagueSync';

async function testIncrementalSync() {
  const leagueId = 804742;

  try {
    console.log('=== Testing Incremental Sync for League 804742 ===\n');

    // Step 1: Check for missing GWs
    console.log('[Step 1] Checking for missing GWs...');
    const missingGWs = await checkForMissingGWs(leagueId);
    console.log('[Step 1] Missing GWs:', missingGWs);

    if (missingGWs.length === 0) {
      console.log('\n✅ No missing GWs found - test complete');
      process.exit(0);
    }

    // Step 2: Sync missing GWs
    console.log(`\n[Step 2] Syncing ${missingGWs.length} missing GWs...`);
    const result = await syncMissingGWs(leagueId, missingGWs);
    console.log('[Step 2] Sync result:', result);

    if (result.success) {
      console.log('\n✅ Incremental sync successful!');
      console.log('Synced GWs:', result.synced);
    } else {
      console.log('\n❌ Incremental sync failed');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during test:', error);
    process.exit(1);
  }
}

testIncrementalSync();
