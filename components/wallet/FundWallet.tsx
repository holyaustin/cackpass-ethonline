// components/wallet/FundWallet.tsx
'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { DollarSign, CreditCard, Loader2, ExternalLink, Check } from 'lucide-react'
import { toast } from 'sonner'

interface FundWalletProps {
  className?: string
}

export function FundWallet({ className = '' }: FundWalletProps) {
  const { user } = usePrivy()
  const [amount, setAmount] = useState('100')
  const [currency, setCurrency] = useState('eth')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const presetAmounts = [50, 100, 250, 500]

  const handleFundWallet = async () => {
    if (!user?.wallet?.address) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    try {
      // Call backend API to get MoonPay URL
      const params = new URLSearchParams({
        walletAddress: user.wallet.address,
        currencyCode: currency,
        baseCurrencyAmount: amount,
        baseCurrencyCode: 'usd',
      })

      const response = await fetch(`/api/onramp/create-url?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create onramp URL')
      }

      // Open MoonPay in new window
      const width = 500
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2

      window.open(
        data.url,
        'moonpay',
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      )

      // Show success message
      setShowSuccess(true)
      toast.success('MoonPay window opened! Complete your purchase there.')

      // Reset success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000)

    } catch (error) {
      console.error('Error funding wallet:', error)
      toast.error('Failed to open payment window. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const walletAddress = user?.wallet?.address
  const truncatedAddress = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'Not connected'

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Fund Your Wallet</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Buy crypto with credit card or bank transfer
          </p>
        </div>
      </div>

      {showSuccess ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h4 className="text-lg font-semibold mb-2">Payment Window Opened!</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Complete your purchase in the MoonPay window. Funds will appear in your wallet shortly.
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-primary hover:underline"
          >
            Start new payment
          </button>
        </div>
      ) : (
        <>
          {/* Wallet Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Funding to wallet
            </div>
            <div className="font-mono text-sm truncate">
              {truncatedAddress}
            </div>
          </div>

          {/* Amount Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">
              Select Amount (USD)
            </label>
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    amount === preset.toString()
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="number"
                min="10"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                USD
              </div>
            </div>
          </div>

          {/* Currency Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-3">
              Select Cryptocurrency
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: 'eth', name: 'Ethereum', icon: 'Ξ' },
                { code: 'usdc', name: 'USDC', icon: '$' },
                { code: 'usdt', name: 'USDT', icon: '$' },
                { code: 'matic', name: 'Polygon', icon: '⧫' },
              ].map((crypto) => (
                <button
                  key={crypto.code}
                  type="button"
                  onClick={() => setCurrency(crypto.code)}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center transition-all ${
                    currency === crypto.code
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{crypto.icon}</div>
                  <div className="font-medium">{crypto.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                  Powered by MoonPay
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  You'll be redirected to MoonPay to complete your purchase. 
                  Transaction fees apply. Funds typically arrive in 5-15 minutes.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleFundWallet}
            disabled={isLoading || !walletAddress}
            className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Buy Crypto with MoonPay
              </>
            )}
          </button>

          {!walletAddress && (
            <p className="text-center text-sm text-red-500 mt-3">
              Please connect your wallet first
            </p>
          )}
        </>
      )}
    </div>
  )
}