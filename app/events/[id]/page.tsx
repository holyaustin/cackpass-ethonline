'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Calendar, MapPin, Users, Ticket, Clock, Globe, 
  Share2, Heart, ArrowLeft, Loader2, Check, 
  CreditCard, Wallet, Shield, QrCode,
  ChevronRight, ExternalLink, Map, Video, 
  User, Mail, Phone, Building, Info,
  Zap, Smartphone, Mail as MailIcon, Send,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { usePrivy } from '@privy-io/react-auth'
import { format } from 'date-fns'
import { useAccount } from 'wagmi'
import { getCackPassCore } from '@/lib/contracts/client'

// Types
interface Event {
  _id: string
  title: string
  description: string
  venue: string
  location?: {
    address?: string
    lat?: number
    lng?: number
  }
  startDate: string
  endDate: string
  startDateTime?: string
  endDateTime?: string
  bannerImage?: string
  imageCid?: string
  category: string
  customCategory?: string
  isVirtual: boolean
  virtualOptions?: {
    zoomMeeting: boolean
    googleMeet: boolean
    hasVirtualLink: boolean
    virtualLink: string
    platform?: string
    meetingId?: string
    password?: string
  }
  isFree: boolean
  price: number
  currency: string
  ticketType: string
  unlimitedCapacity: boolean
  capacity?: number
  organizerId?: any
  organizerWallet: string
  isOnChain: boolean
  transactionHash?: string
  onChainId?: number
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface TicketType {
  _id: string
  name: string
  description?: string
  category: string
  price: number
  maxSupply: number
  currentSupply: number
  isActive: boolean
  isOnChain?: boolean
  onChainCategory?: number
  metadata?: {
    image?: string
    attributes?: Array<{
      trait_type: string
      value: string
    }>
  }
}

interface Organizer {
  _id: string
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  walletAddress?: string
  profileImage?: string
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params as { id: string }
  const { authenticated, ready, user, login } = usePrivy()
  const { isConnected, address: walletAddress } = useAccount()
  
  // State
  const [event, setEvent] = useState<Event | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [organizer, setOrganizer] = useState<Organizer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTicketType, setSelectedTicketType] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'tickets' | 'organizer'>('details')
  const [isFavorite, setIsFavorite] = useState(false)
  const [onChainEventData, setOnChainEventData] = useState<any>(null)

