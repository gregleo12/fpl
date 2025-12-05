# Deployment Guide - Railway

## 🚂 Current Deployment Method: Railway

This project is deployed on **Railway** with automatic deployments from GitHub.

**Database:** Internal PostgreSQL (`postgres.railway.internal`)

---

## 🌍 Environments

| Environment | URL | Branch | Auto-deploy |
|-------------|-----|--------|-------------|
| **Staging** | fpl-staging-production.up.railway.app | `staging` | ✅ Yes |
| **Production** | dedoume.pronos.xyz | `main` | ❌ Needs approval |

**Database:** All environments use internal Postgres in FPL project (`postgres.railway.internal`)

---

## 📋 For AI Assistants / Claude Code

### CRITICAL: Deployment Workflow

**✅ STAGING WORKFLOW (No approval needed):**
1. Make code changes locally
2. Build and test locally: `npm run build`
3. Bump version: `npm version patch --no-git-tag-version`
4. Commit changes: `git add . && git commit -m "..."`
5. Push to staging: `git push origin staging`
6. Test on staging URL: `fpl-staging-production.up.railway.app`

**⚠️ PRODUCTION WORKFLOW (Requires approval):**
1. Complete staging workflow above
2. **STOP - Ask Greg for approval:** "Ready to merge staging to main and deploy to production?"
3. **Wait for explicit approval**
4. Only after approval:
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

**❌ DO NOT:**
- Push directly to `main` branch without Greg's approval
- Skip testing on staging first
- Run any deployment scripts (none exist)
- Attempt to SSH into servers
- Use rsync, scp, or any file transfer tools
- Look for NAS, Docker, or manual deployment methods

### Key Rules
- ✅ Push to `staging` branch freely - no approval needed
- ❌ NEVER push directly to `main` without Greg's approval
- 📈 Version numbers stay sequential (main may jump versions after merge)
- 🧪 Always test on staging first before requesting production deploy

### Quick Reference
- **Staging Deploy:** `git push origin staging` (auto-deploys, OK if it breaks)
- **Production Deploy:** `git push origin main` (**requires approval first**)
- **Check status:** Railway dashboard
- **Database:** PostgreSQL connection string in Railway environment variables
- **Environment:** All env vars managed in Railway dashboard

---

## 🔍 How to Identify This is Railway

If you're an AI assistant unsure about deployment:
1. Check `git remote -v` - will show GitHub remote
2. No `scripts/` directory exists
3. No Docker files exist
4. Database is PostgreSQL (not SQLite)
5. This file says "Railway" at the top 😊

---

## 🚀 Deployment Checklist

When deploying a new version:

- [ ] Code changes complete
- [ ] Local build successful (`npm run build`)
- [ ] Version bumped in package.json
- [ ] Changes committed with clear message
- [ ] Pushed to GitHub (`git push`)
- [ ] Railway automatically picks up changes and deploys
- [ ] Verify deployment in Railway dashboard (if needed)

---

## 📊 Tech Stack

- **Frontend/Backend:** Next.js 14 (App Router)
- **Database:** PostgreSQL (Railway)
- **Hosting:** Railway
- **Deployment:** Git push → Railway auto-deploy
- **CI/CD:** Railway automatic deployments

---

## 🔑 Environment Variables

All environment variables are managed in Railway dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Set to `production`
- Any FPL API related variables

**Never commit .env files to git**

---

## 🐛 Troubleshooting

### Build fails on Railway
- Check Railway build logs in dashboard
- Ensure all dependencies are in package.json
- Verify Next.js build succeeds locally

### Database connection issues
- Check DATABASE_URL is set in Railway
- Verify PostgreSQL service is running
- Check connection string format

### App not reflecting changes
- Confirm git push succeeded: `git log --oneline -1`
- Check Railway deployment status
- May need to trigger manual redeploy in Railway dashboard

---

## 📝 Version History

- **v1.26.7** - Current version (Admin Leagues Page)
- See VERSION_HISTORY_COMPLETE.md for full changelog

---

## 🚨 IMPORTANT REMINDERS

1. **Git is the ONLY deployment method**
2. **No manual file copying or server access**
3. **Railway handles everything after `git push`**
4. **Database is PostgreSQL, not SQLite**

If you see any legacy deployment scripts, Docker files, or NAS references - **IGNORE THEM**. They are outdated.
