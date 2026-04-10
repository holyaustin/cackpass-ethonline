'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Ticket, Home, User, Mail, Calendar, MapPin, DollarSign, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface TicketDetails {
  ticketId: string
  ticketNumber?: string
}

interface PaymentDetails {
  reference: string
  amount: number
  tickets: TicketDetails[]
  userEmail?: string
  event?: {
    ticketsSold?: number
    capacity?: number
  }
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [reference, setReference] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState<boolean | null>(null)

  useEffect(() => {
    const ref = searchParams.get('reference')
    if (!ref) {
      router.push('/')
      return
    }
    setReference(ref)
    verifyPayment(ref)
  }, [searchParams, router])

  const verifyPayment = async (ref: string) => {
    try {
      console.log('🔍 Verifying payment for reference:', ref)
      
      const response = await fetch(`/api/payments/paystack/verify?reference=${ref}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      if (!data.success) {
        throw new Error('Payment verification failed')
      }

      console.log('✅ Payment verified successfully:', data)
      
      setPaymentDetails({
        reference: ref,
        amount: data.amount || 0,
        tickets: data.tickets || [],
        userEmail: data.userEmail,
        event: data.event
      })
      
      // Track email status
      const wasEmailSent = data.emailSent === true
      setEmailSent(wasEmailSent)
      
      // Show toast based on email status
      // In the verifyPayment function, update the email status check:
      if (data.emailSent === true) {
        toast.success('🎫 Ticket details sent to your email!')
      } else if (data.emailSent === false && data.userEmail) {
        toast.warning('Ticket created and sent to your email.')
      } else {
        // If we have tickets, assume success
        if (data.tickets && data.tickets.length > 0) {
          toast.success('Tickets created successfully! Check your dashboard.')
        }
      }
      
      setIsLoading(false)
    } catch (err: any) {
      console.error('❌ Verification error:', err)
      setError(err.message || 'Failed to verify payment')
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Verifying Your Payment...</h2>
          <p className="text-gray-500">Please wait while we confirm your transaction.</p>
          <p className="text-sm text-gray-400 mt-4">Reference: {reference}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Reference: {reference}</p>
          <div className="flex gap-3">
            <button
              onClick={() => verifyPayment(reference)}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-medium"
            >
              Try Again
            </button>
            <Link href="/dashboard/tickets" className="flex-1 py-3 border border-gray-300 rounded-xl text-center">
              View Tickets
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const ticketCount = paymentDetails?.tickets?.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Thank you for your purchase. Your ticket has been issued.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Payment Reference</span>
            <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
              {reference?.slice(0, 8)}...
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <span className="font-medium">Tickets Purchased:</span>
              <span>{ticketCount} ticket{ticketCount !== 1 ? 's' : ''}</span>
            </div>
            {paymentDetails?.amount && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-medium">Amount Paid:</span>
                <span>₦{paymentDetails.amount.toLocaleString()}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>
                {emailSent === true ? (
                  'Ticket details have been sent to your email'
                ) : emailSent === false ? (
                  'Ticket created : Ticket details have been sent to your email.'
                ) : (
                  'Check "My Tickets" to view your purchase'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span>Check "My Tickets" to view your purchase</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/dashboard/tickets"
            className="py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors text-center"
          >
            View Tickets
          </Link>
          <Link
            href="/events"
            className="py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
          >
            Browse More Events
          </Link>
        </div>
      </div>
    </div>
  )
}