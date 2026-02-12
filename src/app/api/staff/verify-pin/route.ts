import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    const { staffId, pin } = await request.json();

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      );
    }

    let staff;

    if (staffId) {
      // Original flow: Verify specific staff member
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, pin_hash, is_active')
        .eq('id', staffId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
      }
      staff = data;

      if (staff.pin_hash !== pin) {
        return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
      }
    } else {
      // New flow: Lookup by PIN
      // Note: In a real app with hashed PINs, this would be harder. 
      // Since we store plain PINs currently (as noted in comments), we can match directly.
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, pin_hash, is_active')
        .eq('pin_hash', pin)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        // Return generic error to avoid enumerating PINs
        return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
      }
      staff = data;
    }

    if (!staff.is_active) {
      return NextResponse.json(
        { error: 'Staff member is not active' },
        { status: 403 }
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
        role: staff.role || 'seamstress',
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
