import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to centralized admin dashboard
  return NextResponse.redirect(new URL('/admin', request.url));
}
