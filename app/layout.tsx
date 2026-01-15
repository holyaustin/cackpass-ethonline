// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AppProviders } from '@/components/providers/AppProviders'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/* Remove the meta viewport and theme-color tags since they're now in viewport export */}
      </head>
      <body className={`${inter.className} bg-background text-text dark:bg-dark-background dark:text-dark-text`}>
        <AppProviders>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <Toaster 
            position="top-center"
            toastOptions={{
              className: 'bg-surface dark:bg-dark-surface text-text dark:text-dark-text border border-gray-200 dark:border-gray-300',
            }}
          />
        </AppProviders>
      </body>
    </html>
  )
}