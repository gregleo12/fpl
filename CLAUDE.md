# RivalFPL - Claude Code Context

**Current Version:** v3.1.1
**Last Updated:** December 18, 2025
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
- `player_gameweek_stats` uses `gameweek` (NOT `event`) and `player_id` (NOT `element_id`)
- Always verify actual column names in DATABASE.md before writing queries

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
