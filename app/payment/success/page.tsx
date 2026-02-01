'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Ticket, Home, User } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [reference, setReference] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const ref = searchParams.get('reference')
    if (ref) {
      setReference(ref)
      // Here you could fetch payment details using the reference
      setTimeout(() => setIsLoading(false), 1000)
    } else {
      router.push('/')
    }
  }, [searchParams, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading payment details...</p>
        </div>
      </div>
    )
  }

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
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400">Payment Reference</span>
            <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
              {reference?.slice(0, 8)}...
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-gray-400" />
              <span>Ticket has been added to your account</span>
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