import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Step 1: Login to FPL
    const loginResponse = await fetch('https://users.premierleague.com/accounts/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: email,
        password: password,
        app: 'plfpl-web',
        redirect_uri: 'https://fantasy.premierleague.com/'
      })
    });

    if (!loginResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid FPL credentials' },
        { status: 401 }
      );
    }

    // Extract session cookies
    const cookies = loginResponse.headers.get('set-cookie');

    if (!cookies) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Step 2: Get user info with session cookies
    const meResponse = await fetch('https://fantasy.premierleague.com/api/me/', {
      headers: {
        'Cookie': cookies
      }
    });

    if (!meResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const userData = await meResponse.json();

    // Step 3: Filter H2H leagues only
    const h2hLeagues = (userData.leagues?.h2h || []).filter((league: any) =>
      league.entry_rank !== null // Only leagues they're participating in
    );

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

    // Set secure session cookie for subsequent requests
    response.cookies.set('fpl_session', cookies, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error: any) {
    console.error('FPL login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
