# K-165b: Railway Cron Setup Instructions

## Overview
K-165b implements scheduled auto-sync for completed gameweeks using Railway's cron job feature.

## Railway Cron Configuration

### Step 1: Access Railway Dashboard
1. Go to https://railway.app
2. Navigate to the RivalFPL project
3. Select the production service

### Step 2: Add Cron Job
1. Click on **Settings** in the left sidebar
2. Scroll down to **Cron Jobs** section
3. Click **Add Cron Job**

### Step 3: Configure Cron Schedule
Enter the following configuration:

- **Name:** `sync-completed-gws`
- **Schedule:** `0 */2 * * *`
- **Command:** `curl https://rivalfpl.com/api/cron/sync-completed-gws`

### Schedule Explanation
`0 */2 * * *` = Every 2 hours at minute 0
- Runs at: 12:00 AM, 2:00 AM, 4:00 AM, 6:00 AM, 8:00 AM, 10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM, 6:00 PM, 8:00 PM, 10:00 PM
- 12 runs per day
- Covers all timezones for worldwide gameweek finishes

### Step 4: Save and Enable
1. Click **Save**
2. Ensure the cron job is **enabled** (toggle should be ON)

## Testing the Cron Job

### Manual Trigger (for testing)
You can manually trigger the cron endpoint to verify it works:

```bash
curl https://rivalfpl.com/api/cron/sync-completed-gws
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2026-01-02T12:00:00.000Z",
  "duration_ms": 15234,
  "stats": {
    "leagues_checked": 10,
    "gameweeks_checked": 19,
    "synced": 2,
    "skipped": 188,
    "failed": 0,
    "stuck_syncs_reset": 0
  },
  "results": [...]
}
```

### Monitoring Cron Execution

1. **Railway Logs**: Check Railway logs for `[K-165b]` prefix entries
2. **Admin Dashboard**: Use `/api/admin/sync-status` endpoint to view sync status
3. **Database**: Query `league_gw_sync` table directly:

```sql
SELECT * FROM league_gw_sync
ORDER BY updated_at DESC
LIMIT 20;
```

## Troubleshooting

### Cron Not Running
- Verify cron job is **enabled** in Railway dashboard
- Check Railway logs for execution errors
- Ensure endpoint is accessible (test with curl)

### Syncs Failing
- Check `/api/admin/sync-status` for failed syncs
- Review error messages in `league_gw_sync.error_message` column
- Check FPL API availability
- Verify database connection

### Stuck Syncs
The cron job automatically resets syncs stuck in "in_progress" for >10 minutes.
Manual reset if needed:

```typescript
import { resetStuckSyncs } from '@/lib/syncManager';
await resetStuckSyncs(10); // Reset syncs stuck >10 minutes
```

## Alternative: Staging Environment

For staging environment, use a different schedule to avoid conflicts:

- **Schedule:** `15 */3 * * *` (every 3 hours at minute 15)
- **Command:** `curl https://fpl-staging-production.up.railway.app/api/cron/sync-completed-gws`

## Rollback Plan

If K-165b needs to be disabled:

1. **Disable Railway cron job** (toggle OFF in dashboard)
2. Existing K-142 user-triggered sync will continue working
3. No database changes needed (tables are additive)

## Next Steps

After Railway cron is configured:

1. ✅ Monitor first few executions via Railway logs
2. ✅ Verify syncs complete successfully via admin dashboard
3. ✅ Confirm no duplicate syncs or stuck processes
4. ✅ Update VERSION_HISTORY.md documenting K-165b deployment
