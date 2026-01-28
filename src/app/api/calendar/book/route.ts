import { NextRequest, NextResponse } from 'next/server';
import { createBooking, setCredentials, BookingDetails } from '@/lib/integrations/google-calendar';
import { createClient } from '@/lib/supabase/server';

interface BookingRequest {
  order_id: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BookingRequest = await request.json();

    if (!body.order_id || !body.start_time || !body.end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, start_time, end_time' },
        { status: 400 }
      );
    }

    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar not configured' },
        { status: 503 }
      );
    }

    setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    interface OrderQueryResult {
      id: string;
      order_number: number;
      client: {
        first_name: string;
        last_name: string;
        phone: string | null;
        email: string | null;
        language: 'fr' | 'en';
      };
    }

    const supabase = await createClient();
    const { data, error: orderError } = await supabase
      .from('order')
      .select(`
        id,
        order_number,
        client:client_id (
          first_name,
          last_name,
          phone,
          email,
          language
        )
      `)
      .eq('id', body.order_id)
      .single();

    if (orderError || !data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = data as unknown as OrderQueryResult;
    const client = order.client;

    const bookingDetails: BookingDetails = {
      clientName: `${client.first_name} ${client.last_name}`,
      clientPhone: client.phone || '',
      clientEmail: client.email ?? undefined,
      orderNumber: order.order_number,
      notes: body.notes,
      language: client.language,
    };

    const result = await createBooking(
      body.start_time,
      body.end_time,
      bookingDetails
    );

    console.log(`✅ Booking created for order #${order.order_number}:`, result.eventId);

    return NextResponse.json({
      success: true,
      event_id: result.eventId,
      calendar_link: result.htmlLink,
      order_number: order.order_number,
    });
  } catch (error) {
    console.error('❌ Failed to create booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
