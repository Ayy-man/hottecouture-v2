import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateTaskSchema = z.object({
  operation: z.string().optional(),
  stage: z.enum(['pending', 'working', 'done', 'ready', 'delivered']).optional(),
  planned_minutes: z.number().min(0).optional(),
  actual_minutes: z.number().min(0).optional(),
  assignee: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { taskId } = await params;

    const { data: task, error } = await supabase
      .from('task')
      .select(`
        *,
        garment (
          id,
          type,
          label_code
        ),
        service (
          id,
          name,
          code
        )
      `)
      .eq('id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching task:', error);
      return NextResponse.json(
        { error: 'Failed to fetch task', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });

  } catch (error) {
    console.error('Task GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { taskId } = await params;
    const body = await request.json();
    const updateData = updateTaskSchema.parse(body);

    const { data: task, error } = await supabase
      .from('task')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      console.error('Error updating task:', error);
      return NextResponse.json(
        { error: 'Failed to update task', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Updated task ${taskId}:`, updateData);

    return NextResponse.json({
      success: true,
      data: task,
      message: 'Task updated successfully',
    });

  } catch (error) {
    console.error('Task PATCH error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { taskId } = await params;

    const { error } = await supabase
      .from('task')
      .delete()
      .eq('id', taskId);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      console.error('Error deleting task:', error);
      return NextResponse.json(
        { error: 'Failed to delete task', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Deleted task ${taskId}`);

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });

  } catch (error) {
    console.error('Task DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}