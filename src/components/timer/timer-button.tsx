'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';
import { formatDetailedTime, getTimerState } from '@/lib/timer/timer-utils';

interface TimerButtonProps {
  orderId: string;
  orderStatus: string;
  onTimeUpdate?: (totalSeconds: number) => void;
}

interface TimerStatus {
  is_running: boolean;
  is_paused: boolean;
  is_completed: boolean;
  timer_started_at: string | null;
  timer_paused_at: string | null;
  work_completed_at: string | null;
  total_work_seconds: number;
  current_session_seconds: number;
  total_seconds: number;
}

export function TimerButton({
  orderId,
  orderStatus,
  onTimeUpdate,
}: TimerButtonProps) {
  const [timerStatus, setTimerStatus] = useState<TimerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Only show timer for orders in working status
  const shouldShowTimer = orderStatus === 'working';

  // Update current time every second when timer is running
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerStatus?.is_running) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerStatus?.is_running]);

  // Fetch timer status
  const fetchTimerStatus = async () => {
    try {
      const response = await fetch(`/api/timer/status?orderId=${orderId}`);
      const result = await response.json();

      if (result.success) {
        setTimerStatus(result);
        setCurrentTime(result.current_session_seconds);
        onTimeUpdate?.(result.total_seconds);
      }
    } catch (error) {
      console.error('Error fetching timer status:', error);
    }
  };

  // Load timer status on mount
  useEffect(() => {
    if (shouldShowTimer) {
      fetchTimerStatus();
    }
  }, [orderId, shouldShowTimer]);

  // Get timer state
  const timerState = timerStatus
    ? getTimerState(
        timerStatus.is_running,
        timerStatus.is_paused,
        timerStatus.is_completed
      )
    : 'idle';

  // Timer actions
  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchTimerStatus();
      }
    } catch (error) {
      console.error('Error starting timer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/timer/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchTimerStatus();
      }
    } catch (error) {
      console.error('Error pausing timer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/timer/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchTimerStatus();
      }
    } catch (error) {
      console.error('Error resuming timer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchTimerStatus();
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show timer if not in working status
  if (!shouldShowTimer) {
    return null;
  }

  // Don't show timer if status not loaded yet
  if (!timerStatus) {
    return (
      <div className='flex items-center gap-2 p-2 bg-gray-50 rounded-lg'>
        <div className='text-sm text-gray-500'>Loading timer...</div>
      </div>
    );
  }

  // Show completed state
  if (timerState === 'completed') {
    return (
      <div className='flex items-center gap-2 p-2 bg-green-50 rounded-lg'>
        <Square className='w-4 h-4 text-green-600' />
        <div className='text-sm font-medium text-green-800'>
          Completed: {formatDetailedTime(timerStatus.total_work_seconds)}
        </div>
      </div>
    );
  }

  // Show timer controls (ensure non-negative display)
  const baseTime = Math.max(0, timerStatus?.total_work_seconds || 0);
  const displayTime =
    timerState === 'running' ? baseTime + Math.max(0, currentTime) : baseTime; // When paused/completed, show the accumulated time from total_work_seconds

  return (
    <div className='flex items-center gap-2 p-2 bg-blue-50 rounded-lg'>
      <div className='flex-1'>
        <div className='text-sm font-medium text-blue-900'>
          {timerState === 'running' ? 'Working...' : 'Paused'}
        </div>
        <div className='text-xs text-blue-700'>
          Total: {formatDetailedTime(displayTime)}
        </div>
      </div>

      <div className='flex gap-1'>
        {timerState === 'idle' ? (
          <Button
            size='sm'
            onClick={handleStart}
            disabled={loading}
            className='btn-press bg-green-600 hover:bg-green-700 text-white'
          >
            <Play className='w-3 h-3 mr-1' />
            Start
          </Button>
        ) : timerState === 'running' ? (
          <Button
            size='sm'
            onClick={handlePause}
            disabled={loading}
            className='btn-press bg-yellow-600 hover:bg-yellow-700 text-white'
          >
            <Pause className='w-3 h-3 mr-1' />
            Pause
          </Button>
        ) : (
          <div className='flex gap-1'>
            <Button
              size='sm'
              onClick={handleResume}
              disabled={loading}
              className='btn-press bg-blue-600 hover:bg-blue-700 text-white'
            >
              <Play className='w-3 h-3 mr-1' />
              Resume
            </Button>
            <Button
              size='sm'
              onClick={handleStop}
              disabled={loading}
              className='btn-press bg-red-600 hover:bg-red-700 text-white'
            >
              <Square className='w-3 h-3 mr-1' />
              Stop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
