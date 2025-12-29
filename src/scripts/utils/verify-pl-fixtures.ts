import { getDatabase } from '../../lib/db.js';

async function verify() {
  const db = await getDatabase();

  // Total fixtures
  const totalResult = await db.query('SELECT COUNT(*) FROM pl_fixtures');
  console.log(`Total fixtures in database: ${totalResult.rows[0].count}`);

  // Status breakdown
  const statusResult = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE finished = true) as completed,
      COUNT(*) FILTER (WHERE started = true AND finished = false) as in_progress,
      COUNT(*) FILTER (WHERE started = false) as upcoming,
      COUNT(*) FILTER (WHERE event IS NULL) as unscheduled
    FROM pl_fixtures
  `);

  console.log('\nStatus Breakdown:');
  console.log(`  Completed: ${statusResult.rows[0].completed}`);
  console.log(`  In Progress: ${statusResult.rows[0].in_progress}`);
  console.log(`  Upcoming: ${statusResult.rows[0].upcoming}`);
  console.log(`  Unscheduled: ${statusResult.rows[0].unscheduled}`);

  // Fixtures by gameweek
  const byGW = await db.query(`
    SELECT
      event,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE finished = true) as completed
    FROM pl_fixtures
    WHERE event IS NOT NULL
    GROUP BY event
    ORDER BY event
  `);

  console.log('\nFixtures by Gameweek:');
  byGW.rows.forEach((r: any) => {
    console.log(`  GW${r.event}: ${r.completed}/${r.total} completed`);
  });

  // Recent completed fixtures
  const recentCompleted = await db.query(`
    SELECT
      f.event,
      f.team_h_score,
      f.team_a_score,
      th.short_name as team_h_name,
      ta.short_name as team_a_name
    FROM pl_fixtures f
    LEFT JOIN teams th ON th.id = f.team_h
    LEFT JOIN teams ta ON ta.id = f.team_a
    WHERE f.finished = true
    ORDER BY f.event DESC, f.id DESC
    LIMIT 10
  `);

  console.log('\nRecent Completed Fixtures (Last 10):');
  recentCompleted.rows.forEach((r: any) => {
    const homeTeam = r.team_h_name || `Team ${r.team_h}`;
    const awayTeam = r.team_a_name || `Team ${r.team_a}`;
    console.log(`  GW${r.event}: ${homeTeam} ${r.team_h_score} - ${r.team_a_score} ${awayTeam}`);
  });

  // Upcoming fixtures
  const upcoming = await db.query(`
    SELECT
      f.event,
      f.kickoff_time,
      th.short_name as team_h_name,
      ta.short_name as team_a_name
    FROM pl_fixtures f
    LEFT JOIN teams th ON th.id = f.team_h
    LEFT JOIN teams ta ON ta.id = f.team_a
    WHERE f.finished = false AND f.event IS NOT NULL
    ORDER BY f.event, f.kickoff_time
    LIMIT 10
  `);

  console.log('\nUpcoming Fixtures (Next 10):');
  upcoming.rows.forEach((r: any) => {
    const homeTeam = r.team_h_name || `Team ${r.team_h}`;
    const awayTeam = r.team_a_name || `Team ${r.team_a}`;
    const kickoffTime = r.kickoff_time ? new Date(r.kickoff_time).toLocaleDateString() : 'TBD';
    console.log(`  GW${r.event} (${kickoffTime}): ${homeTeam} vs ${awayTeam}`);
  });

  // FDR distribution
  const fdrDistribution = await db.query(`
    SELECT
      team_h_difficulty as difficulty,
      COUNT(*) as count
    FROM pl_fixtures
    WHERE team_h_difficulty IS NOT NULL
    GROUP BY team_h_difficulty
    ORDER BY team_h_difficulty
  `);

  console.log('\nFDR Distribution (Home):');
  fdrDistribution.rows.forEach((r: any) => {
    console.log(`  Difficulty ${r.difficulty}: ${r.count} fixtures`);
  });

  process.exit(0);
}

verify();
