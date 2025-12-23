'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
  pin_hash?: string;
  last_clock_in?: string;
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('staff')
          .select('id, name, is_active, pin_hash, last_clock_in')
          .eq('is_active', true)
          .order('name');

        if (fetchError) {
          console.error('Error fetching staff:', fetchError);
          setError(fetchError.message);
          return;
        }

        setStaff(data || []);
      } catch (err) {
        console.error('Failed to fetch staff:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch staff');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  return {
    staff,
    loading,
    error,
  };
}
