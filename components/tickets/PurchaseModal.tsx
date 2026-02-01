// /app/components/tickets/PurchaseModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  X, Wallet, CreditCard, Ticket, CheckCircle, 
  Loader2, ArrowRight, Shield, Globe, QrCode,
  Clock, Calendar, MapPin, Hash, User,
  ExternalLink, AlertCircle, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

// Simplified interface for production
interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (ticketId?: string) => void  // Make parameter optional
  event: {
    id: string
    title: string
    startDate: string
    venue: string
    isFree: boolean
    price: number
    currency: string
    imageCid?: string
    onChainId?: number
    description?: string
    endDate?: string
    isVirtual?: boolean
    category?: string
    // Only include properties that exist in EventData
    organizer?: {
      name?: string
      avatar?: string
    }
  }
  ticketType?: {
    id?: string
    _id?: string
    name: string
    category?: string
    price: number
    maxSupply: number
    currentSupply: number
  }
  quantity?: number
}

interface PaymentMethod {
  id: 'wallet' | 'paystack'
  name: string
  description: string
  icon: React.ReactNode
}

export default function PurchaseModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  event,
  ticketType,
  quantity = 1
}: PurchaseModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'paystack'>('wallet')
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'method' | 'confirm' | 'processing' | 'success'>('method')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)

  // Get user token and wallet address
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('privy_token')
      setUserToken(token)
      
      // Try to get wallet address
      const getWalletAddress = async () => {
        if (token) {
          try {
            const response = await fetch('/api/auth/user', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.user?.walletAddress) {
                setWalletAddress(data.user.walletAddress)
                return
              }
            }
          } catch (error) {
            console.error('Failed to fetch wallet address:', error)
          }
        }
        
        // Check for embedded wallet
        const embeddedWallet = localStorage.getItem('embedded_wallet')
        if (embeddedWallet) {
          try {
            const walletData = JSON.parse(embeddedWallet)
            if (walletData.address) {
              setWalletAddress(walletData.address)
            }
          } catch (error) {
            console.error('Failed to parse embedded wallet:', error)
          }
        }
      }
      
      getWalletAddress()
    }
  }, [isOpen])

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'wallet',
      name: 'Embedded Wallet',
      description: 'Pay directly from your embedded wallet',
      icon: <Wallet className="h-5 w-5" />
    },
    {
      id: 'paystack',
      name: 'Card Payment',
      description: 'Pay with credit/debit card or bank transfer',
      icon: <CreditCard className="h-5 w-5" />
    }
  ]

  const totalAmount = event.isFree ? 0 : (ticketType?.price || event.price) * quantity
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'TBD'
    }
  }

  const handlePayment = async () => {
    setIsProcessing(true)
    setStep('processing')

    try {
      let paymentResult

      if (selectedMethod === 'wallet') {
        paymentResult = await processWalletPayment()
      } else {
        paymentResult = await processPaystackPayment()
      }

      if (paymentResult.success) {
        const mintResult = await mintTicket(paymentResult.paymentId)
        
        if (mintResult.success) {
          setStep('success')
          toast.success('Ticket purchased successfully!')
          setTimeout(() => {
            if (onSuccess) {
              onSuccess(mintResult.ticketId || '')
            }
            onClose()
          }, 2000)
        } else {
          throw new Error('Failed to mint ticket')
        }
      } else {
        throw new Error(paymentResult.error || 'Payment failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Payment failed')
      setStep('method')
    } finally {
      setIsProcessing(false)
    }
  }

  const processWalletPayment = async () => {
    if (!walletAddress) {
      throw new Error('Wallet address not found')
    }

    try {
      const approvalResponse = await fetch('/api/payment/approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken ? `Bearer ${userToken}` : ''
        },
        body: JSON.stringify({
          walletAddress,
          eventId: event.id,
          onChainId: event.onChainId,
          amount: quantity,
          price: totalAmount,
          method: 'wallet'
        })
      })

      const approvalData = await approvalResponse.json()

      if (!approvalResponse.ok || !approvalData.success) {
        throw new Error(approvalData.error || 'Failed to get payment approval')
      }

      const ticketTypeId = ticketType?._id || ticketType?.id

      const paymentResponse = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken ? `Bearer ${userToken}` : ''
        },
        body: JSON.stringify({
          method: 'wallet',
          approvalId: approvalData.approvalId,
          signature: approvalData.signature,
          walletAddress,
          amount: totalAmount,
          currency: event.currency,
          eventId: event.id,
          quantity,
          ticketTypeId: ticketTypeId
        })
      })

      const paymentData = await paymentResponse.json()

      if (!paymentResponse.ok || !paymentData.success) {
        throw new Error(paymentData.error || 'Payment processing failed')
      }

      return paymentData

    } catch (error) {
      throw error
    }
  }

  const processPaystackPayment = async () => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: `paystack_dummy_${Date.now()}`,
          message: 'Payment processed successfully'
        })
      }, 1500)
    })
  }

  const mintTicket = async (paymentId: string) => {
    try {
      const ticketTypeId = ticketType?._id || ticketType?.id

      const response = await fetch('/api/tickets/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken ? `Bearer ${userToken}` : ''
        },
        body: JSON.stringify({
          walletAddress,
          eventId: event.id,
          paymentId,
          quantity,
          method: selectedMethod,
          ticketTypeId: ticketTypeId
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to mint ticket')
      }

      return data

    } catch (error) {
      throw error
    }
  }

  const formatPrice = (amount: number) => {
    if (event.isFree) return 'FREE'
    return `${event.currency} ${amount.toFixed(2)}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Purchase Ticket</h2>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Complete your ticket purchase
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'method' && (
            <>
              {/* Event Info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <h3 className="font-semibold mb-2">{event.title}</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.startDate)}</span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.venue}</span>
                    </div>
                  )}
                  {ticketType && (
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      <span>{ticketType.name} • {quantity} ticket{quantity > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Select Payment Method</h3>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      disabled={method.id === 'wallet' && !walletAddress}
                      className={`w-full p-4 rounded-xl border flex items-start gap-3 text-left transition-all ${
                        selectedMethod === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } ${method.id === 'wallet' && !walletAddress ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className={`p-2 rounded-lg ${
                        selectedMethod === method.id 
                          ? 'bg-primary text-white' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{method.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {method.description}
                          {method.id === 'wallet' && !walletAddress && (
                            <span className="text-red-500 block mt-1">
                              No wallet connected
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedMethod === method.id && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => setStep('confirm')}
                disabled={selectedMethod === 'wallet' && !walletAddress}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                Continue to Payment
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              {/* Confirmation */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Confirm Payment</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You're about to purchase {quantity} ticket{quantity > 1 ? 's' : ''} for {event.title}
                </p>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-6">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {formatPrice(totalAmount)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total amount to be paid
                  </div>
                </div>

                {/* Payment Method Info */}
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                    <span className="font-semibold flex items-center gap-2">
                      {selectedMethod === 'wallet' ? <Wallet className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                      {selectedMethod === 'wallet' ? 'Embedded Wallet' : 'Card Payment'}
                    </span>
                  </div>
                  {selectedMethod === 'wallet' && walletAddress && (
                    <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mt-2 font-mono">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStep('method')}
                  className="py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  disabled={isProcessing}
                >
                  Back
                </button>
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm & Pay'
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="relative">
                <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Ticket className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we process your payment...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your ticket has been purchased and minted successfully.
              </p>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl mb-6">
                <div className="flex items-center justify-center gap-2">
                  <Ticket className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Ticket Ready</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  You can view your ticket in the "My Tickets" section
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Secure payment • Encrypted connection</span>
            </div>
            {event.onChainId && (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-2">
                <Shield className="h-3 w-3" />
                <span>On-chain ticket • Blockchain secured</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}