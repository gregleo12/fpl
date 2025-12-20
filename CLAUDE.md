# RivalFPL - Claude Code Context

**Current Version:** v3.4.23
**Last Updated:** December 20, 2025
**Project:** FPL H2H Analytics Web App

---

## ⚠️ MANDATORY - READ BEFORE DOING ANYTHING

### Before Starting ANY Task:
1. ✅ Read this entire CLAUDE.md file
2. ✅ Check `git log --oneline -5` for recent changes
3. ✅ Check `cat package.json | grep version` for current version
4. ✅ Read relevant docs below if touching those areas

### After Completing ANY Task:
1. ✅ Test locally: `npm run build`
2. ✅ Bump version: `npm version patch --no-git-tag-version`
3. ✅ Update VERSION_HISTORY.md with new version entry
4. ✅ Update README.md version number
5. ✅ Update CLAUDE.md if critical rules changed
6. ✅ Commit with version: `"vX.Y.Z: Description"`
7. ✅ Push to staging first, verify, then request production deploy

**⛔ DO NOT skip these steps. DO NOT say "I'll do it later." Do it NOW.**

---

## 📚 Required Reading

Before starting any task, be aware of these documentation files:

| File | Purpose | When to Read |
|------|---------|--------------|
| [DATABASE.md](./DATABASE.md) | Tables, caching, sync scripts | Any database work |
| [ENDPOINTS.md](./ENDPOINTS.md) | All API routes | Any API work |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | File structure, data flow | New features |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | How to deploy | Before deploying |
| [VERSION_HISTORY.md](./VERSION_HISTORY.md) | What changed when | Check before fixing bugs |
| [CONTEXT_MAINTENANCE_GUIDE.md](./CONTEXT_MAINTENANCE_GUIDE.md) | How to update docs | After completing any task |

---

## 🔴 Critical Rules (Never Break These)

### Database API Routes
**ALWAYS** add this to ANY API route that queries the database:
```typescript
export const dynamic = 'force-dynamic';
```
**Why:** Without this, Next.js pre-renders at build time when `postgres.railway.internal` is unavailable, causing queries to return zeros or fail silently.

### Data Source Rules (K-27 Caching)
| Gameweek Status | Data Source |
|-----------------|-------------|
| Completed | Use database tables (K-27 cache) |
| Live / In Progress | Use FPL API |
| Upcoming | Use FPL API |

**Important:** When fetching from database for completed GWs, fetch ALL required data:
- `manager_picks` → team selections
- `manager_gw_history` → points, transfer costs
- `manager_chips` → active chip

Never return picks without also fetching GW history (caused v2.7.1 bug).

### Database Performance Rules
**ALWAYS filter database queries to minimum necessary data:**
- ✅ Get player IDs from picks first, then query only those players
- ❌ DON'T fetch all 760 players when you only need 15
- ✅ Use `WHERE player_id = ANY($1)` with specific IDs array
- ❌ DON'T fetch all rows and filter in JavaScript

**Database Column Names:**
- ⚠️ Database schema uses different names than FPL API
- `players` table uses `team_id` (NOT `team`) - caused v3.4.18 bug
- `player_gameweek_stats` uses `gameweek` (NOT `event`) and `player_id` (NOT `element_id`)
- FPL API bootstrap-static uses `element.team`, but database query `SELECT * FROM players` returns `team_id`
- **ALWAYS verify actual column names in DATABASE.md before writing queries**
- **NEVER assume database columns match FPL API property names**

### Deployment Rules
- ✅ Push to `staging` freely - no approval needed
- ❌ NEVER push to `main` without Greg's approval
- ✅ Exception: `/admin` routes can go directly to `main`

### If Railway Doesn't Auto-Deploy
Sometimes the webhook doesn't trigger. Fix with:
```bash
git commit --allow-empty -m "Trigger Railway deployment"
git push origin main
```

---

## 📍 Quick Reference

### URLs
| Environment | URL |
|-------------|-----|
| Production | https://rivalfpl.com or https://www.rivalfpl.com |
| Staging | https://fpl-staging-production.up.railway.app |

### Database
| Type | Connection |
|------|------------|
| Internal | postgres.railway.internal:5432 |
| External | caboose.proxy.rlwy.net:45586 |

### Test Data
- **League ID:** 804742 (Dedoume FPL 9th edition, 20 teams)

---

## 🐛 Recent Bugs (Don't Repeat These)

### v3.4.21 - K-66 Fix Used Wrong Table Join (Dec 20, 2025 - K-66 HOTFIX)
- **Problem:** v3.4.19 K-66 fix broke GW Points Leaders - showed "No data available" instead of rankings
- **Root Cause:** Managers query used `WHERE league_id = $1` but `managers` table has NO `league_id` column
- **Result:** Query returned 0 rows → no managers → no live scores calculated → empty rankings
- **Fix:** Join through `league_standings` table: `JOIN league_standings ls ON ls.entry_id = m.entry_id WHERE ls.league_id = $1`
- **Never Do:** Write queries without verifying table schema - builds succeed but queries return 0 rows
- **Always Do:** Check DATABASE.md for exact table structure before writing JOIN queries
- **Pattern:** To get managers for a league, ALWAYS join through `league_standings` (managers table has no league_id)

