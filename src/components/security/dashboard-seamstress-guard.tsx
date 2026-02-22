'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffSession } from '@/components/staff';

/**
 * Client-side guard that redirects seamstresses away from the dashboard page.
 * Renders null (no content) if the current staff member is a seamstress.
 * Used as a wrapper inside the server-rendered DashboardPage.
 */
export function DashboardSeamstressGuard({ children }: { children: React.ReactNode }) {
  const { currentStaff, isLoading } = useStaffSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && currentStaff?.staffRole === 'seamstress') {
      router.replace('/board');
    }
  }, [isLoading, currentStaff, router]);

  if (currentStaff?.staffRole === 'seamstress') return null;

  return <>{children}</>;
}
