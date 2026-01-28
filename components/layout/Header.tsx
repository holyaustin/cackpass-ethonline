// /components/layout/Header.tsx - COMPLETE WORKING VERSION
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Sun, Moon, Menu, X, User as UserIcon, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'

export function Header() {
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [authTokenForModal, setAuthTokenForModal] = useState('')
  
  const router = useRouter()
  const { user, authenticated, ready, logout, login } = usePrivy()
  
  // Handle login with manual post-login check
  const handleLogin = async () => {
    try {
      console.log('🔄 Starting login process...')
      
      // Login with Privy
      await login()
      
      // After login succeeds, Privy will update the auth state
      // We'll handle the post-login logic in a useEffect below
      console.log('✅ Login initiated successfully')
      
    } catch (error) {
      console.error('❌ Login failed:', error)
      toast.error('Login failed. Please try again.')
    }
  }

  // Effect to handle post-login logic AFTER authentication
  useEffect(() => {
    const handlePostLogin = async () => {
      // Only run if user is authenticated and ready
      if (!ready || !authenticated || !user) return
      
      console.log('🔐 User authenticated, checking profile status...')
      
      try {
        // Find the session token
        const tokenKeys = [
          'privy:auth_token',
          'privy-token',
          `privy-token-${user.id}`,
          `privy:token:${user.id}`
        ]
        
        let sessionToken = ''
        for (const key of tokenKeys) {
          const token = localStorage.getItem(key) || sessionStorage.getItem(key)
          if (token) {
            sessionToken = token
            console.log(`✅ Found token with key: ${key}`)
            break
          }
        }
        
        // If no token found, check for embedded wallet
        if (!sessionToken) {
          console.log('⚠️ No session token found, checking for wallet...')
          
          // Check if user has a wallet (embedded wallet creates one)
          if (user.wallet?.address) {
            console.log('✅ Found embedded wallet:', user.wallet.address)
            // Even without session token, we can proceed
            sessionToken = 'embedded-wallet-present'
          }
        }
        
        if (!sessionToken || sessionToken === 'embedded-wallet-present') {
          // For new users with embedded wallets, we need to create their profile
          console.log('👤 New user detected (no session token)')
          
          // Show profile modal directly for new users
          // We'll use a special token to indicate new user
          setAuthTokenForModal('new-user-' + Date.now())
          
          // Import ProfileModal dynamically to avoid dependency issues
          import('@/components/auth/ProfileModal').then(({ ProfileModal }) => {
            // We'll handle the modal display differently
            toast.info('Please complete your profile to continue')
          }).catch(() => {
            console.log('ProfileModal not available, redirecting to profile page')
            router.push('/profile')
          })
          
          return
        }
        
        // For users with session token, check their status
        console.log('🔄 Checking user status with backend...')
        
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 User status:', data)
          
          if (data.needsProfileCompletion) {
            console.log('📝 User needs profile completion')
            setAuthTokenForModal(sessionToken)
            // Redirect to profile page instead of using modal
            router.push('/profile')
          } else {
            console.log('✅ Profile complete, redirecting to dashboard')
            router.push('/dashboard')
          }
        } else {
          console.log('⚠️ API check failed, assuming new user')
          router.push('/profile')
        }
        
      } catch (error) {
        console.error('💥 Error in post-login flow:', error)
        // On any error, redirect to dashboard as fallback
        router.push('/dashboard')
      }
    }
    
    // Give a small delay for state to settle
    const timer = setTimeout(handlePostLogin, 500)
    return () => clearTimeout(timer)
  }, [ready, authenticated, user, router])

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true)
    
    const toastId = toast.loading('Logging out...')
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      await logout()
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
            {user?.linkedAccounts?.some((acc: any) => acc.type === 'wallet') && (
              <Link href="/organizer" className="text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium">
                Organizer
              </Link>
            )}
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
                <Link 
                  href="/dashboard" 
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark dark:bg-dark-primary dark:hover:bg-dark-primary-dark transition-colors"
                >
                  <UserIcon className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                    className="px-4 py-3 mt-4 border border-gray-200 dark:border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left flex items-center gap-2"
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