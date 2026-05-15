// /components/auth/WalletButton.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { LogOut } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

const PUBLIC_PAGES = [
  '/',
  '/events',
  '/about',
  '/privacy',
  '/terms',
  '/payment/success',
  '/payment/failed',
  '/complete-profile',
]

const isPublicPage = (pathname: string): boolean => {
  if (PUBLIC_PAGES.includes(pathname)) return true
  if (pathname.startsWith('/events/') && pathname !== '/events') return true
  return false
}

interface WalletButtonProps {
  mobile?: boolean
}

export function WalletButton({ mobile = false }: WalletButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user, authenticated, ready, logout, login } = usePrivy()
  const hasHandledPostLogin = useRef(false)
  const isLoggingOutRef = useRef(false) // Track logout state
  
  console.log(`🏗️ [WalletButton] Rendering: mobile=${mobile}, authenticated=${authenticated}, ready=${ready}, hasUser=${!!user}, pathname=${pathname}`);

  const handleLogin = async () => {
    console.log('🔄 [WalletButton] handleLogin called');
    try {
      console.log('🚀 [WalletButton] Calling login()...');
      await login()
      console.log('✅ [WalletButton] Login initiated successfully')
    } catch (error) {
      console.error('❌ [WalletButton] Login failed:', error)
      toast.error('Login failed. Please try again.')
    }
  }

  const handleLogout = async () => {
    console.log('🔄 [WalletButton] handleLogout called');
    setIsLoggingOut(true)
    isLoggingOutRef.current = true // Set logout flag
    const toastId = toast.loading('Logging out...')
    
    try {
      await logout()
      hasHandledPostLogin.current = false
      toast.dismiss(toastId)
      toast.success('Logged out successfully')
      
      // Navigate to home page
      console.log('🏠 [WalletButton] Redirecting to home page after logout');
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
      toast.dismiss(toastId)
      toast.error('Logout failed. Please try again.')
      isLoggingOutRef.current = false // Reset flag on error
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Reset flags when authentication state changes
  useEffect(() => {
    if (!authenticated) {
      console.log('🔓 [WalletButton] User not authenticated, resetting flags');
      hasHandledPostLogin.current = false;
      // Reset logout flag after a brief delay to ensure navigation completes
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    }
  }, [authenticated]);

  // Post-login redirect logic - SINGLE SOURCE OF TRUTH
  useEffect(() => {
    console.log(`🔄 [WalletButton] Post-login effect: ready=${ready}, authenticated=${authenticated}, hasUser=${!!user}, hasHandled=${hasHandledPostLogin.current}, isLoggingOut=${isLoggingOutRef.current}, pathname=${pathname}`);
    
    // CRITICAL: Don't redirect if we're in the process of logging out
    if (isLoggingOutRef.current) {
      console.log(`🚫 [WalletButton] Logout in progress, skipping redirect logic`);
      return;
    }

    // Must be ready, authenticated, and have user
    if (!ready || !authenticated || !user) {
      console.log(`⏭️ [WalletButton] Skipping - not ready/authenticated/user`);
      return;
    }

    // Already handled
    if (hasHandledPostLogin.current) {
      console.log(`⏭️ [WalletButton] Already handled post-login`);
      return;
    }

    // If we're already on dashboard or complete-profile, don't redirect
    if (pathname === '/dashboard' || pathname === '/complete-profile') {
      console.log(`📍 [WalletButton] Already on ${pathname}, marking as handled`);
      hasHandledPostLogin.current = true;
      return;
    }

    // If we're on a public page and there are no OAuth params, don't redirect
    const hasOAuthParams = typeof window !== 'undefined' && 
      (new URLSearchParams(window.location.search).has('privy_oauth_code') ||
       new URLSearchParams(window.location.search).has('privy_oauth_state'));
    
    if (isPublicPage(pathname) && !hasOAuthParams) {
      console.log(`🔓 [WalletButton] On public page without OAuth, skipping redirect`);
      return;
    }
    
    console.log('🔐 [WalletButton] Processing post-login redirect...');
    hasHandledPostLogin.current = true;
    
    const performRedirect = async () => {
      try {
        // Clean OAuth params from URL first
        if (hasOAuthParams && typeof window !== 'undefined') {
          console.log('🧹 [WalletButton] Cleaning OAuth params from URL');
          window.history.replaceState({}, '', window.location.pathname);
        }

        const walletAddress = user.wallet?.address
        console.log(`👛 [WalletButton] Wallet address: ${walletAddress || 'none'}`);
        
        if (!walletAddress) {
          console.log('🏠 [WalletButton] No wallet, redirecting to /complete-profile');
          router.push('/complete-profile')
          return
        }
        
        console.log(`🌐 [WalletButton] Fetching /api/auth/user?walletAddress=${walletAddress}`);
        const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`)
        console.log(`📊 [WalletButton] API response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json()
          console.log(`📝 [WalletButton] User data:`, data);
          
          if (data.needsProfileCompletion || !data.user?.isProfileComplete) {
            console.log('📝 [WalletButton] Profile incomplete, redirecting to /complete-profile');
            router.push('/complete-profile')
          } else {
            console.log('✅ [WalletButton] Profile complete, redirecting to /dashboard');
            router.push('/dashboard')
          }
        } else {
          console.log('⚠️ [WalletButton] API failed, redirecting to /complete-profile');
          router.push('/complete-profile')
        }
      } catch (error) {
        console.error('💥 [WalletButton] Redirect error:', error);
        router.push('/complete-profile')
      }
    }
    
    performRedirect()
  }, [ready, authenticated, user, router, pathname])

  const getUserDisplayName = () => {
    if (!user) return 'Guest'
    if (user.google?.name) return user.google.name
    if (user.twitter?.username) return `@${user.twitter.username}`
    if (user.email?.address) return user.email.address.split('@')[0]
    return 'User'
  }

  // Not authenticated - Show Login button
  if (!authenticated) {
    console.log(`🔓 [WalletButton] Not authenticated, showing login button (mobile=${mobile})`);
    if (mobile) {
      return (
        <button
          onClick={handleLogin}
          className="btn-primary w-full py-3"
          disabled={!ready}
        >
          {!ready ? 'Loading...' : 'Login'}
        </button>
      )
    }
    
    return (
      <button
        onClick={handleLogin}
        className="btn-primary px-6 py-3"
        disabled={!ready}
      >
        {!ready ? 'Loading...' : 'Login'}
      </button>
    )
  }

  // Authenticated - Show user info and logout button
  console.log(`✅ [WalletButton] Authenticated, showing user info (mobile=${mobile})`);
  if (mobile) {
    return (
      <div className="space-y-3">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          Signed in as
        </div>
        <div className="font-medium text-text dark:text-dark-text mb-4">
          {getUserDisplayName()}
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full px-4 py-3 border border-gray-900 dark:border-gray-900 text-gray-900 dark:text-gray-900 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
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
    )
  }

  // Desktop authenticated view
  return (
    <div className="flex items-center space-x-3">
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
  )
}