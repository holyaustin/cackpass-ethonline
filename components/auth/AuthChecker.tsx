// /components/auth/AuthChecker.tsx - UPDATED WITH PAGE EXCLUSIONS
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { ProfileModal } from './ProfileModal'

// List of public pages that should NEVER redirect
const PUBLIC_PAGES = [
  '/',
  '/events',
  '/events/[id]',  // Dynamic route pattern
  '/about',
  '/privacy',
  '/terms',
  '/payment/success',
  '/payment/failed'
]

// Check if current path matches any public page pattern
const isPublicPage = (pathname: string): boolean => {
  // Exact matches
  if (PUBLIC_PAGES.includes(pathname)) return true
  
  // Check for dynamic event pages (e.g., /events/123)
  if (pathname.startsWith('/events/') && pathname !== '/events') {
    return true
  }
  
  // Add any other dynamic patterns here
  return false
}

export function AuthChecker() {
  const router = useRouter()
  const pathname = usePathname()
  const { authenticated, ready, getAccessToken, user } = usePrivy()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [authToken, setAuthToken] = useState<string>('')
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    // 🟢 CRITICAL FIX: Skip ALL checks on public pages
    if (isPublicPage(pathname)) {
      console.log(`🔓 Public page detected (${pathname}), skipping auth checks`)
      return
    }

    const checkAuthStatus = async () => {
      // Only run if Privy is ready and user is authenticated
      if (!ready || !authenticated) return
      
      console.log('🔐 AuthChecker: Checking auth on protected page:', pathname)
      setIsChecking(true)
      
      try {
        // Get token
        let tokenToUse = ''
        
        const possibleTokenKeys = [
          'privy:auth_token',
          'privy-token',
          'privy_token',
          `privy:token:${user?.id}`
        ]
        
        for (const key of possibleTokenKeys) {
          const token = localStorage.getItem(key) || sessionStorage.getItem(key)
          if (token) {
            console.log(`✅ Found token in storage with key: ${key}`)
            tokenToUse = token
            break
          }
        }
        
        if (!tokenToUse) {
          console.log('ℹ️ No token in storage, trying getAccessToken()...')
          const accessToken = await getAccessToken()
          if (accessToken) {
            console.log('✅ Got token via getAccessToken()')
            tokenToUse = accessToken
          }
        }
        
        if (!tokenToUse) {
          console.error('❌ No authentication token found')
          return
        }
        
        console.log('🔄 Calling /api/auth/user with token...')
        setAuthToken(tokenToUse)
        
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${tokenToUse}`,
          },
        })

        console.log(`📡 API Response Status: ${response.status}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 API Response Data:', data)
          
          if (data.needsProfileCompletion) {
            console.log('📝 User needs profile completion, showing modal')
            setShowProfileModal(true)
          } else {
            console.log('✅ Profile complete, staying on current page')
            // Don't redirect - just stay on current page
          }
        }
      } catch (error) {
        console.error('💥 Error checking auth:', error)
      } finally {
        setIsChecking(false)
      }
    }

    // Small delay to ensure Privy state is fully settled
    const timer = setTimeout(checkAuthStatus, 500)
    return () => clearTimeout(timer)
  }, [ready, authenticated, getAccessToken, user, pathname])

  const handleProfileComplete = () => {
    setShowProfileModal(false)
    // Don't redirect - just close modal
  }

  // Show loading only on protected pages
  if (isChecking && !isPublicPage(pathname)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking your account...</p>
          <p className="text-xs text-gray-500 mt-2">(Protected page: {pathname})</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {showProfileModal && authToken && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onComplete={handleProfileComplete}
        />
      )}
    </>
  )
}