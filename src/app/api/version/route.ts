import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Don't cache this endpoint

export async function GET() {
  // Read version from package.json
  const packageJson = require('../../../../package.json');

  return NextResponse.json({
    version: packageJson.version,
    timestamp: Date.now(), // Helps prevent caching
    buildDate: process.env.BUILD_DATE || new Date().toISOString()
  });
}
