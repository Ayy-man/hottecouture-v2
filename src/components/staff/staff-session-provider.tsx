'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCurrentStaff, StaffSession } from '@/lib/hooks/useCurrentStaff';

interface StaffSessionContextValue {
  currentStaff: StaffSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  clockIn: (staffId: string, staffName: string, pin: string) => Promise<boolean>;
  clockOut: () => void;
}

const StaffSessionContext = createContext<StaffSessionContextValue | null>(null);

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const staffSession = useCurrentStaff();

  return (
    <StaffSessionContext.Provider value={staffSession}>
      {children}
    </StaffSessionContext.Provider>
  );
}

export function useStaffSession() {
  const context = useContext(StaffSessionContext);
  if (!context) {
    throw new Error('useStaffSession must be used within a StaffSessionProvider');
  }
  return context;
}
