// /components/auth/WalletButton.tsx - NEW FILE
// This contains ALL the Privy logic that was previously in Header
'use client'

import { useState, useRef, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { LogOut, User as UserIcon } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

// ========== COPIED EXACTLY from Header - KEPT ALL LOGIC ==========
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
  // ========== ALL EXISTING STATE and REFS from Header ==========
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user, authenticated, ready, logout, login } = usePrivy()
  const hasHandledPostLogin = useRef(false)
  const hasCheckedUser = useRef(false)

  // ========== EXISTING LOGIN HANDLER (UNCHANGED) ==========
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

  // ========== EXISTING LOGOUT HANDLER (UNCHANGED) ==========
  const handleLogout = async () => {
    setIsLoggingOut(true)
    
    const toastId = toast.loading('Logging out...')
    
    try {
      await logout()
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

  // ========== EXISTING POST-LOGIN REDIRECT LOGIC (UNCHANGED) ==========
  useEffect(() => {
    if (!ready || !authenticated || !user) return
    if (hasHandledPostLogin.current) return
    if (isPublicPage(pathname)) {
      console.log(`🔓 Public page detected (${pathname}), skipping redirect`)
      return
    }
    if (pathname === '/dashboard' || pathname === '/complete-profile') {
      console.log(`📍 Already on ${pathname}, skipping redirect`)
      hasHandledPostLogin.current = true
      return
    }
    
    console.log('🔐 User authenticated, checking status...')
    
    const checkUserAndRedirect = async () => {
      if (hasCheckedUser.current) return
      hasCheckedUser.current = true
      
      try {
        const walletAddress = user.wallet?.address
        
        if (!walletAddress) {
          console.log('⚠️ No wallet address, redirecting to complete-profile')
          hasHandledPostLogin.current = true
          router.push('/complete-profile')
          return
        }
        
        console.log('✅ Found wallet address:', walletAddress)
        
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
    
    const timer = setTimeout(checkUserAndRedirect, 500)
    return () => clearTimeout(timer)
  }, [ready, authenticated, user, router, pathname])

  // ========== EXISTING USER DISPLAY NAME (UNCHANGED) ==========
  const getUserDisplayName = () => {
    if (!user) return 'Guest'
    
    if (user.google?.name) return user.google.name
    if (user.twitter?.username) return `@${user.twitter.username}`
    if (user.email?.address) return user.email.address.split('@')[0]
    
    return 'User'
  }

  // ========== RENDER LOGIC - KEEPS ALL EXISTING UI ==========
  
  // Not authenticated - Show Login button
  if (!authenticated) {
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