### v3.4.19 - GW Rankings Showing 0 Points for Live GW (Dec 20, 2025 - K-66)
- **Problem:** GW Points Rankings modal showed 0 pts for all 20 managers during live GW17
- **Root Cause:** API endpoint only queried database `manager_gw_history`, which has 0 points for live GWs until sync runs
- **Violated:** K-27 Data Source Rules (should use FPL API for live GWs, database for completed GWs)
- **Fix:** Check GW status, use `calculateManagerLiveScore()` for live/upcoming GWs, use database for completed GWs
- **Never Do:** Query `manager_gw_history` without checking if GW is completed - table only has data for finished GWs
- **Always Do:** Implement K-27 rules - check GW status (finished, is_current, data_checked) and use appropriate data source
- **Related:** K-67 (Worst Gameweeks) likely has same root cause - any endpoint querying `manager_gw_history` needs GW status check

### v3.4.18 - Modal Bonus Detection Broken (Dec 20, 2025 - K-63e)
- **Problem:** My Team player modal showed no "Bonus (Live)" row during live games, logs showed `Team: undefined`
- **Root Cause:** Code used `player.team` but database column is `player.team_id` (from `SELECT * FROM players` query)
- **Why Hidden:** Pitch view worked because it uses `element.team` from FPL bootstrap-static API (different data source)
- **Fix:** Changed `player.team` → `player.team_id` in `/api/players/[id]/route.ts` lines 177 & 181
- **Never Do:** Assume column names match between database and FPL API - always verify in DATABASE.md
- **Always Do:** Check actual database schema, especially when using `SELECT *` queries
- **Debug Tip:** Railway logs showed `Team: undefined` which revealed the wrong property access

### v3.4.6 - Sync Getting Stuck in 'syncing' Status (Dec 20, 2025 - K-60)
- **Problem:** League stuck in `sync_status = 'syncing'` for 48+ hours, preventing new syncs
- **Root Cause:** Sync started during FPL downtime, process crashed/timed out, status never updated to 'completed' or 'failed'
- **Fix:** Auto-reset syncs stuck >10 minutes, enhanced error handling, added `last_sync_error` column, manual reset endpoint
- **Never Do:** Update status at start of process without try-catch-finally to ensure status updates on errors
- **Always Do:** Implement timeout protection and auto-reset for long-running processes

### v3.4.5 - Transfers Not Showing for Live GW (Dec 20, 2025 - K-59)
- **Problem:** GW17 transfers showed "No transfers made" despite user making 3 transfers
- **Root Cause:** Transfers endpoint always queried database (violated K-27 rules), database had 0 GW17 transfers (last sync before GW17 started)
- **Fix:** Check if GW is live/upcoming, fetch from FPL API for live GWs, use database for completed GWs
- **Never Do:** Always use database for all GWs - must implement K-27 Data Source Rules (completed = DB, live = API)

### v3.1.2 - Player Cards Showing Stale Points (Dec 18, 2025)
- **Problem:** Player cards on My Team pitch showed wrong points (Bruno GW16: 4 pts vs actual 13 pts)
- **Root Cause:** scoreCalculator used database K-27 cache for player stats, but DB had stale/incorrect data
- **DB Data:** Bruno = 4 pts, 45 mins, 0 goals; **FPL API:** Bruno = 13 pts, 90 mins, 1 goal
- **Fix:** Disabled DB fetch for player stats in scoreCalculator, always use FPL API for accuracy
- **Never Do:** Trust database cache for critical display data without verifying freshness - FPL API is source of truth

### v3.1.1 - Player Modal Wrong Total Points (Dec 18, 2025)
- **Problem:** Player modal showed incorrect total points (e.g., Bruno Fernandes GW16: 4 pts instead of 13 pts)
- **Root Cause:** Modal displayed `player.event_points` from scoreCalculator (uses stale database cache) but showed fresh FPL API stats in breakdown
- **Fix:** Calculate total from displayed stat breakdown using `calculateStatPoints()` instead of relying on prop
- **Never Do:** Display totals from one data source when breakdown comes from a different source - always calculate from shown data

### v3.0.11 - Overview Tab Regression (Dec 18, 2025)
- **Problem:** My Team Player Modal Overview tab only showed "Defensive contribution: 0" and "Total Points"
- **Root Cause:** FPL history uses `round` field, but modal searches for `gameweek` field
- **Introduced:** v3.0.9 when switching to FPL history format for Players Tab modal compatibility
- **Fix:** Map `round` to `gameweek` in API response: `fplHistory.map(h => ({...h, gameweek: h.round}))`
- **Never Do:** Change data formats without checking all consumers of that data

