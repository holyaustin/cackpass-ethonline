// components/wallet/ConnectButton.tsx
'use client'

import { usePrivy } from '@privy-io/react-auth'
import { User, LogOut, Copy, ExternalLink, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ConnectButton() {
  const { login, logout, authenticated, user, ready } = usePrivy()
  const [balance, setBalance] = useState<string>('0.00')
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState<string>('')

  useEffect(() => {
    if (authenticated && ready) {
      initializeUser()
    }
  }, [authenticated, ready])

  const initializeUser = async () => {
    try {
      // In a real app, you would fetch user's embedded wallet address
      // For now, we'll use a mock address
      const mockAddress = '0x' + Array(40).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')
      
      setAddress(mockAddress)
      await fetchBalance()
    } catch (error) {
      console.error('Error initializing user:', error)
    }
  }

  const fetchBalance = async () => {
    setIsLoading(true)
    try {
      // Mock balance - replace with actual API call
      setBalance('1,250.00')
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance('0.00')
    } finally {
      setIsLoading(false)
    }
  }

  const copyAddress = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    alert('Address copied to clipboard!')
  }

  if (!ready) {
    return (
      <div className="px-4 py-2 bg-background dark:bg-dark-background rounded-xl">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-primary dark:border-dark-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="btn-primary flex items-center gap-2 px-4 py-2 md:px-6 md:py-3"
      >
        <User className="h-4 w-4 md:h-5 md:w-5" />
        <span className="text-sm md:text-base">Login</span>
      </button>
    )
  }

  const truncatedAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'No wallet'

  return (
    <div className="relative group">
      <button className="px-3 py-2 md:px-4 md:py-2 bg-surface dark:bg-dark-surface rounded-xl flex items-center gap-2 hover:shadow-sm transition-all">
        <User className="h-4 w-4 md:h-5 md:w-5 text-primary dark:text-dark-primary" />
        <div className="text-left hidden md:block">
          <div className="font-medium text-xs md:text-sm">{isLoading ? '...' : `$${balance}`}</div>
          <div className="text-text-light dark:text-dark-secondary text-xs truncate max-w-[80px]">
            {truncatedAddress}
          </div>
        </div>
      </button>

      <div className="absolute right-0 mt-2 w-64 bg-surface dark:bg-dark-surface rounded-xl shadow-lg border border-gray-100 dark:border-gray-300 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
        <div className="p-4">
          {/* Wallet Info */}
          <div className="mb-4">
            <div className="text-xs text-text-light dark:text-dark-secondary mb-1">
              Digital Wallet
            </div>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono truncate">
                {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Not connected'}
              </code>
              <div className="flex gap-1">
                <button
                  onClick={copyAddress}
                  className="p-1 hover:bg-background dark:hover:bg-dark-background rounded"
                  title="Copy address"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => window.open(`https://sepolia-blockscout.lisk.com/address/${address}`, '_blank')}
              className="w-full text-left px-3 py-2 hover:bg-background dark:hover:bg-dark-background rounded flex items-center gap-2 text-sm"
            >
              <ExternalLink className="h-3 w-3" />
              View Details
            </button>
            
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 hover:bg-background dark:hover:bg-dark-background rounded flex items-center gap-2 text-sm text-red-500"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}