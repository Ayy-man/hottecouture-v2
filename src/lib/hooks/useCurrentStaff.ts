'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hc_staff_session';

export interface StaffSession {
  staffId: string;
  staffName: string;
  clockedInAt: string;
}

export function useCurrentStaff() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StaffSession;
        setSession(parsed);
      }
    } catch (err) {
      console.error('Failed to load staff session:', err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clockIn = useCallback(async (staffId: string, staffName: string, pin: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/staff/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, pin }),
      });

      const result = await response.json();

      if (result.success) {
        const newSession: StaffSession = {
          staffId,
          staffName,
          clockedInAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Clock in failed:', err);
      return false;
    }
  }, []);

  const loginByPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/staff/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const result = await response.json();

      if (result.success && result.staff) {
        const newSession: StaffSession = {
          staffId: result.staff.id,
          staffName: result.staff.name,
          clockedInAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Login by PIN failed:', err);
      return false;
    }
  }, []);

  const clockOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return {
    currentStaff: session,
    isLoading,
    isAuthenticated: !!session,
    clockIn,
    loginByPin,
    clockOut,
  };
}
