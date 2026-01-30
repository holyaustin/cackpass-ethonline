// app/events/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Calendar, MapPin, Users, Ticket, Clock, Globe, 
  Share2, Heart, ArrowLeft, Loader2, Check, 
  CreditCard, Wallet, Shield, QrCode, Star,
  ChevronRight, ExternalLink, Map, Video, 
  User, Mail, Phone, Building, Info
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { usePrivy } from '@privy-io/react-auth'
import { format } from 'date-fns'

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
}

interface Organizer {
  _id: string
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  walletAddress?: string
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params as { id: string }
  const { authenticated, ready, user } = usePrivy()
  
  const [event, setEvent] = useState<Event | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [organizer, setOrganizer] = useState<Organizer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTicketType, setSelectedTicketType] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'tickets' | 'organizer'>('details')
  const [showShareModal, setShowShareModal] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    if (id) {
      fetchEventDetails()
    }
  }, [id])

  const fetchEventDetails = async () => {
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
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'h:mm a')
  }

  const formatDateTimeRange = () => {
    if (!event) return ''
    
    const startDate = new Date(event.startDateTime || event.startDate)
    const endDate = new Date(event.endDateTime || event.endDate)
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return `${formatDate(event.startDate)} • ${formatTime(event.startDateTime || event.startDate)} - ${formatTime(event.endDateTime || event.endDate)}`
    } else {
      return `${formatDate(event.startDate)} ${formatTime(event.startDateTime || event.startDate)} - ${formatDate(event.endDate)} ${formatTime(event.endDateTime || event.endDate)}`
    }
  }

  const getRemainingTickets = (ticketType: TicketType) => {
    return ticketType.maxSupply - ticketType.currentSupply
  }

  const calculateTotalPrice = () => {
    if (!selectedTicketType || !event) return 0
    
    const ticket = ticketTypes.find(t => t._id === selectedTicketType)
    if (!ticket) return 0
    
    if (event.isFree) return 0
    
    return ticket.price * quantity
  }

  const handlePurchase = async () => {
    if (!authenticated || !ready) {
      toast.error('Please login to purchase tickets')
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

    const remaining = getRemainingTickets(ticket)
    if (remaining < quantity) {
      toast.error(`Only ${remaining} tickets available`)
      return
    }

    setIsPurchasing(true)

    try {
      // In a real implementation, this would call your purchase API
      // For now, simulate purchase flow
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Call purchase API
      const purchaseResponse = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('privy-token') || ''}`
        },
        body: JSON.stringify({
          ticketTypeId: selectedTicketType,
          quantity,
          paymentMethod: event?.isFree ? 'free' : 'crypto',
          paymentData: {
            email: user?.email?.address || '',
            walletAddress: user?.wallet?.address || ''
          }
        })
      })

      if (!purchaseResponse.ok) {
        throw new Error('Purchase failed')
      }

      const purchaseData = await purchaseResponse.json()
      
      toast.success('Ticket purchase successful!')
      
      // Redirect to tickets page or show confirmation
      router.push(`/dashboard/tickets?purchased=${purchaseData.orderId}`)
      
    } catch (error) {
      console.error('Purchase error:', error)
      toast.error('Failed to purchase tickets. Please try again.')
    } finally {
      setIsPurchasing(false)
    }
  }

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

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites')
  }

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

  const totalPrice = calculateTotalPrice()
  const imageUrl = event.imageCid 
    ? `https://gateway.pinata.cloud/ipfs/${event.imageCid}`
    : event.bannerImage || '/placeholder-event.jpg'

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Hero Section with Event Image */}
      <div className="relative h-[60vh] max-h-[600px] overflow-hidden">
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Back Button & Actions */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="responsive-container py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="glass p-3 rounded-xl hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={toggleFavorite}
                  className="glass p-3 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </button>
                <button
                  onClick={shareEvent}
                  className="glass p-3 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <Share2 className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Event Title Overlay */}
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
                    PAID EVENT • {event.currency} {event.price}
                  </span>
                )}
                
                {event.isVirtual && (
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold rounded-full flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Virtual Event
                  </span>
                )}
                
                {event.isOnChain && (
                  <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full">
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
                
                {!event.isVirtual && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>{event.venue || event.location?.address || 'Location TBA'}</span>
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
          {/* Left Column: Event Details & Tickets */}
          <div className="lg:col-span-2">
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-4 font-medium text-lg border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-light hover:text-text'
                }`}
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
              >
                <User className="h-5 w-5 inline mr-2" />
                Organizer
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
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
                            <div className="font-medium">{event.capacity} spots total</div>
                          )}
                          {!event.unlimitedCapacity && event.capacity && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                              <div 
                                className="bg-primary h-full rounded-full"
                                style={{ width: '75%' }} // This would be dynamic based on sold tickets
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
                      {event.isOnChain && (
                        <div>
                          <h4 className="font-semibold text-text-light mb-2 flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Blockchain
                          </h4>
                          <div className="text-text">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span>On-chain verified</span>
                            </div>
                            {event.transactionHash && (
                              <a
                                href={`https://sepolia-blockscout.lisk.com/tx/${event.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-sm hover:underline flex items-center gap-1 mt-1"
                              >
                                View transaction <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Virtual Event Details */}
                {event.isVirtual && event.virtualOptions && (
                  <div className="card p-8">
                    <h3 className="text-2xl font-bold text-text mb-6">Virtual Event Access</h3>
                    <div className="space-y-4">
                      {event.virtualOptions.zoomMeeting && (
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
                      
                      {event.virtualOptions.googleMeet && (
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
                      
                      {event.virtualOptions.virtualLink && (
                        <div className="mt-4">
                          <a
                            href={event.virtualOptions.virtualLink}
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
                )}
              </div>
            )}

            {activeTab === 'tickets' && (
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
                      {ticketTypes.map((ticket) => (
                        <div
                          key={ticket._id}
                          onClick={() => setSelectedTicketType(ticket._id)}
                          className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedTicketType === ticket._id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-lg mb-2">{ticket.name}</h4>
                              <p className="text-text-light mb-3">{ticket.description || 'Standard admission ticket'}</p>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-text-light">Category: {ticket.category}</span>
                                <span className="text-text-light">
                                  Available: {getRemainingTickets(ticket)} of {ticket.maxSupply}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              {event.isFree ? (
                                <div className="text-2xl font-bold text-green-600">FREE</div>
                              ) : (
                                <div className="text-2xl font-bold text-primary">
                                  {event.currency} {ticket.price}
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
                                <span>{getRemainingTickets(ticket)} remaining</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-primary h-full rounded-full"
                                  style={{ width: `${(ticket.currentSupply / ticket.maxSupply) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
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
                            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center disabled:opacity-50"
                          >
                            -
                          </button>
                          <span className="text-3xl font-bold">{quantity}</span>
                          <button
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-text-light mb-1">Total Price</div>
                        {event.isFree ? (
                          <div className="text-4xl font-bold text-green-600">FREE</div>
                        ) : (
                          <div className="text-4xl font-bold text-primary">
                            {event.currency} {totalPrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'organizer' && (
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
                        <h4 className="font-semibold mb-2">Secure Transactions</h4>
                        <p className="text-text-light text-sm">
                          All payments are processed securely through blockchain technology.
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
                          Receive digital tickets instantly after purchase. Easy to transfer and verify.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <Check className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Verified Organizer</h4>
                        <p className="text-text-light text-sm">
                          Organizer identity and event details are verified for your safety.
                        </p>
                      </div>
                    </div>
                    
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
            )}
          </div>

          {/* Right Column: Purchase Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="card p-8">
                <h3 className="text-2xl font-bold text-text mb-6">Get Your Tickets</h3>
                
                {/* Price Summary */}
                <div className="space-y-4 mb-8">
                  {selectedTicketType && ticketTypes.map(t => t._id).includes(selectedTicketType) ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-text-light">Ticket Type</span>
                        <span className="font-semibold">
                          {ticketTypes.find(t => t._id === selectedTicketType)?.name}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-text-light">Quantity</span>
                        <span className="font-semibold">{quantity} × {event.currency} {event.isFree ? '0' : ticketTypes.find(t => t._id === selectedTicketType)?.price}</span>
                      </div>
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">Total</span>
                          <span className={`text-3xl font-bold ${event.isFree ? 'text-green-600' : 'text-primary'}`}>
                            {event.isFree ? 'FREE' : `${event.currency} ${totalPrice.toFixed(2)}`}
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

                {/* Purchase Button */}
                {authenticated ? (
                  <button
                    onClick={handlePurchase}
                    disabled={!selectedTicketType || isPurchasing}
                    className="btn-primary w-full py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                        Processing...
                      </>
                    ) : event.isFree ? (
                      'Get Free Ticket'
                    ) : (
                      `Purchase Tickets`
                    )}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="btn-primary w-full py-4 text-lg font-bold text-center block"
                  >
                    Login to Purchase
                  </Link>
                )}

                {/* Payment Methods */}
                {!event.isFree && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="font-semibold text-text-light mb-3">Accepted Payment Methods</h4>
                    <div className="flex gap-3">
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <CreditCard className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        PayStack
                      </div>
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <Wallet className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        App Wallet
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
                    
                    {!event.isVirtual && (
                      <div className="flex justify-between">
                        <span className="text-text-light">Location</span>
                        <span className="font-semibold text-right max-w-[150px] truncate">
                          {event.venue || 'TBA'}
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
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}