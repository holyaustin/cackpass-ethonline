// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AppProviders } from '@/components/providers/AppProviders'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CACK-pass - Gasless Event Ticketing',
  description: 'Buy, sell, and manage event tickets with zero gas fees. Powered by blockchain for security and transparency.',
  manifest: '/manifest.json',
  themeColor: '#FF6B35',
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#FF6B35" />
      </head>
      <body className={`${inter.className} bg-white dark:bg-gray-900`}>
        <AppProviders>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            }}
          />
        </AppProviders>
      </body>
    </html>
  )
}