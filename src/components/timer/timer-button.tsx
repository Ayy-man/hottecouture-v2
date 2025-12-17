'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Square, Pencil, Check, X } from 'lucide-react';
import { formatDetailedTime, getTimerState } from '@/lib/timer/timer-utils';
import { LoadingLogo } from '@/components/ui/loading-logo';

interface TimerButtonProps {
  orderId: string;
  orderStatus: string;
  onTimeUpdate?: (totalSeconds: number) => void;
  garmentId?: string; // Optional: if provided, tracks time for specific garment task
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
  garmentId,
}: TimerButtonProps) {
  const [timerStatus, setTimerStatus] = useState<TimerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('0');
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always show timer now (Persist visibility)
  // const shouldShowTimer = orderStatus === 'working';
  const shouldShowTimer = true;

  // Debug logging
  console.log('🕐 TimerButton Debug:', {
    orderId,
    garmentId,
    orderStatus,
    shouldShowTimer,
    timerStatus: timerStatus ? 'loaded' : 'not loaded',
    timestamp: new Date().toISOString(),
  });

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
      const url = garmentId
        ? `/api/timer/status?orderId=${orderId}&garmentId=${garmentId}`
        : `/api/timer/status?orderId=${orderId}`;
      const response = await fetch(url);
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
  }, [orderId, garmentId, shouldShowTimer]);

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
        body: JSON.stringify({ orderId, garmentId }),
      });

      const result = await response.json();
      if (result.success) {
        setError(null);
        await fetchTimerStatus();
      } else {
        setError(result.error || 'Failed to start timer');
      }
    } catch (err) {
      console.error('Error starting timer:', err);
      setError('Failed to start timer');
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
        body: JSON.stringify({ orderId, garmentId }),
      });

      const result = await response.json();
      if (result.success) {
        setError(null);
        await fetchTimerStatus();
      } else {
        setError(result.error || 'Failed to pause timer');
      }
    } catch (err) {
      console.error('Error pausing timer:', err);
      setError('Failed to pause timer');
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
        body: JSON.stringify({ orderId, garmentId }),
      });

      const result = await response.json();
      if (result.success) {
        setError(null);
        await fetchTimerStatus();
      } else {
        setError(result.error || 'Failed to resume timer');
      }
    } catch (err) {
      console.error('Error resuming timer:', err);
      setError('Failed to resume timer');
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
        body: JSON.stringify({ orderId, garmentId }),
      });

      const result = await response.json();
      if (result.success) {
        setError(null);
        await fetchTimerStatus();
      } else {
        setError(result.error || 'Failed to stop timer');
      }
    } catch (err) {
      console.error('Error stopping timer:', err);
      setError('Failed to stop timer');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = () => {
    const totalSeconds = timerStatus?.total_work_seconds || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    setEditHours(String(hours));
    setEditMinutes(String(minutes));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditHours('0');
    setEditMinutes('0');
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const hours = parseInt(editHours, 10) || 0;
      const minutes = parseInt(editMinutes, 10) || 0;

      const response = await fetch('/api/timer/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, garmentId, hours, minutes }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchTimerStatus();
        setIsEditing(false);
      } else {
        alert(result.error || 'Failed to update time');
      }
    } catch (error) {
      console.error('Error updating time:', error);
      alert('Failed to update time');
    } finally {
      setSavingEdit(false);
    }
  };

  // Don't show timer if not in working status
  if (!shouldShowTimer) {
    return null;
  }

  // Don't show timer if status not loaded yet
  if (!timerStatus) {
    return (
      <div className='flex items-center justify-center p-4 bg-gray-50 rounded-lg'>
        <LoadingLogo size='sm' text='Loading timer...' />
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
    timerState === 'running' ? baseTime + Math.max(0, currentTime) : baseTime;

  const canEdit = timerState === 'paused' || timerState === 'idle';

  if (isEditing) {
    return (
      <div className='flex items-center gap-2 p-2 bg-yellow-50 rounded-lg'>
        <div className='flex items-center gap-1'>
          <Input
            type='number'
            min='0'
            max='999'
            value={editHours}
            onChange={e => setEditHours(e.target.value)}
            className='w-16 h-8 text-center text-sm'
            disabled={savingEdit}
          />
          <span className='text-sm text-gray-600'>h</span>
          <Input
            type='number'
            min='0'
            max='59'
            value={editMinutes}
            onChange={e => setEditMinutes(e.target.value)}
            className='w-16 h-8 text-center text-sm'
            disabled={savingEdit}
          />
          <span className='text-sm text-gray-600'>m</span>
        </div>
        <div className='flex gap-1'>
          <Button
            size='sm'
            onClick={handleSaveEdit}
            disabled={savingEdit}
            className='btn-press bg-green-600 hover:bg-green-700 text-white h-8 px-2'
          >
            <Check className='w-3 h-3' />
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={handleCancelEdit}
            disabled={savingEdit}
            className='h-8 px-2'
          >
            <X className='w-3 h-3' />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
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
          {canEdit && (
            <Button
              size='sm'
              variant='ghost'
              onClick={handleStartEdit}
              disabled={loading}
              className='h-8 px-2 text-gray-500 hover:text-gray-700'
              title='Edit time'
            >
              <Pencil className='w-3 h-3' />
            </Button>
          )}
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
      {error && (
        <div className='text-red-600 text-xs p-2 bg-red-50 rounded-lg border border-red-200'>
          {error}
        </div>
      )}
    </div>
  );
}
