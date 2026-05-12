// /components/layout/Header.tsx - UPDATED VERSION (ADD handleLoginClick)
'use client'

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Sun, Moon, Menu, X, User as UserIcon, LogOut } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/AuthProvider'

// ========== NEW ENHANCEMENT 1: Lazy load the wallet button component ==========
// This removes Privy from the initial bundle entirely
const LazyWalletButton = lazy(() => 
  import('@/components/auth/WalletButton').then(mod => ({ default: mod.WalletButton }))
)

// Public pages that should NOT trigger auth checks (KEPT EXISTING)
const PUBLIC_PAGES = [
  '/',
  '/events',
  '/about',
  '/privacy',
  '/terms',
  '/payment/success',
  '/payment/failed',
  '/complete-profile', // IMPORTANT: Keep this - it needs auth but is special
]

// Check if current path is public (KEPT EXISTING - UNCHANGED)
const isPublicPage = (pathname: string): boolean => {
  // Exact matches
  if (PUBLIC_PAGES.includes(pathname)) return true
  
  // Check for dynamic event pages (e.g., /events/123, /events/abc-123)
  if (pathname.startsWith('/events/') && pathname !== '/events') {
    return true
  }
  
  return false
}

// ========== NEW ENHANCEMENT 2: Skeleton loader for wallet button ==========
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
  
  // ========== NEW ENHANCEMENT 3: Track if wallet button should load ==========
  // This prevents Privy from loading until user actually needs it
  const [shouldLoadWallet, setShouldLoadWallet] = useState(false)
  
  // Get auth context - this will work once AuthProvider is created
  const { isAuthReady, loadAuth } = useAuth()
  
  const router = useRouter()
  const pathname = usePathname()
  
  // ========== NOTE: usePrivy has been REMOVED from Header ==========
  // All Privy logic moved to WalletButton component that loads lazily
  // This is the KEY optimization - removes 500KB+ from initial bundle

  // Theme handling (KEPT EXISTING - UNCHANGED)
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Scroll handling (KEPT EXISTING - UNCHANGED)
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ========== NEW FUNCTION: Handle login button click ==========
  // This triggers both wallet loading AND auth loading
  const handleLoginClick = () => {
    console.log('🔘 Login button clicked - loading auth and wallet');
    // Load the wallet button UI
    setShouldLoadWallet(true);
    // Also trigger auth provider to load Privy
    loadAuth();
  };

  // ========== NEW ENHANCEMENT 4: Preload wallet on hover/focus ==========
  // This ensures instant response when user clicks while keeping initial load fast
  const handleWalletPreload = () => {
    // Only preload if not already loaded
    if (!shouldLoadWallet && !isAuthReady) {
      setShouldLoadWallet(true);
      // Also preload auth on hover for faster response
      loadAuth();
    }
  }

  // Determine if we can show the wallet button
  // auth can be loaded either:
  // 1. Automatically (if page needs it, e.g., dashboard)
  // 2. Manually (user clicked login)
  const canShowWallet = isAuthReady || shouldLoadWallet;

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${
      scrolled 
        ? 'bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-300'
        : 'bg-surface dark:bg-dark-surface border-b border-transparent'
    }`}>
      <nav className="responsive-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo - UNCHANGED */}
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

          {/* Desktop Navigation - UNCHANGED */}
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
            {/* Theme Toggle - UNCHANGED */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-background dark:bg-dark-background hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-text dark:text-dark-text" />
              ) : (
                <Moon className="h-5 w-5 text-text dark:text-dark-text" />
              )}
            </button>

            {/* ========== UPDATED: Lazy loaded auth section with proper click handler ========== */}
            {/* Desktop Auth - loads only on interaction */}
            <div 
              className="hidden md:block"
              onMouseEnter={handleWalletPreload}   // Preload on hover for instant response
              onFocus={handleWalletPreload}        // Preload on focus for keyboard users
            >
              <Suspense fallback={<WalletButtonSkeleton />}>
                {canShowWallet ? (
                  <LazyWalletButton />
                ) : (
                  // Show a placeholder button that triggers loading on click
                  <button 
                    onClick={handleLoginClick}  // UPDATED: Use handleLoginClick
                    className="btn-primary px-6 py-3"
                  >
                    Login
                  </button>
                )}
              </Suspense>
            </div>

            {/* Mobile Menu Button - UNCHANGED */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-text dark:text-dark-text" />
              ) : (
                <Menu className="h-6 w-6 text-text dark:text-dark-text" />
              )}
            </button>
          </div>
        </div>

        {/* ========== Mobile Menu - UPDATED with lazy loading ========== */}
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
              
              {/* Mobile Auth Section - Also lazy loaded */}
              <div className="px-4 py-3 mt-4 border-t border-gray-100 dark:border-gray-300">
                <Suspense fallback={<MobileWalletButtonSkeleton />}>
                  {/* Load immediately on mobile menu open for better UX */}
                  <LazyWalletButton mobile />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}