'use client';

export interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
}

// Hardcoded staff - no database, no API, no bullshit
const STAFF: StaffMember[] = [
  { id: '1', name: 'Audrey', is_active: true },
  { id: '2', name: 'Solange', is_active: true },
  { id: '3', name: 'Audrey-Anne', is_active: true },
];

export function useStaff() {
  return {
    staff: STAFF,
    loading: false,
    error: null,
  };
}
