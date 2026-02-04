import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/integrations/google-calendar';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('❌ Google OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=no_code`
    );
  }

  try {
    const tokens = await getTokensFromCode(code);

    console.log('✅ Google OAuth successful');
    console.log('📝 Store these tokens securely:');
    console.log('Access Token:', tokens.access_token.substring(0, 20) + '...');
    console.log('Refresh Token:', tokens.refresh_token.substring(0, 20) + '...');

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=google_connected`
    );
  } catch (err) {
    console.error('❌ Failed to exchange code for tokens:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=token_exchange_failed`
    );
  }
}
