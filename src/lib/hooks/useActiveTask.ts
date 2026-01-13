'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ActiveTask {
  garmentId: string;
  garmentType: string;
  orderId: string;
  orderNumber: number | null;
  clientName: string | null;
  startedAt: string | null;
  elapsedSeconds: number;
  stage: string;
}

export function useActiveTask(staffName: string | null) {
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTask = useCallback(async () => {
    if (!staffName) {
      setActiveTask(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/staff/active-task?staffName=${encodeURIComponent(staffName)}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      const result = await response.json();

      if (result.success) {
        setActiveTask(result.activeTask);
      } else {
        setError(result.error || 'Failed to fetch active task');
      }
    } catch (err) {
      console.error('Failed to fetch active task:', err);
      setError('Failed to fetch active task');
    } finally {
      setIsLoading(false);
    }
  }, [staffName]);

  // Fetch on mount and when staff changes
  useEffect(() => {
    if (staffName) {
      fetchActiveTask();
    }
  }, [staffName, fetchActiveTask]);

  // Poll every 5 seconds when there's an active task
  useEffect(() => {
    if (!staffName) return;

    const interval = setInterval(fetchActiveTask, 5000);
    return () => clearInterval(interval);
  }, [staffName, fetchActiveTask]);

  return {
    activeTask,
    hasActiveTask: !!activeTask,
    isLoading,
    error,
    refetch: fetchActiveTask,
  };
}
