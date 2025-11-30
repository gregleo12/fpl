import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;

  console.log('[Middleware] Processing request:', pathname);

  // Only track API routes (not static assets, not admin tracking endpoint itself)
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/admin/track')) {
    console.log('[Middleware] Skipping (not API or is track endpoint):', pathname);
    return NextResponse.next();
  }

  console.log('[Middleware] Will track API request:', pathname);

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

  // Use absolute URL with proper protocol and host from headers
  // In production, request.nextUrl.origin may be localhost, so we build URL from headers
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const trackUrl = `${protocol}://${host}/api/admin/track`;

  console.log('[Middleware] Calling track endpoint:', trackUrl, { leagueId, endpoint: pathname });

  // Call the tracking API endpoint
  // (middleware runs on edge, can't use node pg directly)
  fetch(trackUrl, {
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
  })
  .then(() => console.log('[Middleware] Track fetch completed for:', pathname))
  .catch((err) => console.error('[Middleware] Track fetch error:', err)); // Log errors instead of silent fail

  return response;
}

export const config = {
  matcher: '/api/:path*'
};
