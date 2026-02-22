import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    const { staffId, newPin } = await request.json();

    if (!staffId || !newPin) {
      return NextResponse.json(
        { error: 'Staff ID and new PIN are required' },
        { status: 400 }
      );
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { error: 'Le NIP doit être exactement 4 chiffres' },
        { status: 400 }
      );
    }

    // Check PIN uniqueness (exclude current staff member)
    const { data: pinExists } = await supabase
      .from('staff')
      .select('id')
      .eq('pin_hash', newPin)
      .eq('is_active', true)
      .neq('id', staffId)
      .maybeSingle();

    if (pinExists) {
      return NextResponse.json(
        { error: 'Ce NIP est déjà utilisé. Veuillez en choisir un autre.' },
        { status: 400 }
      );
    }

    // Update PIN
    const { error: updateError } = await supabase
      .from('staff')
      .update({ pin_hash: newPin })
      .eq('id', staffId);

    if (updateError) {
      console.error('PIN update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update PIN' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'PIN updated successfully',
    });
  } catch (error) {
    console.error('Set PIN error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
