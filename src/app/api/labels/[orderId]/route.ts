import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    console.log('Labels API: Looking for order ID:', orderId);

    const supabase = await createServiceRoleClient();

    // Simple order query
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('*')
      .eq('id', orderId)
      .single();

    console.log('Labels API: Order query result:', { order, orderError });

    if (orderError) {
      return NextResponse.json({
        error: 'Order query failed',
        details: orderError.message,
        orderId,
      });
    }

    if (!order) {
      return NextResponse.json({
        error: 'Order not found',
        orderId,
      });
    }

    // Fetch garments for this order
    const { data: garments, error: garmentsError } = await supabase
      .from('garment')
      .select('id, type, label_code')
      .eq('order_id', orderId);

    console.log('Labels API: Garments query result:', {
      garments,
      garmentsError,
    });

    if (garmentsError) {
      return NextResponse.json({
        error: 'Failed to fetch garments',
        details: garmentsError.message,
      });
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('client')
      .select('first_name, last_name')
      .eq('id', (order as any).client_id)
      .single();

    console.log('Labels API: Client query result:', { client, clientError });

    if (clientError) {
      return NextResponse.json({
        error: 'Failed to fetch client data',
        details: clientError.message,
      });
    }

    // Check if order has garments
    if (!garments || garments.length === 0) {
      return NextResponse.json(
        { error: 'No garments found for this order' },
        { status: 400 }
      );
    }

    // Generate HTML labels (simplified approach for Vercel)
    try {
      const { generateLabelSheetHTML } = await import(
        '@/lib/labels/label-template'
      );

      // Prepare label data
      const labelData = {
        orderNumber: (order as any).order_number,
        clientName: `${(client as any).first_name} ${(client as any).last_name}`,
        clientInitials: `${(client as any).first_name?.[0] || ''}${(client as any).last_name?.[0] || ''}`,
        garments: garments.map((garment: any) => ({
          id: garment.id,
          labelCode: garment.label_code,
          type: garment.type,
          qrCode: `data:image/svg+xml;base64,${Buffer.from(`<svg width="100" height="100"><text x="50" y="50" text-anchor="middle">QR-${garment.label_code}</text></svg>`).toString('base64')}`,
        })),
        rush: (order as any).rush,
        createdAt: (order as any).created_at,
        language: 'en' as const,
      };

      // Generate HTML
      const html = generateLabelSheetHTML(labelData);

      console.log('✅ HTML labels generated successfully');

      return NextResponse.json({
        success: true,
        html: html,
        orderNumber: (order as any).order_number,
        garmentCount: garments.length,
        message: 'Labels generated successfully (HTML version)',
      });
    } catch (error) {
      console.error('Error generating HTML labels:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate labels',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Labels API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    console.log('Labels API GET: Looking for order ID:', orderId);

    const supabase = await createServiceRoleClient();

    // Get current user (skip auth in development)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      // In development mode, create a mock user
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '🔧 Labels API GET: Using mock authentication for development'
        );
        // Continue without real user for development
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Simple order query (same as POST method)
    const { data: order, error: orderError } = await supabase
      .from('order')
      .select('id, order_number, rush, created_at, status, due_date, client_id')
      .eq('id', orderId)
      .single();

    console.log('Labels API GET: Order query result:', { order, orderError });

    if (orderError) {
      console.error('Labels API GET: Order query failed:', orderError);
      return NextResponse.json(
        {
          error: 'Order query failed',
          details: orderError.message,
          orderId,
        },
        { status: 500 }
      );
    }

    if (!order) {
      console.warn('Labels API GET: Order not found for ID:', orderId);
      return NextResponse.json(
        { error: 'Order not found', orderId },
        { status: 404 }
      );
    }

    // Fetch garments for this order
    const { data: garments, error: garmentsError } = await supabase
      .from('garment')
      .select('id, type, label_code')
      .eq('order_id', orderId);

    console.log('Labels API GET: Garments query result:', {
      garments,
      garmentsError,
    });

    if (garmentsError) {
      console.error('Labels API GET: Garments query failed:', garmentsError);
      return NextResponse.json(
        {
          error: 'Failed to fetch garments',
          details: garmentsError.message,
        },
        { status: 500 }
      );
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('client')
      .select('first_name, last_name')
      .eq('id', (order as any).client_id)
      .single();

    console.log('Labels API GET: Client query result:', {
      client,
      clientError,
    });

    if (clientError) {
      console.error('Labels API GET: Client query failed:', clientError);
      return NextResponse.json(
        {
          error: 'Failed to fetch client data',
          details: clientError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order: {
        id: (order as any).id,
        orderNumber: (order as any).order_number,
        rush: (order as any).rush,
        createdAt: (order as any).created_at,
        status: (order as any).status,
        dueDate: (order as any).due_date,
        client: client,
        garments: garments,
      },
    });
  } catch (error) {
    console.error('Labels API GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
