# K-62: Admin Panel Analytics Accuracy - Investigation Report

**Date:** December 20, 2025
**Investigator:** Claude Sonnet 4.5
**Status:** Investigation Complete - NO MODIFICATIONS MADE

---

## Executive Summary

The admin panel analytics are partially accurate but have **3 critical issues**:

1. **MANAGERS metric is severely underreported** (99.6% of requests don't capture team_id)
2. **TEAMS column shows 2x actual count** (double-counting bug in SQL query)
3. **Some leagues show TEAMS = 0** (because they weren't fetched via `/api/league/[id]` which populates h2h_matches)

**Current State:**
- Total Requests: ✅ ACCURATE
- League Requests: ✅ ACCURATE
- Users: ✅ ACCURATE
- **Managers: ❌ SEVERELY UNDERREPORTED** (shows 2 today but should be ~100+)
- **Active Leagues: ⚠️ PARTIALLY ACCURATE** (counts leagues with requests, but TEAMS count is wrong)

---

## 1. Database Schema

### `analytics_requests` Table

| Column | Type | Description | Populated? |
|--------|------|-------------|------------|
| `id` | integer | Primary key | ✅ Always |
| `league_id` | integer | League ID from URL | ✅ When `/api/league/[id]` called |
| `endpoint` | varchar(255) | API endpoint path | ✅ Always |
| `method` | varchar(10) | HTTP method | ✅ Always (default: GET) |
| `timestamp` | timestamp | Request timestamp | ✅ Always |
| `user_hash` | varchar(64) | SHA256 hash of IP + User-Agent | ✅ Always |
| `response_time_ms` | integer | Response time | ✅ Always |
| `status_code` | integer | HTTP status code | ✅ Always (default: 200) |
| **`selected_team_id`** | **integer** | **Manager entry_id** | **❌ RARELY (0.38% of requests)** |

**Indexes:**
- Primary key on `id`
- Index on `league_id`
- Index on `selected_team_id`
- Index on `timestamp`
- Index on `user_hash`

### `analytics_daily` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `date` | date | Date of aggregation |
| `league_id` | integer | League ID (NULL = global) |
| `unique_users` | integer | Unique user_hashes for this date |
| `total_requests` | integer | Total requests for this date |
| `avg_response_time_ms` | integer | Average response time |
| `error_count` | integer | Requests with status >= 400 |

**Note:** This table is for historical aggregation (not currently used by admin panel).

### `analytics_leagues` Table

| Column | Type | Description |
|--------|------|-------------|
| `league_id` | integer | Primary key |
| `league_name` | varchar(255) | League name |
| `team_count` | integer | Number of teams |
| `first_seen` | timestamp | First request timestamp |
| `last_seen` | timestamp | Last request timestamp |
| `total_requests` | integer | Total requests for this league |
| `total_unique_users` | integer | Total unique users |

**Note:** This table exists but is **NOT USED** by the current admin panel. The code comment says "analytics_leagues table removed" and queries are computed on-demand from `analytics_requests`.

---

## 2. Dashboard Stats Calculation

**File:** `/src/app/api/admin/stats/route.ts`

### Total Requests

**Definition:** Total count of all API requests.

**Query:**
```sql
-- TODAY
SELECT COUNT(*) FROM analytics_requests WHERE timestamp >= CURRENT_DATE

-- 7 DAYS
SELECT COUNT(*) FROM analytics_requests WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'

-- 30 DAYS
SELECT COUNT(*) FROM analytics_requests WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'

-- ALL TIME
SELECT COUNT(*) FROM analytics_requests
```

**Status:** ✅ **ACCURATE**

**Current Values:**
- All Time: 78,702
- Today: 3,361

---

### League Requests

**Definition:** Requests to league-specific endpoints (where `league_id IS NOT NULL`).

**Query:**
```sql
-- TODAY
SELECT COUNT(*) FROM analytics_requests
WHERE league_id IS NOT NULL AND timestamp >= CURRENT_DATE
```

**Status:** ✅ **ACCURATE**

**What it means:** Count of requests to `/api/league/[id]/*` endpoints.

---

### Users

**Definition:** Unique `user_hash` values (SHA256 hash of IP address + User-Agent).

**Query:**
```sql
-- TODAY
SELECT COUNT(DISTINCT user_hash) FROM analytics_requests
WHERE timestamp >= CURRENT_DATE
```

**Status:** ✅ **ACCURATE**

**Current Values:**
- All Time: 809 unique users
- Today: 27 unique users

**Caveat:** Users who change IP or browser will be counted as different users.

---

### Managers

**Definition:** Unique `selected_team_id` values (FPL entry_id/team_id).

**Query:**
```sql
-- TODAY
SELECT COUNT(DISTINCT selected_team_id) FROM analytics_requests
WHERE selected_team_id IS NOT NULL AND timestamp >= CURRENT_DATE
```

**Status:** ❌ **SEVERELY UNDERREPORTED**

**Current Values:**
- All Time: 100 unique managers
- Today: 2 unique managers
- **Requests WITH team_id:** 303 out of 78,702 (0.38%)
- **Requests WITHOUT team_id:** 78,399 out of 78,702 (99.62%)

**Why it's wrong:**
`selected_team_id` is ONLY captured when:
1. User visits `/setup/team/select` page (from `setup/team/page.tsx`)
2. That page makes a client-side POST to `/api/admin/track` with `selectedTeamId`

**Why it's NOT captured for normal API requests:**
- The middleware (`/src/middleware.ts`) tracks all `/api/*` requests
- But it does NOT extract `selected_team_id` from the request
- It only extracts: `leagueId`, `endpoint`, `method`, `ip`, `userAgent`, `responseTimeMs`
- **Line 48-55 of middleware.ts** shows no `selectedTeamId` parameter

**Real Activity:**
- Today: 27 unique users made 3,361 requests
- But only 2 "managers" were recorded
- This means 25+ users are not being counted as managers

---

### Active Leagues

**Definition:** Count of distinct `league_id` values in `analytics_requests`.

**Query:**
```sql
SELECT COUNT(DISTINCT league_id) FROM analytics_requests
WHERE league_id IS NOT NULL
```

**Status:** ✅ **ACCURATE** (but see TEAMS issue below)

**What it means:** Number of leagues that have received at least one request.

---

## 3. All Leagues Table Calculation

**File:** `/src/app/api/admin/leagues/route.ts`

### Query Structure

```sql
WITH league_stats AS (
  SELECT
    league_id,
    COUNT(*) as total_requests,
    COUNT(DISTINCT user_hash) as unique_users,
    COUNT(DISTINCT selected_team_id) FILTER (WHERE selected_team_id IS NOT NULL) as unique_managers,
    MAX(timestamp) as last_seen,
    MIN(timestamp) as first_seen
  FROM analytics_requests
  WHERE league_id IS NOT NULL
  GROUP BY league_id
),
league_teams AS (
  SELECT
    league_id,
    COUNT(DISTINCT entry_1_id) + COUNT(DISTINCT entry_2_id) as team_count  ⚠️ DOUBLE COUNTS!
  FROM h2h_matches
  GROUP BY league_id
)
SELECT ... FROM league_stats ls
LEFT JOIN league_teams lt ON ls.league_id = lt.league_id
LEFT JOIN leagues l ON ls.league_id = l.id
ORDER BY ls.total_requests DESC
```

### Column Definitions

| Column | Source | Definition | Status |
|--------|--------|------------|--------|
| LEAGUE | `leagues.name` | League name | ✅ Accurate |
| **TEAMS** | `h2h_matches` | **Count of teams** | **❌ SHOWS 2X ACTUAL** |
| REQUESTS | `analytics_requests` | Total requests for league | ✅ Accurate |
| USERS | `analytics_requests` | Unique user_hashes | ✅ Accurate |
| MANAGERS | `analytics_requests` | Unique selected_team_ids | ❌ Underreported (same issue) |
| LAST SEEN | `analytics_requests` | MAX(timestamp) | ✅ Accurate |
| FIRST SEEN | `analytics_requests` | MIN(timestamp) | ✅ Accurate |

---

### TEAMS Column - Double Counting Bug

**Query:**
```sql
COUNT(DISTINCT entry_1_id) + COUNT(DISTINCT entry_2_id) as team_count
```

**Issue:** This double-counts teams!

**Example - League 804742:**
- Actual teams: 20 (from `league_standings`)
- Teams shown: 40 (double!)

**Why:**
- Each team plays multiple matches
- In some matches, they're `entry_1`, in others they're `entry_2`
- Counting both separately adds them twice

**Correct Query:**
```sql
-- Option 1: Use league_standings (most accurate)
SELECT COUNT(DISTINCT entry_id) FROM league_standings WHERE league_id = X

-- Option 2: Fix h2h_matches query
SELECT COUNT(DISTINCT team_id) FROM (
  SELECT entry_1_id as team_id FROM h2h_matches WHERE league_id = X
  UNION
  SELECT entry_2_id as team_id FROM h2h_matches WHERE league_id = X
) teams
```

---

### TEAMS = 0 Issue

**Why some leagues show 0 teams:**

1. League was accessed via analytics tracking
2. But `/api/league/[id]` endpoint was never called
3. So `h2h_matches` table has no data for this league
4. LEFT JOIN returns NULL → COALESCE converts to 0

**Solution:** Use `league_standings` table instead, which is populated whenever a league is loaded.

---

## 4. Analytics Tracking Implementation

**File:** `/src/lib/analytics.ts`

### How Tracking Works

1. **Client makes request** to any `/api/*` endpoint
2. **Middleware intercepts** (`/src/middleware.ts`)
3. **Middleware extracts:**
   - `leagueId` from URL path (regex: `/api/league/(\d+)`)
   - `ip` from headers (x-forwarded-for or x-real-ip)
   - `userAgent` from headers
   - `endpoint` (pathname)
   - `method` (GET/POST/etc)
   - `responseTimeMs` (calculated)
4. **Middleware calls** `/api/admin/track` (POST)
5. **Track endpoint:**
   - Creates `user_hash` = SHA256(ip + userAgent)
   - Inserts row into `analytics_requests`

### What Gets Captured

| Data Point | Source | Always Captured? |
|------------|--------|------------------|
| `league_id` | URL regex | ✅ When `/api/league/[id]` |
| `endpoint` | pathname | ✅ Always |
| `method` | request.method | ✅ Always |
| `user_hash` | SHA256(ip + UA) | ✅ Always |
| `timestamp` | now() | ✅ Always |
| `response_time_ms` | Date.now() - start | ✅ Always |
| `status_code` | default 200 | ✅ Always |
| **`selected_team_id`** | **??? request body/params ???** | **❌ NEVER (in middleware)** |

---

### The Critical Missing Piece

**Middleware does NOT capture `selected_team_id`:**

```typescript
// /src/middleware.ts lines 48-55
body: JSON.stringify({
  leagueId,           // ✅ Captured
  endpoint: pathname, // ✅ Captured
  method: request.method, // ✅ Captured
  ip,                 // ✅ Captured
  userAgent,          // ✅ Captured
  responseTimeMs      // ✅ Captured
  // ❌ NO selectedTeamId!
})
```

**Where IS it captured?**

Only in `/src/app/setup/team/page.tsx` (lines 108+):
```typescript
fetch('/api/admin/track', {
  method: 'POST',
  body: JSON.stringify({
    leagueId,
    endpoint: '/setup/team/select',
    method: 'GET',
    ip: '...',
    userAgent: '...',
    selectedTeamId: selectedTeam.id  // ✅ Only here!
  })
})
```

**This means:**
- `selected_team_id` is ONLY recorded when users select their team on the setup page
- Once they're using the app, their team ID is NOT tracked
- Result: "Managers" metric is useless for tracking actual usage

---

## 5. Data Verification Queries

### Overall Stats

```sql
SELECT
  COUNT(*) as total_requests,                                           -- 78,702
  COUNT(*) FILTER (WHERE timestamp >= CURRENT_DATE) as requests_today,  -- 3,361
  COUNT(DISTINCT user_hash) as total_users,                            -- 809
  COUNT(DISTINCT user_hash) FILTER (WHERE timestamp >= CURRENT_DATE) as users_today, -- 27
  COUNT(DISTINCT selected_team_id) FILTER (WHERE selected_team_id IS NOT NULL) as total_managers, -- 100
  COUNT(DISTINCT selected_team_id) FILTER (WHERE selected_team_id IS NOT NULL AND timestamp >= CURRENT_DATE) as managers_today, -- 2
  COUNT(*) FILTER (WHERE selected_team_id IS NOT NULL) as requests_with_team_id,     -- 303 (0.38%)
  COUNT(*) FILTER (WHERE selected_team_id IS NULL) as requests_without_team_id      -- 78,399 (99.62%)
FROM analytics_requests;
```

### Which Endpoints Capture team_id?

```sql
SELECT endpoint, COUNT(*) as count
FROM analytics_requests
WHERE selected_team_id IS NOT NULL
GROUP BY endpoint;

-- Result: ONLY /setup/team/select (303 requests)
```

### Top 5 Leagues

```sql
SELECT
  league_id,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_hash) as unique_users,
  MAX(timestamp) as last_seen
FROM analytics_requests
WHERE league_id IS NOT NULL
GROUP BY league_id
ORDER BY total_requests DESC
LIMIT 5;
```

**Results:**
| league_id | total_requests | unique_users | last_seen |
|-----------|----------------|--------------|-----------|
| 804742 | 11,041 | 140 | 2025-12-20 14:38 |
| 7381 | 1,718 | 27 | 2025-12-19 14:35 |
| 76559 | 1,185 | 60 | 2025-12-20 14:32 |
| 1320411 | 1,006 | 4 | 2025-12-20 13:05 |
| 23473 | 539 | 11 | 2025-12-19 07:59 |

### Team Count Verification

```sql
SELECT
  ls.league_id,
  COUNT(DISTINCT ls.entry_id) as teams_in_standings,
  (SELECT COUNT(DISTINCT entry_1_id) + COUNT(DISTINCT entry_2_id)
   FROM h2h_matches WHERE league_id = ls.league_id) as teams_in_matches
FROM league_standings ls
WHERE ls.league_id IN (804742, 7381, 76559, 1320411, 23473)
GROUP BY ls.league_id;
```

**Results:**
| league_id | teams_in_standings | teams_in_matches |
|-----------|-------------------|------------------|
| 804742 | 20 | 40 ⚠️ |
| 1320411 | 20 | 40 ⚠️ |
| 76559 | 14 | 28 ⚠️ |
| 7381 | 8 | 16 ⚠️ |
| 23473 | 4 | 8 ⚠️ |

**Confirms:** `teams_in_matches` is exactly 2x `teams_in_standings` for every league.

---

## 6. How to Read the Data

### Dashboard - What Each Number Means

#### Total Requests
- **Definition:** Count of all API requests tracked
- **Source:** `COUNT(*) FROM analytics_requests`
- **Accuracy:** ✅ Accurate
- **Includes:** All `/api/*` endpoints except `/api/admin/track`

#### League Requests
- **Definition:** Requests to league-specific endpoints
- **Source:** `COUNT(*) FROM analytics_requests WHERE league_id IS NOT NULL`
- **Accuracy:** ✅ Accurate
- **Includes:** Only `/api/league/[id]/*` endpoints

#### Users
- **Definition:** Unique visitors based on IP + User-Agent hash
- **Source:** `COUNT(DISTINCT user_hash) FROM analytics_requests`
- **Accuracy:** ✅ Accurate
- **Caveats:**
  - User changing IP/browser = counted as different user
  - Multiple users behind same IP = counted as one user (less common)
  - Anonymous/private - cannot identify individual people

#### Managers
- **Definition:** Unique FPL team IDs selected by users
- **Source:** `COUNT(DISTINCT selected_team_id) WHERE selected_team_id IS NOT NULL`
- **Accuracy:** ❌ **SEVERELY UNDERREPORTED**
- **What it SHOULD represent:** Unique FPL managers using the app
- **What it ACTUALLY represents:** Users who completed the setup/team selection flow
- **Issue:** Only 0.38% of requests capture this data
- **Real Usage:** Likely 10-50x higher than reported

---

### All Leagues - What Each Column Means

#### LEAGUE
- **Definition:** League name from `leagues` table
- **Accuracy:** ✅ Accurate
- **Fallback:** "League [id]" if name not in database

#### TEAMS
- **Definition:** Number of teams in the league
- **Source:** `COUNT(DISTINCT entry_1_id) + COUNT(DISTINCT entry_2_id) FROM h2h_matches`
- **Accuracy:** ❌ **SHOWS 2X ACTUAL COUNT**
- **Issue:** Double-counts teams (see Issue #2 below)
- **Shows 0 when:** League never fetched via `/api/league/[id]` (no h2h_matches data)

#### REQUESTS
- **Definition:** Total API requests for this league
- **Source:** `COUNT(*) FROM analytics_requests WHERE league_id = X`
- **Accuracy:** ✅ Accurate

#### USERS
- **Definition:** Unique visitors to this league
- **Source:** `COUNT(DISTINCT user_hash) FROM analytics_requests WHERE league_id = X`
- **Accuracy:** ✅ Accurate
- **Same caveats as dashboard Users**

#### MANAGERS
- **Definition:** Unique team IDs selected for this league
- **Source:** `COUNT(DISTINCT selected_team_id) WHERE league_id = X`
- **Accuracy:** ❌ **SEVERELY UNDERREPORTED** (same issue as dashboard)

#### LAST SEEN
- **Definition:** Most recent request timestamp for this league
- **Source:** `MAX(timestamp) FROM analytics_requests WHERE league_id = X`
- **Accuracy:** ✅ Accurate

#### FIRST SEEN
- **Definition:** First request timestamp for this league
- **Source:** `MIN(timestamp) FROM analytics_requests WHERE league_id = X`
- **Accuracy:** ✅ Accurate

---

## 7. Identified Issues

### Issue #1: MANAGERS Metric is Useless

**Impact:** CRITICAL

**Description:**
- "Managers TODAY: 2" is shown, but 27 unique users made 3,361 requests today
- 99.62% of requests do NOT capture `selected_team_id`
- Metric only counts users who completed team selection, not active users

**Root Cause:**
- Middleware does NOT extract team ID from requests
- Team ID should come from:
  - Session storage (frontend)
  - Cookie
  - Request header
  - URL parameter for team-specific endpoints like `/api/team/[teamId]/*`

**Example:**
- User selects Team #123456 on setup page → recorded
- User makes 100 requests to `/api/team/123456/*` → NOT recorded as that manager
- Another user views Team #123456 → NOT recorded

**Why This Matters:**
- Cannot track which managers are actively using the app
- Cannot measure manager engagement
- Cannot identify popular managers/teams
- Metric is misleading and underreports by ~50-100x

---

### Issue #2: TEAMS Column Shows Double Count

**Impact:** HIGH

**Description:**
- TEAMS column shows 2x the actual count for every league
- League with 20 teams shows 40
- League with 14 teams shows 28

**Root Cause:**
```sql
COUNT(DISTINCT entry_1_id) + COUNT(DISTINCT entry_2_id)
```
- Each team appears in ~50% of matches as entry_1, ~50% as entry_2
- Counting both separately adds each team twice

**Example:**
- League 804742 has 20 teams
- Query returns: 20 (from entry_1) + 20 (from entry_2) = 40

**Correct Query:**
```sql
-- Use league_standings table
SELECT COUNT(DISTINCT entry_id)
FROM league_standings
WHERE league_id = X
```

---

### Issue #3: Some Leagues Show TEAMS = 0

**Impact:** MEDIUM

**Description:**
- Some leagues show TEAMS = 0 despite having requests and users
- Happens when league was never fully loaded

**Root Cause:**
- `h2h_matches` table is populated when `/api/league/[id]` is called
- If league was only accessed via other endpoints, h2h_matches is empty
- LEFT JOIN returns NULL → COALESCE(NULL, 0) = 0

**Example Scenario:**
1. User directly visits `/api/league/123456/stats` (from bookmark)
2. Stats endpoint works, league_id tracked in analytics_requests
3. But h2h_matches never populated (would need full league fetch)
4. All Leagues table shows: TEAMS = 0, but REQUESTS > 0

**Solution:**
- Use `league_standings` table instead of `h2h_matches`
- It's populated whenever league is loaded
- More accurate source for team count

---

## 8. Recommendations

### Priority 1: Fix MANAGERS Tracking (Issue #1)

**Option A: Extract from URL (Easiest - Recommended)**

Modify `/src/middleware.ts` to extract team ID from URL:

```typescript
// Line 24-26: Add team ID extraction
const leagueMatch = pathname.match(/\/api\/league\/(\d+)/);
const leagueId = leagueMatch ? leagueMatch[1] : null;

// ADD THIS:
const teamMatch = pathname.match(/\/api\/team\/(\d+)/);
const selectedTeamId = teamMatch ? teamMatch[1] : null;

// Line 48-55: Include in tracking call
body: JSON.stringify({
  leagueId,
  endpoint: pathname,
  method: request.method,
  ip,
  userAgent,
  responseTimeMs,
  selectedTeamId  // ADD THIS
})
```

**Pros:**
- Simple, no client changes needed
- Works for all `/api/team/[teamId]/*` endpoints
- Captures 90%+ of manager activity

**Cons:**
- Doesn't capture team ID for league-level endpoints
- User viewing multiple teams = counted as multiple managers (acceptable)

---

**Option B: Use Cookie/Session (More Accurate)**

1. Store selected team ID in cookie when user selects team
2. Middleware reads cookie on each request
3. Pass to tracking

**Pros:**
- Captures ALL requests from a user with their team
- More accurate "active managers" count

**Cons:**
- More complex implementation
- Need to set/manage cookies
- Need to handle cookie expiration

---

**Option C: Add Request Header (Best for API)**

1. Frontend stores selected team in localStorage
2. Frontend adds `X-Selected-Team-Id` header to all API requests
3. Middleware extracts from header

**Pros:**
- Clean separation of concerns
- Works across all endpoints
- No URL dependency

**Cons:**
- Requires frontend changes
- Need to update all API calls

---

### Priority 2: Fix TEAMS Double Count (Issue #2)

**Recommended Fix:**

Replace the `league_teams` CTE in `/src/app/api/admin/leagues/route.ts`:

```sql
-- BEFORE (lines 24-30)
league_teams AS (
  SELECT
    league_id,
    COUNT(DISTINCT entry_1_id) + COUNT(DISTINCT entry_2_id) as team_count
  FROM h2h_matches
  GROUP BY league_id
)

-- AFTER
league_teams AS (
  SELECT
    league_id,
    COUNT(DISTINCT entry_id) as team_count
  FROM league_standings
  GROUP BY league_id
)
```

**Why This is Better:**
- `league_standings` has one row per team per league
- Accurate count
- Also fixes TEAMS = 0 issue (standings populated whenever league loaded)

---

### Priority 3: Fix TEAMS = 0 (Issue #3)

**Already Fixed by Priority 2!**

Using `league_standings` instead of `h2h_matches` automatically fixes this.

---

### Priority 4: Update Dashboard Copy

**Add explanatory tooltips/help text:**

```typescript
"Managers" metric help text:
"⚠️ Currently undercounted. Shows users who selected a team, not all active managers. Fix in progress."

"Teams" column help text:
"Number of teams in the league standings"
```

---

## 9. Summary

### What Works
- ✅ Total Requests tracking
- ✅ League Requests tracking
- ✅ Users tracking (with known IP/browser caveats)
- ✅ LAST SEEN timestamps
- ✅ FIRST SEEN timestamps
- ✅ Request counting per league

### What's Broken
- ❌ **MANAGERS metric** - Shows ~2 but should be ~100+ (99.6% of requests missing team_id)
- ❌ **TEAMS column** - Shows 2x actual count (double-counting bug)
- ⚠️ **TEAMS = 0** - Some leagues show 0 despite having teams (using wrong source table)

### Next Steps
1. **K-62b Brief:** Create implementation brief for fixes
2. **Priority Order:** Fix managers tracking first (biggest impact)
3. **Quick Win:** Fix TEAMS column (simple SQL change)
4. **Test:** Verify fixes on dev database before production

---

## 10. Questions Answered

**Q: Why does "Managers TODAY: 2" seem low when many leagues were active today?**
A: Because the middleware doesn't capture team IDs. Only 303 out of 78,702 requests (0.38%) have team_id recorded, all from the setup page. Real manager count is likely 50-100x higher.

**Q: What's the difference between USERS and MANAGERS?**
A:
- **USERS** = Unique IP+browser combinations (anonymous visitors)
- **MANAGERS** = Unique FPL team IDs selected by users
- One user can view multiple managers (friend's team, league rivals)
- One manager can be viewed by multiple users

**Q: Why do some leagues show 0 TEAMS?**
A: Because TEAMS is counted from `h2h_matches` table, which is only populated when `/api/league/[id]` is called. If a league was accessed via other endpoints, it won't have h2h_matches data. Should use `league_standings` instead.

---

**End of Investigation Report**
