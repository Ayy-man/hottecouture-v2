'use client';

import { usePathname } from 'next/navigation';
import { InternalChat } from './internal-chat';

// Pages where chat should NOT appear
const EXCLUDED_PATHS = ['/portal', '/embed', '/login', '/auth'];

export function GlobalChatWrapper() {
  const pathname = usePathname();

  const isExcluded = EXCLUDED_PATHS.some(p => pathname.startsWith(p));

  if (isExcluded) return null;

  return <InternalChat />;
}
