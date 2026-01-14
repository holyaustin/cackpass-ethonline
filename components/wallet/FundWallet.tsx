// components/wallet/FundWallet.tsx
'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { DollarSign, CreditCard, Loader2, ExternalLink, Check, Banknote } from 'lucide-react'
import { toast } from 'sonner'

interface FundWalletProps {
  className?: string
}

export function FundWallet({ className = '' }: FundWalletProps) {
  const { user } = usePrivy()
  const [amount, setAmount] = useState('100')
  const [currency, setCurrency] = useState('usdc')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const presetAmounts = [50, 100, 250, 500]

  const handleFundWallet = async () => {
    if (!user?.email?.address) {
      toast.error('Please login first')
      return
    }

    setIsLoading(true)
    try {
      // In a real app, this would call your backend API
      // For now, we'll simulate a successful payment initiation
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Show success message
      setShowSuccess(true)
      toast.success('Payment initiated successfully!')

      // Reset success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000)

    } catch (error) {
      console.error('Error funding wallet:', error)
      toast.error('Failed to initiate payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const userEmail = user?.email?.address || 'Not logged in'
  const truncatedEmail = userEmail.length > 20 ? `${userEmail.slice(0, 20)}...` : userEmail

  return (
    <div className={`card rounded-2xl p-4 md:p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 dark:bg-dark-primary/10 rounded-xl flex items-center justify-center">
          <Banknote className="h-5 w-5 md:h-6 md:w-6 text-primary dark:text-dark-primary" />
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold">Add Funds</h3>
          <p className="text-text-light dark:text-dark-secondary text-sm md:text-base">
            Top up your account balance
          </p>
        </div>
      </div>

      {showSuccess ? (
        <div className="text-center py-6 md:py-8">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
          </div>
          <h4 className="text-lg md:text-xl font-semibold mb-2">Payment Started!</h4>
          <p className="text-text-light dark:text-dark-secondary mb-4 md:mb-6 text-sm md:text-base">
            Complete your payment to add funds to your account.
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-primary hover:text-primary-dark dark:text-dark-primary dark:hover:text-dark-primary-dark font-medium"
          >
            Add more funds
          </button>
        </div>
      ) : (
        <>
          {/* User Info */}
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-background dark:bg-dark-background rounded-xl">
            <div className="text-xs text-text-light dark:text-dark-secondary mb-1">
              Funding to account
            </div>
            <div className="font-medium text-sm md:text-base truncate">
              {truncatedEmail}
            </div>
          </div>

          {/* Amount Selection */}
          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium mb-2 md:mb-3">
              Select Amount (USD)
            </label>
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-4">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`py-2 md:py-3 rounded-xl font-medium transition-all text-sm md:text-base ${
                    amount === preset.toString()
                      ? 'bg-primary text-white dark:bg-dark-primary dark:text-white'
                      : 'bg-background dark:bg-dark-background text-text dark:text-dark-text hover:shadow-sm'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary h-4 w-4 md:h-5 md:w-5" />
              <input
                type="number"
                min="10"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="input-field pl-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary text-sm">
                USD
              </div>
            </div>
          </div>

          {/* Currency Selection */}
          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium mb-2 md:mb-3">
              Select Currency
            </label>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              {[
                { code: 'usdc', name: 'USDC', icon: '$' },
                { code: 'usd', name: 'USD', icon: '$' },
                { code: 'ngn', name: 'NGN', icon: '₦' },
              ].map((currencyOption) => (
                <button
                  key={currencyOption.code}
                  type="button"
                  onClick={() => setCurrency(currencyOption.code)}
                  className={`p-3 md:p-4 rounded-xl border-2 flex flex-col items-center transition-all ${
                    currency === currencyOption.code
                      ? 'border-primary bg-primary/5 dark:border-dark-primary dark:bg-dark-primary/5'
                      : 'border-gray-200 dark:border-gray-300 hover:border-primary/50 dark:hover:border-dark-primary/50'
                  }`}
                >
                  <div className="text-lg md:text-xl mb-1 md:mb-2">{currencyOption.icon}</div>
                  <div className="font-medium text-sm md:text-base">{currencyOption.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-primary/5 dark:bg-dark-primary/5 rounded-xl border border-primary/20 dark:border-dark-primary/20">
            <div className="flex items-start gap-2 md:gap-3">
              <ExternalLink className="h-4 w-4 md:h-5 md:w-5 text-primary dark:text-dark-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-primary dark:text-dark-primary mb-1 text-sm md:text-base">
                  Secure Payment Processing
                </h4>
                <p className="text-text-light dark:text-dark-secondary text-xs md:text-sm">
                  All payments are processed securely through our payment partners. 
                  Funds typically appear in your account within minutes.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleFundWallet}
            disabled={isLoading || !user?.email?.address}
            className="w-full py-3 md:py-4 bg-primary text-white dark:bg-dark-primary dark:text-white rounded-xl font-bold hover:bg-primary-dark dark:hover:bg-dark-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
                Add Funds
              </>
            )}
          </button>

          {!user?.email?.address && (
            <p className="text-center text-xs text-red-500 mt-2 md:mt-3">
              Please login first
            </p>
          )}
        </>
      )}
    </div>
  )
}