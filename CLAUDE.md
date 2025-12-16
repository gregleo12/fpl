# RivalFPL - Claude Code Context

**Current Version:** v2.7.1
**Last Updated:** December 16, 2025
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
