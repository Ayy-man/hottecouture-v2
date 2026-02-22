import { NavigationProvider } from '@/components/navigation/navigation-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { HLogo } from '@/components/ui/h-logo';
import {
  StaffSessionProvider,
  StaffPinModal,
  StaffIndicator,
} from '@/components/staff';
import { ToastProvider } from '@/components/ui/toast';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { GlobalChatWrapper } from '@/components/chat/global-chat-wrapper';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <AuthProvider>
        <StaffSessionProvider>
          <NavigationProvider>
          <div className='grid h-full grid-rows-[auto,1fr]'>
            <header className='row-start-1 row-end-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden'>
              <div className='container flex h-16 items-center justify-between'>
                <div className='flex items-center'>
                  <HLogo size='md' />
                </div>
                <nav className='hidden md:flex items-center space-x-4'>
                  <a
                    href='/'
                    className='text-sm font-medium transition-colors hover:text-primary'
                  >
                    Home
                  </a>
                  <StaffIndicator />
                </nav>
                {/* Mobile: show only staff indicator */}
                <div className='flex md:hidden items-center'>
                  <StaffIndicator />
                </div>
              </div>
            </header>
            <main className='row-start-2 row-end-3 min-h-0 overflow-y-auto pb-16 md:pb-0 print:pb-0'>
              {children}
            </main>
            <MobileBottomNav />
          </div>
          <StaffPinModal />
          <GlobalChatWrapper />
          </NavigationProvider>
        </StaffSessionProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
