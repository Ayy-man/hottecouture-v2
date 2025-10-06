import { createClient } from '@/lib/supabase/server';

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: Date;
  end_time?: Date;
  duration_minutes?: number;
  notes?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TimeTrackingSession {
  id: string;
  task_id: string;
  user_id: string;
  start_time: Date;
  end_time?: Date;
  duration_minutes: number;
  notes?: string;
  is_active: boolean;
}

export interface TimeTrackingStats {
  total_time_minutes: number;
  total_sessions: number;
  average_session_minutes: number;
  today_time_minutes: number;
  week_time_minutes: number;
  month_time_minutes: number;
}

/**
 * Start time tracking for a task
 */
export async function startTimeTracking(
  taskId: string,
  userId: string,
  notes?: string
): Promise<TimeTrackingSession> {
  const supabase = await createClient();

  // Check if user already has an active session
  const { data: activeSession } = await supabase
    .from('time_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (activeSession) {
    throw new Error('User already has an active time tracking session');
  }

  // Create new time tracking session
  const { data, error } = await (supabase as any)
    .from('time_tracking')
    .insert({
      task_id: taskId,
      user_id: userId,
      start_time: new Date().toISOString(),
      is_active: true,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to start time tracking: ${error.message}`);
  }

  return {
    id: (data as any).id,
    task_id: (data as any).task_id,
    user_id: (data as any).user_id,
    start_time: new Date((data as any).start_time),
    duration_minutes: 0,
    notes: (data as any).notes,
    is_active: (data as any).is_active,
  };
}

/**
 * Stop time tracking for a task
 */
export async function stopTimeTracking(
  sessionId: string,
  notes?: string
): Promise<TimeTrackingSession> {
  const supabase = await createClient();

  // Get the active session
  const { data: session, error: fetchError } = await supabase
    .from('time_tracking')
    .select('*')
    .eq('id', sessionId)
    .eq('is_active', true)
    .single();

  if (fetchError || !session) {
    throw new Error('Active time tracking session not found');
  }

  const endTime = new Date();
  const startTime = new Date((session as any).start_time);
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );

  // Update the session
  const { data, error } = await (supabase as any)
    .from('time_tracking')
    .update({
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      is_active: false,
      notes: notes || (session as any).notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to stop time tracking: ${error.message}`);
  }

  return {
    id: data.id,
    task_id: data.task_id,
    user_id: data.user_id,
    start_time: new Date(data.start_time),
    end_time: new Date(data.end_time),
    duration_minutes: data.duration_minutes,
    notes: data.notes,
    is_active: data.is_active,
  };
}

/**
 * Get active time tracking session for a user
 */
export async function getActiveSession(
  userId: string
): Promise<TimeTrackingSession | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('time_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: (data as any).id,
    task_id: (data as any).task_id,
    user_id: (data as any).user_id,
    start_time: new Date((data as any).start_time),
    duration_minutes: 0,
    notes: (data as any).notes,
    is_active: (data as any).is_active,
  };
}

/**
 * Get time tracking history for a user
 */
export async function getTimeTrackingHistory(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TimeTrackingSession[]> {
  const supabase = await createClient();

  let query = supabase
    .from('time_tracking')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });

  if (startDate) {
    query = query.gte('start_time', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('start_time', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get time tracking history: ${error.message}`);
  }

  return (data || []).map((entry: any) => ({
    id: entry.id,
    task_id: entry.task_id,
    user_id: entry.user_id,
    start_time: new Date(entry.start_time),
    end_time: entry.end_time ? new Date(entry.end_time) : new Date(),
    duration_minutes: entry.duration_minutes || 0,
    notes: entry.notes,
    is_active: entry.is_active,
  }));
}

/**
 * Get time tracking stats for a user
 */
export async function getTimeTrackingStats(
  userId: string,
  period: 'today' | 'week' | 'month' | 'all' = 'all'
): Promise<TimeTrackingStats> {
  const supabase = await createClient();

  const now = new Date();
  let startDate: Date | undefined;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  let query = supabase
    .from('time_tracking')
    .select('duration_minutes, start_time')
    .eq('user_id', userId)
    .eq('is_active', false); // Only completed sessions

  if (startDate) {
    query = query.gte('start_time', startDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get time tracking stats: ${error.message}`);
  }

  const sessions = data || [];
  const totalTimeMinutes = sessions.reduce(
    (sum, session) => sum + ((session as any).duration_minutes || 0),
    0
  );
  const totalSessions = sessions.length;
  const averageSessionMinutes =
    totalSessions > 0 ? Math.round(totalTimeMinutes / totalSessions) : 0;

  // Calculate today's time
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todaySessions = sessions.filter(
    (session: any) => new Date(session.start_time) >= todayStart
  );
  const todayTimeMinutes = todaySessions.reduce(
    (sum, session) => sum + ((session as any).duration_minutes || 0),
    0
  );

  // Calculate this week's time
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekSessions = sessions.filter(
    (session: any) => new Date(session.start_time) >= weekStart
  );
  const weekTimeMinutes = weekSessions.reduce(
    (sum, session) => sum + ((session as any).duration_minutes || 0),
    0
  );

  // Calculate this month's time
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSessions = sessions.filter(
    (session: any) => new Date(session.start_time) >= monthStart
  );
  const monthTimeMinutes = monthSessions.reduce(
    (sum, session) => sum + ((session as any).duration_minutes || 0),
    0
  );

  return {
    total_time_minutes: totalTimeMinutes,
    total_sessions: totalSessions,
    average_session_minutes: averageSessionMinutes,
    today_time_minutes: todayTimeMinutes,
    week_time_minutes: weekTimeMinutes,
    month_time_minutes: monthTimeMinutes,
  };
}

/**
 * Get time tracking for a specific task
 */
export async function getTaskTimeTracking(
  taskId: string
): Promise<TimeTrackingSession[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('time_tracking')
    .select('*')
    .eq('task_id', taskId)
    .order('start_time', { ascending: false });

  if (error) {
    throw new Error(`Failed to get task time tracking: ${error.message}`);
  }

  return (data || []).map((entry: any) => ({
    id: entry.id,
    task_id: entry.task_id,
    user_id: entry.user_id,
    start_time: new Date(entry.start_time),
    end_time: entry.end_time ? new Date(entry.end_time) : new Date(),
    duration_minutes: entry.duration_minutes || 0,
    notes: entry.notes,
    is_active: entry.is_active,
  }));
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get current session duration
 */
export function getCurrentSessionDuration(startTime: Date): number {
  const now = new Date();
  return Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
}
