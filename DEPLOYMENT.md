# RivalFPL - Deployment Guide

**Last Updated:** December 24, 2025
**Current Version:** v4.1.0
**Platform:** Railway

---

## 🌐 Environments

| Environment | URL | Branch | Auto-deploy |
|-------------|-----|--------|-------------|
| **Production** | https://rivalfpl.com | `main` | ⚠️ Needs approval |
| **Production** | https://www.rivalfpl.com | `main` | ⚠️ Needs approval |
| **Staging** | https://fpl-staging-production.up.railway.app | `staging` | ✅ Yes |

**Note:** Both `rivalfpl.com` and `www.rivalfpl.com` work. The non-www redirects to www.

---

## 🔌 Database

| Type | Host | Port |
|------|------|------|
| Internal (Railway) | postgres.railway.internal | 5432 |
| External (Scripts) | caboose.proxy.rlwy.net | 45586 |

All environments use the same PostgreSQL database.

---

## 🚀 Deployment Workflow

### Staging (No Approval Needed)

```bash
# 1. Make changes
# 2. Test locally
npm run build

# 3. Commit
git add .
git commit -m "vX.Y.Z: Description"

# 4. Push to staging
git push origin staging

# 5. Verify on staging URL
# https://fpl-staging-production.up.railway.app
```

### Production (Requires Approval)

```bash
# 1. Complete staging workflow above
# 2. Verify everything works on staging

# 3. ASK GREG: "Ready to deploy to production?"
# 4. WAIT for explicit approval

# 5. Only after approval:
git checkout main
git pull origin main
git merge staging
git push origin main

# 6. Verify on production
# https://rivalfpl.com
```

---

## ⚠️ If Railway Doesn't Auto-Deploy

Sometimes the Railway webhook doesn't trigger. Fix with an empty commit:

```bash
git commit --allow-empty -m "Trigger Railway deployment"
git push origin main
```

This forces Railway to detect a new commit and start a build.

---

## 🔴 Critical Rules

| Rule | Details |
|------|---------|
| ✅ Push to staging freely | No approval needed, OK if it breaks |
| ❌ Never push to main without approval | Always ask Greg first |
| ✅ Admin routes exception | `/admin` changes can go directly to main |
| ✅ Always test staging first | Before requesting production deploy |

---

## 📋 Deployment Checklist

Before deploying:

- [ ] Code changes complete
- [ ] Local build passes (`npm run build`)
- [ ] Version bumped in package.json
- [ ] VERSION_HISTORY.md updated (technical details)
- [ ] changelog.json updated (user-facing, see CHANGELOG_GUIDE.md)
- [ ] README.md version updated
- [ ] Committed with version in message

After pushing to staging:

- [ ] Check Railway dashboard for build status
- [ ] Verify app loads on staging environment
- [ ] Test key features work
- [ ] Check for console errors
- [ ] Verify What's New page shows latest updates

After pushing to production:

- [ ] Check Railway dashboard for build status
- [ ] Verify app loads on production
- [ ] Test key features work
- [ ] Check version badge appears for existing users
- [ ] Confirm What's New page accessible

---

## 🔧 Environment Variables

All environment variables are managed in Railway dashboard:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NODE_ENV` | `production` or `development` |

**Never commit .env files to git.**

---

## 🐛 Troubleshooting

### Build Fails on Railway

1. Check Railway build logs in dashboard
2. Ensure all dependencies are in package.json
3. Verify `npm run build` succeeds locally

### Database Connection Issues

1. Check DATABASE_URL is set in Railway
2. Verify PostgreSQL service is running
3. Check connection string format

### App Not Reflecting Changes

1. Confirm git push succeeded: `git log --oneline -1`
2. Check Railway deployment status in dashboard
3. Try empty commit to trigger deploy (see above)

### Version Still Shows Old

1. Railway build may still be in progress
2. Check Railway dashboard for build status
3. Wait 2-3 minutes for deployment to complete
4. Hard refresh browser (Cmd+Shift+R)

---

## 📊 Monitoring

### Check Current Version

```bash
curl -s https://rivalfpl.com/api/version
```

### Check Health

```bash
curl -s https://rivalfpl.com/api/health
```

### View Recent Commits

```bash
git log --oneline -10
```

---

## 🗂️ Domain Setup (Reference)

### DNS Configuration (OVH)

| Type | Name | Target |
|------|------|--------|
| CNAME | www | Railway app URL |
| Redirect | @ | https://www.rivalfpl.com |

The apex domain (rivalfpl.com) redirects to www.rivalfpl.com.

---

## 📝 Version Numbering

| Type | When | Example |
|------|------|---------|
| Patch | Bug fixes | v2.7.1 |
| Minor | New features | v2.8.0 |
| Major | Breaking changes | v3.0.0 |

Always bump version before deploying:

```bash
npm version patch --no-git-tag-version
# or: npm version minor --no-git-tag-version
```

---

**Questions?** Check Railway dashboard for logs and build status.
