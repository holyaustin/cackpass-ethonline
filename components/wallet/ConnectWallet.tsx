// components/wallet/ConnectWallet.tsx
'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { Wallet, LogOut, Copy, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'

export function ConnectWallet() {
  const { login, logout, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const [balance, setBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)

  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')

  useEffect(() => {
    if (embeddedWallet) {
      fetchBalance()
    }
  }, [embeddedWallet])

  const fetchBalance = async () => {
    if (!embeddedWallet) return
    
    try {
      const provider = await embeddedWallet.getEthersProvider()
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const balanceWei = await provider.getBalance(address)
      const balanceEth = ethers.formatEther(balanceWei)
      setBalance(parseFloat(balanceEth).toFixed(4))
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const copyAddress = async () => {
    if (!embeddedWallet) return
    const provider = await embeddedWallet.getEthersProvider()
    const signer = await provider.getSigner()
    const address = await signer.getAddress()
    await navigator.clipboard.writeText(address)
    alert('Address copied to clipboard!')
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark flex items-center gap-2"
      >
        <Wallet className="h-5 w-5" />
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="relative group">
      <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <span className="font-medium">{balance} ETH</span>
      </button>

      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
        <div className="p-4">
          {embeddedWallet && (
            <>
              <div className="mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Wallet Address
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono truncate">
                    {embeddedWallet.address?.slice(0, 10)}...{embeddedWallet.address?.slice(-8)}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => window.open(`https://sepolia-blockscout.lisk.com/address/${embeddedWallet.address}`, '_blank')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </button>
                
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-red-500"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}