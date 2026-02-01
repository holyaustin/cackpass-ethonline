// /app/events/[id]/page.tsx - FINAL PRODUCTION VERSION
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Calendar, MapPin, Clock, Users, Ticket, 
  Share2, Heart, ChevronLeft, ChevronRight,
  Star, Tag, Globe, Shield, QrCode, Loader2,
  ShoppingCart, CreditCard, Wallet, CheckCircle,
  AlertCircle, ArrowRight, ExternalLink, User,
  Building, Video, Youtube, Twitch, Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import PurchaseModal from '@/components/tickets/PurchaseModal'
import { usePrivy } from '@privy-io/react-auth'
import { format } from 'date-fns'
import type { EventData } from '@/types/events'

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
  metadataURI?: string
  createdAt?: string
  updatedAt?: string
}

// Main component wrapper
export default function EventPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <EventPageContent />
    </Suspense>
  )
}

function EventPageContent() {
  const params = useParams()
  const router = useRouter()
  const { authenticated, ready, user, getAccessToken } = usePrivy()
  
  const [event, setEvent] = useState<EventData | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketTypeData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [selectedTicketType, setSelectedTicketType] = useState<TicketTypeData | null>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [hasLinkedAccounts, setHasLinkedAccounts] = useState(false)
  
  const eventId = params.id as string

  // Check if user has linked accounts (for wallet)
  useEffect(() => {
    const checkLinkedAccounts = async () => {
      if (authenticated && ready) {
        try {
          const token = await getAccessToken()
          if (token) {
            const response = await fetch('/api/auth/debug', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            if (response.ok) {
              const data = await response.json()
              setHasLinkedAccounts(data.linkedAccountsCount > 0)
            }
          }
        } catch (error) {
          console.error('Failed to check linked accounts:', error)
        }
      }
    }
    
    checkLinkedAccounts()
  }, [authenticated, ready, getAccessToken])

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) return
      
      try {
        setIsLoading(true)
        
        // Fetch event details
        const eventResponse = await fetch(`/api/events/${eventId}`)
        if (!eventResponse.ok) {
          const errorData = await eventResponse.json()
          throw new Error(errorData.error || 'Failed to fetch event')
        }
        
        const eventData = await eventResponse.json()
        
        if (!eventData.success || !eventData.event) {
          throw new Error('Event not found')
        }
        
        setEvent(eventData.event)
        
        // Fetch ticket types
        setIsLoadingTickets(true)
        const ticketsResponse = await fetch(`/api/events/${eventId}/tickets`)
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json()
          if (ticketsData.success && ticketsData.ticketTypes) {
            setTicketTypes(ticketsData.ticketTypes)
            if (ticketsData.ticketTypes.length > 0) {
              setSelectedTicketType(ticketsData.ticketTypes[0])
            }
          }
        }
        
        // Check if event is in favorites
        const favorites = JSON.parse(localStorage.getItem('cackpass_favorites') || '[]')
        setIsFavorite(favorites.includes(eventId))
        
      } catch (error) {
        console.error('Error loading event:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to load event details')
        router.push('/events')
      } finally {
        setIsLoading(false)
        setIsLoadingTickets(false)
      }
    }

    fetchEventData()
  }, [eventId, router])

  // Handle purchase click
  const handlePurchaseClick = () => {
    if (!authenticated) {
      toast.error('Please sign in to purchase tickets')
      router.push(`/?redirect=/events/${eventId}`)
      return
    }

    // Check if user has a wallet (embedded wallet)
    if (!hasLinkedAccounts) {
      toast.error('Please set up your embedded wallet to purchase tickets')
      return
    }

    if (!selectedTicketType) {
      toast.error('Please select a ticket type')
      return
    }

    if (selectedTicketType.maxSupply > 0 && selectedTicketType.currentSupply >= selectedTicketType.maxSupply) {
      toast.error('This ticket type is sold out')
      return
    }

    if (selectedQuantity < 1) {
      toast.error('Please select at least one ticket')
      return
    }

    setShowPurchaseModal(true)
  }

  // Handle ticket type selection
  const handleTicketTypeSelect = (ticketType: TicketTypeData) => {
    if (ticketType.maxSupply > 0 && ticketType.currentSupply >= ticketType.maxSupply) {
      toast.error('This ticket type is sold out')
      return
    }
    
    setSelectedTicketType(ticketType)
    setSelectedQuantity(1)
  }

  // Handle quantity change
  const handleQuantityChange = (change: number) => {
    if (!selectedTicketType) return
    
    const newQuantity = selectedQuantity + change
    const maxAvailable = selectedTicketType.maxSupply > 0 
      ? selectedTicketType.maxSupply - selectedTicketType.currentSupply
      : 10 // Default max for unlimited
    
    if (newQuantity < 1) {
      toast.error('Minimum quantity is 1')
      return
    }
    
    if (newQuantity > maxAvailable) {
      toast.error(`Only ${maxAvailable} tickets available`)
      return
    }
    
    setSelectedQuantity(newQuantity)
  }

  // Handle share event
  const handleShare = async () => {
    try {
      const shareData = {
        title: event?.title || 'Check out this event',
        text: `Check out "${event?.title}" on CACK-pass`,
        url: window.location.href,
      }
      
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
      if (!(error instanceof Error) || !error.message.includes('AbortError')) {
        toast.error('Failed to share event')
      }
    }
  }

  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    const favorites = JSON.parse(localStorage.getItem('cackpass_favorites') || '[]')
    
    if (isFavorite) {
      const newFavorites = favorites.filter((id: string) => id !== eventId)
      localStorage.setItem('cackpass_favorites', JSON.stringify(newFavorites))
      setIsFavorite(false)
      toast.success('Removed from favorites')
    } else {
      if (favorites.length >= 50) {
        toast.error('Maximum 50 favorites allowed')
        return
      }
      favorites.push(eventId)
      localStorage.setItem('cackpass_favorites', JSON.stringify(favorites))
      setIsFavorite(true)
      toast.success('Added to favorites')
    }
  }

  // Format date and time
  const formatDateTime = (dateString: string, includeTime: boolean = true) => {
    if (!dateString) return 'Date TBD'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      
      if (includeTime) {
        return format(date, 'MMM d, yyyy • h:mm a')
      }
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      return 'Invalid date'
    }
  }

  // Get image URL with fallback
  const getImageUrl = () => {
    if (imageError) return '/placeholder-event.jpg'
    
    if (event?.imageCid) {
      return `https://gateway.pinata.cloud/ipfs/${event.imageCid}`
    }
    
    if (event?.bannerImage && event.bannerImage.startsWith('http')) {
      return event.bannerImage
    }
    
    return '/placeholder-event.jpg'
  }

  // Calculate available tickets
  const getAvailableTickets = (ticketType: TicketTypeData) => {
    if (ticketType.maxSupply === 0) return 'Unlimited'
    const available = ticketType.maxSupply - ticketType.currentSupply
    return Math.max(0, available)
  }

  // Check if ticket is available
  const isTicketAvailable = (ticketType: TicketTypeData) => {
    if (ticketType.maxSupply === 0) return true
    return ticketType.currentSupply < ticketType.maxSupply
  }

  // Get total price
  const getTotalPrice = () => {
    if (!selectedTicketType || !event?.isFree) return (selectedTicketType?.price || 0 * selectedQuantity).toFixed(2)
    return '0.00'
  }

  // Render virtual event info
  const renderVirtualInfo = () => {
    if (!event?.isVirtual) return null
    
    return (
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5 text-blue-500" />
          <span className="font-semibold">Virtual Event</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Joining details will be provided after ticket purchase
        </p>
      </div>
    )
  }

  // Check if event is in the past
  const isPastEvent = event?.endDate ? new Date(event.endDate) < new Date() : false

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading event details..." />
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center p-8 max-w-md">
          <AlertCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/events"
            className="btn-primary px-6 py-3 inline-flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Browse Events
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Back Navigation */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleFavoriteToggle}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Share event"
              >
                <Share2 className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Event Header Image */}
      <div className="relative h-64 md:h-80 lg:h-96">
        <img
          src={getImageUrl()}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="container mx-auto max-w-6xl">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {isPastEvent && (
                      <span className="px-3 py-1.5 bg-gray-500 text-white text-xs font-bold rounded-full">
                        Past Event
                      </span>
                    )}
                    {event.isVirtual && (
                      <span className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        Virtual
                      </span>
                    )}
                    {event.onChainId && (
                      <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        On-Chain Ticket
                      </span>
                    )}
                    {event.isFree && (
                      <span className="px-3 py-1.5 bg-purple-500 text-white text-xs font-bold rounded-full">
                        FREE
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">{event.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-white/90">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {formatDateTime(event.startDate)}
                    </span>
                    {!event.isVirtual && event.venue && (
                      <span className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {event.venue}
                      </span>
                    )}
                  </div>
                </div>
                
                {!isPastEvent && (
                  <div className="text-right">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                      {event.isFree ? 'FREE' : `${event.currency} ${event.price}`}
                    </div>
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
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-4">Event Details</h2>
              
              {/* Description */}
              <div className="mb-6">
                <div className={`prose prose-gray dark:prose-invert max-w-none ${
                  !showFullDescription && event.description && event.description.length > 200 
                    ? 'line-clamp-3' 
                    : ''
                }`}>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {event.description || 'No description provided.'}
                  </p>
                </div>
                {event.description && event.description.length > 200 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-primary font-medium mt-3 hover:underline transition-colors"
                  >
                    {showFullDescription ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
              
              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date & Time */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    Date & Time
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Start</p>
                      <p className="font-medium">
                        {formatDateTime(event.startDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">End</p>
                      <p className="font-medium">
                        {formatDateTime(event.endDate)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Location */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    {event.isVirtual ? (
                      <Globe className="h-5 w-5 text-gray-400" />
                    ) : (
                      <MapPin className="h-5 w-5 text-gray-400" />
                    )}
                    {event.isVirtual ? 'Virtual Event' : 'Location'}
                  </h3>
                  <div>
                    {!event.isVirtual ? (
                      <p className="font-medium">{event.venue || 'Location TBD'}</p>
                    ) : (
                      renderVirtualInfo()
                    )}
                  </div>
                </div>
              </div>
              
              {/* Category & Organizer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                {/* Category */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-gray-400" />
                    Category
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-block px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                      {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                    </span>
                  </div>
                </div>
                
                {/* Organizer Info */}
                <div>
                  <h3 className="font-semibold mb-3">Organizer</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <img
                        src={event.organizer.avatar || '/placeholder-avatar.jpg'}
                        alt={event.organizer.name}
                        className="w-10 h-10 rounded-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {event.organizer.name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Ticket Types Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-6">Available Tickets</h2>
              
              {isLoadingTickets ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading ticket options...</p>
                </div>
              ) : ticketTypes.length > 0 ? (
                <div className="space-y-4">
                  {ticketTypes.map((ticketType) => {
                    const available = getAvailableTickets(ticketType)
                    const isAvailable = isTicketAvailable(ticketType)
                    
                    return (
                      <div
                        key={ticketType._id}
                        onClick={() => isAvailable && handleTicketTypeSelect(ticketType)}
                        className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedTicketType?._id === ticketType._id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        } ${!isAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg mb-1">{ticketType.name}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {ticketType.category}
                                  </span>
                                  {ticketType.maxSupply > 0 && (
                                    <span className="text-sm">
                                      • {available} of {ticketType.maxSupply} left
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">
                                  {event.isFree ? 'FREE' : `${event.currency} ${ticketType.price}`}
                                </div>
                                {!event.isFree && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    per ticket
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {ticketType.description && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                                {ticketType.description}
                              </p>
                            )}
                            
                            {!isAvailable && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-medium">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Sold Out
                              </div>
                            )}
                          </div>
                          
                          {selectedTicketType?._id === ticketType._id && (
                            <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Ticket className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Tickets Available</h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Ticket sales haven't started yet or this event doesn't have any tickets configured.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Purchase Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold mb-6">Get Your Ticket</h2>
                
                {isPastEvent ? (
                  <div className="text-center py-8">
                    <Clock className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="font-semibold mb-2">Event Has Ended</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      This event has already taken place. Check out upcoming events below.
                    </p>
                    <Link
                      href="/events"
                      className="btn-primary px-6 py-3 inline-flex items-center gap-2 w-full justify-center"
                    >
                      <Ticket className="h-4 w-4" />
                      Browse Upcoming Events
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Selected Ticket Info */}
                    {selectedTicketType && (
                      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold mb-1">{selectedTicketType.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedTicketType.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {event.isFree ? 'FREE' : `${event.currency} ${selectedTicketType.price}`}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              per ticket
                            </div>
                          </div>
                        </div>
                        
                        {/* Quantity Selector */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quantity</p>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleQuantityChange(-1)}
                                disabled={selectedQuantity <= 1}
                                className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <span className="text-lg">-</span>
                              </button>
                              <span className="text-xl font-semibold w-12 text-center">
                                {selectedQuantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(1)}
                                className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <span className="text-lg">+</span>
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
                            <div className="text-3xl font-bold text-primary">
                              {event.isFree ? 'FREE' : `${event.currency} ${getTotalPrice()}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Purchase Button */}
                    <button
                      onClick={handlePurchaseClick}
                      disabled={isLoadingTickets || !selectedTicketType || !isTicketAvailable(selectedTicketType!)}
                      className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg transition-all duration-200"
                    >
                      {isLoadingTickets ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Loading...
                        </>
                      ) : !selectedTicketType ? (
                        'Select a Ticket Type'
                      ) : !isTicketAvailable(selectedTicketType) ? (
                        'Sold Out'
                      ) : event.isFree ? (
                        <>
                          <Ticket className="h-5 w-5" />
                          Get Free Ticket
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-5 w-5" />
                          Purchase Ticket
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                    
                    {/* Security & Features */}
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <Shield className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Secure Payment</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Encrypted connection & secure processing
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <QrCode className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Digital Ticket</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            QR code for easy entry
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <Wallet className="h-5 w-5 text-purple-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Embedded Wallet</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Works with your Privy wallet
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Need Help */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Need help?{' '}
                        <a 
                          href="mailto:support@cackpass.com" 
                          className="text-primary hover:underline font-medium"
                        >
                          Contact our support team
                        </a>
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Blockchain Info */}
              {event.onChainId && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">On-Chain Ticket</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    This ticket is stored on the blockchain for maximum security.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {event && selectedTicketType && (
        <PurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
            toast.success('Ticket purchased successfully!')
            router.push(`/dashboard/tickets`)
          }}
          event={{
            id: event.id,
            title: event.title,
            startDate: event.startDate,
            venue: event.venue,
            isFree: event.isFree,
            price: selectedTicketType.price,
            currency: event.currency,
            imageCid: event.imageCid,
            onChainId: event.onChainId,
            description: event.description,
            endDate: event.endDate,
            isVirtual: event.isVirtual,
            category: event.category,
            organizer: event.organizer
          }}
          ticketType={{
            _id: selectedTicketType._id,
            id: selectedTicketType._id,
            name: selectedTicketType.name,
            category: selectedTicketType.category,
            price: selectedTicketType.price,
            maxSupply: selectedTicketType.maxSupply,
            currentSupply: selectedTicketType.currentSupply
          }}
          quantity={selectedQuantity}
        />
      )}
    </div>
  )
}