'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Calendar, MapPin, Clock, Users, Ticket, 
  Share2, Heart, ChevronLeft, Star, Tag, 
  Globe, Shield, QrCode, Loader2,
  CreditCard, Wallet, CheckCircle,
  AlertCircle, User, Mail, Check, Settings
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { usePrivy } from '@privy-io/react-auth'
import { format } from 'date-fns'
import ShareDropdown from '@/components/common/ShareDropdown'

declare global {
  interface Window {
    PaystackPop: any
  }
}

interface TicketTypeData {
  _id: string
  name: string
  description?: string
  category: string
  price: number
  maxSupply: number
  currentSupply: number
  isActive: boolean
  eventId: string
}

interface EventDataWithId {
  id: string
  _id?: string
  title: string
  description: string
  startDate: string
  endDate: string
  venue: string
  location: { address?: string; lat?: number; lng?: number }
  isVirtual: boolean
  isFree: boolean
  price: number
  currency: string
  category: string
  imageCid?: string
  bannerImage?: string
  ticketType: string
  unlimitedCapacity: boolean
  capacity?: number
  ticketsSold?: number
  organizerWallet: string
  organizer: { name: string; avatar: string; _id?: string }
  attendees: number
  rating: number
}

const DEFAULT_ORGANIZER = { name: 'Event Organizer', avatar: '/cackpas.jpg' }

const getSafeOrganizer = (organizer?: { name?: string; avatar?: string }) => {
  if (!organizer) return DEFAULT_ORGANIZER
  return { name: organizer.name || DEFAULT_ORGANIZER.name, avatar: organizer.avatar || DEFAULT_ORGANIZER.avatar }
}

const getSafeAvatarUrl = (avatar?: string) => {
  if (!avatar || avatar.trim() === '') return '/cackpas.jpg'
  if (avatar.startsWith('http') || avatar.startsWith('/')) return avatar
  return `/${avatar}`
}

// Helper functions to extract wallet address and email from Privy user
const getWalletAddress = (user: any): string | null => {
  if (!user) return null
  if (user.wallet?.address) return user.wallet.address
  const linkedAccounts = user.linkedAccounts || []
  for (const account of linkedAccounts) {
    if (account.type === 'wallet' && account.address) return account.address
  }
  return null
}

