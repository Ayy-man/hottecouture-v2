'use client';

import { usePathname } from 'next/navigation';
import { InternalChat } from './internal-chat';

// Pages where chat should NOT appear
const EXCLUDED_PATHS = ['/portal', '/embed', '/login', '/auth', '/chat'];

export function GlobalChatWrapper() {
  const pathname = usePathname();

  const isExcluded = EXCLUDED_PATHS.some(p => pathname.startsWith(p));

  if (isExcluded) return null;

  // Hide floating widget on mobile — mobile uses /chat page via bottom nav
  return (
    <div className="hidden md:block">
      <InternalChat />
    </div>
  );
}
