'use client';

import { useEffect, useState } from 'react';
import { InternalChat } from './internal-chat';

// Pages where chat should NOT appear
const EXCLUDED_PATHS = ['/portal', '/embed', '/login', '/auth'];

export function GlobalChatWrapper() {
  const [showChat, setShowChat] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const path = window.location.pathname;
    const isExcluded = EXCLUDED_PATHS.some(p => path.startsWith(p));
    setShowChat(!isExcluded);
  }, [mounted]);

  if (!mounted || !showChat) return null;

  return <InternalChat />;
}
