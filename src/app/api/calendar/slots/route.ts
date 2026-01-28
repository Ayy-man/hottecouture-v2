import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots, setCredentials } from '@/lib/integrations/google-calendar';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date');
  const duration = searchParams.get('duration');

  if (!date) {
    return NextResponse.json(
      { error: 'Date parameter is required (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  try {
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar not configured. Please connect your calendar first.' },
        { status: 503 }
      );
    }

    setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const durationMinutes = duration ? parseInt(duration, 10) : 60;
    const slots = await getAvailableSlots(date, durationMinutes);

    return NextResponse.json({
      date,
      duration_minutes: durationMinutes,
      slots: slots.filter(s => s.available),
      all_slots: slots,
    });
  } catch (error) {
    console.error('❌ Failed to get calendar slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}
