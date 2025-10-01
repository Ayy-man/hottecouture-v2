import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavigationProvider } from '@/components/navigation/navigation-provider'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Hotte Couture',
    template: '%s | Hotte Couture',
  },
  description: 'A modern, production-ready web application built with Next.js 14+',
  keywords: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
  authors: [{ name: 'Hotte Couture Team' }],
  creator: 'Hotte Couture',
  publisher: 'Hotte Couture',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: 'Hotte Couture',
    description: 'A modern, production-ready web application built with Next.js 14+',
    siteName: 'Hotte Couture',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hotte Couture',
    description: 'A modern, production-ready web application built with Next.js 14+',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NavigationProvider>
          <div className="relative flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold">Hotte Couture</h1>
                </div>
                <nav className="flex items-center space-x-6">
                  <a
                    href="/"
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    Home
                  </a>
                  <a
                    href="/about"
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    About
                  </a>
                  <a
                    href="/contact"
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    Contact
                  </a>
                </nav>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t bg-background">
              <div className="container py-6">
                <div className="flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row md:py-0">
                  <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                      Built with Next.js 14+ and Tailwind CSS. The source code is available on{' '}
                      <a
                        href="#"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-4"
                      >
                        GitHub
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </NavigationProvider>
      </body>
    </html>
  )
}
