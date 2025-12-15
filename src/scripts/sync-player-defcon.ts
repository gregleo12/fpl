import { syncPlayerHistory } from '../lib/sync/playerSync.js';

async function syncPlayer() {
  // Sync Senesi (ID 72) who we know has defensive contribution in GW15
  const playerId = 72;
  console.log(`[Sync] Syncing player ${playerId} with defensive contribution...`);

  const updated = await syncPlayerHistory(playerId);
  console.log(`[Sync] ✅ Synced ${updated} gameweeks for player ${playerId}`);

  process.exit(0);
}

syncPlayer();
