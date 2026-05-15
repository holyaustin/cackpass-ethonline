// /components/layout/Header.tsx
'use client'

import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'

const LazyWalletButton = lazy(() => 
  import('@/components/auth/WalletButton').then(mod => ({ default: mod.WalletButton }))
)

function WalletButtonSkeleton() {
  return (
    <div className="hidden md:flex items-center space-x-3">
      <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
    </div>
  )
}

function MobileWalletButtonSkeleton() {
  return (
    <button className="btn-primary w-full py-3" disabled>
      Loading...
    </button>
  )
}

export function Header() {
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [shouldLoadWallet, setShouldLoadWallet] = useState(false)
  
  const { isAuthReady } = useAuth()
  const pathname = usePathname()

  console.log(`🏗️ [Header] Rendering: pathname=${pathname}, isAuthReady=${isAuthReady}, shouldLoadWallet=${shouldLoadWallet}`);

  // Check for OAuth params on mount - DON'T clean them
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hasOAuthParams = params.has('privy_oauth_code') || params.has('privy_oauth_state');
      console.log(`🔍 [Header] OAuth params detected: ${hasOAuthParams}`);
      
      if (hasOAuthParams) {
        console.log('🔐 [Header] OAuth callback detected, forcing wallet load');
        setShouldLoadWallet(true);
        window.dispatchEvent(new CustomEvent('load-auth'));
      }
    }
  }, []);

  // Theme handling
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      const newScrolled = window.scrollY > 10;
      if (newScrolled !== scrolled) {
        setScrolled(newScrolled);
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrolled])

  const handleLoginClick = useCallback(() => {
    console.log('🔘 [Header] Login button clicked');
    setShouldLoadWallet(true);
    window.dispatchEvent(new CustomEvent('load-auth'));
  }, []);

  const canShowWallet = isAuthReady || shouldLoadWallet;
  console.log(`👛 [Header] canShowWallet=${canShowWallet}`);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${
      scrolled 
        ? 'bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-300'
        : 'bg-surface dark:bg-dark-surface border-b border-transparent'
    }`}>
      <nav className="responsive-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-10 h-10 md:w-16 md:h-16">
              <Image
                src="/logoosm.png"
                alt="CACK-pass logo"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 640px) 40px, (max-width: 768px) 44px, (max-width: 1024px) 48px, 56px"
              />
            </div>
            <span className="text-xl md:text-2xl font-bold text-text dark:text-dark-text">
              CACK-<span className="text-primary dark:text-dark-primary">pass</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/events" className="text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium">
              Events
            </Link>
            <Link href="/dashboard" className="text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium">
              Dashboard
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-background dark:bg-dark-background hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Desktop Auth */}
            <div className="hidden md:block">
              <Suspense fallback={<WalletButtonSkeleton />}>
                {canShowWallet ? (
                  <LazyWalletButton />
                ) : (
                  <button 
                    onClick={handleLoginClick}
                    className="px-6 py-2.5 text-sm font-medium rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all duration-300"
                  >
                    Login
                  </button>
                )}
              </Suspense>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 dark:border-gray-300">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/events" 
                className="px-4 py-3 text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Events
              </Link>
              <Link 
                href="/dashboard" 
                className="px-4 py-3 text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              
              {/* Mobile Auth Section */}
              <div className="px-4 py-3 mt-4 border-t border-gray-100 dark:border-gray-300">
                <Suspense fallback={<MobileWalletButtonSkeleton />}>
                  {canShowWallet ? (
                    <LazyWalletButton mobile />
                  ) : (
                    <button 
                      onClick={handleLoginClick}
                      className="w-full py-3 text-sm font-medium rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all duration-300"
                    >
                      Login
                    </button>
                  )}
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}