// app/layout.tsx
import type { Metadata, Viewport } from 'next'
// 1. Change the import to use localFont
import localFont from 'next/font/local' 
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AppProviders } from '@/components/providers/AppProviders'
import { Toaster } from 'sonner'
import { Suspense } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react'; // Adjusted entrypoint to prevent TS issues

// 2. Configure the local font targeting your public folder file
const inter = localFont({
  src: [
    {
      path: '../public/fonts/InterVariable.ttf',
      style: 'normal',
    },
    {
      path: '../public/fonts/InterVariable-Italic.ttf',
      style: 'italic',
    },
  ],
  variable: '--font-inter',
  weight: '100 900', // Both files are variable and support all weights automatically
  display: 'swap',
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
      {/* 3. The local font configuration applies identically to your existing body className structure */}
      <body className={`${inter.className} antialiased bg-background text-text dark:bg-dark-background dark:text-dark-text`}>
        <Suspense fallback={<LoadingFallback />}>
          <AppProviders>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                {children}
                <SpeedInsights />
                <Analytics />
              </main>
              <Footer />
            </div>
            <Toaster 
              position="top-right"
              toastOptions={{
                className: 'bg-surface dark:bg-dark-surface text-text dark:text-dark-text border border-gray-200 dark:border-gray-300',
                duration: 2500,
              }}
            />
          </AppProviders>
        </Suspense>
      </body>
    </html>
  )
}
