# FPL Authentication Attempt (v1.25.4)

## Overview

FPL login was implemented in v1.26.0, fixed in v1.26.1, but ultimately **reverted in v1.25.4** due to FPL's anti-bot protection blocking server-side authentication.

### Timeline
- **v1.26.0** (Dec 4, 2025): Initial FPL login implementation
- **v1.26.1** (Dec 4, 2025): Fixed authentication issues (redirect_uri, headers, cookies)
- **v1.25.4** (Dec 4, 2025): Reverted - FPL anti-bot protection made it impossible

---

## Why It Failed

### Root Cause: Anti-Bot Protection
FPL's authentication endpoint returns a **302 redirect** instead of session cookies when called from server-side code, even with correct credentials and browser-like headers.

### Evidence from v1.25.4 Commit Message:
> "FPL's anti-bot protection blocks server-side authentication. After thorough investigation (v1.26.0-v1.26.2), reverting to proven approach."

### Technical Issues:
1. **302 Redirect Response**: Instead of cookies, FPL returns a redirect
2. **No Session Cookies**: Server never receives authentication cookies
3. **Anti-Bot Detection**: FPL detects non-browser requests despite proper headers

---

## Authentication Implementation (v1.26.1 - Fixed Version)

### Endpoint
```
POST https://users.premierleague.com/accounts/login/
```

### Headers (Critical - Must Match Browser)
```javascript
{
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Referer': 'https://fantasy.premierleague.com/',
  'Origin': 'https://fantasy.premierleague.com'
}
```

**Note**: The User-Agent, Referer, and Origin headers were missing in v1.26.0, causing initial failures.

### Payload
```json
{
  "login": "user@email.com",
  "password": "userpassword",
  "app": "plfpl-web",
  "redirect_uri": "https://fantasy.premierleague.com/a/login"
}
```

**Critical Fix in v1.26.1**: Changed `redirect_uri` from:
- ❌ `"https://fantasy.premierleague.com/"` (v1.26.0 - incorrect)
- ✅ `"https://fantasy.premierleague.com/a/login"` (v1.26.1 - correct)

### Expected Response (If It Worked)
```json
{
  "success": true,
  "user": {
    "id": 12345,
    "name": "John Doe",
    "teamName": "My FPL Team"
  },
  "leagues": [
    {
      "id": 804742,
      "name": "Dedoume FPL 9th Edition",
      "entryRank": 5,
      "entryLastRank": 7
    }
  ]
}
```

**Plus**: Session cookies in `Set-Cookie` header for subsequent API calls.

---

## Complete Working Code (v1.26.1)

