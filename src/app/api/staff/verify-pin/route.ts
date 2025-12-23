import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    const { staffId, pin } = await request.json();

    if (!staffId || !pin) {
      return NextResponse.json(
        { error: 'Staff ID and PIN are required' },
        { status: 400 }
      );
    }

    // Fetch staff member
    const { data: staff, error: fetchError } = await supabase
      .from('staff')
      .select('id, name, pin_hash, is_active')
      .eq('id', staffId)
      .single();

    if (fetchError || !staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    if (!staff.is_active) {
      return NextResponse.json(
        { error: 'Staff member is not active' },
        { status: 403 }
      );
    }

    // Simple PIN comparison (in production, use proper hashing like bcrypt)
    // For now, we store plain PIN for simplicity - can upgrade later
    if (staff.pin_hash !== pin) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Update last clock in time
    await supabase
      .from('staff')
      .update({ last_clock_in: new Date().toISOString() })
      .eq('id', staffId);

    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
      },
    });
  } catch (error) {
    console.error('PIN verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
