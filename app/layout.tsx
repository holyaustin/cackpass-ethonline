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
  title: 'TicketPass - Smart Event Ticketing',
  description: 'Buy, sell, and manage event tickets with smart digital passes that create lasting memories.',
  manifest: '/manifest.json',
  themeColor: '#D95427',
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#D95427" />
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