### File: `/src/app/api/auth/fpl-login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      console.error('[FPL Login] Missing credentials');
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    console.log('[FPL Login] Starting authentication for:', email);

    // Step 1: Login to FPL
    const loginPayload = {
      login: email,
      password: password,
      app: 'plfpl-web',
      redirect_uri: 'https://fantasy.premierleague.com/a/login' // ✅ Fixed in v1.26.1
    };

    console.log('[FPL Login] Sending request to FPL with payload:', {
      login: email,
      app: 'plfpl-web',
      redirect_uri: 'https://fantasy.premierleague.com/a/login'
    });

    const loginResponse = await fetch('https://users.premierleague.com/accounts/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ These headers were added in v1.26.1 to mimic browser behavior
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://fantasy.premierleague.com/',
        'Origin': 'https://fantasy.premierleague.com'
      },
      body: JSON.stringify(loginPayload)
    });

    console.log('[FPL Login] Response status:', loginResponse.status);
    console.log('[FPL Login] Response headers:', Object.fromEntries(loginResponse.headers.entries()));

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('[FPL Login] Login failed:', loginResponse.status, errorText);
      return NextResponse.json(
        { error: 'Invalid FPL credentials' },
        { status: 401 }
      );
    }

    // Extract session cookies
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('[FPL Login] Set-Cookie header:', setCookieHeader ? 'Present' : 'Missing');

    if (!setCookieHeader) {
      console.error('[FPL Login] No cookies in response');

      // ✅ Fallback added in v1.26.1 - Check for all cookie-related headers
      const allCookies = loginResponse.headers.getSetCookie?.() || [];
      console.log('[FPL Login] All Set-Cookie headers:', allCookies);

      if (allCookies.length === 0) {
        return NextResponse.json(
          { error: 'Authentication failed - no session cookies received' },
          { status: 401 }
        );
      }
    }

    const cookies = setCookieHeader || loginResponse.headers.getSetCookie?.()?.join('; ') || '';

    // Step 2: Get user info with session cookies
    console.log('[FPL Login] Fetching user data with cookies');

    const meResponse = await fetch('https://fantasy.premierleague.com/api/me/', {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    console.log('[FPL Login] User data response status:', meResponse.status);

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error('[FPL Login] Failed to fetch user data:', meResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const userData = await meResponse.json();
    console.log('[FPL Login] User data received for:', userData.player?.first_name);

    // Step 3: Filter H2H leagues only
    const h2hLeagues = (userData.leagues?.h2h || []).filter((league: any) =>
      league.entry_rank !== null // Only leagues they're participating in
    );

    console.log('[FPL Login] Found', h2hLeagues.length, 'H2H leagues');

    // Step 4: Return user data and leagues
    const response = NextResponse.json({
      success: true,
      user: {
        id: userData.player.entry,
        name: `${userData.player.first_name} ${userData.player.last_name}`,
        teamName: userData.player.name,
      },
      leagues: h2hLeagues.map((league: any) => ({
        id: league.id,
        name: league.name,
        entryRank: league.entry_rank,
        entryLastRank: league.entry_last_rank
      }))
    });

    console.log('[FPL Login] Authentication successful!');

    // Set secure session cookie for subsequent requests
    response.cookies.set('fpl_session', cookies, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error: any) {
    console.error('[FPL Login] Unexpected error:', error.message);
    console.error('[FPL Login] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
```

---

## Supporting Endpoints

### 1. Find User's Team in League
**File**: `/src/app/api/auth/fpl-team-in-league/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const userId = searchParams.get('userId');

    if (!leagueId || !userId) {
      return NextResponse.json(
        { error: 'leagueId and userId required' },
        { status: 400 }
      );
    }

    // Fetch league standings to find user's team
    const response = await fetch(
      `https://fantasy.premierleague.com/api/leagues-h2h/${leagueId}/standings/`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch league data' },
        { status: 500 }
      );
    }

    const leagueData = await response.json();

    // Find user's team in standings
    const userTeam = leagueData.standings.results.find(
      (team: any) => team.entry === parseInt(userId)
    );

    if (!userTeam) {
      return NextResponse.json(
        { error: 'User not found in this league' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      team: {
        entryId: userTeam.entry,
        entryName: userTeam.entry_name,
        playerName: userTeam.player_name,
        teamName: userTeam.entry_name
      }
    });

  } catch (error: any) {
    console.error('Error finding user team:', error);
    return NextResponse.json(
      { error: 'Failed to find team in league' },
      { status: 500 }
    );
  }
}
```

### 2. Logout Endpoint
**File**: `/src/app/api/auth/logout/route.ts`

```typescript
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('fpl_session');
  return response;
}
```

---

## Frontend Components

### FPL Login Modal
**File**: `/src/components/auth/FPLLoginModal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './FPLLoginModal.module.css';

interface FPLLoginModalProps {
  onClose: () => void;
}

export function FPLLoginModal({ onClose }: FPLLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/fpl-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store user data temporarily
      sessionStorage.setItem('fpl_user', JSON.stringify({
        user: data.user,
        leagues: data.leagues
      }));

      // Redirect to league selection
      router.push('/setup/select-league');

    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>

        <h2 className={styles.title}>Sign in to FPL</h2>
        <p className={styles.subtitle}>
          Use your Fantasy Premier League account credentials
        </p>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.privacy}>
          <p>🔒 Your credentials are sent directly to FPL</p>
          <p>We never store your password</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Changes Between Versions

### v1.26.0 (Initial - Had Issues)
```typescript
// ❌ WRONG redirect_uri
redirect_uri: 'https://fantasy.premierleague.com/'

// ❌ MISSING browser headers
headers: {
  'Content-Type': 'application/json'
  // No User-Agent, Referer, or Origin
}
```

### v1.26.1 (Fixed - Still Blocked)
```typescript
// ✅ CORRECT redirect_uri
redirect_uri: 'https://fantasy.premierleague.com/a/login'

// ✅ ADDED browser-like headers
headers: {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Referer': 'https://fantasy.premierleague.com/',
  'Origin': 'https://fantasy.premierleague.com'
}

// ✅ ADDED cookie extraction fallback
const cookies = setCookieHeader || loginResponse.headers.getSetCookie?.()?.join('; ') || '';

// ✅ ADDED comprehensive logging
console.log('[FPL Login] Response status:', loginResponse.status);
console.log('[FPL Login] Response headers:', ...);
```

---

## What the Code Was Supposed to Do

### User Flow:
1. User clicks "Login with FPL" button
2. Modal opens asking for email/password
3. Frontend sends credentials to `/api/auth/fpl-login`
4. Backend authenticates with FPL API
5. Backend receives session cookies
6. Backend fetches user's H2H leagues
7. User redirected to league selection screen
8. User selects a league
9. App auto-detects user's team in that league
10. User lands on dashboard with their stats

### Benefits (If It Worked):
- ✅ No manual team selection
- ✅ See all H2H leagues in one place
- ✅ Auto-detect your team
- ✅ Seamless authentication
- ✅ 7-day session persistence

---

## Why It Was Reverted

From the v1.25.4 commit message:

> **"FPL's anti-bot protection blocks server-side authentication."**

### Technical Reality:
- Even with correct `redirect_uri`, headers, and cookies handling
- FPL API returns **302 redirect** instead of authentication cookies
- No amount of header spoofing works - FPL detects server-side requests
- Anti-bot protection is too sophisticated for server-side auth

### Decision:
> "FPL public API provides everything we need without authentication. Clean, maintainable codebase with simple League ID entry that works perfectly."

---

## Lessons Learned (From CLAUDE_CODE_CONTEXT.md)

1. **Anti-Bot Protection is Real**: FPL actively blocks server-side authentication attempts
2. **302 Redirects**: FPL returns redirects instead of cookies for non-browser clients
3. **Public API is Sufficient**: All H2H league data is publicly accessible without auth
4. **KISS Principle**: Simple League ID entry works better than complex auth flows
5. **Code Reduction**: Removed 1,081 lines of code, improved bundle size

---

## Commit References

- **v1.26.0**: `add51a8` - Initial FPL login implementation
- **v1.26.1**: `d423c10` - Fixed authentication (redirect_uri, headers, cookies)
- **v1.25.4**: `af7c3f8` - Reverted everything due to anti-bot protection

---

## Status

**❌ ABANDONED** - Anti-bot protection makes server-side FPL authentication impossible.

**Current Approach**: Simple League ID entry using FPL's public API (no authentication required).

---

## For Someone With a Working Implementation

If you have a working FPL authentication solution, the key differences would likely be:

1. **Browser-Based Authentication**: Using actual browser cookies/sessions instead of server-side fetch
2. **Puppeteer/Playwright**: Headless browser automation to bypass anti-bot
3. **Chrome Extension**: Browser extension with access to real browser cookies
4. **Official FPL Partnership**: Whitelisted API access (unlikely)
5. **Reverse-Engineered Mobile App**: Using FPL mobile app's authentication flow

The code above represents the best server-side approach, but **FPL's anti-bot protection makes it non-viable**.

