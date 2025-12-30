const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function investigate() {
  try {
    console.log('\n=== GW TRANSFERS INVESTIGATION ===\n');

    // Get current GW
    const gwRes = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    const gwData = await gwRes.json();
    const currentGW = gwData.events.find(e => e.is_current)?.id || 16;
    console.log(`Current GW: ${currentGW}\n`);

    // Sample 5 random leagues
    const leaguesResult = await pool.query(`
      SELECT league_id
      FROM manager_transfers
      GROUP BY league_id
      ORDER BY RANDOM()
      LIMIT 5
    `);

    console.log(`Checking ${leaguesResult.rows.length} random leagues with transfer data:\n`);

    for (const row of leaguesResult.rows) {
      const leagueId = row.league_id;

      // Get league name
      const leagueInfo = await pool.query(`
        SELECT name FROM leagues WHERE id = $1
      `, [leagueId]);
      const leagueName = leagueInfo.rows[0]?.name || 'Unknown';

      console.log(`\n--- League ${leagueId}: ${leagueName} ---`);

      // Get all managers in this league
      const managers = await pool.query(`
        SELECT entry_id FROM league_standings WHERE league_id = $1
      `, [leagueId]);

      console.log(`Total managers: ${managers.rows.length}`);

      // Count transfers per GW
      const transfersByGW = await pool.query(`
        SELECT event, COUNT(*) as transfer_count
        FROM manager_transfers
        WHERE league_id = $1
        GROUP BY event
        ORDER BY event
      `, [leagueId]);

      console.log('Transfers by GW:');
      transfersByGW.rows.forEach(r => {
        const marker = r.event == currentGW ? ' ← CURRENT GW' : '';
        console.log(`  GW${r.event}: ${r.transfer_count} transfers${marker}`);
      });

      // Check current GW specifically
      const currentGWTransfers = await pool.query(`
        SELECT entry_id, COUNT(*) as transfer_count
        FROM manager_transfers
        WHERE league_id = $1 AND event = $2
        GROUP BY entry_id
      `, [leagueId, currentGW]);

      console.log(`\nGW${currentGW} breakdown:`);
      console.log(`  ${currentGWTransfers.rows.length}/${managers.rows.length} managers made transfers`);

      if (currentGWTransfers.rows.length > 0) {
        console.log(`  Sample managers with transfers:`);
        currentGWTransfers.rows.slice(0, 3).forEach(r => {
          console.log(`    - Manager ${r.entry_id}: ${r.transfer_count} transfers`);
        });
      }

      // Check managers with NO transfers in current GW
      const noTransfers = await pool.query(`
        SELECT ls.entry_id
        FROM league_standings ls
        WHERE ls.league_id = $1
          AND ls.entry_id NOT IN (
            SELECT entry_id FROM manager_transfers WHERE league_id = $1 AND event = $2
          )
        LIMIT 3
      `, [leagueId, currentGW]);

      if (noTransfers.rows.length > 0) {
        console.log(`  Managers with NO transfers this GW:`);
        for (const r of noTransfers.rows) {
          // Check FPL API directly
          try {
            const fplRes = await fetch(`https://fantasy.premierleague.com/api/entry/${r.entry_id}/transfers/`);
            const fplTransfers = await fplRes.json();
            const gwTransfers = fplTransfers.filter(t => t.event === currentGW);
            console.log(`    - Manager ${r.entry_id}: ${gwTransfers.length} transfers (per FPL API)`);
          } catch (err) {
            console.log(`    - Manager ${r.entry_id}: API check failed`);
          }
        }
      }
    }

    console.log('\n\n=== SUMMARY ===\n');

    // Overall stats
    const totalTransfers = await pool.query(`
      SELECT COUNT(*) FROM manager_transfers
    `);
    console.log(`Total transfers in DB: ${totalTransfers.rows[0].count}`);

    const currentGWTotal = await pool.query(`
      SELECT COUNT(*) FROM manager_transfers WHERE event = $1
    `, [currentGW]);
    console.log(`GW${currentGW} transfers in DB: ${currentGWTotal.rows[0].count}`);

    const managersWithTransfers = await pool.query(`
      SELECT COUNT(DISTINCT entry_id) FROM manager_transfers WHERE event = $1
    `, [currentGW]);
    console.log(`Managers with GW${currentGW} transfers: ${managersWithTransfers.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

investigate();
