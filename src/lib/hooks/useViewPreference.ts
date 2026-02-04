'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hc_services_view_mode';

export type ViewMode = 'grid' | 'list';

export function useViewPreference(defaultMode: ViewMode = 'grid') {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'grid' || stored === 'list') {
          setViewModeState(stored);
        }
      }
    } catch (err) {
      console.error('Failed to load view preference:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, mode);
      }
    } catch (err) {
      console.error('Failed to save view preference:', err);
    }
  }, []);

  return {
    viewMode,
    setViewMode,
    isLoaded,
  };
}
