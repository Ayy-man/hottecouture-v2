'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingLogo } from '@/components/ui/loading-logo';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('🔒 No user found, redirecting to login...');
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?redirectTo=${returnUrl}`);
    }
  }, [user, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center'>
        <LoadingLogo size='xl' text='Authenticating...' />
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  // User is authenticated, show the protected content
  return <>{children}</>;
}
