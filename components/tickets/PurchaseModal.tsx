// components/tickets/PurchaseModal.tsx
'use client'

import { useState } from 'react'
import { X, Ticket, CreditCard, Smartphone, Globe } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'

interface PurchaseModalProps {
  event: any
  ticketType: any
  onClose: () => void
}

export function PurchaseModal({ event, ticketType, onClose }: PurchaseModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'paystack' | 'flutterwave' | 'ussd'>('crypto')
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = usePrivy()

  const totalPrice = ticketType.price * quantity

  const handlePurchase = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('privy_token')}`,
        },
        body: JSON.stringify({
          ticketTypeId: ticketType._id,
          quantity,
          paymentMethod,
          paymentData: {
            walletAddress: user?.wallet?.address,
            email: user?.email?.address,
          },
        }),
      })

      const data = await response.json()

      if (data.paymentUrl) {
        // Redirect to payment URL for fiat payments
        window.location.href = data.paymentUrl
      } else if (data.success) {
        // Crypto payment - show success
        alert('Ticket purchased successfully!')
        onClose()
      }
    } catch (error) {
      console.error('Purchase error:', error)
      alert('Failed to purchase ticket')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Purchase Tickets</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {event.title} - {ticketType.name}
          </p>
        </div>

        {/* Quantity Selector */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Quantity</span>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full border flex items-center justify-center"
              >
                -
              </button>
              <span className="text-xl font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-full border flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              ${(totalPrice).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">
              ${ticketType.price} each
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-6 border-b">
          <h4 className="font-medium mb-4">Payment Method</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('crypto')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center ${
                paymentMethod === 'crypto' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200'
              }`}
            >
              <Globe className="h-6 w-6 mb-2" />
              <span>Crypto</span>
              <span className="text-xs text-gray-500 mt-1">Gasless</span>
            </button>

            <button
              onClick={() => setPaymentMethod('paystack')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center ${
                paymentMethod === 'paystack' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200'
              }`}
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span>Paystack</span>
              <span className="text-xs text-gray-500 mt-1">NGN Cards</span>
            </button>

            <button
              onClick={() => setPaymentMethod('flutterwave')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center ${
                paymentMethod === 'flutterwave' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200'
              }`}
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span>Flutterwave</span>
              <span className="text-xs text-gray-500 mt-1">Pan-Africa</span>
            </button>

            <button
              onClick={() => setPaymentMethod('ussd')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center ${
                paymentMethod === 'ussd' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200'
              }`}
            >
              <Smartphone className="h-6 w-6 mb-2" />
              <span>USSD</span>
              <span className="text-xs text-gray-500 mt-1">Nigeria</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6">
          <button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Ticket className="h-5 w-5" />
                Purchase {quantity} Ticket{quantity > 1 ? 's' : ''}
              </>
            )}
          </button>
          
          <p className="text-center text-sm text-gray-500 mt-4">
            {paymentMethod === 'crypto' 
              ? 'No gas fees required - powered by Biconomy' 
              : 'You will be redirected to complete payment'}
          </p>
        </div>
      </div>
    </div>
  )
}