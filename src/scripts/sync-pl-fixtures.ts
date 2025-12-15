import { getDatabase } from '../lib/db.js';

const FPL_API = 'https://fantasy.premierleague.com/api';

interface Fixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string | null;
  started: boolean;
  finished: boolean;
  finished_provisional: boolean;
  minutes: number;
  pulse_id: number;
}

async function syncPLFixtures() {
  const db = await getDatabase();

  try {
    console.log('[Fixtures Sync] Fetching all PL fixtures from FPL API...');

    const response = await fetch(`${FPL_API}/fixtures/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch fixtures: ${response.status}`);
    }

    const fixtures: Fixture[] = await response.json();

    console.log(`[Fixtures Sync] Processing ${fixtures.length} fixtures...`);

    let inserted = 0;
    let updated = 0;

    for (const fixture of fixtures) {
      const result = await db.query(`
        INSERT INTO pl_fixtures
        (id, event, team_h, team_a, team_h_score, team_a_score,
         team_h_difficulty, team_a_difficulty, kickoff_time,
         started, finished, finished_provisional, minutes, pulse_id, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          event = EXCLUDED.event,
          team_h_score = EXCLUDED.team_h_score,
          team_a_score = EXCLUDED.team_a_score,
          kickoff_time = EXCLUDED.kickoff_time,
          started = EXCLUDED.started,
          finished = EXCLUDED.finished,
          finished_provisional = EXCLUDED.finished_provisional,
          minutes = EXCLUDED.minutes,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `, [
        fixture.id,
        fixture.event,
        fixture.team_h,
        fixture.team_a,
        fixture.team_h_score,
        fixture.team_a_score,
        fixture.team_h_difficulty,
        fixture.team_a_difficulty,
        fixture.kickoff_time,
        fixture.started,
        fixture.finished,
        fixture.finished_provisional,
        fixture.minutes,
        fixture.pulse_id
      ]);

      if (result.rows[0].inserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    console.log(`\n[Fixtures Sync] Complete!`);
    console.log(`  Total fixtures: ${fixtures.length}`);
    console.log(`  Inserted: ${inserted}`);
    console.log(`  Updated: ${updated}`);

    // Breakdown by status
    const statusBreakdown = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE finished = true) as completed,
        COUNT(*) FILTER (WHERE started = true AND finished = false) as in_progress,
        COUNT(*) FILTER (WHERE started = false) as upcoming
      FROM pl_fixtures
    `);

    console.log(`\n  Status Breakdown:`);
    console.log(`    Completed: ${statusBreakdown.rows[0].completed}`);
    console.log(`    In Progress: ${statusBreakdown.rows[0].in_progress}`);
    console.log(`    Upcoming: ${statusBreakdown.rows[0].upcoming}`);

    // Breakdown by gameweek
    const gwBreakdown = await db.query(`
      SELECT
        event,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE finished = true) as completed
      FROM pl_fixtures
      WHERE event IS NOT NULL
      GROUP BY event
      ORDER BY event
    `);

    console.log(`\n  Fixtures by Gameweek:`);
    gwBreakdown.rows.forEach((row: any) => {
      console.log(`    GW${row.event}: ${row.completed}/${row.total} completed`);
    });

    process.exit(0);
  } catch (error) {
    console.error('[Fixtures Sync] Fatal error:', error);
    process.exit(1);
  }
}

console.log('[Fixtures Sync] Starting PL fixtures sync...');
syncPLFixtures();
