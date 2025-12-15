/**
 * Test script for Players API endpoints
 * Run with: npx tsx src/scripts/test-players-api.ts
 */

async function testEndpoint(name: string, url: string, expectedFields: string[]) {
  console.log(`\nTesting: ${name}`);
  console.log(`  URL: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`  ✗ Failed: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.error(`    Error: ${error}`);
      return false;
    }

    const data = await response.json();

    // Check expected fields
    const missingFields = expectedFields.filter(field => !(field in data));
    if (missingFields.length > 0) {
      console.error(`  ✗ Missing fields: ${missingFields.join(', ')}`);
      return false;
    }

    console.log(`  ✓ Success`);
    return data;

  } catch (error) {
    console.error(`  ✗ Error: ${error}`);
    return false;
  }
}

async function main() {
  console.log('=== Testing Players API Endpoints ===\n');

  const baseUrl = 'http://localhost:3000';
  let testsRun = 0;
  let testsPassed = 0;

  // Test 1: List endpoint (default)
  testsRun++;
  const list1 = await testEndpoint(
    'GET /api/players (default)',
    `${baseUrl}/api/players`,
    ['players', 'pagination', 'filters']
  );
  if (list1) {
    testsPassed++;
    console.log(`    Players returned: ${list1.players.length}`);
    console.log(`    Total in DB: ${list1.pagination.total}`);
    console.log(`    Sample player: ${list1.players[0]?.web_name} (${list1.players[0]?.position}, £${(list1.players[0]?.now_cost / 10).toFixed(1)}m)`);
  }

  // Test 2: List with filters (MID position)
  testsRun++;
  const list2 = await testEndpoint(
    'GET /api/players (position=MID)',
    `${baseUrl}/api/players?position=MID&limit=5`,
    ['players', 'pagination']
  );
  if (list2) {
    testsPassed++;
    console.log(`    Midfielders: ${list2.pagination.total}`);
  }

  // Test 3: List with price filter
  testsRun++;
  const list3 = await testEndpoint(
    'GET /api/players (maxPrice=100)',
    `${baseUrl}/api/players?maxPrice=100&limit=10&sort=total_points`,
    ['players', 'pagination']
  );
  if (list3) {
    testsPassed++;
    console.log(`    Players under £10m: ${list3.pagination.total}`);
    console.log(`    Top scorer under £10m: ${list3.players[0]?.web_name} (${list3.players[0]?.total_points} pts)`);
  }

  // Test 4: Search by name
  testsRun++;
  const list4 = await testEndpoint(
    'GET /api/players (search=salah)',
    `${baseUrl}/api/players?search=salah`,
    ['players', 'pagination']
  );
  if (list4) {
    testsPassed++;
    console.log(`    Search results: ${list4.players.length}`);
    if (list4.players.length > 0) {
      console.log(`    Found: ${list4.players.map((p: any) => p.web_name).join(', ')}`);
    }
  }

  // Test 5: Player detail (Haaland - ID 328)
  testsRun++;
  const detail = await testEndpoint(
    'GET /api/players/[id] (Haaland)',
    `${baseUrl}/api/players/328`,
    ['player', 'history', 'totals', 'per90']
  );
  if (detail) {
    testsPassed++;
    console.log(`    Player: ${detail.player.web_name}`);
    console.log(`    Total points: ${detail.totals.points}`);
    console.log(`    History records: ${detail.history.length}`);
    if (detail.per90) {
      console.log(`    Goals per 90: ${detail.per90.goals_scored}`);
    }
  }

  // Test 6: Gameweek-specific stats (Haaland GW16)
  testsRun++;
  const gwStats = await testEndpoint(
    'GET /api/players/[id]/gameweek/[gw]',
    `${baseUrl}/api/players/328/gameweek/16`,
    ['player_id', 'gameweek', 'total_points']
  );
  if (gwStats) {
    testsPassed++;
    console.log(`    GW16 points: ${gwStats.total_points}`);
    console.log(`    Minutes: ${gwStats.minutes}`);
    console.log(`    Goals: ${gwStats.goals_scored}`);
  }

  // Summary
  console.log(`\n=== Test Summary ===`);
  console.log(`Tests run: ${testsRun}`);
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsRun - testsPassed}`);

  if (testsPassed === testsRun) {
    console.log(`\n✓ All tests passed!`);
    process.exit(0);
  } else {
    console.log(`\n✗ Some tests failed`);
    process.exit(1);
  }
}

main();
