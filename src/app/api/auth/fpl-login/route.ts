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
      redirect_uri: 'https://fantasy.premierleague.com/a/login'
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

      // Check for all cookie-related headers
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
