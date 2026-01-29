// /hooks/useWalletAuth.ts - FIXED VERSION
'use client'

import { useState, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'

interface UserData {
  id: string
  privyId: string
  walletAddress: string
  email?: string
  firstName?: string
  lastName?: string
  loginMethod: string
  username: string
  isOrganizer: boolean
  country: string
  phoneNumber: string
  isProfileComplete: boolean
  admin: boolean
  createdAt: string
  updatedAt: string
}

interface ApiResponse {
  success: boolean
  user: UserData
  needsProfileCompletion: boolean
  isNewUser: boolean
  message?: string
  error?: string
}

// Type for Privy email account
interface PrivyEmailAccount {
  type: 'email'
  address: string
  verifiedAt?: string
}

// Type for Privy OAuth account
interface PrivyOAuthAccount {
  type: 'google_oauth' | 'twitter_oauth' | 'discord_oauth' | 'github_oauth' | 'apple_oauth' | 'linkedin_oauth' | 'microsoft_oauth' | 'spotify_oauth'
  email?: string
  name?: string
  username?: string
  subject?: string
}

// Type for Privy wallet account
interface PrivyWalletAccount {
  type: 'wallet' | 'smart_wallet'
  address: string
  chainType: 'ethereum' | string
  walletClientType?: string
}

// Union type for all possible linked accounts
type PrivyLinkedAccount = PrivyEmailAccount | PrivyOAuthAccount | PrivyWalletAccount;

export function useWalletAuth() {
  const { user, authenticated, ready } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Helper to get wallet address from Privy user
  const getWalletAddress = useCallback(() => {
    if (!user) return null
    
    console.log('🔍 Checking Privy user for wallet:', {
      userId: user.id,
      hasWallet: !!user.wallet,
      linkedAccountsCount: user.linkedAccounts?.length || 0,
    })
    
    // Method 1: Check direct wallet object
    if (user.wallet?.address && typeof user.wallet.address === 'string') {
      console.log('✅ Found direct wallet address:', user.wallet.address)
      return user.wallet.address
    }
    
    // Method 2: Check linked accounts
    const linkedAccounts = user.linkedAccounts || []
    
    for (const account of linkedAccounts as PrivyLinkedAccount[]) {
      // Check if it's a wallet account
      if ((account.type === 'wallet' || account.type === 'smart_wallet')) {
        const walletAccount = account as PrivyWalletAccount
        if (walletAccount.address) {
          console.log('✅ Found wallet in linked accounts:', walletAccount.address)
          return walletAccount.address
        }
      }
    }
    
    console.log('❌ No wallet found in user object')
    return null
  }, [user])

  // Helper to get email from Privy user
  const getEmailFromPrivy = useCallback(() => {
    if (!user) return ''
    
    console.log('🔍 Checking Privy user for email:', {
      userId: user.id,
      linkedAccountsCount: user.linkedAccounts?.length || 0,
    })
    
    // Method 1: Check linked accounts
    const linkedAccounts = user.linkedAccounts || []
    
    for (const account of linkedAccounts as PrivyLinkedAccount[]) {
      // Email account
      if (account.type === 'email') {
        const emailAccount = account as PrivyEmailAccount
        if (emailAccount.address) {
          console.log('✅ Found email in email account:', emailAccount.address)
          return emailAccount.address
        }
      }
      
      // OAuth account with email (Google, etc.)
      if (account.type === 'google_oauth' || 
          account.type === 'apple_oauth' || 
          account.type === 'microsoft_oauth' ||
          account.type === 'linkedin_oauth') {
        const oauthAccount = account as PrivyOAuthAccount
        if (oauthAccount.email) {
          console.log(`✅ Found email in ${account.type} account:`, oauthAccount.email)
          return oauthAccount.email
        }
      }
      
      // Twitter OAuth (rarely has email)
      if (account.type === 'twitter_oauth') {
        const twitterAccount = account as PrivyOAuthAccount
        if (twitterAccount.email) {
          console.log('✅ Found email in Twitter OAuth account:', twitterAccount.email)
          return twitterAccount.email
        }
      }
    }
    
    // Method 2: Check email object directly
    if (user.email) {
      // Email can be string or object
      if (typeof user.email === 'string') {
        console.log('✅ Found email as string:', user.email)
        return user.email
      }
      
      // Email as object with address property
      if (typeof user.email === 'object' && (user.email as any).address) {
        console.log('✅ Found email in email object:', (user.email as any).address)
        return (user.email as any).address
      }
    }
    
    // Method 3: Check for email in user info
    if (user.google?.email) {
      console.log('✅ Found email in google object:', user.google.email)
      return user.google.email
    }
    
    if (user.apple?.email) {
      console.log('✅ Found email in apple object:', user.apple.email)
      return user.apple.email
    }
    
    // Method 4: Check for any email field in the user object
    // This is a fallback to check for any email property at any level
    const findEmailInObject = (obj: any, depth = 0): string => {
      if (depth > 3) return '' // Prevent infinite recursion
      
      if (!obj || typeof obj !== 'object') return ''
      
      // Check if this object has an email property
      if (obj.email && typeof obj.email === 'string') {
        return obj.email
      }
      
      if (obj.address && typeof obj.address === 'string' && obj.address.includes('@')) {
        return obj.address
      }
      
      // Recursively check nested objects
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          const found = findEmailInObject(obj[key], depth + 1)
          if (found) return found
        }
      }
      
      return ''
    }
    
    const foundEmail = findEmailInObject(user)
    if (foundEmail) {
      console.log('✅ Found email in user object:', foundEmail)
      return foundEmail
    }
    
    console.log('❌ No email found in Privy user')
    return ''
  }, [user])

  const getUserByWallet = useCallback(async (): Promise<ApiResponse | null> => {
    const walletAddress = getWalletAddress()
    
    if (!ready || !authenticated || !walletAddress) {
      setError('No wallet address available')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`)
      const data = await response.json() as ApiResponse

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to get user')
      }

      setUserData(data.user)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user'
      setError(errorMessage)
      console.error('Error getting user by wallet:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [ready, authenticated, getWalletAddress])

  const updateProfileByWallet = useCallback(async (profileData: {
    isOrganizer: boolean
    country: string
    phoneNumber: string
    email?: string
    firstName?: string
    lastName?: string
  }): Promise<ApiResponse> => {
    const walletAddress = getWalletAddress()
    
    if (!ready || !authenticated || !walletAddress) {
      throw new Error('No wallet address available')
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get email from Privy if not provided in profileData
      let finalProfileData = { ...profileData }
      
      if (!finalProfileData.email) {
        const emailFromPrivy = getEmailFromPrivy()
        if (emailFromPrivy) {
          finalProfileData.email = emailFromPrivy
          console.log('📧 Using email from Privy:', emailFromPrivy)
        } else {
          console.log('⚠️ No email provided and none found in Privy')
        }
      }

      console.log('📤 Sending profile update with data:', {
        ...finalProfileData,
        phoneNumber: finalProfileData.phoneNumber ? finalProfileData.phoneNumber.substring(0, 10) + '...' : ''
      })

      const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalProfileData),
      })

      const data = await response.json() as ApiResponse

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to update profile')
      }

      setUserData(data.user)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      console.error('Error updating profile by wallet:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [ready, authenticated, getWalletAddress, getEmailFromPrivy])

  return {
    walletAddress: getWalletAddress(),
    email: getEmailFromPrivy(),
    authenticated,
    ready,
    userData,
    isLoading,
    error,
    getUserByWallet,
    updateProfileByWallet,
    getEmailFromPrivy,
  }
}