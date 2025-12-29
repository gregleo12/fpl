import { getDatabase } from '../../lib/db.js';
import { syncPlayerHistory } from '../../lib/sync/playerSync.js';

async function syncAllPlayersDefcon() {
  console.log('[DEFCON Sync] Starting full player sync...');
  const db = await getDatabase();

  try {
    // Get all player IDs from database
    const result = await db.query('SELECT DISTINCT id FROM players ORDER BY id');
    const playerIds = result.rows.map((r: any) => r.id);

    console.log(`[DEFCON Sync] Found ${playerIds.length} players to sync`);

    let synced = 0;
    let errors = 0;

    for (const playerId of playerIds) {
      try {
        await syncPlayerHistory(playerId);
        synced++;

        // Progress update every 50 players
        if (synced % 50 === 0) {
          console.log(`[DEFCON Sync] Progress: ${synced}/${playerIds.length}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errors++;
        console.error(`[DEFCON Sync] Error syncing player ${playerId}:`, error);
      }
    }

    console.log(`[DEFCON Sync] ✅ Completed!`);
    console.log(`[DEFCON Sync] Synced: ${synced}, Errors: ${errors}`);
    process.exit(0);
  } catch (error) {
    console.error('[DEFCON Sync] Fatal error:', error);
    process.exit(1);
  }
}

syncAllPlayersDefcon();
