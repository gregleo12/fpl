import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'bootstrap-static';

    // Build query string from all other params
    const queryParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const url = `https://fantasy.premierleague.com/api/${endpoint}${queryString ? '?' + queryString : ''}`;

    console.log('[FPL Proxy] Fetching:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      throw new Error(`FPL API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('[FPL Proxy] Error fetching from FPL API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from FPL API' },
      { status: 500 }
    );
  }
}
