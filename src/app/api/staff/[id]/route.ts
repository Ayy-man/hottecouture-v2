import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/staff/[id] - Update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