// Helper to fetch user email by wallet address
const fetchUserEmailByWallet = async (wallet: string): Promise<string | null> => {
  try {
    const res = await fetch(`/api/auth/user?walletAddress=${wallet}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.user?.email || null
  } catch (error) {
    console.error('Failed to fetch user email:', error)
    return null
  }
}

export default function EventPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen text="Loading event..." />}>
      <EventPageContent />
    </Suspense>
  )
}

function EventPageContent() {
  const params = useParams()
  const router = useRouter()
  const { user, authenticated, ready, login } = usePrivy()
  
  const [event, setEvent] = useState<EventDataWithId | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketTypeData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [selectedTicketType, setSelectedTicketType] = useState<TicketTypeData | null>(null)
  const [imageError, setImageError] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isGettingFreeTicket, setIsGettingFreeTicket] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'paystack' | 'crypto'>('paystack')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isFetchingEmail, setIsFetchingEmail] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  
  const eventId = params.id as string
  const walletAddress = getWalletAddress(user)
  const isLoggedIn = authenticated && ready

  // Fetch logged‑in user's email from database
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!isLoggedIn || !walletAddress) return
      setIsFetchingEmail(true)
      try {
        const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`)
        if (response.ok) {
          const data = await response.json()
          if (data.user?.email) setUserEmail(data.user.email)
        }
      } catch (error) {
        console.error('Error fetching user email:', error)
      } finally {
        setIsFetchingEmail(false)
      }
    }
    fetchUserEmail()
  }, [isLoggedIn, walletAddress])

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) return
      try {
        setIsLoading(true)
        const eventResponse = await fetch(`/api/events/${eventId}`)
        if (!eventResponse.ok) throw new Error('Failed to fetch event')
        const eventData = await eventResponse.json()
        if (!eventData.success || !eventData.event) throw new Error('Event not found')
        
        const transformedEvent = {
          ...eventData.event,
          id: eventData.event._id || eventData.event.id,
          _id: eventData.event._id,
          organizerWallet: eventData.event.organizerWallet,
          organizer: getSafeOrganizer(eventData.event.organizer)
        }
        setEvent(transformedEvent)
        
        setIsLoadingTickets(true)
        const ticketsResponse = await fetch(`/api/events/${eventId}/tickets`)
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json()
          const ticketTypesList = ticketsData.ticketTypes || []
          setTicketTypes(ticketTypesList)
          if (ticketTypesList.length > 0) setSelectedTicketType(ticketTypesList[0])
        }
        
        const favorites = JSON.parse(localStorage.getItem('cackpass_favorites') || '[]')
        setIsFavorite(favorites.includes(eventId))
      } catch (error) {
        console.error('Error loading event:', error)
        toast.error('Failed to load event details')
        router.push('/events')
      } finally {
        setIsLoading(false)
        setIsLoadingTickets(false)
      }
    }
    fetchEventData()
  }, [eventId, router])

  // Determine if the logged‑in user is the event organizer (by email)
  useEffect(() => {
    const checkOrganizer = async () => {
      if (!event || !userEmail) return
      try {
        // Fetch organizer's email using organizerWallet
        const organizerEmail = await fetchUserEmailByWallet(event.organizerWallet)
        setIsOrganizer(organizerEmail === userEmail)
      } catch (error) {
        console.error('Failed to check organizer status:', error)
        setIsOrganizer(false)
      }
    }
    checkOrganizer()
  }, [event, userEmail])

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.PaystackPop) {
      const script = document.createElement('script')
      script.src = 'https://js.paystack.co/v2/inline.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  const handleGetFreeTicket = async () => {
    if (!isLoggedIn) {
      toast.error('Please login to get a free ticket')
      login()
      return
    }
    if (!userEmail) {
      toast.error('Please complete your profile with an email address first')
      router.push('/complete-profile')
      return
    }
    if (!selectedTicketType) {
      toast.error('Please select a ticket type')
      return
    }
    try {
      setIsGettingFreeTicket(true)
      const response = await fetch('/api/tickets/free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventId,
          quantity: selectedQuantity,
          userEmail: userEmail,
          userName: userEmail.split('@')[0] || 'User'
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to get free ticket')
      if (data.success) {
        toast.success('Free ticket sent to your email! Check your inbox.')
        setTimeout(() => window.location.reload(), 2000)
      }
    } catch (error) {
      console.error('Error getting free ticket:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to get free ticket')
    } finally {
      setIsGettingFreeTicket(false)
    }
  }

  const handlePayWithCard = async () => {
    if (!isLoggedIn) {
      toast.error('Please login to purchase tickets')
      login()
      return
    }
    if (!userEmail) {
      toast.error('Please complete your profile with an email address first')
      router.push('/complete-profile')
      return
    }
    if (!selectedTicketType) {
      toast.error('Please select a ticket type')
      return
    }
    const totalPrice = selectedTicketType.price * selectedQuantity
    try {
      setIsProcessingPayment(true)
      const response = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketTypeId: selectedTicketType._id,
          quantity: selectedQuantity,
          amount: totalPrice,
          email: userEmail,
          userName: userEmail.split('@')[0] || 'User'
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to initialize payment')
      if (window.PaystackPop && data.access_code) {
        const paystack = new window.PaystackPop()
        paystack.resumeTransaction(data.access_code, {
          onSuccess: async (transaction: any) => {
            toast.loading('Verifying payment...')
            try {
              const verifyResponse = await fetch(`/api/payments/paystack/verify?reference=${transaction.reference}`)
              const verifyData = await verifyResponse.json()
              toast.dismiss()
              if (verifyData.success) {
                toast.success('Payment successful! Redirecting...')
                setTimeout(() => {
                  window.location.href = `/payment/success?reference=${transaction.reference}`
                }, 1500)
              } else {
                toast.error('Payment verification failed. Please contact support.')
              }
            } catch (verifyError) {
              toast.dismiss()
              console.error('Verification error:', verifyError)
              toast.error('Payment verification failed. Please contact support.')
            }
            setIsProcessingPayment(false)
          },
          onCancel: () => {
            toast.info('Payment cancelled')
            setIsProcessingPayment(false)
          },
          onError: (error: any) => {
            console.error('Paystack error:', error)
            toast.error('Payment failed. Please try again.')
            setIsProcessingPayment(false)
          }
        })
      } else if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        throw new Error('No payment URL received')
      }
    } catch (error) {
      console.error('Paystack payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process payment')
      setIsProcessingPayment(false)
    }
  }

  const handlePayWithCrypto = async () => {
    toast.info('🚀 Crypto payments are coming soon! Stay tuned for updates.')
  }

  const handleTicketTypeSelect = (ticketType: TicketTypeData) => {
    setSelectedTicketType(ticketType)
    setSelectedQuantity(1)
  }

  const handleQuantityChange = (change: number) => {
    if (!selectedTicketType) return
    let maxAvailable = 10
    if (selectedTicketType._id.toString().startsWith('virtual_') && event) {
      if (!event.unlimitedCapacity) {
        maxAvailable = (event.capacity || 0) - (event.ticketsSold || 0)
      } else {
        maxAvailable = 10
      }
    } else {
      maxAvailable = selectedTicketType.maxSupply === 0 ? 10 : selectedTicketType.maxSupply - selectedTicketType.currentSupply
    }
    const newQuantity = selectedQuantity + change
    if (newQuantity < 1) {
      toast.error('Minimum quantity is 1')
      return
    }
    if (newQuantity > maxAvailable && maxAvailable > 0) {
      toast.error(`Only ${maxAvailable} tickets available`)
      return
    }
    setSelectedQuantity(newQuantity)
  }

  const handleFavoriteToggle = () => {
    const favorites = JSON.parse(localStorage.getItem('cackpass_favorites') || '[]')
    if (isFavorite) {
      localStorage.setItem('cackpass_favorites', JSON.stringify(favorites.filter((id: string) => id !== eventId)))
      setIsFavorite(false)
      toast.success('Removed from favorites')
    } else {
      if (favorites.length >= 50) { toast.error('Maximum 50 favorites allowed'); return }
      favorites.push(eventId)
      localStorage.setItem('cackpass_favorites', JSON.stringify(favorites))
      setIsFavorite(true)
      toast.success('Added to favorites')
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Date TBD'
    try {
      const date = new Date(dateString)
      return format(date, 'MMM d, yyyy • h:mm a')
    } catch { return 'Invalid date' }
  }

  const getImageUrl = () => {
    if (imageError) return '/placeholder-event.jpg'
    if (event?.imageCid) return `https://gateway.pinata.cloud/ipfs/${event.imageCid}`
    if (event?.bannerImage?.startsWith('http')) return event.bannerImage
    return '/placeholder-event.jpg'
  }

  const getAvailableTickets = (ticketType: TicketTypeData) => {
    if (ticketType._id.toString().startsWith('virtual_') && event) {
      if (event.unlimitedCapacity) return 'Unlimited'
      const remaining = (event.capacity || 0) - (event.ticketsSold || 0)
      return Math.max(0, remaining)
    }
    if (ticketType.maxSupply === 0) return 'Unlimited'
    return Math.max(0, ticketType.maxSupply - ticketType.currentSupply)
  }

  const isTicketAvailable = (ticketType: TicketTypeData) => {
    if (ticketType._id.toString().startsWith('virtual_') && event) {
      if (event.unlimitedCapacity) return true
      const remaining = (event.capacity || 0) - (event.ticketsSold || 0)
      return remaining > 0
    }
    if (ticketType.maxSupply === 0) return true
    return ticketType.currentSupply < ticketType.maxSupply
  }

  const getTotalPrice = () => {
    if (!selectedTicketType || event?.isFree) return '0.00'
    return (selectedTicketType.price * selectedQuantity).toFixed(2)
  }

  const isPastEvent = event?.endDate ? new Date(event.endDate) < new Date() : false
  const totalPrice = selectedTicketType ? (selectedTicketType.price * selectedQuantity).toFixed(2) : '0.00'

  if (isLoading) return <LoadingSpinner fullScreen text="Loading event details..." />
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center p-8 max-w-md">
          <AlertCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <Link href="/events" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Browse Events
          </Link>
        </div>
      </div>
    )
  }

  const organizer = getSafeOrganizer(event.organizer)
  const organizerAvatar = getSafeAvatarUrl(organizer.avatar)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Back Navigation */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900">
              <ChevronLeft className="h-5 w-5" /> <span>Back</span>
            </button>
            <div className="flex items-center gap-3">
              <button onClick={handleFavoriteToggle} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>

              {/* Edit button – only visible to the event organizer (by email) */}
              {isOrganizer && (
                <Link
                  href={`/dashboard/edit-event/${eventId}`}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl hover:bg-primary-dark transition-all shadow-sm"
                  title="Edit event"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-base font-medium">Edit Event</span>
                </Link>
              )}
              {/* Share Dropdown */}
              <ShareDropdown 
                url={`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/events/${eventId}`}
                title={event.title}
                eventTitle={event.title}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event Header Image */}
      <div className="relative h-64 md:h-80 lg:h-96">
        <img src={getImageUrl()} alt={event.title} className="w-full h-full object-cover" onError={() => setImageError(true)} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="container mx-auto max-w-6xl">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {isPastEvent && <span className="px-3 py-1.5 bg-gray-500 text-white text-xs font-bold rounded-full">Past Event</span>}
                    {event.isVirtual && <span className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Virtual</span>}
                    {event.isFree && <span className="px-3 py-1.5 bg-purple-500 text-white text-xs font-bold rounded-full">FREE</span>}
                    {!event.isFree && event.price > 0 && <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full">PAID EVENT</span>}
                  </div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">{event.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-white/90">
                    <span className="flex items-center gap-2"><Calendar className="h-5 w-5" />{formatDateTime(event.startDate)}</span>
                    {!event.isVirtual && (event.venue || event.location?.address) && (
                      <span className="flex items-center gap-2"><MapPin className="h-5 w-5" />{event.venue}</span>
                    )}
                  </div>
                </div>
                {!isPastEvent && !event.isFree && event.price > 0 && (
                  <div className="text-right">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">{event.currency} {event.price.toLocaleString()}</div>
                    <p className="text-white/80 text-sm">Starting price</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-4">About This Event</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line text-base leading-relaxed">
                {event.description || 'No description provided.'}
              </p>
            </div>

            {/* Event Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-6">Event Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-5 w-5 text-gray-400" />Date & Time</h3>
                  <div><p className="text-sm text-gray-600 mb-1">Start</p><p className="font-medium">{formatDateTime(event.startDate)}</p></div>
                  <div className="mt-3"><p className="text-sm text-gray-600 mb-1">End</p><p className="font-medium">{formatDateTime(event.endDate)}</p></div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    {event.isVirtual ? <Globe className="h-5 w-5 text-gray-400" /> : <MapPin className="h-5 w-5 text-gray-400" />}
                    {event.isVirtual ? 'Virtual Event' : 'Location'}
                  </h3>
                  {!event.isVirtual ? (
                    <p className="font-medium">{event.venue || event.location?.address || 'Location TBD'}</p>
                  ) : (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2"><Globe className="h-5 w-5 text-blue-500" /><span className="font-semibold">Virtual Event</span></div>
                      <p className="text-sm text-gray-600">Joining details will be provided after ticket purchase</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
                <div><h3 className="font-semibold mb-3 flex items-center gap-2"><Tag className="h-5 w-5 text-gray-400" />Category</h3><span className="inline-block px-3 py-1.5 bg-gray-100 rounded-full text-sm">{event.category.charAt(0).toUpperCase() + event.category.slice(1)}</span></div>
                <div><h3 className="font-semibold mb-3">Organizer</h3><div className="flex items-center gap-3"><div className="w-12 h-12 bg-primary/10 rounded-full overflow-hidden"><img src={organizerAvatar} alt={organizer.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/cackpas.jpg' }} /></div><p className="font-medium truncate">{organizer.name}</p></div></div>
              </div>
            </div>
            
            {/* Ticket Types */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-6">Available Tickets</h2>
              {isLoadingTickets ? (
                <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" /><p className="text-gray-600">Loading ticket options...</p></div>
              ) : ticketTypes.length > 0 ? (
                <div className="space-y-4">
                  {ticketTypes.map((ticketType) => {
                    const available = getAvailableTickets(ticketType)
                    const isAvailable = isTicketAvailable(ticketType)
                    return (
                      <div key={ticketType._id} onClick={() => isAvailable && handleTicketTypeSelect(ticketType)} className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${selectedTicketType?._id === ticketType._id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'} ${!isAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg mb-1">{ticketType.name}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">{ticketType.category}</span>
                                  <span className="text-sm">• {available} of {ticketType.maxSupply > 0 ? ticketType.maxSupply : (event.capacity || 'Unlimited')} left</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">{event.isFree ? 'FREE' : `₦${ticketType.price.toLocaleString()}`}</div>
                                {!event.isFree && <div className="text-sm text-gray-600">per ticket</div>}
                              </div>
                            </div>
                            {ticketType.description && <p className="text-gray-600 text-sm mb-3">{ticketType.description}</p>}
                          </div>
                          {selectedTicketType?._id === ticketType._id && <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12"><Ticket className="h-16 w-16 mx-auto text-gray-400 mb-4" /><h3 className="text-lg font-semibold mb-2">No Tickets Available</h3><p className="text-gray-600 max-w-md mx-auto">Ticket sales haven't started yet or this event doesn't have any tickets configured.</p></div>
              )}
            </div>
          </div>
          
          {/* Right Column - Purchase Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold mb-6">Get Your Ticket</h2>
                {isPastEvent ? (
                  <div className="text-center py-8"><Clock className="h-16 w-16 mx-auto text-gray-400 mb-4" /><h3 className="font-semibold mb-2">Event Has Ended</h3><Link href="/events" className="btn-primary px-6 py-3 inline-flex items-center gap-2 w-full justify-center"><Ticket className="h-4 w-4" />Browse Upcoming Events</Link></div>
                ) : (
                  <>
                    {selectedTicketType && (
                      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                        <div className="flex justify-between items-start mb-4">
                          <div><h3 className="font-semibold mb-1">{selectedTicketType.name}</h3><p className="text-sm text-gray-600">{selectedTicketType.category}</p></div>
                          <div className="text-right"><div className="text-2xl font-bold text-primary">{event.isFree ? 'FREE' : `₦${selectedTicketType.price.toLocaleString()}`}</div><div className="text-sm text-gray-600">per ticket</div></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Quantity</p>
                            <div className="flex items-center gap-3">
                              <button onClick={() => handleQuantityChange(-1)} disabled={selectedQuantity <= 1} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"><span className="text-lg">-</span></button>
                              <span className="text-xl font-semibold w-12 text-center">{selectedQuantity}</span>
                              <button onClick={() => handleQuantityChange(1)} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"><span className="text-lg">+</span></button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 mb-1">Total</p>
                            <div className="text-3xl font-bold text-primary">{event.isFree ? 'FREE' : `₦${Number(getTotalPrice()).toLocaleString()}`}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* FREE EVENT BUTTON */}
                    {event.isFree && (
                      <button onClick={handleGetFreeTicket} disabled={isGettingFreeTicket} className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50">
                        {isGettingFreeTicket ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                        {isGettingFreeTicket ? 'Processing...' : 'Get Free Ticket'}
                      </button>
                    )}
                    
                    {/* PAID EVENT - Check if user can purchase */}
                    {!event.isFree && selectedTicketType && selectedTicketType.price > 0 && (
                      <div className="space-y-4">
                        {!isLoggedIn ? (
                          <button onClick={() => login()} className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-base bg-primary hover:bg-primary-dark text-white transition-all">
                            <User className="h-5 w-5" />
                            Login to Purchase
                          </button>
                        ) : !userEmail && !isFetchingEmail ? (
                          <button onClick={() => router.push('/complete-profile')} className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-base bg-yellow-500 hover:bg-yellow-600 text-white transition-all">
                            <Mail className="h-5 w-5" />
                            Complete Profile to Purchase
                          </button>
                        ) : isFetchingEmail ? (
                          <button disabled className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-base bg-gray-400 text-white cursor-not-allowed">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading...
                          </button>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                              <button 
                                onClick={() => setSelectedPaymentMethod('paystack')} 
                                className={`flex-1 py-3 px-2 rounded-xl font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-sm sm:text-base ${
                                  selectedPaymentMethod === 'paystack' 
                                    ? 'bg-primary text-white' 
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                <CreditCard className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">Pay with Card</span>
                              </button>
                              <button 
                                onClick={() => setSelectedPaymentMethod('crypto')} 
                                className={`flex-1 py-3 px-2 rounded-xl font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-sm sm:text-base ${
                                  selectedPaymentMethod === 'crypto' 
                                    ? 'bg-primary text-white' 
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                <Wallet className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">Pay with Crypto</span>
                              </button>
                            </div>
                            
                            {selectedPaymentMethod === 'paystack' && (
                              <button 
                                onClick={handlePayWithCard} 
                                disabled={isProcessingPayment} 
                                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm sm:text-base bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-all duration-200"
                              >
                                {isProcessingPayment ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                                <span className="truncate">{isProcessingPayment ? 'Processing...' : `Pay ₦${Number(totalPrice).toLocaleString()} with Card`}</span>
                              </button>
                            )}
                            
                            {selectedPaymentMethod === 'crypto' && (
                              <button 
                                onClick={handlePayWithCrypto} 
                                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all duration-200"
                              >
                                <Wallet className="h-5 w-5" />
                                <span className="truncate">Pay with Crypto (Coming Soon)</span>
                              </button>
                            )}
                            
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              {selectedPaymentMethod === 'paystack' 
                                ? '🔒 Secure payment via Paystack (Card, Bank Transfer, USSD)' 
                                : '🚀 Crypto payments are coming soon! Stay tuned for updates.'}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {event.isFree && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-green-500" /><span className="text-sm font-medium">Email Delivery</span></div>
                        <p className="text-xs text-gray-600 mt-1">Your free ticket will be sent to your registered email address</p>
                      </div>
                    )}
                    
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Shield className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div><p className="font-medium text-sm">Secure Payment</p><p className="text-xs text-gray-600">PCI-DSS compliant payment processing</p></div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <QrCode className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        <div><p className="font-medium text-sm">Digital Ticket</p><p className="text-xs text-gray-600">QR code for easy entry</p></div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-sm text-gray-600 text-center">Need help? <a href="mailto:support@cackpass.com" className="text-primary hover:underline font-medium">Contact support</a></p>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2 mb-2"><Shield className="h-4 w-4 text-green-500" /><span className="text-sm font-medium">100% Secure Transactions</span></div>
                <p className="text-xs text-gray-500">Powered by Paystack • PCI-DSS Level 1 Certified</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}