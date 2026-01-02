# K-200: Top 10K Ownership Combinations - Handoff Document

**Status:** ✅ Deployed to Production (v4.4.7)
**Created:** January 2, 2026
**Last Updated:** January 2, 2026

This document is for managing K-200 in a separate Claude Code session, allowing the main session to focus on RivalFPL H2H app.

---

## 🎯 Quick Overview

**What it does:** Shows what player combinations elite FPL managers (top 10K by total points) own together from each team.

**Live URLs:**
- Production: https://rivalfpl.com/ownership
- Staging: https://fpl-staging-production.up.railway.app/ownership

**Current Data:** GW19, 10,000 teams, 150,000 player picks

---

## 📊 Current Status

### Production (v4.4.7)
- ✅ All 20 PL teams in selector
- ✅ Team IDs correctly mapped to database
- ✅ 10K data synced (GW19)
- ✅ Doubles and triples displaying correctly
- ✅ Mobile responsive

### Known Issues
- None currently

---

## 🔧 Key Files

### Database
- `src/db/migrations/create-elite-picks.sql` - Schema for elite_picks and elite_sync_status tables

### Backend
- `src/scripts/sync-elite-picks.ts` - Main sync script (10K teams, ~60-90 min)
- `src/scripts/run-elite-picks-migration.ts` - Migration runner
- `src/app/api/ownership/combinations/route.ts` - API endpoint for combinations
- `src/app/api/admin/sync-elite-picks/route.ts` - Admin endpoint (timeout limit: 5 min)

### Frontend
- `src/app/ownership/page.tsx` - Page route
- `src/components/Ownership/OwnershipPage.tsx` - Main container
- `src/components/Ownership/TeamSelector.tsx` - Team dropdown (20 teams)
- `src/components/Ownership/CombinationTable.tsx` - Table component
- `src/components/Ownership/Ownership.module.css` - Styling

### Utilities
- `src/scripts/verify-elite-data.ts` - Verify data in database

---

## 🚀 How to Run Weekly Sync

**Recommended: Run locally connected to Railway DB**

```bash
# Navigate to project
cd "/Users/matos/Football App Projects/fpl"

# Run sync (takes 60-90 minutes)
DATABASE_URL="postgresql://postgres:LmoGdsXHMosNUwfCdKmPlaIMletkDZXj@caboose.proxy.rlwy.net:45586/railway" npm run sync:elite-picks
```

**Monitor progress:**
```bash
# If running in background
tail -f /tmp/elite-10k-sync.log

# Check if complete
grep "✅ Sync completed successfully" /tmp/elite-10k-sync.log
```

**Alternative: Railway CLI (runs on their servers)**
```bash
railway login
railway link
railway run npm run sync:elite-picks
```

---

## 📋 Configuration

**Current Settings** (in `src/scripts/sync-elite-picks.ts`):

```typescript
const SAMPLE_TIER = 'top10k';        // Sample tier name
const TOTAL_PAGES = 200;              // 200 pages × 50 teams = 10,000
const DELAY_BETWEEN_REQUESTS = 150;   // 150ms delay (~6-7 req/sec)
const BATCH_SIZE = 50;                // Process 50 teams at a time
const PAUSE_BETWEEN_BATCHES = 3000;   // 3 sec pause between batches
```

**To change sample size:**
- Top 500: `TOTAL_PAGES = 10` (~6 min)
- Top 1K: `TOTAL_PAGES = 20` (~12 min)
- Top 10K: `TOTAL_PAGES = 200` (~90 min)
- Top 100K: `TOTAL_PAGES = 2000` (~15 hours) - NOT RECOMMENDED

---

## 🗄️ Database Schema

**elite_picks table:**
```sql
CREATE TABLE elite_picks (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  sample_tier VARCHAR(20) NOT NULL,  -- 'top10k'
  entry_id INTEGER NOT NULL,         -- FPL manager ID
  player_id INTEGER NOT NULL,        -- Player ID
  is_captain BOOLEAN,
  is_vice_captain BOOLEAN,
  multiplier INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(gameweek, sample_tier, entry_id, player_id)
);
```

