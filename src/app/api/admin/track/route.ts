import { NextResponse } from 'next/server';
import { createUserHash, trackRequest } from '@/lib/analytics';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leagueId, endpoint, method, ip, userAgent, responseTimeMs } = body;

    // Create anonymous user hash
    const userHash = createUserHash(ip || 'unknown', userAgent || 'unknown');

    // Track the request (MUST await to ensure DB insert completes)
    await trackRequest({
      leagueId: leagueId ? parseInt(leagueId, 10) : null,
      endpoint,
      method,
      userHash,
      responseTimeMs
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silent fail for tracking - but log for debugging
    console.error('Track endpoint error:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
