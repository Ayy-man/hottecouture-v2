import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/integrations/google-calendar';

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('❌ Failed to generate Google OAuth URL:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}
