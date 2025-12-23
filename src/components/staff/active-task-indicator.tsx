'use client';

import { useState, useEffect } from 'react';
import { useStaffSession } from './staff-session-provider';
import { useActiveTask } from '@/lib/hooks/useActiveTask';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, Pause, Square, Clock, ExternalLink, ChevronDown } from 'lucide-react';
import Link from 'next/link';

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ActiveTaskIndicator() {
  const { currentStaff, isAuthenticated } = useStaffSession();
  const { activeTask, hasActiveTask, refetch } = useActiveTask(currentStaff?.staffName || null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Update elapsed time every second
  useEffect(() => {
    if (!activeTask) {
      setElapsedTime(0);
      return;
    }

    setElapsedTime(activeTask.elapsedSeconds);

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask]);

  const handlePause = async () => {
    if (!activeTask) return;
    setActionLoading(true);

    try {
      await fetch('/api/timer/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeTask.orderId,
          garmentId: activeTask.garmentId,
        }),
      });
      await refetch();
    } catch (err) {
      console.error('Pause failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!activeTask) return;
    setActionLoading(true);

    try {
      await fetch('/api/timer/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeTask.orderId,
          garmentId: activeTask.garmentId,
        }),
      });
      await refetch();
    } catch (err) {
      console.error('Resume failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeTask) return;
    setActionLoading(true);

    try {
      await fetch('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeTask.orderId,
          garmentId: activeTask.garmentId,
        }),
      });
      await refetch();
    } catch (err) {
      console.error('Stop failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (!hasActiveTask) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-500 text-sm">
        <Clock className="w-3.5 h-3.5" />
        <span>Aucune tâche</span>
      </div>
    );
  }

  const isRunning = activeTask?.stage === 'working';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            isRunning
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span>#{activeTask?.orderNumber || '?'}</span>
          <span className="font-mono">{formatTime(elapsedTime)}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-4">
        <div className="space-y-3">
          {/* Order info */}
          <div>
            <div className="font-semibold text-sm">
              Commande #{activeTask?.orderNumber || '?'}
            </div>
            <div className="text-sm text-stone-600">
              {activeTask?.garmentType}
            </div>
            {activeTask?.clientName && (
              <div className="text-xs text-stone-500">
                {activeTask.clientName}
              </div>
            )}
          </div>

          {/* Time display */}
          <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg">
            <Clock className="w-4 h-4 text-stone-500" />
            <span className="font-mono text-lg font-semibold">
              {formatTime(elapsedTime)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isRunning
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {isRunning ? 'En cours' : 'En pause'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {isRunning ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePause}
                disabled={actionLoading}
                className="flex-1"
              >
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleResume}
                disabled={actionLoading}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-1" />
                Reprendre
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={handleStop}
              disabled={actionLoading}
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-1" />
              Terminer
            </Button>
          </div>

          {/* View order link */}
          <Link
            href={`/board?order=${activeTask?.orderId}`}
            className="flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Voir la commande
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