### v3.0.8 - Player Modal CORS Error (Dec 18, 2025)
- **Problem:** Player Modal showed "TypeError: Failed to fetch", tabs didn't work
- **Root Cause:** PlayerModal made client-side fetch to FPL API for past seasons, causing CORS error
- **Fix:** Moved past seasons fetch to server-side in `/api/players/[id]` route, added to response
- **Never Do:** Make client-side fetch calls directly to FPL API - always fetch server-side in API routes

### v3.0.5 - Wrong Column Names in DB Query (Dec 18, 2025)
- **Problem:** `player_gameweek_stats` query failed silently
- **Root Cause:** Used FPL API column names instead of database column names
  - Used `event` instead of `gameweek`
  - Used `element_id` instead of `player_id`
- **Fix:** Updated query to use correct database schema column names
- **Never Do:** Assume database column names match FPL API field names - always check actual schema

### v3.0.4 - Performance Issue: Fetching All Players (Dec 18, 2025)
- **Problem:** My Team loaded slowly for completed GWs (500ms+ queries)
- **Root Cause:** Fetched all 760 players from `player_gameweek_stats` instead of just the 15 in squad
- **Fix:** Fetch manager picks first, extract player IDs, then query only those 15 players
- **Impact:** 98% reduction in rows fetched (760 → 15), query time dropped to 10-50ms
- **Never Do:** Fetch all players when you only need specific ones - always filter by player IDs

### v2.7.1 - H2H Fixtures Showing 0-0 (Dec 16, 2025)
- **Problem:** All H2H fixtures showed 0-0 for completed GWs
- **Root Cause:** `fetchManagerPicks()` in scoreCalculator.ts only fetched picks, missed points from `manager_gw_history`
- **Fix:** Fetch from all 3 K-27 tables in parallel (picks, history, chips)
- **Never Do:** Return picks data without also fetching GW history for completed gameweeks

### v2.0.16 - Admin Panel Showing Zeros (Dec 8, 2025)
- **Problem:** Admin dashboard showed 0 for all stats
- **Root Cause:** Missing `export const dynamic = 'force-dynamic'`
- **Fix:** Added force-dynamic to admin API routes
- **Never Do:** Create database API routes without force-dynamic

---

## ✅ After Every Task Checklist

Add this to the end of every task:

```
## After Completion
- [ ] Test locally: `npm run build`
- [ ] Bump version: `npm version patch --no-git-tag-version`
- [ ] Update VERSION_HISTORY.md with new version entry
- [ ] Update README.md version number
- [ ] Update CLAUDE.md if any critical rules changed
- [ ] Commit with version in message: "vX.Y.Z: Description"
- [ ] Push to staging first, verify, then request production deploy
```

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production

# Database Sync (K-27)
npm run sync:manager-history    # Sync GW history
npm run sync:manager-picks      # Sync team picks
npm run sync:manager-chips      # Sync chip usage
npm run sync:manager-transfers  # Sync transfers
npm run sync:pl-fixtures        # Sync PL fixtures

# Deployment
git push origin staging         # Deploy to staging
git push origin main            # Deploy to production (needs approval)
```

---

## 📝 Version Numbering

| Type | When to Use | Example |
|------|-------------|---------|
| Patch (0.0.X) | Bug fixes, small tweaks | v2.7.1 |
| Minor (0.X.0) | New features | v2.7.0 |
| Major (X.0.0) | Breaking changes | v3.0.0 |

Always include version in commit message: `"vX.Y.Z: Description"`

---

## 🚨 When Starting a New Session

1. Check current version: `cat package.json | grep version`
2. Check recent commits: `git log --oneline -5`
3. Read this file (CLAUDE.md)
4. Read relevant docs (DATABASE.md, ENDPOINTS.md, etc.)
5. Ask Greg: "What are we working on today?"

---

## 🚨 When Ending a Session

1. Ensure all changes are committed
2. Update VERSION_HISTORY.md if version was bumped
3. Update this file if any critical rules changed
4. Confirm staging/production deployment status with Greg

---

## 📋 Standard Brief Footer

When creating briefs for tasks, ALWAYS include this footer at the end:

```
## After Completion
- [ ] Test locally: `npm run build`
- [ ] Bump version: `npm version patch --no-git-tag-version`
- [ ] Update VERSION_HISTORY.md with new version entry
- [ ] Update README.md version number
- [ ] Update CLAUDE.md if any critical rules changed
- [ ] Commit with version in message: "vX.Y.Z: Description"
- [ ] Push to staging first, verify, then request production deploy
```

This ensures documentation stays updated and deployments are verified.

---

**Questions?** Ask Greg before proceeding if anything is unclear.
