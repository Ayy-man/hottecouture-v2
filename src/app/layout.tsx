import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
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

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: 'Hotte Couture',
    template: '%s | Hotte Couture',
  },
  description:
    'Professional tailoring and custom design services for all your garment needs',
  keywords: [
    'tailoring',
    'alterations',
    'custom design',
    'sewing',
    'fashion',
    'garments',
  ],
  authors: [{ name: 'Hotte Couture Team' }],
  creator: 'Hotte Couture',
  publisher: 'Hotte Couture',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/logo-round.jpg',
  },
  manifest: '/manifest.json',
  themeColor: '#6366f1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hotte Couture',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: 'Hotte Couture',
    description:
      'Professional tailoring and custom design services for all your garment needs',
    siteName: 'Hotte Couture',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hotte Couture',
    description:
      'Professional tailoring and custom design services for all your garment needs',
    creator: '@hottecouture',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className={inter.variable}>
      <body className='h-dvh overflow-hidden bg-background font-sans antialiased'>
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
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')` }} />
      </body>
    </html>
  );
}
