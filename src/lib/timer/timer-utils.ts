/**
 * Format seconds into human-readable time format (e.g., "2h 30m", "45m", "15s")
 * Ensures non-negative display.
 * @param seconds - Number of seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

/**
 * Format seconds into detailed time format (e.g., "2:30:45", "45:30", "00:30")
 * Ensures non-negative display.
 * @param seconds - Number of seconds
 * @returns Detailed formatted time string
 */
export function formatDetailedTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate elapsed time since a given start time
 * @param startTime - Start time as Date or ISO string
 * @returns Elapsed seconds
 */
export function calculateElapsedTime(startTime: Date | string): number {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 1000);
}

/**
 * Timer state types
 */
export type TimerState = 'idle' | 'running' | 'paused' | 'completed';

/**
 * Get timer state based on database fields
 * @param isRunning - Is timer currently running
 * @param isPaused - Is timer paused
 * @param isCompleted - Is work completed
 * @returns Timer state
 */
export function getTimerState(
  isRunning: boolean,
  isPaused: boolean,
  isCompleted: boolean
): TimerState {
  if (isCompleted) return 'completed';
  if (isRunning) return 'running';
  if (isPaused) return 'paused';
  return 'idle';
}
