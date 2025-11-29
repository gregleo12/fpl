import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;

  // Only track API routes (not static assets, not admin tracking endpoint itself)
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/admin/track')) {
    return NextResponse.next();
  }

  // Get client info for hashing
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Extract league ID from path
  const leagueMatch = pathname.match(/\/api\/league\/(\d+)/);
  const leagueId = leagueMatch ? leagueMatch[1] : null;

  // Create response FIRST - don't block it
  const response = NextResponse.next();

  // Track request asynchronously AFTER response is created (don't block response)
  const responseTime = Date.now() - startTime;

  // Call the tracking API endpoint
  // (middleware runs on edge, can't use node pg directly)
  fetch(`${request.nextUrl.origin}/api/admin/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leagueId,
      endpoint: pathname,
      method: request.method,
      ip,
      userAgent,
      responseTimeMs: responseTime
    })
  }).catch(() => {}); // Silent fail - never throw errors

  return response;
}

export const config = {
  matcher: '/api/:path*'
};
