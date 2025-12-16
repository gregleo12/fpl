import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const db = await getDatabase();
  const results: string[] = [];

  try {
    console.log('[Admin Reset All] Starting reset for all leagues...');

    // Get all league IDs
    const leaguesResult = await db.query('SELECT id, name FROM leagues ORDER BY id');
    const leagues = leaguesResult.rows;

    results.push(`Found ${leagues.length} leagues to reset`);
    console.log(`[Admin Reset All] Found ${leagues.length} leagues`);

    // Clear all manager_gw_history
    const gwResult = await db.query('DELETE FROM manager_gw_history');
    results.push(`Deleted ${gwResult.rowCount} rows from manager_gw_history`);
    console.log(`[Admin Reset All] Deleted ${gwResult.rowCount} rows from manager_gw_history`);

    // Clear all entry_captains
    const captainsResult = await db.query('DELETE FROM entry_captains');
    results.push(`Deleted ${captainsResult.rowCount} rows from entry_captains`);
    console.log(`[Admin Reset All] Deleted ${captainsResult.rowCount} rows from entry_captains`);

    // Clear all manager_chips
    const chipsResult = await db.query('DELETE FROM manager_chips');
    results.push(`Deleted ${chipsResult.rowCount} rows from manager_chips`);
    console.log(`[Admin Reset All] Deleted ${chipsResult.rowCount} rows from manager_chips`);

    // Reset sync status for all leagues
    const resetResult = await db.query(`
      UPDATE leagues
      SET last_synced = NULL, sync_status = 'pending'
    `);
    results.push(`Reset sync status for ${resetResult.rowCount} leagues`);
    console.log(`[Admin Reset All] Reset sync status for ${resetResult.rowCount} leagues`);

    // Return success page
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Leagues Reset</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px 20px; background: #0f172a; color: #10b981; max-width: 700px; margin: 0 auto;">
          <h1 style="font-size: 28px; margin-bottom: 30px;">✅ All Leagues Reset Complete</h1>

          <div style="background: #1e293b; padding: 25px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #10b981; font-size: 18px;">Results:</h3>
            <ul style="line-height: 2; color: #94a3b8; margin: 0; padding-left: 20px;">
              ${results.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>

          <div style="background: #1e293b; padding: 25px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #60a5fa; font-size: 18px;">What Happens Next:</h3>
            <p style="color: #94a3b8; line-height: 1.7; margin-bottom: 15px;">
              All league data has been cleared. When users visit their leagues:
            </p>
            <ol style="line-height: 2; color: #94a3b8; margin: 0; padding-left: 20px;">
              <li>The app will detect no synced data exists</li>
              <li>Auto-sync will automatically trigger for that league</li>
              <li>Fresh, correct data will be populated in 30-60 seconds</li>
            </ol>
            <p style="color: #10b981; line-height: 1.7; margin-top: 20px; font-weight: 500;">
              ✓ No action needed from you. Leagues will fix themselves as users visit.
            </p>
          </div>

          <div style="background: #1e293b; padding: 25px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #fbbf24; font-size: 18px;">Important Notes:</h3>
            <ul style="line-height: 2; color: #94a3b8; margin: 0; padding-left: 20px;">
              <li>First visit to each league will trigger 30-60 second sync</li>
              <li>Stats will be empty until sync completes</li>
              <li>All data will be fresh and correct (no corrupted column swaps)</li>
              <li>Each league syncs independently on first visit</li>
            </ul>
          </div>

          <p style="margin-top: 40px; text-align: center;">
            <a href="/" style="color: #10b981; text-decoration: none; font-weight: 500; padding: 12px 24px; background: #1e293b; border-radius: 6px; display: inline-block; font-size: 16px;">
              ← Go to App
            </a>
          </p>

          <p style="color: #475569; font-size: 12px; margin-top: 50px; text-align: center; border-top: 1px solid #334155; padding-top: 20px;">
            Reset completed at: ${new Date().toISOString()}<br>
            Total leagues affected: ${leagues.length}
          </p>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('[Admin Reset All] Error:', error);

    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reset Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px 20px; background: #0f172a; color: #ef4444; max-width: 600px; margin: 0 auto;">
          <h1 style="font-size: 24px; margin-bottom: 20px;">❌ Reset Failed</h1>
          <div style="background: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #fca5a5; font-family: monospace; white-space: pre-wrap;">${String(error)}</p>
          </div>
          <p style="margin-top: 30px; text-align: center;">
            <a href="/" style="color: #10b981; text-decoration: none; font-weight: 500; padding: 12px 24px; background: #1e293b; border-radius: 6px; display: inline-block;">
              ← Go back to app
            </a>
          </p>
        </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}
