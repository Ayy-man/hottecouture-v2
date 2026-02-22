import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')` }} />
      </body>
    </html>
  );
}
