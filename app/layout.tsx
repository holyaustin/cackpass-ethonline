// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local' 
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AppProviders } from '@/components/providers/AppProviders'
import { Toaster } from 'sonner'
import { Suspense } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

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
  weight: '100 900',
  display: 'swap', // Ensures text renders instantly using a fallback font
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

// Optimized: Pure CSS styling skeleton reduces asset-blocking times on mobile devices
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background dark:bg-dark-background opacity-50 transition-opacity duration-200" />
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
      {/* Fixed: Replaced inter.className with inter.variable font fallback integration */}
      <body className={`${inter.variable} font-sans antialiased bg-background text-text dark:bg-dark-background dark:text-dark-text`}>
        <Suspense fallback={<LoadingFallback />}>
          <AppProviders>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            
            {/* Fixed: Relocated tracking scripts to the absolute bottom of the DOM render stack */}
            <SpeedInsights />
            <Analytics />
            
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
