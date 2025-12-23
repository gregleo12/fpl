/**
 * Test Provisional Bonus Calculation
 *
 * Validates our provisional bonus calculation against FPL's official bonus
 * for a completed gameweek.
 */

import { calculateProvisionalBonus, type PlayerLiveData } from '../lib/pointsCalculator.js';

const FPL_API = 'https://fantasy.premierleague.com/api';

interface TestResult {
  playerId: number;
  playerName: string;
  team: string;
  fixture: string;
  bps: number;
  ourBonus: number;
  fplBonus: number;
  match: boolean;
}

async function testProvisionalBonus(gameweek: number) {
  console.log(`\n[Provisional Bonus Test] Testing GW${gameweek}...`);
  console.log('='.repeat(80));

  // Fetch data
  const [bootstrapResponse, liveResponse, fixturesResponse] = await Promise.all([
    fetch(`${FPL_API}/bootstrap-static/`),
    fetch(`${FPL_API}/event/${gameweek}/live/`),
    fetch(`${FPL_API}/fixtures/?event=${gameweek}`),
  ]);

  if (!bootstrapResponse.ok || !liveResponse.ok || !fixturesResponse.ok) {
    throw new Error('Failed to fetch FPL API data');
  }

  const bootstrapData = await bootstrapResponse.json();
  const liveData = await liveResponse.json();
  const fixturesData = await fixturesResponse.json();

  // Build lookups
  const playerLookup: { [key: number]: any } = {};
  bootstrapData.elements.forEach((el: any) => {
    playerLookup[el.id] = el;
  });

  const teamLookup: { [key: number]: any } = {};
  bootstrapData.teams.forEach((team: any) => {
    teamLookup[team.id] = team;
  });

  // Build player live data
  const playerLiveData: PlayerLiveData[] = liveData.elements.map((e: any) => {
    const element = playerLookup[e.id];
    return {
      id: e.id,
      team: element?.team || 0,
      bps: e.stats.bps || 0,
      minutes: e.stats.minutes || 0,
    };
  });

  // Debug: Check fixture status
  console.log(`\n[DEBUG] Total fixtures: ${fixturesData.length}`);
  const startedFixtures = fixturesData.filter((f: any) => f.started);
  const finishedFixtures = fixturesData.filter((f: any) => f.finished);
  console.log(`[DEBUG] Started fixtures: ${startedFixtures.length}`);
  console.log(`[DEBUG] Finished fixtures: ${finishedFixtures.length}`);
  console.log(`[DEBUG] Sample fixture:`, fixturesData[0]);

  // Calculate provisional bonus (include finished fixtures for testing)
  const provisionalBonusMap = calculateProvisionalBonus(fixturesData, playerLiveData, true);

  console.log(`[DEBUG] Players in bonus map: ${provisionalBonusMap.size}`);

  // Compare with FPL's official bonus
  const results: TestResult[] = [];
  let totalWithBonus = 0;
  let matches = 0;
  let mismatches = 0;
  const mismatchDetails: TestResult[] = [];
  const tieExamples: TestResult[] = [];

  for (const liveElement of liveData.elements) {
    const fplBonus = liveElement.stats.bonus || 0;
    const ourBonus = provisionalBonusMap.get(liveElement.id) || 0;
    const player = playerLookup[liveElement.id];

    if (fplBonus > 0 || ourBonus > 0) {
      totalWithBonus++;

      const match = ourBonus === fplBonus;
      if (match) {
        matches++;
      } else {
        mismatches++;
      }

      // Find player's fixture
      const playerTeam = player?.team || 0;
      const fixture = fixturesData.find((f: any) =>
        f.team_h === playerTeam || f.team_a === playerTeam
      );

      const fixtureStr = fixture
        ? `${teamLookup[fixture.team_h]?.short_name || '?'} vs ${teamLookup[fixture.team_a]?.short_name || '?'}`
        : 'Unknown';

      const result: TestResult = {
        playerId: liveElement.id,
        playerName: player?.web_name || 'Unknown',
        team: teamLookup[playerTeam]?.short_name || '?',
        fixture: fixtureStr,
        bps: liveElement.stats.bps || 0,
        ourBonus,
        fplBonus,
        match,
      };

      results.push(result);

      if (!match) {
        mismatchDetails.push(result);
      }
    }
  }

  // Find tie examples (multiple players with same BPS)
  const bpsGroups = new Map<string, TestResult[]>();
  for (const result of results) {
    const key = `${result.fixture}-${result.bps}`;
    if (!bpsGroups.has(key)) {
      bpsGroups.set(key, []);
    }
    bpsGroups.get(key)!.push(result);
  }

  Array.from(bpsGroups.entries()).forEach(([key, group]) => {
    if (group.length > 1) {
      tieExamples.push(...group);
    }
  });

  // Report results
  console.log('\n📊 SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total players with bonus points: ${totalWithBonus}`);
  console.log(`Matches (our calculation = FPL):   ${matches} (${((matches / totalWithBonus) * 100).toFixed(1)}%)`);
  console.log(`Mismatches (our calc ≠ FPL):       ${mismatches} (${((mismatches / totalWithBonus) * 100).toFixed(1)}%)`);

  if (mismatches > 0) {
    console.log('\n❌ MISMATCHES FOUND');
    console.log('-'.repeat(80));
    console.log('Player'.padEnd(20) + 'Fixture'.padEnd(20) + 'BPS'.padEnd(6) + 'Our'.padEnd(6) + 'FPL'.padEnd(6) + 'Diff');
    console.log('-'.repeat(80));

    mismatchDetails.sort((a, b) => Math.abs(b.ourBonus - b.fplBonus) - Math.abs(a.ourBonus - a.fplBonus));

    for (const result of mismatchDetails) {
      const diff = result.ourBonus - result.fplBonus;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      console.log(
        result.playerName.padEnd(20) +
        result.fixture.padEnd(20) +
        result.bps.toString().padEnd(6) +
        result.ourBonus.toString().padEnd(6) +
        result.fplBonus.toString().padEnd(6) +
        diffStr
      );
    }
  } else {
    console.log('\n✅ PERFECT MATCH - All provisional bonus calculations match FPL official bonus!');
  }

  // Show tie examples
  if (tieExamples.length > 0) {
    console.log('\n🔗 TIE EXAMPLES (Multiple players with same BPS)');
    console.log('-'.repeat(80));
    console.log('Player'.padEnd(20) + 'Fixture'.padEnd(20) + 'BPS'.padEnd(6) + 'Our'.padEnd(6) + 'FPL'.padEnd(6) + 'Match');
    console.log('-'.repeat(80));

    // Group by fixture
    const fixtureGroups = new Map<string, TestResult[]>();
    for (const result of tieExamples) {
      if (!fixtureGroups.has(result.fixture)) {
        fixtureGroups.set(result.fixture, []);
      }
      fixtureGroups.get(result.fixture)!.push(result);
    }

    Array.from(fixtureGroups.entries()).forEach(([fixture, group]) => {
      // Sort by BPS descending
      group.sort((a, b) => b.bps - a.bps);

      console.log(`\nFixture: ${fixture}`);
      for (const result of group) {
        const matchStr = result.match ? '✓' : '✗';
        console.log(
          '  ' + result.playerName.padEnd(18) +
          ''.padEnd(20) +
          result.bps.toString().padEnd(6) +
          result.ourBonus.toString().padEnd(6) +
          result.fplBonus.toString().padEnd(6) +
          matchStr
        );
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log(`[Provisional Bonus Test] GW${gameweek} test complete\n`);

  // Return summary for programmatic use
  return {
    totalWithBonus,
    matches,
    mismatches,
    matchPercentage: (matches / totalWithBonus) * 100,
  };
}

// Run test for GW17
const gw = process.argv[2] ? parseInt(process.argv[2]) : 17;

if (isNaN(gw) || gw < 1 || gw > 38) {
  console.error('[Provisional Bonus Test] Invalid gameweek. Must be 1-38.');
  process.exit(1);
}

testProvisionalBonus(gw)
  .then((result) => {
    if (result.mismatches === 0) {
      console.log('✅ All tests passed!');
      process.exit(0);
    } else {
      console.error(`❌ ${result.mismatches} mismatches found`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('[Provisional Bonus Test] Error:', error);
    process.exit(1);
  });
