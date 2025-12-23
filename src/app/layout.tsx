import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NavigationProvider } from '@/components/navigation/navigation-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { AuthButton } from '@/components/auth/auth-button';
import { HLogo } from '@/components/ui/h-logo';
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
    apple: '/logo.jpg',
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
        <AuthProvider>
          <NavigationProvider>
            <div className='grid h-full grid-rows-[auto,1fr]'>
              <header className='row-start-1 row-end-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
                <div className='container flex h-16 items-center justify-between'>
                  <div className='flex items-center'>
                    <HLogo size='md' />
                  </div>
                  <nav className='flex items-center space-x-6'>
                    <a
                      href='/'
                      className='text-sm font-medium transition-colors hover:text-primary'
                    >
                      Home
                    </a>
                    <AuthButton />
                  </nav>
                </div>
              </header>
              <main className='row-start-2 row-end-3 min-h-0 overflow-hidden'>
                {children}
              </main>
            </div>
            <GlobalChatWrapper />
          </NavigationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
