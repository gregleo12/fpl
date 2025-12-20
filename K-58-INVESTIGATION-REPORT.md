# K-58 Investigation Report: FPL API Error Handling & Messages

**Date:** December 20, 2025
**Investigator:** Claude (Sonnet 4.5)
**Status:** Complete - NO MODIFICATIONS MADE

---

## Executive Summary

When FPL API is down for updates, RivalFPL shows: **"⚠ Unable to load league. Please verify this is an H2H league ID."**

This is **inaccurate**. The league ID is correct, but FPL is updating. FPL's official response during updates is: **"The game is being updated."** with HTTP 503.

**Recommendation:** Implement differentiated error messages based on HTTP status codes and response content to provide accurate user feedback.

---

## 1. Files Found

### Error Message Location
**File:** `src/components/SetupFlow/LeagueInput.tsx`

**Lines:** 115-138 (Client-side error handling)

**Current Error Message Generation:**
```typescript
// Line 136
throw new Error('⚠️ Unable to load league. Please verify this is an H2H league ID.');
```

### API Route
**File:** `src/app/api/league/[id]/route.ts`

**Lines:** 57-77 (Server-side error handling)

**Current Error Handling:**
```typescript
try {
  league = await fplApi.getH2HLeague(leagueId);
} catch (error: any) {
  console.error(`[League ${leagueId}] Error fetching H2H league:`, {
    status: error.response?.status,
    message: error.message,
    code: error.code,
    fullError: error
  });

  // Only checks for 404 (classic league)
  if (error.response?.status === 404 || error.message?.includes('404')) {
    return NextResponse.json(
      {
        error: 'classic_league',
        message: 'This is a Classic league. Only H2H leagues are supported.'
      },
      { status: 400 }
    );
  }
  // All other errors fall through to generic 500
  throw error;
}
```

### FPL API Client
**File:** `src/lib/fpl-api.ts`

**Lines:** 93-98 (League fetch function)

**Current Implementation:**
```typescript
async getH2HLeague(leagueId: number): Promise<H2HLeague> {
  const response = await axios.get(
    `${this.baseUrl}/leagues-h2h/${leagueId}/standings/`
  );
  return response.data;
}
```

**Note:** Uses axios with 90-second timeout (line 4). Axios throws errors for non-2xx status codes.

---

## 2. Current Error Handling Logic

### Client-Side (LeagueInput.tsx)

The component handles errors from `/api/league/[id]` with limited differentiation:

```typescript
// Line 115-138: Error handling in LeagueInput.tsx
if (!response.ok) {
  let errorData;
  try {
    errorData = await response.json();
  } catch {
    errorData = { error: 'unknown' };
  }

  // Specific error types (from server)
  if (errorData.error === 'classic_league') {
    throw new Error('⚠️ This is a Classic league. Only H2H leagues supported.');
  } else if (errorData.error === 'no_standings') {
    throw new Error('⚠️ This league has no H2H matches yet. Please try again after GW1.');
  } else if (response.status === 404) {
    throw new Error('League not found. Please check the League ID.');
  } else if (response.status === 400) {
    throw new Error(errorData.message || 'Invalid league ID. Please verify this is an H2H league.');
  } else {
    // FALLBACK FOR ALL OTHER ERRORS (including 503!)
    throw new Error('⚠️ Unable to load league. Please verify this is an H2H league ID.');
  }
}
```

**Problem:** Line 136 catches ALL unhandled errors (including 503 FPL updates, 500 server errors, timeouts) and shows the same misleading message.

### Server-Side (route.ts)

The API route only handles 404 specifically:

```typescript
// Line 66-74: Only handles 404
if (error.response?.status === 404 || error.message?.includes('404')) {
  return NextResponse.json(
    { error: 'classic_league', message: '...' },
    { status: 400 }
  );
}
// Line 76: All other errors fall through
throw error;
```

