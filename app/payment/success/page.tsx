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
  currency?: string         // ✅ NEW
  tickets: TicketDetails[]
  userEmail?: string
  event?: {
    ticketsSold?: number
    capacity?: number
  }
  isFree?: boolean
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [reference, setReference] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState<boolean | null>(null)
  const [isFreeTicket, setIsFreeTicket] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('reference')
    const isFree = searchParams.get('free') === 'true'
    const email = searchParams.get('email')
    
    setIsFreeTicket(isFree)
    
    if (!ref) {
      router.push('/')
      return
    }
    
    setReference(ref)
    
    if (isFree) {
      setPaymentDetails({
        reference: ref,
        amount: 0,
        currency: 'FREE',
        tickets: [{ ticketId: ref }],
        userEmail: email || undefined,
        isFree: true
      })
      setEmailSent(true)
      setIsLoading(false)
      toast.success('🎫 Free ticket created successfully!')
    } else {
      verifyPayment(ref)
    }
  }, [searchParams, router])

  const verifyPayment = async (ref: string) => {
    try {
      console.log('🔍 Verifying payment for reference:', ref);
      
      const urlParams = new URLSearchParams(window.location.search);
      const provider = urlParams.get('provider');
      const transactionId = urlParams.get('transaction_id');
      
      let verifyUrl;
      if (provider === 'arc') {
        verifyUrl = `/api/payments/arc/verify?reference=${ref}`;
        if (transactionId) {
          verifyUrl += `&transaction_id=${transactionId}`;
        }
      } else {
        verifyUrl = `/api/payments/flutterwave/verify?reference=${ref}`;
        if (transactionId) {
          verifyUrl += `&transaction_id=${transactionId}`;
        }
      }
      
      console.log('📡 Verification URL:', verifyUrl);
      console.log('📡 Provider:', provider || 'flutterwave (default)');
      
      const response = await fetch(verifyUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Verification response error:', response.status, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Verification failed' };
        }
        
        throw new Error(errorData.error || 'Verification failed');
      }
      
      const data = await response.json();
      console.log('📥 Verification response data:', data);

      if (!data.success) {
        console.error('❌ Verification failed:', data);
        throw new Error(data.error || 'Payment verification failed');
      }

      console.log('✅ Payment verified successfully:', data);
      
      setPaymentDetails({
        reference: ref,
        amount: data.amount || 0,
        currency: data.currency || 'NGN',    // ✅ Capture currency from API
        tickets: data.tickets || [],
        userEmail: data.userEmail,
        event: data.event
      });
      
      const wasEmailSent = data.emailSent === true;
      setEmailSent(wasEmailSent);
      
      if (wasEmailSent) {
        toast.success('🎫 Ticket details sent to your email!');
      } else if (data.emailError) {
        toast.warning('Payment successful! Tickets available in your dashboard.');
        console.warn('Email sending failed:', data.emailError);
      } else {
        toast.success('Tickets created successfully!');
      }
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      setError(err.message || 'Failed to verify payment');
      setIsLoading(false);
    }
  };

  // ✅ NEW: Helper to format amount with correct currency
  const formatAmountDisplay = (amount: number, currency: string = 'NGN'): string => {
    // USDC / USD - use $ prefix with 6 decimals max
    if (currency === 'USDC' || currency === 'USD') {
      const formatted = amount.toFixed(amount < 1 ? 6 : 2).replace(/\.?0+$/, '');
      return `${formatted} USDC`;
    }
    
    // NGN - use ₦ symbol
    if (currency === 'NGN') {
      return `₦${amount.toLocaleString()}`;
    }
    
    // EUR, GBP etc.
    if (currency === 'EUR') return `€${amount.toLocaleString()}`;
    if (currency === 'GBP') return `£${amount.toLocaleString()}`;
    
    // Fallback
    return `${amount.toLocaleString()} ${currency}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {isFreeTicket ? 'Processing Your Free Ticket...' : 'Verifying Your Payment...'}
          </h2>
          <p className="text-gray-500">
            {isFreeTicket ? 'Please wait while we create your ticket.' : 'Please wait while we confirm your transaction.'}
          </p>
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

  const ticketCount = paymentDetails?.tickets?.length || 1
  const currency = paymentDetails?.currency || 'NGN'

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isFreeTicket ? 'Free Ticket Claimed!' : 'Payment Successful!'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isFreeTicket 
              ? 'Your free ticket has been issued successfully.' 
              : 'Thank you for your purchase. Your ticket has been issued.'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">
              {isFreeTicket ? 'Ticket ID' : 'Payment Reference'}
            </span>
            <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
              {reference?.slice(0, 12)}...
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <span className="font-medium">Tickets:</span>
              <span>{ticketCount} ticket{ticketCount !== 1 ? 's' : ''}</span>
            </div>
            {!isFreeTicket && paymentDetails?.amount !== undefined && paymentDetails.amount > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-medium">Amount Paid:</span>
                {/* ✅ FIXED: Now displays USDC when paid in USDC */}
                <span className="font-semibold">
                  {formatAmountDisplay(paymentDetails.amount, currency)}
                </span>
              </div>
            )}
            {isFreeTicket && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="font-medium">Amount:</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>
                {isFreeTicket 
                  ? 'Your free ticket has been sent to your email'
                  : emailSent === true 
                    ? 'Ticket details have been sent to your email'
                    : emailSent === false 
                      ? 'Ticket created! Check your dashboard for details.'
                      : 'Check "My Tickets" to view your purchase'}
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
            View My Tickets
          </Link>
          <Link
            href="/events"
            className="py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
          >
            Browse More Events
          </Link>
        </div>
        
        {isFreeTicket && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              🎉 You've successfully claimed your free ticket!
            </p>
            <p className="text-xs text-gray-400 mt-2">
              A confirmation email has been sent to your registered email address.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}