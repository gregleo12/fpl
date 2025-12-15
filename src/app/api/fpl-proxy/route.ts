import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
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
    console.error('Error fetching from FPL API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from FPL API' },
      { status: 500 }
    );
  }
}
