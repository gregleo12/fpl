import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Insert email (ON CONFLICT DO NOTHING for duplicates)
    await db.query(
      `INSERT INTO classic_waitlist (email)
       VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [email.toLowerCase().trim()]
    );

    // Always return success (don't reveal if email exists)
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Waitlist signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
