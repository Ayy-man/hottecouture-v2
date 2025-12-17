import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Hardcoded fallback staff when database table doesn't exist
const FALLBACK_STAFF = [
  { id: 'fallback-1', name: 'Audrey', is_active: true, created_at: new Date().toISOString() },
  { id: 'fallback-2', name: 'Solange', is_active: true, created_at: new Date().toISOString() },
  { id: 'fallback-3', name: 'Audrey-Anne', is_active: true, created_at: new Date().toISOString() },
];

// GET /api/staff - List all staff (optionally filter by active)
export async function GET(request: NextRequest) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    console.error('Failed to create Supabase client - check env vars');
    return NextResponse.json({
      staff: FALLBACK_STAFF,
      usingFallback: true,
      warning: 'Database connection failed'
    });
  }
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') !== 'false';

  let query = supabase
    .from('staff')
    .select('id, name, is_active, created_at')
    .order('name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    // If staff table doesn't exist, return fallback staff
    if (error.message.includes('staff') || error.code === '42P01') {
      console.warn('Staff table not found, returning fallback staff');
      return NextResponse.json({
        staff: FALLBACK_STAFF,
        usingFallback: true,
        warning: 'Using fallback staff data. Please run migration 0021_add_staff_table.sql'
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

// POST /api/staff - Create new staff member
export async function POST(request: NextRequest) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    console.error('Failed to create Supabase client - check env vars');
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('staff')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) {
    // If staff table doesn't exist, return helpful error
    if (error.message.includes('staff') || error.code === '42P01' || error.message.includes('does not exist')) {
      console.error('Staff table not found:', error);
      return NextResponse.json({
        error: 'Staff table not configured. Please run migration 0021_add_staff_table.sql in Supabase.',
        usingFallback: true
      }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data }, { status: 201 });
}
