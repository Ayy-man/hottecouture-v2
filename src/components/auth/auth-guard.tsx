import { useStaffSession } from '@/components/staff/staff-session-provider';
import { LoadingLogo } from '@/components/ui/loading-logo';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  // Use staff session instead of Supabase auth
  const { isAuthenticated, isLoading } = useStaffSession();

  // No redirect - StaffPinModal in layout will handle the prompt
  // We just simply hide the content until authenticated

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center'>
        <LoadingLogo size='xl' text='Authenticating...' />
      </div>
    );
  }

  // Not authenticated? Render nothing (Modal will show)
  if (!isAuthenticated) {
    return null;
  }

  // User is authenticated, show the protected content
  return <>{children}</>;
}
