'use client';

import { useState, useEffect, useCallback } from 'react';

export interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

// Hardcoded fallback staff when database table doesn't exist
const FALLBACK_STAFF: StaffMember[] = [
  { id: 'fallback-1', name: 'Audrey', is_active: true, created_at: new Date().toISOString() },
  { id: 'fallback-2', name: 'Solange', is_active: true, created_at: new Date().toISOString() },
  { id: 'fallback-3', name: 'Audrey-Anne', is_active: true, created_at: new Date().toISOString() },
];

export function useStaff(activeOnly: boolean = true) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff?active=${activeOnly}`);
      if (!response.ok) {
        throw new Error('Failed to fetch staff');
      }
      const data = await response.json();
      const staffData = data.staff || [];

      // If no staff returned or API error, use fallback
      if (staffData.length === 0 && data.error) {
        console.warn('Staff API error, using fallback staff:', data.error);
        setStaff(FALLBACK_STAFF);
        setUsingFallback(true);
      } else {
        setStaff(staffData);
        setUsingFallback(false);
      }
    } catch (err) {
      console.warn('Staff fetch failed, using fallback staff:', err);
      setStaff(FALLBACK_STAFF);
      setUsingFallback(true);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const addStaff = async (name: string): Promise<StaffMember | null> => {
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to add staff');
      }

      const data = await response.json();
      await fetchStaff();
      return data.staff;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updateStaff = async (
    id: string,
    updates: { name?: string; is_active?: boolean }
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update staff');
      }

      await fetchStaff();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const deleteStaff = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete staff');
      }

      await fetchStaff();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    staff,
    loading,
    error,
    usingFallback,
    refetch: fetchStaff,
    addStaff,
    updateStaff,
    deleteStaff,
  };
}
