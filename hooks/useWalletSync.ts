// /hooks/useWalletSync.ts
'use client'

import { useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'

export function useWalletSync() {
  const { authenticated, ready, user } = usePrivy()

  useEffect(() => {
    const syncWallet = async () => {
      if (!ready || !authenticated) return
      
      try {
        // Get auth token
        const token = localStorage.getItem('privy:auth_token') || 
                      localStorage.getItem('privy-token')
        
        if (!token) return
        
        // Call sync endpoint
        const response = await fetch('/api/auth/user', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          console.log('Wallet synced successfully')
        }
      } catch (error) {
        console.error('Error syncing wallet:', error)
      }
    }

    // Sync wallet when user authenticates
    if (authenticated) {
      syncWallet()
    }
  }, [ready, authenticated, user])
}