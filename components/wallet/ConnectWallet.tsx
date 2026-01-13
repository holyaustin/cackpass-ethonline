// components/wallet/ConnectWallet.tsx
'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { Wallet, LogOut, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'

export function ConnectWallet() {
  const { login, logout, authenticated, user, ready } = usePrivy()
  const { wallets } = useWallets()
  const [balance, setBalance] = useState<string>('0.00')
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState<string>('')

  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')

  useEffect(() => {
    if (embeddedWallet && ready) {
      initializeWallet()
    }
  }, [embeddedWallet, ready])

  const initializeWallet = async () => {
    try {
      if (!embeddedWallet) return
      
      // Get address from wallet
      const walletAddress = embeddedWallet.address
      setAddress(walletAddress || '')
      
      // Fetch balance
      await fetchBalance()
    } catch (error) {
      console.error('Error initializing wallet:', error)
    }
  }

  const fetchBalance = async () => {
    if (!embeddedWallet || !address) return
    
    try {
      setIsLoading(true)
      
      // For demo purposes, return a mock balance
      // In production, you would fetch actual balance
      setBalance('0.85')
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
      <div className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark flex items-center gap-2 transition-all"
      >
        <Wallet className="h-5 w-5" />
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="relative group">
      <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <Wallet className="h-5 w-5 text-primary" />
        <div className="text-left">
          <div className="font-medium text-sm">{isLoading ? '...' : `${balance} ETH`}</div>
          <div className="text-xs text-gray-500 truncate max-w-[120px]">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No wallet'}
          </div>
        </div>
      </button>

      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
        <div className="p-4">
          {/* Wallet Info */}
          <div className="mb-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Wallet Address
            </div>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono truncate">
                {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Not connected'}
              </code>
              <div className="flex gap-1">
                <button
                  onClick={copyAddress}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Copy address"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={fetchBalance}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Refresh balance"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => window.open(`https://sepolia-blockscout.lisk.com/address/${address}`, '_blank')}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              View on Explorer
            </button>
            
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-sm text-red-500"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}