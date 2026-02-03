// /app/complete-profile/page.tsx - UPDATED WITH EMAIL CHECK
'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { ProfileModal } from '@/components/auth/ProfileModal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

// Type guard for wallet accounts
function isWalletAccount(account: any): account is { type: 'wallet'; address: string; walletClientType?: string } {
  if (typeof account !== 'object' || account === null) return false
  if (account.type !== 'wallet') return false
  if (!('address' in account)) return false
  return typeof account.address === 'string'
}

// Type guard for embedded wallet (Privy wallet)
function isEmbeddedWallet(account: any): account is { type: 'wallet'; address: string; walletClientType: 'privy' } {
  if (!isWalletAccount(account)) return false
  if (!('walletClientType' in account)) return false
  return account.walletClientType === 'privy'
}

// Type guard for email accounts
function isEmailAccount(account: any): account is { type: 'email'; address: string } {
  if (typeof account !== 'object' || account === null) return false
  if (account.type !== 'email') return false
  if (!('address' in account)) return false
  return typeof account.address === 'string'
}

// Type guard for OAuth accounts
function isOAuthAccount(account: any): account is { type: 'oauth'; provider: string; email?: string; name?: string; username?: string } {
  if (typeof account !== 'object' || account === null) return false
  if (account.type !== 'oauth') return false
  return 'provider' in account
}

// Helper function to extract email from Privy user
function extractEmailFromPrivyUser(privyUser: any): string {
  const linkedAccounts = privyUser.linkedAccounts || []
  let email = ''
  
  console.log('📧 Checking Privy user for email:', {
    userId: privyUser.id,
    linkedAccountsCount: linkedAccounts.length
  })
  
  // 1. Check email linked accounts first
  for (const account of linkedAccounts) {
    if (isEmailAccount(account)) {
      email = account.address
      console.log('✅ Found email from email account:', email)
      break
    }
    
    if (isOAuthAccount(account) && account.email) {
      email = account.email
      console.log('✅ Found email from OAuth account:', email, 'provider:', account.provider)
      break
    }
  }
  
  // 2. Check for verified emails
  if (!email && privyUser.email) {
    if (typeof privyUser.email === 'object' && privyUser.email.address) {
      email = privyUser.email.address
      console.log('✅ Found email from email object:', email)
    } else if (typeof privyUser.email === 'string') {
      email = privyUser.email
      console.log('✅ Found email from string:', email)
    }
  }
  
  // 3. Check for any email in the user object
  if (!email && privyUser.emailAddresses && Array.isArray(privyUser.emailAddresses)) {
    const emailObj = privyUser.emailAddresses.find((e: any) => e && e.address)
    if (emailObj) {
      email = emailObj.address
      console.log('✅ Found email from emailAddresses:', email)
    }
  }
  
  if (!email) {
    console.log('❌ No email found in Privy user')
  }
  
  return email || ''
}

export default function CompleteProfilePage() {
  const { authenticated, ready, user } = usePrivy()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [needsEmail, setNeedsEmail] = useState<boolean>(false)

  // Function to extract wallet address from Privy user
  const extractWalletAddress = (user: any): string | null => {
    console.log('🔍 Extracting wallet from Privy user:', {
      hasDirectWallet: !!user?.wallet?.address,
      linkedAccountsCount: user?.linkedAccounts?.length || 0
    })
    
    // Check direct wallet object (for embedded wallets)
    if (user?.wallet?.address && typeof user.wallet.address === 'string') {
      console.log('✅ Found direct wallet address:', user.wallet.address)
      return user.wallet.address
    }
    
    // Check linked accounts
    const linkedAccounts = user?.linkedAccounts || []
    
    // First, try to find embedded wallet (Privy wallet)
    const embeddedWallet = linkedAccounts.find(isEmbeddedWallet)
    if (embeddedWallet) {
      console.log('✅ Found embedded wallet in linked accounts:', embeddedWallet.address)
      return embeddedWallet.address
    }
    
    // If no embedded wallet, try to find any wallet
    const anyWallet = linkedAccounts.find(isWalletAccount)
    if (anyWallet) {
      console.log('✅ Found wallet in linked accounts:', anyWallet.address)
      return anyWallet.address
    }
    
    console.log('❌ No wallet found in user object')
    return null
  }

  useEffect(() => {
    if (!ready) return

    if (!authenticated || !user) {
      console.log('⚠️ User not authenticated, redirecting to home')
      router.push('/')
      return
    }

    // Extract wallet address from user
    const extractedWallet = extractWalletAddress(user)
    
    if (!extractedWallet) {
      console.log('⚠️ No wallet found, redirecting to dashboard')
      router.push('/dashboard')
      return
    }

    console.log('✅ Wallet address found:', extractedWallet)
    setWalletAddress(extractedWallet)

    // Extract email from Privy user
    const email = extractEmailFromPrivyUser(user)
    setUserEmail(email)
    setNeedsEmail(!email)
    
    console.log('📧 Email status:', {
      hasEmail: !!email,
      email: email,
      needsEmail: !email
    })

    // Check if user already exists and has complete profile
    const checkUserStatus = async () => {
      try {
        const response = await fetch(`/api/auth/user?walletAddress=${extractedWallet}`)
        if (response.ok) {
          const data = await response.json()
          console.log('📊 User status by wallet:', {
            userExists: !!data.user,
            needsProfileCompletion: data.needsProfileCompletion,
            hasEmailInDB: !!data.user?.email
          })
          
          // If user already exists and profile is complete, go to dashboard
          if (data.user && !data.needsProfileCompletion) {
            console.log('✅ User profile already complete, redirecting to dashboard')
            router.push('/dashboard')
            return
          }
          
          // User needs profile completion, show the modal
          setShowModal(true)
        } else {
          // API call failed, still show the modal
          console.warn('⚠️ API check failed, showing profile modal anyway')
          setShowModal(true)
        }
      } catch (error) {
        console.error('Error checking user status:', error)
        setShowModal(true)
      } finally {
        setIsLoading(false)
      }
    }

    checkUserStatus()
  }, [ready, authenticated, user, router])

  const handleComplete = () => {
    console.log('✅ Profile completed, redirecting to dashboard')
    router.push('/dashboard')
  }

  const handleClose = () => {
    console.log('❌ Profile modal closed, redirecting to dashboard')
    router.push('/dashboard')
  }

  if (!ready || isLoading) {
    return <LoadingSpinner fullScreen text="Checking your profile..." />
  }

  if (!authenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        {showModal && walletAddress ? (
          <ProfileModal
            isOpen={showModal}
            onClose={handleClose}
            onComplete={handleComplete}
            initialEmail={userEmail}
            needsEmail={needsEmail}
          />
        ) : !walletAddress ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-3">No Wallet Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need an embedded wallet to complete your profile. 
              Please ensure you're logged in with a wallet-enabled account.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Preparing profile setup...</p>
          </div>
        )}
      </div>
    </div>
  )
}