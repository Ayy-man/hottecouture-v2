import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// PATCH /api/staff/[id] - Update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }
  const { id } = await params;
  const body = await request.json();

  const updates: { name?: string; is_active?: boolean } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

// DELETE /api/staff/[id] - Delete staff member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }
  const { id } = await params;

  // Get staff name first
  const { data: staffMember, error: fetchError } = await supabase
    .from('staff')
    .select('name')
    .eq('id', id)
    .single();

  if (fetchError || !staffMember) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  }

  // Check if staff has assigned orders
  const { count, error: countError } = await supabase
    .from('order')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', staffMember.name);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete staff with ${count} assigned order(s). Reassign orders first.` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
