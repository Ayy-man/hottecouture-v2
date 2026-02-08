'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile viewport (max-width: 767px)
 * SSR-safe: defaults to false on server, updates on client
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Create media query for mobile viewport
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes (resize, orientation change)
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}
