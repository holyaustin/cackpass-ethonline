// /hooks/useWalletAuth.ts - USING PROPER PRIVY TYPES
'use client'

import { useState, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import type { LinkedAccountWithMetadata } from '@privy-io/react-auth'

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
}

// Type guard for wallet accounts using Privy's type
function isWalletAccount(account: LinkedAccountWithMetadata): account is 
  LinkedAccountWithMetadata & { type: 'wallet'; address: string; walletClientType?: string } {
  return account.type === 'wallet' && 'address' in account && typeof account.address === 'string'
}

// Type guard for embedded wallet (Privy wallet)
function isEmbeddedWallet(account: LinkedAccountWithMetadata): account is 
  LinkedAccountWithMetadata & { type: 'wallet'; address: string; walletClientType: 'privy' } {
  return isWalletAccount(account) && account.walletClientType === 'privy'
}

export function useWalletAuth() {
  const { user, authenticated, ready } = usePrivy()
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Helper to get wallet address from Privy user
  const getWalletAddress = useCallback(() => {
    if (!user) return null
    
    console.log('🔍 Checking Privy user for wallet:', {
      hasDirectWallet: !!user.wallet?.address,
      linkedAccountsCount: user.linkedAccounts?.length || 0,
    })
    
    // Check direct wallet object (for embedded wallets)
    if (user.wallet?.address && typeof user.wallet.address === 'string') {
      console.log('✅ Found direct wallet address:', user.wallet.address)
      return user.wallet.address
    }
    
    // Check linked accounts for embedded wallet
    const linkedAccounts = user.linkedAccounts || []
    
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
      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get user')
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
      const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile')
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
  }, [ready, authenticated, getWalletAddress])

  return {
    walletAddress: getWalletAddress(),
    authenticated,
    ready,
    userData,
    isLoading,
    error,
    getUserByWallet,
    updateProfileByWallet,
  }
}