**Problem:** Doesn't differentiate between:
- 503 (FPL updating)
- 500 (FPL server error)
- Timeout (large league or network issue)
- Network errors (user's connection)
- Rate limiting (if FPL implements 429)

---

## 3. FPL API Error Types Discovered

### Live Testing (December 20, 2025)

**Current Status:** FPL is updating right now. All endpoints return:

| Endpoint | Status Code | Response Body | Headers |
|----------|-------------|---------------|---------|
| `/api/bootstrap-static/` | **503** | `"The game is being updated."` | `content-type: text/html` |
| `/api/leagues-h2h/804742/standings/` | **503** | `"The game is being updated."` | `content-type: text/html` |
| `/api/leagues-h2h/999999999/standings/` | **503** | `"The game is being updated."` | `content-type: text/html` |

**Key Findings:**
1. **503 Service Unavailable** is returned during FPL updates
2. Response is **plain text**, not JSON
3. Message is: `"The game is being updated."`
4. **All endpoints** return this, regardless of validity

### Research from FPL API Community

Based on GitHub issues and community documentation:

| Scenario | Expected Status | Response | Currently Handled? |
|----------|----------------|----------|-------------------|
| **Valid H2H league** | 200 | JSON data | ✅ Yes |
| **Invalid league ID** (when FPL operational) | 404 | Not Found | ⚠️ Misidentified as Classic league |
| **Classic league** (not H2H) | 404 | Not Found | ✅ Yes (assumes all 404 = Classic) |
| **FPL updating** (gameweek transition) | **503** | `"The game is being updated."` | ❌ No - shows "verify H2H league ID" |
| **FPL maintenance** | **503** | Service unavailable | ❌ No |
| **Rate limited** (if implemented) | 429? | Unknown | ❌ No |
| **Network timeout** (90s) | No response | `ECONNABORTED` | ⚠️ Shows timeout message |
| **User network error** | No response | `Network Error` | ⚠️ Shows network error message |
| **FPL server error** | 500 | Internal Server Error | ❌ No |

**Source:** [GitHub Issue #12 - vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League/issues/12)

---

## 4. FPL Bootstrap-Static Analysis

The `/api/bootstrap-static/` endpoint is commonly used to check FPL status:

**Normal Operation:**
```json
{
  "events": [
    {
      "id": 17,
      "name": "Gameweek 17",
      "is_current": true,
      "is_next": false,
      "finished": false,
      "deadline_time": "2025-12-21T11:00:00Z"
    }
  ],
  "teams": [...],
  "elements": [...]
}
```

**During Updates:**
```
HTTP/1.1 503 Service Unavailable
Content-Type: text/html

"The game is being updated."
```

**Useful Fields for Status Checking:**
- `events[].is_current` - Current gameweek
- `events[].finished` - GW completed
- `events[].deadline_time` - When GW locks

**Recommendation:** Check bootstrap-static first to detect FPL updates before attempting league fetch.

---

## 5. Recommended Error Messages

| Error Type | Detection | Current Message | Suggested Message |
|------------|-----------|-----------------|-------------------|
| **FPL Updating** | Status 503 + response contains "updating" | "Unable to load league..." | "🔄 FPL is updating. Please try again in a few minutes." |
| **Invalid ID** | Status 404 + NOT in H2H standings format | "Unable to load league..." | "❌ League not found. Please check the ID and try again." |
| **Classic League** | Status 404 + valid league structure | "This is a Classic league..." | ✅ Keep current: "⚠️ This is a Classic league. Only H2H leagues supported." |
| **No Standings** | 200 + empty standings | "This league has no H2H matches..." | ✅ Keep current |
| **Network Error** | `axios` network error | "Network error..." | ✅ Keep current: "⚠️ Network error. Please check your connection." |
| **Timeout** | 90s timeout | "Large leagues..." | ✅ Keep current: "⏱️ League took too long to load..." |
| **Rate Limited** | Status 429 | "Unable to load league..." | "⏳ Too many requests. Please wait a moment and try again." |
| **Server Error** | Status 500/502/504 | "Unable to load league..." | "⚠️ FPL servers are experiencing issues. Please try again later." |

---

## 6. Implementation Recommendation

### Option A: Simple (Recommended for K-58b)

Update client-side error handling in `LeagueInput.tsx` only:

```typescript
if (!response.ok) {
  let errorData;
  try {
    errorData = await response.json();
  } catch {
    errorData = { error: 'unknown' };
  }

  // Specific server errors
  if (errorData.error === 'classic_league') {
    throw new Error('⚠️ This is a Classic league. Only H2H leagues supported.');
  } else if (errorData.error === 'no_standings') {
    throw new Error('⚠️ This league has no H2H matches yet. Please try again after GW1.');
  } else if (errorData.error === 'fpl_updating') {
    throw new Error('🔄 FPL is updating. Please try again in a few minutes.');
  } else if (response.status === 503) {
    throw new Error('🔄 FPL is updating. Please try again in a few minutes.');
  } else if (response.status === 500 || response.status === 502 || response.status === 504) {
    throw new Error('⚠️ FPL servers are experiencing issues. Please try again later.');
  } else if (response.status === 429) {
    throw new Error('⏳ Too many requests. Please wait a moment and try again.');
  } else if (response.status === 404) {
    throw new Error('❌ League not found. Please check the ID and try again.');
  } else if (response.status === 400) {
    throw new Error(errorData.message || 'Invalid league ID.');
  } else {
    throw new Error('⚠️ Unable to load league. Please try again.');
  }
}
```

### Option B: Comprehensive (Better Long-term)

Update server-side in `route.ts` to detect and categorize errors:

```typescript
try {
  league = await fplApi.getH2HLeague(leagueId);
} catch (error: any) {
  const status = error.response?.status;
  const responseText = error.response?.data;

  console.error(`[League ${leagueId}] Error:`, {
    status,
    message: error.message,
    response: responseText
  });

  // FPL is updating
  if (status === 503 || responseText?.includes('being updated')) {
    return NextResponse.json(
      {
        error: 'fpl_updating',
        message: 'FPL is updating. Please try again in a few minutes.'
      },
      { status: 503 }
    );
  }

  // Classic league (404)
  if (status === 404) {
    return NextResponse.json(
      {
        error: 'classic_league',
        message: 'This is a Classic league. Only H2H leagues are supported.'
      },
      { status: 400 }
    );
  }

  // Rate limiting
  if (status === 429) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Too many requests. Please wait a moment.'
      },
      { status: 429 }
    );
  }

  // FPL server errors
  if (status >= 500) {
    return NextResponse.json(
      {
        error: 'fpl_server_error',
        message: 'FPL servers are experiencing issues. Please try again later.'
      },
      { status: 502 }
    );
  }

  // Generic fallback
  throw error;
}
```

---

## 7. Additional Findings

### FPL Update Times

Based on community knowledge, FPL typically updates during:

| Day/Time | Reason | Duration |
|----------|--------|----------|
| **Friday evening** | New gameweek starts | ~30 minutes |
| **During matches** | Live bonus points updates | Intermittent |
| **After matches** | Final points calculation | ~1 hour |
| **Monday/Tuesday 1-2am GMT** | Price changes | ~5-10 minutes |
| **Season start (August)** | New season initialization | Several hours |
| **Gameweek deadline** | Locking in transfers | ~5 minutes |

**Source:** r/FantasyPL community observations and FPL forum discussions

### Error Logging

Current implementation logs errors well:

```typescript
console.error(`[League ${leagueId}] Error fetching H2H league:`, {
  status: error.response?.status,
  message: error.message,
  code: error.code,
  fullError: error
});
```

**Recommendation:** Keep this logging - it's valuable for debugging.

---

## 8. Testing Recommendations

When implementing K-58b:

1. **Test during FPL update** (like now) - Should show "FPL is updating" message
2. **Test with invalid ID** (e.g., 999999999) - Should show "League not found"
3. **Test with Classic league** - Should show "Classic league not supported"
4. **Test with valid H2H league** - Should work normally
5. **Test timeout** (if possible with large league) - Should show timeout message
6. **Test network disconnect** - Should show network error

---

## 9. Next Steps

1. ✅ Share findings with Greg
2. ⏳ Get approval on proposed error messages
3. ⏳ Create K-58b brief for implementation
4. ⏳ Decide between Option A (simple) vs Option B (comprehensive)

---

## Sources

- [FPL API GitHub Issue - 404 Errors](https://github.com/vaastav/Fantasy-Premier-League/issues/12)
- Live testing of FPL API endpoints (December 20, 2025)
- FPL community documentation on r/FantasyPL
- RivalFPL codebase analysis

---

**Conclusion:** The current error message "Unable to load league. Please verify this is an H2H league ID" is misleading when FPL is updating (503). We can easily detect 503 errors and show "FPL is updating" instead, matching the official FPL app behavior.
