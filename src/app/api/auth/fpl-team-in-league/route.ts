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
