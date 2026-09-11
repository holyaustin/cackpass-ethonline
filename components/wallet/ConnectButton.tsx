'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { User, LogOut, Copy, ExternalLink, Wallet, Loader2 } from 'lucide-react'
import { getWalletAddress } from '@/lib/auth/token'
import { toast } from 'sonner'

interface ConnectButtonProps {
  className?: string
}

export function ConnectButton({ className = '' }: ConnectButtonProps) {
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
      // Get wallet address from Privy user or local storage
      const walletAddress = user?.wallet?.address || getWalletAddress()
      
      if (walletAddress) {
        setAddress(walletAddress)
        
        // Store wallet address for future use
        if (user?.wallet?.address) {
          localStorage.setItem('privy:embedded_wallet', JSON.stringify({
            address: user.wallet.address,
            createdAt: new Date().toISOString()
          }))
        }
      }
      
      await fetchBalance()
    } catch (error) {
      console.error('Error initializing user:', error)
      toast.error('Failed to initialize wallet')
    }
  }

  const fetchBalance = async () => {
    setIsLoading(true)
    try {
      // In a real app, fetch from your backend API
      const mockBalance = '1,250.00'
      setBalance(mockBalance)
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance('0.00')
      toast.error('Failed to fetch balance')
    } finally {
      setIsLoading(false)
    }
  }

  const copyAddress = async () => {
    if (!address) {
      toast.error('No wallet address found')
      return
    }
    
    try {
      await navigator.clipboard.writeText(address)
      toast.success('Address copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy address:', error)
      toast.error('Failed to copy address')
    }
  }

  const viewOnExplorer = () => {
    if (!address) return
    window.open(`https://testnet.arcscan.app/address/${address}`, '_blank')
  }

  if (!ready) {
    return (
      <div className={`px-4 py-2 bg-accent dark:bg-dark-background rounded-xl ${className}`}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-text-light">Loading...</span>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <button
        onClick={() => login()}
        className={`btn-primary flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 ${className}`}
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
      <button className={`px-3 py-2 md:px-4 md:py-2 bg-surface dark:bg-dark-surface rounded-xl flex items-center gap-2 hover:shadow-sm transition-all ${className}`}>
        <User className="h-4 w-4 md:h-5 md:w-5 text-primary dark:text-dark-primary" />
        <div className="text-left hidden md:block">
          <div className="font-medium text-xs md:text-sm">
            {isLoading ? (
              <div className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                ...
              </div>
            ) : (
              `$${balance}`
            )}
          </div>
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
              <code className="text-xs font-mono truncate flex-1 mr-2">
                {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Not connected'}
              </code>
              <div className="flex gap-1">
                <button
                  onClick={copyAddress}
                  className="p-1 hover:bg-background dark:hover:bg-dark-background rounded transition-colors"
                  title="Copy address"
                  disabled={!address}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={viewOnExplorer}
              className="w-full text-left px-3 py-2 hover:bg-background dark:hover:bg-dark-background rounded flex items-center gap-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!address}
            >
              <ExternalLink className="h-3 w-3" />
              View Details
            </button>
            
            <button
              onClick={() => {
                logout()
                toast.success('Logged out successfully')
              }}
              className="w-full text-left px-3 py-2 hover:bg-background dark:hover:bg-dark-background rounded flex items-center gap-2 text-sm text-red-500 transition-colors"
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