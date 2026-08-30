// /components/tickets/PurchaseModal.tsx 
'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  X, Wallet, CreditCard, Ticket, CheckCircle, 
  Loader2, ArrowRight, Shield, Globe, QrCode,
  Clock, Calendar, MapPin, Hash, User,
  ExternalLink, AlertCircle, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { usePrivy } from '@privy-io/react-auth'

// Simplified interface for production
interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (ticketId?: string) => void
  event: {
    id?: string
    _id?: string
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

// Helper function to extract wallet address from Privy user
function getWalletAddressFromUser(user: any): string | null {
  if (!user) return null
  
  // Check direct wallet object
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    return user.wallet.address
  }
  
  // Check linked accounts
  const linkedAccounts = user.linkedAccounts || []
  
  // Look for embedded wallet
  const embeddedWallet = linkedAccounts.find(
    (acc: any) => acc.type === 'wallet' && acc.walletClientType === 'privy'
  )
  
  if (embeddedWallet?.address) {
    return embeddedWallet.address
  }
  
  // Find any wallet address
  for (const account of linkedAccounts) {
    if (account.type === 'wallet' && account.address) {
      return account.address
    }
  }
  
  return null
}

export default function PurchaseModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  event,
  ticketType,
  quantity = 1
}: PurchaseModalProps) {
  const { user, authenticated, ready, getAccessToken } = usePrivy()
  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'paystack'>('wallet')
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'method' | 'confirm' | 'processing' | 'success'>('method')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [hasEmbeddedWallet, setHasEmbeddedWallet] = useState(false)
  const [approvalData, setApprovalData] = useState<any>(null)

  // Helper function to get event ID
  const getEventId = useCallback(() => {
    return event._id || event.id
  }, [event._id, event.id])

  // Get user token and wallet address from Privy
  useEffect(() => {
    if (isOpen) {
      const fetchUserData = async () => {
        try {
          if (authenticated && ready && user) {
            // Get access token
            const token = await getAccessToken()
            setUserToken(token)
            
            // Extract wallet address
            const address = getWalletAddressFromUser(user)
            if (address) {
              setWalletAddress(address)
              setHasEmbeddedWallet(true)
            } else {
              setHasEmbeddedWallet(false)
              setSelectedMethod('paystack')
            }
          } else {
            setHasEmbeddedWallet(false)
            setSelectedMethod('paystack')
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error)
          setHasEmbeddedWallet(false)
          setSelectedMethod('paystack')
        }
      }
      
      fetchUserData()
    }
  }, [isOpen, authenticated, ready, user, getAccessToken])

  // Debug: Log event data when modal opens
  useEffect(() => {
    if (isOpen) {
      const eventId = getEventId()
      console.log('PurchaseModal event data:', {
        eventId,
        event,
        allEventFields: Object.keys(event),
        hasEmbeddedWallet,
        walletAddress
      })
      
      if (!eventId) {
        console.error('Event ID is missing! Available fields:', event)
      }
    }
  }, [isOpen, getEventId, event, hasEmbeddedWallet, walletAddress])

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'wallet',
      name: 'Pay from Wallet',
      description: 'Pay directly from your embedded wallet',
      icon: <Wallet className="h-5 w-5" />
    },
    {
      id: 'paystack',
      name: 'PayStack Payment',
      description: 'Pay with credit/debit card, bank transfer or USSD',
      icon: <CreditCard className="h-5 w-5" />
    }
  ]

  const totalAmount = event.isFree ? 0 : (ticketType?.price || event.price) * quantity
  
  const formatDate = useCallback((dateString: string) => {
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
  }, [])

  // ===== MAIN PAYMENT HANDLER =====
  const handlePayment = async () => {
    if (selectedMethod === 'wallet' && !walletAddress) {
      toast.error('Please connect your embedded wallet first')
      return
    }

    const eventId = getEventId()
    if (!eventId) {
      toast.error('Event ID is missing. Please try refreshing the page.')
      console.error('Event ID missing in PurchaseModal. Event object:', event)
      return
    }

    setIsProcessing(true)
    setStep('processing')

    try {
      let paymentResult

      if (selectedMethod === 'wallet') {
        paymentResult = await processWalletPayment(eventId)
      } else {
        paymentResult = await processPaystackPayment(eventId)
      }

      // Handle Paystack redirect
      if (paymentResult.requiresRedirect) {
        toast.info('Redirecting to payment gateway...')
        return
      }

      if (paymentResult.success) {
        // Always try to use paymentId for mint-with-approval
        const paymentId = paymentResult.paymentId
        if (!paymentId) {
          throw new Error('No payment ID received from payment')
        }
        
        console.log('🎫 Starting ticket minting with paymentId:', paymentId)
        
        // Mint ticket with paymentId and approval data
        const mintResult = await mintTicketWithApproval(eventId, paymentId)
        
        if (mintResult.success) {
          setStep('success')
          toast.success(`Successfully purchased ${quantity} ticket(s)!`)
          setTimeout(() => {
            if (onSuccess) {
              onSuccess(mintResult.ticketId || mintResult.ticketIds?.[0] || '')
            }
            onClose()
          }, 2000)
        } else {
          throw new Error(mintResult.error || 'Failed to mint ticket')
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

  // ===== WALLET PAYMENT FUNCTION =====
  const processWalletPayment = async (eventId: string) => {
    if (!walletAddress) {
      throw new Error('Wallet address not found')
    }

    try {
      console.log('Starting wallet payment process for event:', eventId)
      
      // First get payment approval
      const approvalResponse = await fetch('/api/payment/approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken ? `Bearer ${userToken}` : ''
        },
        body: JSON.stringify({
          walletAddress,
          eventId: eventId,
          onChainId: event.onChainId,
          amount: quantity,
          price: totalAmount,
          method: 'wallet'
        })
      })

      const approvalData = await approvalResponse.json()

      if (!approvalResponse.ok || !approvalData.success) {
        console.error('Approval failed:', approvalData)
        throw new Error(approvalData.error || 'Failed to get payment approval')
      }

      console.log('Approval received:', approvalData)
      setApprovalData(approvalData) // Store for later use

      const ticketTypeId = ticketType?._id || ticketType?.id

      // Process the payment
      const paymentPayload = {
        paymentMethod: 'wallet',
        approvalId: approvalData.approvalId,
        signature: approvalData.signature,
        walletAddress: walletAddress,
        amount: totalAmount,
        currency: event.currency || 'USD',
        eventId: eventId,
        quantity: quantity,
        ticketTypeId: ticketTypeId,
        signatureData: approvalData.signatureData || null,
        validUntil: approvalData.validUntil || null
      }

      console.log('Sending payment payload:', paymentPayload)

      const paymentResponse = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken ? `Bearer ${userToken}` : ''
        },
        body: JSON.stringify(paymentPayload)
      })

      const paymentData = await paymentResponse.json()

      if (!paymentResponse.ok || !paymentData.success) {
        console.error('Payment failed:', paymentData)
        throw new Error(paymentData.error || paymentData.details || 'Payment processing failed')
      }

      console.log('Payment successful:', paymentData)
      
      // Return both paymentId and approval data for minting
      return {
        ...paymentData,
        approvalData: approvalData // Include approval data for minting
      }

    } catch (error) {
      console.error('Wallet payment error:', error)
      throw error
    }
  }

  // ===== PAYSTACK PAYMENT FUNCTION =====
  const processPaystackPayment = async (eventId: string) => {
    const ticketTypeId = ticketType?._id || ticketType?.id

    try {
      console.log('Starting Paystack payment for event:', eventId)
      
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken ? `Bearer ${userToken}` : ''
        },
        body: JSON.stringify({
          paymentMethod: 'paystack',
          walletAddress: walletAddress || 'paystack-payment',
          amount: totalAmount,
          currency: event.currency || 'NGN',
          eventId: eventId,
          quantity: quantity,
          ticketTypeId: ticketTypeId
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('Paystack payment failed:', data)
        throw new Error(data.error || data.details || 'Paystack payment failed')
      }

      console.log('Paystack payment initiated:', data)
      
      // If Paystack returns a payment URL, redirect to it
      if (data.paymentUrl && data.requiresRedirect) {
        window.location.href = data.paymentUrl
        return { success: true, requiresRedirect: true }
      }

      return data
    } catch (error) {
      console.error('Paystack payment error:', error)
      throw error
    }
  }

  // ===== MINT TICKET WITH APPROVAL FUNCTION =====
  const mintTicketWithApproval = async (eventId: string, paymentId: string) => {
    if (!walletAddress) {
      throw new Error('Wallet address not found')
    }

    try {
      const ticketTypeId = ticketType?._id || ticketType?.id

      console.log('🎫 [PurchaseModal] Minting ticket with approval:', {
        walletAddress,
        eventId,
        paymentId,
        quantity,
        method: selectedMethod,
        hasApprovalData: !!approvalData
      })

      // Prepare mint payload
      const mintPayload: any = {
        walletAddress,
        eventId: eventId,
        paymentId: paymentId,
        quantity: quantity,
        method: selectedMethod,
        ticketTypeId: ticketTypeId
      }

      // Add approval data if available (for wallet payments)
      if (selectedMethod === 'wallet' && approvalData) {
        mintPayload.approvalId = approvalData.approvalId
        mintPayload.signature = approvalData.signature
      }

      console.log('Sending mint payload to /api/tickets/mint-with-approval:', mintPayload)

      const response = await fetch('/api/tickets/mint-with-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken ? `Bearer ${userToken}` : ''
        },
        body: JSON.stringify(mintPayload)
      })

      // Handle response properly
      const responseText = await response.text()
      
      if (!responseText) {
        console.error('Empty response from mint endpoint')
        throw new Error('Server returned empty response')
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse JSON response:', responseText)
        throw new Error('Invalid server response')
      }

      if (!response.ok || !data.success) {
        console.error('Mint failed:', data)
        throw new Error(data.error || data.details || 'Failed to mint ticket')
      }

      console.log('✅ Ticket minting successful:', data)
      return data

    } catch (error) {
      console.error('Mint ticket error:', error)
      
      // If mint-with-approval fails, try regular mint endpoint as fallback
      if (selectedMethod === 'wallet') {
        console.log('🔄 Falling back to regular mint endpoint...')
        try {
          return await mintTicketRegular(eventId, paymentId)
        } catch (fallbackError) {
          console.error('Fallback minting also failed:', fallbackError)
          throw error // Throw original error
        }
      }
      
      throw error
    }
  }

  // ===== REGULAR MINT TICKET FUNCTION (FALLBACK) =====
  const mintTicketRegular = async (eventId: string, paymentId: string) => {
    if (!walletAddress) {
      throw new Error('Wallet address not found')
    }

    try {
      const ticketTypeId = ticketType?._id || ticketType?.id

      console.log('🎫 [PurchaseModal] Falling back to regular mint endpoint')

      const mintPayload = {
        walletAddress,
        eventId: eventId,
        paymentId: paymentId,
        quantity: quantity,
        method: selectedMethod,
        ticketTypeId: ticketTypeId
      }

      const response = await fetch('/api/tickets/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken ? `Bearer ${userToken}` : ''
        },
        body: JSON.stringify(mintPayload)
      })

      const responseText = await response.text()
      
      if (!responseText) {
        throw new Error('Server returned empty response')
      }

      const data = JSON.parse(responseText)

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to mint ticket')
      }

      return data

    } catch (error) {
      console.error('Regular mint ticket error:', error)
      throw error
    }
  }

  const formatPrice = useCallback((amount: number) => {
    if (event.isFree) return 'FREE'
    return `${event.currency} ${amount.toFixed(2)}`
  }, [event.isFree, event.currency])

  if (!isOpen) return null

  const eventId = getEventId()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
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
                  {paymentMethods.map((method, index) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        // Deactivate the second button (index 1) - Paystack button
                        if (index === 1) {
                          // Optional: Show a toast or message
                          toast.error('PayStack payments are temporarily unavailable. Please use wallet payment.');
                          return;
                        }
                        setSelectedMethod(method.id);
                      }}
                      disabled={method.id === 'wallet' && !hasEmbeddedWallet}
                      className={`w-full p-4 rounded-xl border flex items-start gap-3 text-left transition-all ${
                        selectedMethod === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } ${(method.id === 'wallet' && !hasEmbeddedWallet) || index === 1 ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className={`p-2 rounded-lg ${
                        selectedMethod === method.id && index !== 1
                          ? 'bg-primary text-white' 
                          : (index === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')
                      }`}>
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          {method.name}
                          {index === 1 && (
                            <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {method.description}
                          {method.id === 'wallet' && !hasEmbeddedWallet && (
                            <div className="mt-1">
                            </div>
                          )}
                          {index === 1 && (
                            <div className="mt-1">
                              <span className="text-amber-600 dark:text-amber-400 text-xs">
                                Card payments are temporarily unavailable. Please use wallet payment.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedMethod === method.id && index !== 1 && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      )}
                      {index === 1 && (
                        <div className="flex-shrink-0 mt-1">
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setStep('confirm')}
                  disabled={(selectedMethod === 'wallet' && !hasEmbeddedWallet) || isProcessing || !eventId}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  Continue to Payment
                  <ArrowRight className="h-4 w-4" />
                </button>
                
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
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
                  {selectedMethod === 'paystack' && (
                    <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg mt-2">
                      You'll be redirected to Paystack to complete payment
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handlePayment}
                  disabled={isProcessing || !eventId}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm & Pay'
                  )}
                </button>
                
                <button
                  onClick={() => setStep('method')}
                  className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  disabled={isProcessing}
                >
                  Back
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
                Please wait while we process your payment and mint your ticket...
              </p>
              <div className="mt-4 text-sm text-gray-500">
                {selectedMethod === 'wallet' ? (
                  <p>• Approving payment with your wallet</p>
                ) : (
                  <p>• Processing Paystack payment</p>
                )}
                <p>• Creating your ticket</p>
                <p>• Securing on blockchain</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
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
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (onSuccess) {
                      onSuccess()
                    }
                    onClose()
                  }}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
                >
                  Done
                </button>
                
                <button
                  onClick={() => {
                    window.location.href = '/dashboard/tickets'
                  }}
                  className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  View My Tickets
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && step !== 'processing' && (
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