  // Fetch event data
  const fetchEventDetails = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${id}`)
      if (!eventResponse.ok) {
        throw new Error('Event not found')
      }
      
      const eventData = await eventResponse.json()
      setEvent(eventData.event)
      
      // Fetch ticket types for this event
      if (eventData.event._id) {
        const ticketsResponse = await fetch(`/api/events/${id}/tickets`)
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json()
          setTicketTypes(ticketsData.ticketTypes || [])
          
          // Set first ticket type as default if available
          if (ticketsData.ticketTypes?.length > 0) {
            setSelectedTicketType(ticketsData.ticketTypes[0]._id)
          }
        }
        
        // Fetch organizer details
        if (eventData.event.organizerId) {
          const organizerResponse = await fetch(`/api/users/${eventData.event.organizerId}`)
          if (organizerResponse.ok) {
            const organizerData = await organizerResponse.json()
            setOrganizer(organizerData.user)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching event details:', error)
      toast.error('Failed to load event details')
      router.push('/events')
    } finally {
      setIsLoading(false)
    }
  }, [id, router])

  // Fetch on-chain data if event is on-chain
  const fetchOnChainData = useCallback(async () => {
    if (!event?.isOnChain || !event?.onChainId) return
    
    try {
      const contract = getCackPassCore()
      const eventData = await contract.events(event.onChainId)
      setOnChainEventData(eventData)
    } catch (error) {
      console.error('Error fetching on-chain event data:', error)
    }
  }, [event])

  // Load data on mount
  useEffect(() => {
    if (id) {
      fetchEventDetails()
    }
  }, [id, fetchEventDetails])

  // Load on-chain data when event is loaded
  useEffect(() => {
    if (event?.isOnChain) {
      fetchOnChainData()
    }
  }, [event, fetchOnChainData])

  // Utility functions
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'EEEE, MMMM d, yyyy')
    } catch {
      return 'Date not available'
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'h:mm a')
    } catch {
      return 'Time not available'
    }
  }

  const formatDateTimeRange = () => {
    if (!event) return ''
    
    try {
      const startDate = new Date(event.startDateTime || event.startDate)
      const endDate = new Date(event.endDateTime || event.endDate)
      
      if (startDate.toDateString() === endDate.toDateString()) {
        return `${formatDate(event.startDate)} • ${formatTime(event.startDateTime || event.startDate)} - ${formatTime(event.endDateTime || event.endDate)}`
      } else {
        return `${formatDate(event.startDate)} ${formatTime(event.startDateTime || event.startDate)} - ${formatDate(event.endDate)} ${formatTime(event.endDateTime || event.endDate)}`
      }
    } catch {
      return 'Date/time not available'
    }
  }

  const getRemainingTickets = (ticketType: TicketType) => {
    return Math.max(0, ticketType.maxSupply - ticketType.currentSupply)
  }

  const calculateTotalPrice = () => {
    if (!selectedTicketType || !event) return 0
    
    const ticket = ticketTypes.find(t => t._id === selectedTicketType)
    if (!ticket) return 0
    
    return ticket.price * quantity
  }

  // Handle ticket purchase
  const handleTicketPurchase = async () => {
    // Validation
    if (!authenticated) {
      toast.error('Please login to purchase tickets')
      login()
      return
    }

    if (!ready) {
      toast.error('Please wait while we prepare your session')
      return
    }

    if (!selectedTicketType) {
      toast.error('Please select a ticket type')
      return
    }

    const ticket = ticketTypes.find(t => t._id === selectedTicketType)
    if (!ticket) {
      toast.error('Invalid ticket selection')
      return
    }

    // Check if ticket is active
    if (!ticket.isActive) {
      toast.error('This ticket type is no longer available')
      return
    }

    const remaining = getRemainingTickets(ticket)
    if (remaining < quantity) {
      toast.error(`Only ${remaining} ticket${remaining !== 1 ? 's' : ''} available`)
      return
    }

    setIsProcessing(true)

    try {
      // Determine ticket type and route accordingly
      if (ticket.price === 0) {
        // Free ticket - send email
        await handleFreeTicket(ticket)
      } else if (event?.isOnChain && event?.onChainId && ticket.isOnChain) {
        // Paid on-chain ticket - gasless minting
        await handlePaidOnChainTicket(ticket)
      } else {
        // Paid off-chain ticket
        await handlePaidOffChainTicket(ticket)
      }
    } catch (error: any) {
      console.error('Ticket processing error:', error)
      toast.error(error.message || 'Failed to process ticket. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle free tickets
  const handleFreeTicket = async (ticket: TicketType) => {
    try {
      const response = await fetch('/api/tickets/free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketTypeId: selectedTicketType,
          quantity,
          eventId: id,
          userEmail: user?.email?.address || '',
          userName: user?.email?.address || 'Guest',
          userId: user?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to claim free ticket')
      }

      const data = await response.json()
      
      toast.success('Free ticket claimed! Check your email for details.')
      
      // Refresh ticket availability
      fetchEventDetails()
      
      // Redirect to tickets page
      router.push(`/dashboard/tickets?claimed=${data.ticketId}`)
      
    } catch (error: any) {
      console.error('Free ticket error:', error)
      throw error
    }
  }

  // Handle paid on-chain tickets
  const handlePaidOnChainTicket = async (ticket: TicketType) => {
    // Validate wallet connection for on-chain tickets
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your Web3 wallet to mint NFT tickets')
      // You might want to trigger wallet connection here
      return
    }

    try {
      // Step 1: Process payment
      const paymentResponse = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketTypeId: selectedTicketType,
          quantity,
          amount: ticket.price * quantity,
          currency: event?.currency || 'USD',
          userEmail: user?.email?.address || '',
          walletAddress: walletAddress,
          userId: user?.id,
          eventId: id
        })
      })

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json()
        throw new Error(error.message || 'Payment processing failed')
      }

      const paymentData = await paymentResponse.json()
      
      // Step 2: Get mint approval
      const approvalResponse = await fetch('/api/mint/approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: walletAddress,
          eventId: event?.onChainId,
          ticketCategory: ticket.onChainCategory || 0,
          amount: quantity,
          price: ticket.price.toString(),
          paymentReference: paymentData.paymentId
        })
      })

      if (!approvalResponse.ok) {
        const error = await approvalResponse.json()
        throw new Error(error.message || 'Failed to get mint approval')
      }

      const { approval, signature } = await approvalResponse.json()
      
      // Step 3: Execute mint
      const mintResponse = await fetch('/api/mint/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval,
          signature,
          walletAddress
        })
      })

      if (!mintResponse.ok) {
        const error = await mintResponse.json()
        throw new Error(error.message || 'Minting failed')
      }

      const mintData = await mintResponse.json()
      
      toast.success('NFT ticket minted successfully! Check your wallet.')
      
      // Refresh ticket availability
      fetchEventDetails()
      
      // Redirect to tickets page
      router.push(`/dashboard/tickets?minted=${mintData.ticketId}&tx=${mintData.transactionHash}`)
      
    } catch (error: any) {
      console.error('Paid on-chain ticket error:', error)
      throw error
    }
  }

  // Handle paid off-chain tickets
  const handlePaidOffChainTicket = async (ticket: TicketType) => {
    try {
      const purchaseResponse = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketTypeId: selectedTicketType,
          quantity,
          amount: ticket.price * quantity,
          currency: event?.currency || 'USD',
          paymentMethod: 'crypto',
          userEmail: user?.email?.address || '',
          walletAddress: user?.wallet?.address || '',
          userId: user?.id,
          eventId: id
        })
      })

      if (!purchaseResponse.ok) {
        const error = await purchaseResponse.json()
        throw new Error(error.message || 'Purchase failed')
      }

      const purchaseData = await purchaseResponse.json()
      
      toast.success('Ticket purchase successful!')
      
      // Refresh ticket availability
      fetchEventDetails()
      
      // Redirect to tickets page
      router.push(`/dashboard/tickets?purchased=${purchaseData.orderId}`)
      
    } catch (error: any) {
      console.error('Paid off-chain ticket error:', error)
      throw error
    }
  }

  // Helper functions
  const shareEvent = () => {
    if (navigator.share) {
      navigator.share({
        title: event?.title,
        text: `Check out this event: ${event?.title}`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Event link copied to clipboard!')
    }
  }

  const toggleFavorite = async () => {
    if (!authenticated) {
      toast.error('Please login to save favorites')
      login()
      return
    }

    try {
      const response = await fetch('/api/events/favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: id,
          userId: user?.id
        })
      })

      if (response.ok) {
        const newFavoriteState = !isFavorite
        setIsFavorite(newFavoriteState)
        toast.success(newFavoriteState ? 'Added to favorites' : 'Removed from favorites')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorites')
    }
  }

  // Determine ticket type properties
  const selectedTicket = ticketTypes.find(t => t._id === selectedTicketType)
  const isFreeTicket = selectedTicket?.price === 0
  const isOnChainPaidTicket = event?.isOnChain && selectedTicket?.isOnChain && !isFreeTicket
  const totalPrice = calculateTotalPrice()

  // Check if purchase button should be disabled
  const isPurchaseDisabled = (): boolean => {
    if (!selectedTicketType) return true
    if (isProcessing) return true
    if (isOnChainPaidTicket && !isConnected) return true
    return false
  }

  // Get button text
  const getPurchaseButtonText = () => {
    if (isProcessing) return 'Processing...'
    if (isFreeTicket) return 'Claim Free Ticket'
    if (isOnChainPaidTicket) return 'Purchase & Mint NFT'
    return 'Purchase Ticket'
  }

  // Get button icon
  const getPurchaseButtonIcon = () => {
    if (isProcessing) return <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
    if (isFreeTicket) return <MailIcon className="h-5 w-5 inline mr-2" />
    if (isOnChainPaidTicket) return <Zap className="h-5 w-5 inline mr-2" />
    return <CreditCard className="h-5 w-5 inline mr-2" />
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-primary animate-spin-slow flex items-center justify-center">
            <Ticket className="h-8 w-8 text-white" />
          </div>
          <p className="text-text-light text-lg">Loading event details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background">
        <div className="text-center">
          <Ticket className="h-16 w-16 mx-auto text-primary mb-6" />
          <h2 className="text-2xl font-bold text-text mb-3">Event Not Found</h2>
          <p className="text-text-light mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <Link href="/events" className="btn-primary px-6 py-3">
            Browse Events
          </Link>
        </div>
      </div>
    )
  }

  // Image URL
  const imageUrl = event.imageCid 
    ? `https://gateway.pinata.cloud/ipfs/${event.imageCid}`
    : event.bannerImage || '/placeholder-event.jpg'

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Hero Section */}
      <div className="relative h-[60vh] max-h-[600px] overflow-hidden">
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="responsive-container py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="glass p-3 rounded-xl hover:bg-white/20 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={toggleFavorite}
                  className="glass p-3 rounded-xl hover:bg-white/20 transition-colors"
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </button>
                <button
                  onClick={shareEvent}
                  className="glass p-3 rounded-xl hover:bg-white/20 transition-colors"
                  aria-label="Share event"
                >
                  <Share2 className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Event Title */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="responsive-container pb-12">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2 mb-4">
                {event.isFree ? (
                  <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold rounded-full">
                    FREE EVENT
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold rounded-full">
                    PAID EVENT • {event.currency} {event.price.toFixed(2)}
                  </span>
                )}
                
                {event.isVirtual && (
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold rounded-full flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Virtual Event
                  </span>
                )}
                
                {event.isOnChain && (
                  <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    On-chain Tickets
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                {event.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{formatDateTimeRange()}</span>
                </div>
                
                {!event.isVirtual && event.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>{event.venue}</span>
                  </div>
                )}
                
                {event.virtualOptions?.virtualLink && (
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    <span>Virtual Access Available</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="responsive-container py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-4 font-medium text-lg border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-light hover:text-text'
                }`}
                aria-selected={activeTab === 'details'}
              >
                <Info className="h-5 w-5 inline mr-2" />
                Details
              </button>
              
              <button
                onClick={() => setActiveTab('tickets')}
                className={`px-6 py-4 font-medium text-lg border-b-2 transition-colors ${
                  activeTab === 'tickets'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-light hover:text-text'
                }`}
                aria-selected={activeTab === 'tickets'}
              >
                <Ticket className="h-5 w-5 inline mr-2" />
                Tickets
              </button>
              
              <button
                onClick={() => setActiveTab('organizer')}
                className={`px-6 py-4 font-medium text-lg border-b-2 transition-colors ${
                  activeTab === 'organizer'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-light hover:text-text'
                }`}
                aria-selected={activeTab === 'organizer'}
              >
                <User className="h-5 w-5 inline mr-2" />
                Organizer
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <EventDetailsTab 
                event={event} 
                formatDate={formatDate}
                formatTime={formatTime}
                isOnChainEvent={event.isOnChain}
              />
            )}

            {activeTab === 'tickets' && (
              <TicketsTab 
                ticketTypes={ticketTypes}
                selectedTicketType={selectedTicketType}
                setSelectedTicketType={setSelectedTicketType}
                quantity={quantity}
                setQuantity={setQuantity}
                getRemainingTickets={getRemainingTickets}
                isOnChainEvent={event.isOnChain}
                totalPrice={totalPrice}
                currency={event.currency}
                isFreeEvent={event.isFree}
              />
            )}

            {activeTab === 'organizer' && (
              <OrganizerTab 
                organizer={organizer}
                isOnChainEvent={event.isOnChain}
              />
            )}
          </div>

          {/* Right Column - Purchase Panel */}
          <div className="lg:col-span-1">
            <PurchasePanel
              selectedTicketType={selectedTicketType}
              ticketTypes={ticketTypes}
              quantity={quantity}
              totalPrice={totalPrice}
              currency={event.currency}
              isFreeEvent={event.isFree}
              isOnChainPaidTicket={isOnChainPaidTicket}
              isConnected={isConnected}
              isFreeTicket={isFreeTicket}
              isProcessing={isProcessing}
              isPurchaseDisabled={isPurchaseDisabled()}
              authenticated={authenticated}
              getPurchaseButtonText={getPurchaseButtonText}
              getPurchaseButtonIcon={getPurchaseButtonIcon}
              handleTicketPurchase={handleTicketPurchase}
              login={login}
              event={event}
              formatDate={formatDate}
              formatTime={formatTime}
              shareEvent={shareEvent}
              toggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Sub-components for better organization

const EventDetailsTab = ({ 
  event, 
  formatDate, 
  formatTime,
  isOnChainEvent 
}: { 
  event: Event
  formatDate: (date: string) => string
  formatTime: (date: string) => string
  isOnChainEvent: boolean
}) => (
  <div className="space-y-8">
    {/* Event Description */}
    <div className="card p-8">
      <h3 className="text-2xl font-bold text-text mb-6">About This Event</h3>
      <div className="prose max-w-none text-text">
        {event.description ? (
          <p className="whitespace-pre-line text-lg leading-relaxed">{event.description}</p>
        ) : (
          <p className="text-text-light italic">No description provided.</p>
        )}
      </div>
    </div>

    {/* Event Details */}
    <div className="card p-8">
      <h3 className="text-2xl font-bold text-text mb-6">Event Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Date & Time */}
          <div>
            <h4 className="font-semibold text-text-light mb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date & Time
            </h4>
            <div className="text-text">
              <div className="font-medium">{formatDate(event.startDate)}</div>
              <div className="text-text-light">
                {formatTime(event.startDateTime || event.startDate)} - {formatTime(event.endDateTime || event.endDate)}
              </div>
            </div>
          </div>

          {/* Location */}
          {!event.isVirtual ? (
            <div>
              <h4 className="font-semibold text-text-light mb-2 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </h4>
              <div className="text-text">
                <div className="font-medium">{event.venue}</div>
                {event.location?.address && (
                  <div className="text-text-light">{event.location.address}</div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-semibold text-text-light mb-2 flex items-center gap-2">
                <Video className="h-5 w-5" />
                Virtual Access
              </h4>
              <div className="text-text">
                <div className="font-medium">Online Event</div>
                {event.virtualOptions?.virtualLink && (
                  <a
                    href={event.virtualOptions.virtualLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    Join Event <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <h4 className="font-semibold text-text-light mb-2 flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Category
            </h4>
            <div className="text-text">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {event.customCategory || event.category}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Capacity */}
          <div>
            <h4 className="font-semibold text-text-light mb-2 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Capacity
            </h4>
            <div className="text-text">
              {event.unlimitedCapacity ? (
                <div className="font-medium">Unlimited Capacity</div>
              ) : (
                <div className="font-medium">{event.capacity || 0} spots total</div>
              )}
              {!event.unlimitedCapacity && event.capacity && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-full rounded-full"
                    style={{ width: '75%' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Ticket Type */}
          <div>
            <h4 className="font-semibold text-text-light mb-2 flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Ticket Type
            </h4>
            <div className="text-text">
              <span className="font-medium">{event.ticketType}</span>
            </div>
          </div>

          {/* Blockchain Status */}
          {isOnChainEvent && (
            <div>
              <h4 className="font-semibold text-text-light mb-2 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                On-chain Tickets
              </h4>
              <div className="text-text">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Blockchain verified</span>
                </div>
                <div className="text-sm text-text-light mt-1">
                  Paid tickets are minted as NFTs with gasless technology
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Virtual Event Details */}
    {event.isVirtual && event.virtualOptions && (
      <VirtualEventDetails virtualOptions={event.virtualOptions} />
    )}
  </div>
)

const VirtualEventDetails = ({ virtualOptions }: { virtualOptions: Event['virtualOptions'] }) => (
  <div className="card p-8">
    <h3 className="text-2xl font-bold text-text mb-6">Virtual Event Access</h3>
    <div className="space-y-4">
      {virtualOptions?.zoomMeeting && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Video className="h-6 w-6 text-blue-500" />
          <div>
            <div className="font-semibold">Zoom Meeting</div>
            <div className="text-sm text-text-light">
              This event will be hosted on Zoom. Meeting details will be provided after ticket purchase.
            </div>
          </div>
        </div>
      )}
      
      {virtualOptions?.googleMeet && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <Video className="h-6 w-6 text-green-500" />
          <div>
            <div className="font-semibold">Google Meet</div>
            <div className="text-sm text-text-light">
              This event will be hosted on Google Meet. Meeting link will be provided after ticket purchase.
            </div>
          </div>
        </div>
      )}
      
      {virtualOptions?.virtualLink && (
        <div className="mt-4">
          <a
            href={virtualOptions.virtualLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Video className="h-5 w-5" />
            Join Virtual Event
          </a>
        </div>
      )}
    </div>
  </div>
)

const TicketsTab = ({
  ticketTypes,
  selectedTicketType,
  setSelectedTicketType,
  quantity,
  setQuantity,
  getRemainingTickets,
  isOnChainEvent,
  totalPrice,
  currency,
  isFreeEvent
}: any) => (
  <div className="space-y-8">
    {/* Available Tickets */}
    <div className="card p-8">
      <h3 className="text-2xl font-bold text-text mb-6">Available Tickets</h3>
      
      {ticketTypes.length === 0 ? (
        <div className="text-center py-8">
          <Ticket className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-text-light">No tickets available for this event.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ticketTypes.map((ticket: TicketType) => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              isSelected={selectedTicketType === ticket._id}
              onSelect={() => setSelectedTicketType(ticket._id)}
              getRemainingTickets={getRemainingTickets}
              isOnChainEvent={isOnChainEvent}
              currency={currency}
              isFreeEvent={isFreeEvent}
            />
          ))}
        </div>
      )}
    </div>

    {/* Quantity Selector */}
    {selectedTicketType && (
      <div className="card p-8">
        <h3 className="text-2xl font-bold text-text mb-6">Select Quantity</h3>
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-sm text-text-light mb-1">Number of Tickets</div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="text-3xl font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-text-light mb-1">Total Price</div>
            {isFreeEvent || totalPrice === 0 ? (
              <div className="text-4xl font-bold text-green-600">FREE</div>
            ) : (
              <div className="text-4xl font-bold text-primary">
                {currency} {totalPrice.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
)

const TicketCard = ({
  ticket,
  isSelected,
  onSelect,
  getRemainingTickets,
  isOnChainEvent,
  currency,
  isFreeEvent
}: any) => {
  const remaining = getRemainingTickets(ticket)
  const percentageSold = ticket.maxSupply > 0 
    ? Math.min(100, (ticket.currentSupply / ticket.maxSupply) * 100)
    : 0
  
  return (
    <div
      onClick={onSelect}
      className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${!ticket.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
      role="button"
      tabIndex={0}
      aria-disabled={!ticket.isActive}
      onKeyDown={(e) => e.key === 'Enter' && ticket.isActive && onSelect()}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-lg mb-2">{ticket.name}</h4>
          <p className="text-text-light mb-3">{ticket.description || 'Standard admission ticket'}</p>
          
          {/* Delivery Method Badge */}
          <div className="flex items-center gap-2 mb-3">
            {ticket.price === 0 ? (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium flex items-center gap-1">
                <MailIcon className="h-3 w-3" />
                Email Delivery
              </span>
            ) : isOnChainEvent && ticket.isOnChain ? (
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium flex items-center gap-1">
                <Zap className="h-3 w-3" />
                NFT Minting
              </span>
            ) : (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Digital Ticket
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-light">Category: {ticket.category}</span>
            <span className="text-text-light">
              Available: {remaining} of {ticket.maxSupply}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          {isFreeEvent || ticket.price === 0 ? (
            <div className="text-2xl font-bold text-green-600">FREE</div>
          ) : (
            <div className="text-2xl font-bold text-primary">
              {currency} {ticket.price.toFixed(2)}
            </div>
          )}
          <div className="text-sm text-text-light">per ticket</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      {ticket.maxSupply > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-text-light mb-1">
            <span>{ticket.currentSupply} sold</span>
            <span>{remaining} remaining</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${percentageSold}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const OrganizerTab = ({ organizer, isOnChainEvent }: any) => (
  <div className="space-y-8">
    {/* Organizer Profile */}
    <div className="card p-8">
      <h3 className="text-2xl font-bold text-text mb-6">Event Organizer</h3>
      
      {organizer ? (
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold">
            {organizer.firstName?.[0] || organizer.username?.[0] || 'O'}
          </div>
          
          <div className="flex-1">
            <h4 className="text-xl font-bold mb-2">
              {organizer.firstName && organizer.lastName 
                ? `${organizer.firstName} ${organizer.lastName}`
                : organizer.username || 'Event Organizer'
              }
            </h4>
            
            <div className="space-y-3 mb-6">
              {organizer.email && (
                <div className="flex items-center gap-2 text-text-light">
                  <Mail className="h-4 w-4" />
                  <span>{organizer.email}</span>
                </div>
              )}
              
              {organizer.walletAddress && (
                <div className="flex items-center gap-2 text-text-light">
                  <Wallet className="h-4 w-4" />
                  <span className="font-mono text-sm">
                    {organizer.walletAddress.slice(0, 6)}...{organizer.walletAddress.slice(-4)}
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-text-light">
              This event is organized by {organizer.firstName || organizer.username || 'the organizer'}. 
              All tickets are verified and secure.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-text-light">Organizer information not available.</p>
        </div>
      )}
    </div>

    {/* Trust & Safety */}
    <div className="card p-8">
      <h3 className="text-2xl font-bold text-text mb-6">Trust & Safety</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Secure Delivery</h4>
            <p className="text-text-light text-sm">
              Free tickets via email. Paid tickets as secure NFT tickets.
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <QrCode className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Digital Tickets</h4>
            <p className="text-text-light text-sm">
              All tickets are digital for easy access and verification.
            </p>
          </div>
        </div>
        
        {isOnChainEvent && (
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold mb-2">Gasless NFT Minting</h4>
              <p className="text-text-light text-sm">
                Paid tickets are minted as NFTs with zero gas fees required.
              </p>
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h4 className="font-semibold mb-2">24/7 Support</h4>
            <p className="text-text-light text-sm">
              Get help anytime with our dedicated support team for any event issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
)

const PurchasePanel = ({
  selectedTicketType,
  ticketTypes,
  quantity,
  totalPrice,
  currency,
  isFreeEvent,
  isOnChainPaidTicket,
  isConnected,
  isFreeTicket,
  isProcessing,
  isPurchaseDisabled,
  authenticated,
  getPurchaseButtonText,
  getPurchaseButtonIcon,
  handleTicketPurchase,
  login,
  event,
  formatDate,
  formatTime,
  shareEvent,
  toggleFavorite,
  isFavorite
}: any) => (
  <div className="sticky top-6">
    <div className="card p-8">
      <h3 className="text-2xl font-bold text-text mb-6">Get Your Tickets</h3>
      
      {/* Price Summary */}
      <div className="space-y-4 mb-8">
        {selectedTicketType && ticketTypes.map((t: any) => t._id).includes(selectedTicketType) ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-light">Ticket Type</span>
              <span className="font-semibold">
                {ticketTypes.find((t: any) => t._id === selectedTicketType)?.name}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-text-light">Quantity</span>
              <span className="font-semibold">
                {quantity} × {currency} {ticketTypes.find((t: any) => t._id === selectedTicketType)?.price.toFixed(2) || '0.00'}
              </span>
            </div>
            
            {/* Delivery Method */}
            <div className="flex justify-between items-center py-2 border-y border-gray-100 dark:border-gray-700">
              <span className="text-text-light">Delivery Method</span>
              <span className="font-semibold">
                {isFreeTicket ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <MailIcon className="h-4 w-4" />
                    Email
                  </span>
                ) : isOnChainPaidTicket ? (
                  <span className="text-purple-600 flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    NFT (Gasless)
                  </span>
                ) : (
                  <span className="text-blue-600 flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    Digital
                  </span>
                )}
              </span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className={`text-3xl font-bold ${isFreeEvent || totalPrice === 0 ? 'text-green-600' : 'text-primary'}`}>
                  {isFreeEvent || totalPrice === 0 ? 'FREE' : `${currency} ${totalPrice.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-text-light">Select a ticket type to see pricing</p>
          </div>
        )}
      </div>

      {/* Wallet Requirement Alert */}
      {isOnChainPaidTicket && !isConnected && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold text-yellow-700 dark:text-yellow-300">Wallet Required</span>
          </div>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            This ticket requires a Web3 wallet for NFT minting.
          </p>
        </div>
      )}

      {/* Purchase Button */}
      {authenticated ? (
        <button
          onClick={handleTicketPurchase}
          disabled={isPurchaseDisabled}
          className="btn-primary w-full py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {getPurchaseButtonIcon()}
          {getPurchaseButtonText()}
        </button>
      ) : (
        <button
          onClick={login}
          className="btn-primary w-full py-4 text-lg font-bold"
        >
          Login to Get Tickets
        </button>
      )}

      {/* Delivery Description */}
      {selectedTicketType && (
        <div className="mt-4 text-center">
          <p className="text-sm text-text-light">
            {isFreeTicket 
              ? 'Ticket details will be sent to your email' 
              : isOnChainPaidTicket 
                ? 'NFT ticket will be minted to your wallet (gasless)'
                : 'Digital ticket will be delivered after payment'}
          </p>
        </div>
      )}

      {/* Payment Methods */}
      {!isFreeEvent && totalPrice > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-text-light mb-3">Accepted Payment Methods</h4>
          <div className="flex gap-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <CreditCard className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <span className="text-sm ml-2">Card</span>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <Wallet className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <span className="text-sm ml-2">Crypto</span>
            </div>
          </div>
        </div>
      )}

      {/* Event Status */}
      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-text-light">Status</span>
            <span className="font-semibold text-green-600">Active</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-text-light">Event Date</span>
            <span className="font-semibold">{formatDate(event.startDate)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-text-light">Time</span>
            <span className="font-semibold">{formatTime(event.startDateTime || event.startDate)}</span>
          </div>
          
          {!event.isVirtual && event.venue && (
            <div className="flex justify-between">
              <span className="text-text-light">Location</span>
              <span className="font-semibold text-right max-w-[150px] truncate">
                {event.venue}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Need Help */}
      <div className="mt-8 p-4 bg-primary/5 rounded-xl">
        <h4 className="font-semibold text-primary mb-2">Need Help?</h4>
        <p className="text-sm text-text-light mb-3">
          Have questions about this event or need assistance with your purchase?
        </p>
        <button className="text-primary text-sm font-medium hover:underline">
          Contact Support
        </button>
      </div>
    </div>

    {/* Share Event */}
    <div className="card mt-6 p-6">
      <h4 className="font-semibold text-text mb-4">Share This Event</h4>
      <div className="flex gap-3">
        <button
          onClick={shareEvent}
          className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-text rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
        <button
          onClick={toggleFavorite}
          className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-text rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>
    </div>
  </div>
)