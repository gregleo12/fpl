import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { syncLeagueData } from '@/lib/leagueSync';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const leagueId = parseInt(params.id);

  if (isNaN(leagueId)) {
    return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
  }

  const db = await getDatabase();
  const results: string[] = [];

  try {
    console.log(`[Admin Reset] Starting reset for league ${leagueId}`);

    // 1. Delete manager_gw_history
    const gw = await db.query(
      'DELETE FROM manager_gw_history WHERE league_id = $1',
      [leagueId]
    );
    results.push(`Deleted ${gw.rowCount} rows from manager_gw_history`);
    console.log(`[Admin Reset] Deleted ${gw.rowCount} rows from manager_gw_history`);

    // 2. Delete entry_captains
    const captains = await db.query(`
      DELETE FROM entry_captains
      WHERE entry_id IN (SELECT entry_id FROM league_standings WHERE league_id = $1)
    `, [leagueId]);
    results.push(`Deleted ${captains.rowCount} rows from entry_captains`);
    console.log(`[Admin Reset] Deleted ${captains.rowCount} rows from entry_captains`);

    // 3. Delete manager_chips
    const chips = await db.query(
      'DELETE FROM manager_chips WHERE league_id = $1',
      [leagueId]
    );
    results.push(`Deleted ${chips.rowCount} rows from manager_chips`);
    console.log(`[Admin Reset] Deleted ${chips.rowCount} rows from manager_chips`);

    // 4. Reset sync status
    await db.query(
      `UPDATE leagues SET last_synced = NULL, sync_status = 'pending' WHERE id = $1`,
      [leagueId]
    );
    results.push(`Reset sync status to pending`);
    console.log(`[Admin Reset] Reset sync status to pending`);

    // 5. Trigger fresh sync
    syncLeagueData(leagueId).catch(err => {
      console.error(`[Admin Reset] Sync failed for league ${leagueId}:`, err);
    });
    results.push(`Triggered fresh sync (runs in background)`);
    console.log(`[Admin Reset] Triggered fresh sync for league ${leagueId}`);

    // Return simple HTML page with results
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>League ${leagueId} Reset</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px 20px; background: #0f172a; color: #10b981; max-width: 600px; margin: 0 auto;">
          <h1 style="font-size: 24px; margin-bottom: 20px;">✅ League ${leagueId} Reset Complete</h1>
          <div style="background: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
              ${results.map(r => `<li style="color: #94a3b8;">${r}</li>`).join('')}
            </ul>
          </div>
          <div style="margin-top: 30px; padding: 20px; background: #1e293b; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0 0 10px 0; color: #60a5fa; font-weight: 500;">What happens next:</p>
            <p style="margin: 0; color: #94a3b8; line-height: 1.6;">
              The sync is running in the background and will take 30-60 seconds.<br>
              You can monitor progress in Railway logs.<br><br>
              Wait 1 minute, then check your league's Season Stats to verify the data is fixed.
            </p>
          </div>
          <p style="margin-top: 30px; text-align: center;">
            <a href="/" style="color: #10b981; text-decoration: none; font-weight: 500; padding: 12px 24px; background: #1e293b; border-radius: 6px; display: inline-block;">
              ← Go to App
            </a>
          </p>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error(`[Admin Reset] Error resetting league ${leagueId}:`, error);

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
