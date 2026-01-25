// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AppProviders } from '@/components/providers/AppProviders'
import { Toaster } from 'sonner'
import { Suspense } from 'react'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'CACK-pass - Event Ticketing Platform',
  description: 'Buy, sell, and manage event tickets with smart digital passes that create lasting memories.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CACK-pass',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'CACK-pass',
    title: 'CACK-pass - Event Ticketing Platform',
    description: 'Buy, sell, and manage event tickets with smart digital passes that create lasting memories.',
  },
  twitter: {
    card: 'summary',
    title: 'CACK-pass - Event Ticketing Platform',
    description: 'Buy, sell, and manage event tickets with smart digital passes that create lasting memories.',
  },
}

export const viewport: Viewport = {
  themeColor: '#D95427',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

// Loading component for Suspense fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text dark:text-dark-text">Loading CACK-pass...</p>
      </div>
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="color-scheme" content="dark light" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-text dark:bg-dark-background dark:text-dark-text`}>
        <Suspense fallback={<LoadingFallback />}>
          <AppProviders>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <Toaster 
              position="top-center"
              toastOptions={{
                className: 'bg-surface dark:bg-dark-surface text-text dark:text-dark-text border border-gray-200 dark:border-gray-300',
                duration: 4000,
              }}
            />
          </AppProviders>
        </Suspense>
      </body>
    </html>
  )
}