/**
 * K-200: Admin Endpoint to Sync Elite Picks
 *
 * POST /api/admin/sync-elite-picks
 *
 * Runs migration (if needed) + syncs 500 team sample
 * Takes ~6-8 minutes to complete
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes max

const SAMPLE_TIER = 'top500';
const TOTAL_PAGES = 10; // 500 teams
const DELAY_BETWEEN_REQUESTS = 150;
const BATCH_SIZE = 50;
const PAUSE_BETWEEN_BATCHES = 3000;

interface FPLPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithDelay(url: string, delayMs: number = DELAY_BETWEEN_REQUESTS): Promise<any> {
  await sleep(delayMs);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });

  if (response.status === 429) {
    await sleep(30000);
    return fetchWithDelay(url, delayMs * 2);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

export async function POST() {
  const logs: string[] = [];

  try {
    const db = await getDatabase();
    logs.push('✅ Connected to database');

    // Step 1: Check if tables exist, create if not
    const tablesCheck = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('elite_picks', 'elite_sync_status')
    `);

    if (tablesCheck.rows.length < 2) {
      logs.push('📋 Running migration...');
      const migrationPath = path.join(process.cwd(), 'src/db/migrations/create-elite-picks.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      await db.query(migrationSQL);
      logs.push('✅ Tables created: elite_picks, elite_sync_status');
    } else {
      logs.push('✅ Tables already exist');
    }

    // Step 2: Get current gameweek
    logs.push('📅 Fetching current gameweek...');
    const fplData = await fetchWithDelay('https://fantasy.premierleague.com/api/bootstrap-static/');
    const currentEvent = fplData.events.find((e: any) => e.is_current);
    const gameweek = currentEvent?.id || 19;
    logs.push(`✅ Current gameweek: ${gameweek}`);

    // Step 3: Check if already synced
    const existingSync = await db.query(
      'SELECT status, teams_fetched FROM elite_sync_status WHERE gameweek = $1 AND sample_tier = $2',
      [gameweek, SAMPLE_TIER]
    );

    if (existingSync.rows.length > 0 && existingSync.rows[0].status === 'completed') {
      const count = existingSync.rows[0].teams_fetched;
      logs.push(`⚠️ Already synced: ${count} teams for GW${gameweek}`);
      return NextResponse.json({
        success: true,
        message: 'Already synced',
        gameweek,
        teams: count,
        logs,
      });
    }

    // Step 4: Fetch top team IDs
    logs.push(`📋 Fetching top ${TOTAL_PAGES * 50} team IDs...`);
    const teamIds: number[] = [];

    for (let page = 1; page <= TOTAL_PAGES; page++) {
      const url = `https://fantasy.premierleague.com/api/leagues-classic/314/standings/?page_standings=${page}`;
      const data = await fetchWithDelay(url);
      data.standings.results.forEach((entry: any) => teamIds.push(entry.entry));

      if (page % 5 === 0) {
        logs.push(`  Page ${page}/${TOTAL_PAGES}: ${teamIds.length} teams`);
      }
    }
    logs.push(`✅ Fetched ${teamIds.length} team IDs`);

    // Step 5: Mark as in progress
    const now = new Date();
    await db.query(
      `INSERT INTO elite_sync_status
        (gameweek, sample_tier, status, teams_fetched, total_teams, started_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (gameweek, sample_tier)
      DO UPDATE SET
        status = EXCLUDED.status,
        teams_fetched = EXCLUDED.teams_fetched,
        total_teams = EXCLUDED.total_teams,
        started_at = EXCLUDED.started_at`,
      [gameweek, SAMPLE_TIER, 'in_progress', 0, teamIds.length, now]
    );

    // Step 6: Process teams
    logs.push(`🔄 Syncing ${teamIds.length} teams...`);
    let successCount = 0;

    for (let i = 0; i < teamIds.length; i += BATCH_SIZE) {
      const batch = teamIds.slice(i, i + BATCH_SIZE);

      for (const entryId of batch) {
        try {
          const url = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gameweek}/picks/`;
          const picksData = await fetchWithDelay(url);

          if (picksData?.picks) {
            for (const pick of picksData.picks) {
              await db.query(
                `INSERT INTO elite_picks
                  (gameweek, sample_tier, entry_id, player_id, is_captain, is_vice_captain, multiplier)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (gameweek, sample_tier, entry_id, player_id) DO NOTHING`,
                [gameweek, SAMPLE_TIER, entryId, pick.element, pick.is_captain, pick.is_vice_captain, pick.multiplier]
              );
            }
            successCount++;
          }
        } catch (err) {
          // Skip failed teams
        }
      }

      if ((i + BATCH_SIZE) % 100 === 0) {
        logs.push(`  Progress: ${successCount}/${teamIds.length} teams`);
      }

      if (i + BATCH_SIZE < teamIds.length) {
        await sleep(PAUSE_BETWEEN_BATCHES);
      }
    }

    // Step 7: Mark as completed
    const completedAt = new Date();
    await db.query(
      `UPDATE elite_sync_status
       SET status = $1, teams_fetched = $2, completed_at = $3
       WHERE gameweek = $4 AND sample_tier = $5`,
      ['completed', successCount, completedAt, gameweek, SAMPLE_TIER]
    );

    logs.push(`✅ Sync completed!`);
    logs.push(`📊 Teams synced: ${successCount}/${teamIds.length}`);

    // Verify
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM elite_picks WHERE gameweek = $1 AND sample_tier = $2',
      [gameweek, SAMPLE_TIER]
    );
    const totalPicks = countResult.rows[0].total;
    logs.push(`📁 Total picks stored: ${totalPicks}`);

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      gameweek,
      teams_synced: successCount,
      total_picks: totalPicks,
      duration_ms: completedAt.getTime() - now.getTime(),
      logs,
    });

  } catch (error) {
    logs.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
    }, { status: 500 });
  }
}