**elite_sync_status table:**
```sql
CREATE TABLE elite_sync_status (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  sample_tier VARCHAR(20) NOT NULL,
  teams_fetched INTEGER,
  total_teams INTEGER,
  status VARCHAR(20),  -- 'pending', 'in_progress', 'completed', 'failed'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  UNIQUE(gameweek, sample_tier)
);
```

---

## 🔍 Verify Data

```bash
# Check total picks for current GW
DATABASE_URL="..." npx tsx src/scripts/verify-elite-data.ts

# Expected output for 10K:
# Total picks: 150000 (10K teams × 15 players)

# Check Arsenal ownership
# Expected: Saka ~58%, Raya ~36%, Timber ~33%
```

---

## 🐛 Common Issues

### Issue: Team selector shows wrong team
**Solution:** Verify team IDs match database
```sql
SELECT id, name FROM teams ORDER BY id;
```
Update `TeamSelector.tsx` TEAMS array if needed.

### Issue: No data for a gameweek
**Solution:** Run sync script for that GW
```bash
DATABASE_URL="..." npm run sync:elite-picks
```

### Issue: Sync takes too long
**Solution:**
- Top 10K takes 60-90 min (normal)
- Don't close terminal/laptop while running
- Use Railway CLI to run on their servers

### Issue: API returns 404
**Solution:** Check tables exist
```bash
DATABASE_URL="..." npm run migrate:elite-picks
```

---

## 📈 Future Enhancements

**Priority Features (not yet implemented):**
1. Historical GW comparison (show trending combos)
2. Captain ownership in combinations
3. Cross-team popular pairs (e.g., Salah + Saka together)
4. Top 1K / Top 100K tiers
5. Automated weekly sync (cron job)
6. Integration into main RivalFPL dashboard
7. Export data as CSV

**Data Enrichment:**
- Form analysis (are combinations working?)
- Price change correlation
- Template differential finder

---

## 🔄 Weekly Maintenance Checklist

**Every gameweek (after deadline):**
- [ ] Wait for GW deadline to pass (Friday ~7pm GMT)
- [ ] Run sync script: `npm run sync:elite-picks`
- [ ] Monitor progress (~90 min)
- [ ] Verify data: `npm run verify-elite-data`
- [ ] Check /ownership page loads correctly
- [ ] Spot-check a few teams (Arsenal, Liverpool, City)

**Monthly:**
- [ ] Check disk space on Railway (150K rows/week adds up)
- [ ] Consider archiving old GW data if needed

---

## 📞 Support / Questions

**Main RivalFPL Session:** Use for H2H app features, bugs, new development
**K-200 Ownership Session:** Use this separate session for ownership-specific work

**Database Connection:**
```
Host: caboose.proxy.rlwy.net
Port: 45586
Database: railway
User: postgres
Password: LmoGdsXHMosNUwfCdKmPlaIMletkDZXj
```

**FPL API Endpoints Used:**
- Bootstrap: `https://fantasy.premierleague.com/api/bootstrap-static/`
- League Standings: `https://fantasy.premierleague.com/api/leagues-classic/314/standings/?page_standings={page}`
- Manager Picks: `https://fantasy.premierleague.com/api/entry/{id}/event/{gw}/picks/`

---

## 🎯 Success Criteria

**Working correctly when:**
- ✅ All 20 teams show in dropdown
- ✅ Selecting Arsenal shows Arsenal data (not another team)
- ✅ Singles ownership matches FPL API (~58% Saka)
- ✅ Doubles/triples add up correctly
- ✅ Sample size displays (10,000 teams)
- ✅ Mobile responsive
- ✅ No console errors

**Data quality:**
- ✅ Total picks = sample_size × 15 (10K × 15 = 150K)
- ✅ Each team has sensible ownership %s
- ✅ Most popular combos make sense (Saka + Timber, not Saka + obscure player)

---

**Last Sync:** January 2, 2026 (GW19)
**Next Sync:** After GW20 deadline (January 10, 2026 estimated)
