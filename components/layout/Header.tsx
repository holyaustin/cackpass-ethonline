// /components/layout/Header.tsx - FIXED VERSION
'use client'

import { useState, useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Sun, Moon, Menu, X, User as UserIcon, LogOut } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'

// Public pages that should NOT trigger auth checks
const PUBLIC_PAGES = [
  '/',
  '/events',
  '/about',
  '/privacy',
  '/terms',
  '/payment/success',
  '/payment/failed',
  '/complete-profile', // IMPORTANT: Add this to prevent redirect loop
]

// Check if current path is public
const isPublicPage = (pathname: string): boolean => {
  // Exact matches
  if (PUBLIC_PAGES.includes(pathname)) return true
  
  // Check for dynamic event pages (e.g., /events/123, /events/abc-123)
  if (pathname.startsWith('/events/') && pathname !== '/events') {
    return true
  }
  
  return false
}

export function Header() {
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const { user, authenticated, ready, logout, login } = usePrivy()
  
  // IMPORTANT: Track if we've already handled post-login redirect
  const hasHandledPostLogin = useRef(false)
  // Track if user was already checked
  const hasCheckedUser = useRef(false)

  // Handle login
  const handleLogin = async () => {
    try {
      console.log('🔄 Starting login process...')
      await login()
      console.log('✅ Login initiated successfully')
    } catch (error) {
      console.error('❌ Login failed:', error)
      toast.error('Login failed. Please try again.')
    }
  }

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true)
    
    const toastId = toast.loading('Logging out...')
    
    try {
      await logout()
      // Reset the refs on logout
      hasHandledPostLogin.current = false
      hasCheckedUser.current = false
      toast.dismiss(toastId)
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
      toast.dismiss(toastId)
      toast.error('Logout failed. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  // IMPORTANT: Only run post-login redirect ONCE after authentication
  useEffect(() => {
    // Don't run if not ready or not authenticated
    if (!ready || !authenticated || !user) return
    
    // Don't run if we already handled post-login
    if (hasHandledPostLogin.current) return
    
    // Skip redirect on public pages
    if (isPublicPage(pathname)) {
      console.log(`🔓 Public page detected (${pathname}), skipping redirect`)
      return
    }
    
    // Skip if already on dashboard or complete-profile
    if (pathname === '/dashboard' || pathname === '/complete-profile') {
      console.log(`📍 Already on ${pathname}, skipping redirect`)
      hasHandledPostLogin.current = true
      return
    }
    
    console.log('🔐 User authenticated, checking status...')
    
    const checkUserAndRedirect = async () => {
      // Prevent multiple simultaneous checks
      if (hasCheckedUser.current) return
      hasCheckedUser.current = true
      
      try {
        // Get wallet address
        const walletAddress = user.wallet?.address
        
        if (!walletAddress) {
          console.log('⚠️ No wallet address, redirecting to complete-profile')
          hasHandledPostLogin.current = true
          router.push('/complete-profile')
          return
        }
        
        console.log('✅ Found wallet address:', walletAddress)
        
        // Check user status
        const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 User status:', data)
          
          if (data.needsProfileCompletion || !data.user?.isProfileComplete) {
            console.log('📝 Profile incomplete, redirecting to complete-profile')
            hasHandledPostLogin.current = true
            router.push('/complete-profile')
          } else {
            console.log('✅ Profile complete, redirecting to dashboard')
            hasHandledPostLogin.current = true
            router.push('/dashboard')
          }
        } else {
          console.log('⚠️ API check failed, redirecting to complete-profile')
          hasHandledPostLogin.current = true
          router.push('/complete-profile')
        }
        
      } catch (error) {
        console.error('💥 Error in post-login flow:', error)
        hasHandledPostLogin.current = true
        router.push('/complete-profile')
      }
    }
    
    // Add small delay to ensure everything is loaded
    const timer = setTimeout(checkUserAndRedirect, 500)
    return () => clearTimeout(timer)
  }, [ready, authenticated, user, router, pathname])

  // Reset the handled flag when user logs out (handled in logout function)

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
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Guest'
    
    if (user.google?.name) return user.google.name
    if (user.twitter?.username) return `@${user.twitter.username}`
    if (user.email?.address) return user.email.address.split('@')[0]
    
    return 'User'
  }

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
              {darkMode ? (
                <Sun className="h-5 w-5 text-text dark:text-dark-text" />
              ) : (
                <Moon className="h-5 w-5 text-text dark:text-dark-text" />
              )}
            </button>

            {/* Auth Section */}
            {authenticated ? (
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-xs text-text-light dark:text-dark-secondary">
                    Welcome back
                  </div>
                  <div className="text-sm font-medium text-text dark:text-dark-text">
                    {getUserDisplayName()}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2 border border-primary dark:border-primary text-gray-700 dark:text-primary rounded-xl hover:bg-gray-50 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      Logout
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="btn-primary px-6 py-3"
                disabled={!ready}
              >
                {!ready ? 'Loading...' : 'Login'}
              </button>
            )}

            {/* Mobile Menu Button */}
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
              
              {authenticated ? (
                <>
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-300 mt-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Signed in as
                    </div>
                    <div className="font-medium text-text dark:text-dark-text">
                      {getUserDisplayName()}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-4 py-3 mt-4 border border-gray-900 dark:border-gray-900 text-gray-900 dark:text-gray-900 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left flex items-center gap-2"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Logging out...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4" />
                        Logout
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    handleLogin()
                    setMobileMenuOpen(false)
                  }}
                  className="btn-primary px-4 py-3 mt-4"
                  disabled={!ready}
                >
                  {!ready ? 'Loading...' : 'Login'}
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}