import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();

    const { data: services, error } = await supabase
      .from('service')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('display_order')
      .order('name');

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      );
    }

    return NextResponse.json({ services: services || [] });
  } catch (error) {
    console.error('Error in services API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
