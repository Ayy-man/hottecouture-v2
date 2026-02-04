'use client';

import { useState, useEffect } from 'react';

interface MuralBackgroundProps {
  children: React.ReactNode;
  className?: string;
  useMuralBackground?: boolean;
  opacity?: number;
}

export function MuralBackground({
  children,
  className = '',
  useMuralBackground = true,
  opacity = 0.1,
}: MuralBackgroundProps) {
  const [muralLoaded, setMuralLoaded] = useState(false);

  useEffect(() => {
    // Preload the mural image
    const img = new Image();
    img.onload = () => setMuralLoaded(true);
    img.onerror = () => setMuralLoaded(false);
    img.src = '/mural-background.png';
  }, []);

  if (!useMuralBackground || !muralLoaded) {
    // Fallback to gradient background
    return (
      <div
        className={`h-full bg-gradient-to-br from-pink-50 to-purple-50 ${className}`}
      >
        <div className='h-full min-h-0'>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`h-full relative ${className}`}
      style={{
        backgroundImage: `url('/mural-background.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay for better text readability */}
      <div className='absolute inset-0 bg-white' style={{ opacity }} />

      {/* Content */}
      <div className='relative z-10 h-full min-h-0'>{children}</div>
    </div>
  );
}
