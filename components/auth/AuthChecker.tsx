// /components/auth/AuthChecker.tsx - UPDATED
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { ProfileModal } from './ProfileModal'

export function AuthChecker() {
  const router = useRouter()
  const { authenticated, ready, getAccessToken, user } = usePrivy()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [authToken, setAuthToken] = useState<string>('')
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const checkAuthStatus = async () => {
      // Only run if Privy is ready and user is authenticated
      if (!ready || !authenticated) return
      
      console.log('🔐 AuthChecker: User is authenticated via Privy')
      setIsChecking(true)
      
      try {
        // METHOD 1: Try to get the session token directly from the user object
        let tokenToUse = ''
        
        // Privy often stores the raw JWT in the user's session context
        // Check localStorage/sessionStorage where Privy might put it
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
        
        // METHOD 2: If no token in storage, try getAccessToken()
        if (!tokenToUse) {
          console.log('ℹ️ No token in storage, trying getAccessToken()...')
          const accessToken = await getAccessToken()
          if (accessToken) {
            console.log('✅ Got token via getAccessToken()')
            tokenToUse = accessToken
          }
        }
        
        // If we still don't have a token, something is wrong
        if (!tokenToUse) {
          console.error('❌ No authentication token found')
          return
        }
        
        console.log('🔄 Calling /api/auth/user with token...')
        setAuthToken(tokenToUse)
        
        // Make the API call to check user status
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
            console.log('✅ Profile complete, redirecting to dashboard')
            router.push('/dashboard')
          }
        } else {
          // Log detailed error info
          const errorText = await response.text()
          console.error('❌ API Error Response:', errorText)
          
          // Try to parse as JSON if possible
          try {
            const errorData = JSON.parse(errorText)
            console.error('❌ Parsed Error:', errorData)
          } catch {
            console.error('❌ Raw Error Text:', errorText)
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
  }, [ready, authenticated, getAccessToken, user, router])

  const handleProfileComplete = () => {
    setShowProfileModal(false)
    router.push('/dashboard')
  }

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking your account...</p>
          <p className="text-xs text-gray-500 mt-2">(Check browser console for details)</p>
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
          authToken={authToken}
        />
      )}
    </>
  )
}