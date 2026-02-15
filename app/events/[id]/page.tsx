// /app/events/[id]/page.tsx - COMPLETE FIXED VERSION
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Calendar, MapPin, Clock, Users, Ticket, 
  Share2, Heart, ChevronLeft, ChevronRight,
  Star, Tag, Globe, Shield, QrCode, Loader2,
  ShoppingCart, CreditCard, Wallet, CheckCircle,
  AlertCircle, ArrowRight, ExternalLink, User,
  Building, Video, Youtube, Twitch, Link as LinkIcon,
  Mail, Check
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import PurchaseModal from '@/components/tickets/PurchaseModal'
import { usePrivy } from '@privy-io/react-auth'
import { format } from 'date-fns'
import { ethers } from 'ethers'

// Lisk Mainnet USDC Contract Address
const LISK_MAINNET_USDC_ADDRESS = '0xF242275d3a6527d877f2c927a82D9b057609cc71'
const LISK_MAINNET_RPC_URL = 'https://rpc.api.lisk.com'

// USDC ABI
const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
]

// Helper function to extract wallet address from Privy user
function getWalletAddressFromUser(user: any): string | null {
  if (!user) return null
  
  // Check direct wallet object (for embedded wallets)
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    return user.wallet.address
  }
  
  // Check linked accounts
  const linkedAccounts = user.linkedAccounts || []
  
  // Look for embedded wallet in linked accounts
  const embeddedWallet = linkedAccounts.find(
    (acc: any) => acc.type === 'wallet' && acc.walletClientType === 'privy'
  )
  
  if (embeddedWallet?.address) {
    return embeddedWallet.address
  }
  
  // Try to find any wallet address
  for (const account of linkedAccounts) {
    if (account.type === 'wallet' && account.address) {
      return account.address
    }
  }
  
  return null
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
  metadataURI?: string
  createdAt?: string
  updatedAt?: string
}

interface EventDataWithId {
  id: string
  _id?: string
  title: string
  description: string
  startDate: string
  endDate: string
  venue: string
 location: {
  address?: string;
  lat?: number;
  lng?: number;
}
  isVirtual: boolean
  isFree: boolean
  price: number
  currency: string
  category: string
  imageCid?: string
  bannerImage?: string
  onChainId?: number
  organizer: {
    name: string
    avatar: string
  }
  attendees: number
  rating: number
  ticketTypes: Array<{
    id: string
    name: string
    price: number
    maxSupply: number
    currentSupply: number
  }>
}

const DEFAULT_ORGANIZER = {
  name: 'Event Organizer',
  avatar: '/cackpas.jpg'
}

const getSafeOrganizer = (organizer?: { name?: string; avatar?: string }) => {
  if (!organizer) return DEFAULT_ORGANIZER
  
  return {
    name: organizer.name || DEFAULT_ORGANIZER.name,
    avatar: organizer.avatar || DEFAULT_ORGANIZER.avatar
  }
}

const getSafeAvatarUrl = (avatar?: string) => {
  if (!avatar || avatar.trim() === '') {
    return '/cackpas.jpg'
  }
  
  if (avatar.startsWith('http') || avatar.startsWith('/')) {
    return avatar
  }
  
  if (!avatar.startsWith('/')) {
    return `/${avatar}`
  }
  
  return '/cackpas.jpg'
}

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
  
  const [event, setEvent] = useState<EventDataWithId | null>(null)
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
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isCheckingBalance, setIsCheckingBalance] = useState(false)
  const [isGettingFreeTicket, setIsGettingFreeTicket] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  
  const eventId = params.id as string

  const getOrganizer = () => {
    return getSafeOrganizer(event?.organizer)
  }

  // Check if user has linked accounts
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

  // Extract wallet address from user
  useEffect(() => {
    if (authenticated && ready && user) {
      const address = getWalletAddressFromUser(user)
      setWalletAddress(address)
    }
  }, [authenticated, ready, user])

  // Function to fetch USDC balance from Lisk Mainnet
  const fetchUSDCBalance = async (address: string): Promise<number> => {
    try {
      console.log('Fetching USDC balance for:', address)
      
      const provider = new ethers.JsonRpcProvider(LISK_MAINNET_RPC_URL)
      
      const usdcContract = new ethers.Contract(
        LISK_MAINNET_USDC_ADDRESS,
        USDC_ABI,
        provider
      )
      
      const rawBalance = await usdcContract.balanceOf(address)
      const decimals = await usdcContract.decimals()
      
      const usdcBalance = ethers.formatUnits(rawBalance, decimals)
      const usdcBalanceFormatted = parseFloat(usdcBalance)
      
      console.log('USDC balance fetched:', usdcBalanceFormatted)
      
      return usdcBalanceFormatted
      
    } catch (error: any) {
      console.error('Error fetching USDC balance:', error.message)
      return 0
    }
  }

  // Check wallet balance when wallet address changes
  useEffect(() => {
    const checkBalance = async () => {
      if (walletAddress && authenticated && !event?.isFree) {
        setIsCheckingBalance(true)
        try {
          const balance = await fetchUSDCBalance(walletAddress)
          setWalletBalance(balance)
        } catch (error) {
          console.error('Balance check error:', error)
          setWalletBalance(0)
        } finally {
          setIsCheckingBalance(false)
        }
      }
    }

    if (walletAddress) {
      checkBalance()
    }
  }, [walletAddress, authenticated, event?.isFree])

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
        
        // Transform event data to ensure it has both id and _id fields
        const transformedEvent = {
          ...eventData.event,
          id: eventData.event._id || eventData.event.id,
          _id: eventData.event._id,
          organizer: getSafeOrganizer(eventData.event.organizer)
        }
        
        setEvent(transformedEvent)
        
        // Fetch ticket types
        setIsLoadingTickets(true)
        const ticketsResponse = await fetch(`/api/events/${eventId}/tickets`)
        let ticketTypesList: TicketTypeData[] = []
        
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json()
          
          // Initialize with fetched ticket types or empty array
          ticketTypesList = ticketsData.ticketTypes || []
          
          // OPTION 2 IMPLEMENTATION: Create virtual ticket for free events if no ticket types exist
          if (transformedEvent.isFree && ticketTypesList.length === 0) {
            const virtualFreeTicket: TicketTypeData = {
              _id: `free-virtual-${transformedEvent.id}`,
              name: 'Free Admission',
              category: 'General Admission',
              price: 0,
              maxSupply: 0, // 0 means unlimited
              currentSupply: 0,
              isActive: true,
              eventId: transformedEvent.id,
              description: 'Free admission to the event'
            }
            ticketTypesList = [virtualFreeTicket]
          }
        }
        
        setTicketTypes(ticketTypesList)
        if (ticketTypesList.length > 0) {
          setSelectedTicketType(ticketTypesList[0])
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

  // Function to get free ticket via email
  const handleGetFreeTicket = async () => {
    if (!authenticated) {
      toast.error('Please sign in to get a free ticket')
      router.push(`/?redirect=/events/${eventId}`)
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

    try {
      setIsGettingFreeTicket(true)
      
      const token = await getAccessToken()
      if (!token) {
        toast.error('Authentication required')
        return
      }

      // Check if it's a virtual ticket (no backend ID)
      const requestBody: any = {
        eventId: eventId,
        quantity: selectedQuantity,
      }
  // Only send ticketTypeId if it's NOT a virtual ticket
  if (selectedTicketType && !selectedTicketType._id.includes('free-virtual')) {
    requestBody.ticketTypeId = selectedTicketType._id
  }

  const response = await fetch('/api/tickets/free', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get free ticket')
      }

      if (data.success) {
        toast.success('Free ticket sent to your email! Check your inbox.')
        
        // For virtual tickets, update the current supply display
        if (selectedTicketType._id.includes('free-virtual')) {
          const updatedTicketType = {
            ...selectedTicketType,
            currentSupply: selectedTicketType.currentSupply + selectedQuantity
          }
          setSelectedTicketType(updatedTicketType)
          
          // Update in ticketTypes array
          setTicketTypes(prev => 
            prev.map(ticket => 
              ticket._id === selectedTicketType._id ? updatedTicketType : ticket
            )
          )
        } else {
          // For real ticket types, refresh from API
          const ticketsResponse = await fetch(`/api/events/${eventId}/tickets`)
          if (ticketsResponse.ok) {
            const ticketsData = await ticketsResponse.json()
            if (ticketsData.success && ticketsData.ticketTypes) {
              setTicketTypes(ticketsData.ticketTypes)
              const updatedTicketType = ticketsData.ticketTypes.find(
                (t: TicketTypeData) => t._id === selectedTicketType._id
              )
              if (updatedTicketType) {
                setSelectedTicketType(updatedTicketType)
              }
            }
          }
        }
      } else {
        throw new Error(data.message || 'Failed to get free ticket')
      }
    } catch (error) {
      console.error('Error getting free ticket:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to get free ticket')
    } finally {
      setIsGettingFreeTicket(false)
    }
  }

  // MAIN BUTTON LOGIC FUNCTION
// MAIN BUTTON LOGIC FUNCTION - FIXED VERSION
const getButtonState = () => {
  // 1. Loading states
  if (isLoadingTickets) {
    return {
      text: 'Loading...',
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      action: null,
      disabled: true,
      variant: 'loading'
    }
  }
  
  if (isCheckingBalance) {
    return {
      text: 'Checking Balance...',
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      action: null,
      disabled: true,
      variant: 'loading'
    }
  }
  
  if (isGettingFreeTicket) {
    return {
      text: 'Getting Ticket...',
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      action: null,
      disabled: true,
      variant: 'loading'
    }
  }
  
  // 2. Not authenticated
  if (!authenticated) {
    return {
      text: 'Sign In to Continue',
      icon: <User className="h-5 w-5" />,
      action: () => router.push(`/?redirect=/events/${eventId}`),
      disabled: false,
      variant: 'auth'
    }
  }
  
  // 3. Free events - handle FIRST (before ticket selection checks)
  if (event?.isFree) {
    // For free events, we don't need a ticket type to be selected
    // Virtual tickets are created automatically if none exist
    if (!selectedTicketType) {
      // This shouldn't happen with our virtual ticket creation,
      // but just in case, return a disabled state
      return {
        text: 'Loading Free Ticket...',
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
        action: null,
        disabled: true,
        variant: 'loading'
      }
    }
    
    // Check if free ticket is sold out (for tickets with maxSupply > 0)
    if (selectedTicketType.maxSupply > 0 && selectedTicketType.currentSupply >= selectedTicketType.maxSupply) {
      return {
        text: 'Sold Out',
        icon: null,
        action: null,
        disabled: true,
        variant: 'disabled'
      }
    }
    
    return {
      text: 'Get Free Ticket',
      icon: <Ticket className="h-5 w-5" />,
      action: handleGetFreeTicket,
      disabled: false,
      variant: 'free'
    }
  }
  
  // 4. For paid events only: No ticket selected
  if (!selectedTicketType) {
    return {
      text: 'Select a Ticket Type',
      icon: null,
      action: null,
      disabled: true,
      variant: 'disabled'
    }
  }
  
  // 5. Ticket sold out (for tickets with maxSupply > 0)
  if (selectedTicketType.maxSupply > 0 && selectedTicketType.currentSupply >= selectedTicketType.maxSupply) {
    return {
      text: 'Sold Out',
      icon: null,
      action: null,
      disabled: true,
      variant: 'disabled'
    }
  }
  
  // 6. Paid events - check wallet setup
  if (!hasLinkedAccounts) {
    return {
      text: 'Set Up Wallet',
      icon: <Wallet className="h-5 w-5" />,
      action: () => toast.error('Please set up your embedded wallet to purchase tickets'),
      disabled: false,
      variant: 'wallet'
    }
  }
  
  // 7. Check if we have wallet address
  if (!walletAddress) {
    return {
      text: 'Connect Wallet',
      icon: <Wallet className="h-5 w-5" />,
      action: () => toast.error('No wallet address found'),
      disabled: false,
      variant: 'wallet'
    }
  }
  
  // 8. Calculate total price and check balance
  const totalPrice = selectedTicketType.price * selectedQuantity
  
  // If balance is zero or insufficient, show "Fund Wallet"
if (walletBalance === 0 || walletBalance < totalPrice) {
  return {
    text: 'Fund Wallet',
    icon: <Wallet className="h-5 w-5" />,
    action: () => {
      toast.error('Insufficient balance. Please fund your wallet to continue.')
      // This will definitely work
      window.location.href = '/dashboard/wallet'
      // Or if you want to keep it within the app:
      // router.push('/wallet')
    },
    disabled: false,
    variant: 'fund'
  }
}
  
  // 9. Balance is sufficient, show "Purchase Ticket"
  return {
    text: 'Purchase Ticket',
    icon: <ShoppingCart className="h-5 w-5" />,
    action: () => setShowPurchaseModal(true),
    disabled: false,
    variant: 'purchase'
  }
}

  // Handle purchase click (wrapper for button click)
  const handlePurchaseClick = () => {
    const buttonState = getButtonState()
    if (buttonState.action) {
      buttonState.action()
    }
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
    
    // For unlimited tickets (maxSupply === 0), allow up to 10 tickets at once
    const maxAvailable = selectedTicketType.maxSupply === 0 
      ? 10 
      : selectedTicketType.maxSupply - selectedTicketType.currentSupply
    
    const newQuantity = selectedQuantity + change
    
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
    // Handle virtual free tickets and unlimited tickets
    if (ticketType.maxSupply === 0 || ticketType._id?.includes('free-virtual')) {
      return 'Unlimited'
    }
    const available = ticketType.maxSupply - ticketType.currentSupply
    return Math.max(0, available)
  }

  // Check if ticket is available
  const isTicketAvailable = (ticketType: TicketTypeData) => {
    // Virtual free tickets and unlimited tickets are always available
    if (ticketType.maxSupply === 0 || ticketType._id?.includes('free-virtual')) {
      return true
    }
    return ticketType.currentSupply < ticketType.maxSupply
  }

  // Get total price
  const getTotalPrice = () => {
    if (!selectedTicketType || event?.isFree) return '0.00'
    return (selectedTicketType.price * selectedQuantity).toFixed(2)
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

  const organizer = getOrganizer()
  const organizerAvatar = getSafeAvatarUrl(organizer.avatar)

  // Get current button state
  const buttonState = getButtonState()

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
                    {!event.isVirtual && (event.venue || event.location?.address) && (
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
                      <p className="font-medium">{event.venue || event.location?.address || 'Location TBD'}</p>
                    ) : (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-5 w-5 text-blue-500" />
                          <span className="font-semibold">Virtual Event</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Joining details will be provided after ticket purchase
                        </p>
                      </div>
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
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        src={organizerAvatar}
                        alt={organizer.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/cackpas.jpg'
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {organizer.name}
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
                    const isVirtual = ticketType._id.includes('free-virtual')
                    
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
                                  {!isVirtual && ticketType.maxSupply > 0 && (
                                    <span className="text-sm">
                                      • {available} of {ticketType.maxSupply} left
                                    </span>
                                  )}
                                  {isVirtual && (
                                    <span className="text-sm">• Unlimited</span>
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
                            
                            {isVirtual && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                                Free Admission
                              </div>
                            )}
                            
                            {!isAvailable && !isVirtual && (
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
                    
                    {/* Wallet Balance Display - Only show for paid events */}
                    {authenticated && hasLinkedAccounts && !event.isFree && walletAddress && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">Wallet Balance</span>
                          </div>
                          <div className="text-right">
                            {isCheckingBalance ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            ) : (
                              <span className={`font-bold ${walletBalance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                ${walletBalance.toFixed(2)} USDC
                              </span>
                            )}
                          </div>
                        </div>
                        {walletBalance === 0 && !isCheckingBalance && selectedTicketType && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Wallet balance is zero. Please fund your wallet.
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Email Notification for Free Tickets */}
                    {event.isFree && authenticated && (
                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Email Delivery</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Your free ticket will be sent to your registered email address
                        </p>
                      </div>
                    )}
                    
                    {/* Purchase Button with Correct Logic */}
                    <button
                      onClick={handlePurchaseClick}
                      disabled={buttonState.disabled}
                      className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-lg transition-all duration-200 ${
                        buttonState.variant === 'fund' 
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                          : buttonState.variant === 'free'
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : buttonState.variant === 'purchase'
                          ? 'bg-primary hover:bg-primary-dark text-white'
                          : buttonState.variant === 'auth' || buttonState.variant === 'wallet'
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {buttonState.icon}
                      {buttonState.text}
                      {buttonState.variant === 'purchase' && <ArrowRight className="h-5 w-5" />}
                    </button>
                    
                    {/* Security & Features */}
                    <div className="mt-6 space-y-4">
                      {event.isFree ? (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Free Ticket</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              No payment required. Ticket sent via email.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Shield className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Secure Payment</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Encrypted connection & secure processing
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <QrCode className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Digital Ticket</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            QR code for easy entry
                          </p>
                        </div>
                      </div>
                      
                      {!event.isFree && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Wallet className="h-5 w-5 text-purple-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Embedded Wallet</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Works with your Privy wallet
                            </p>
                          </div>
                        </div>
                      )}
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

      {/* Purchase Modal - Only show for paid events */}
      {event && selectedTicketType && !event.isFree && (
        <PurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
            toast.success('Ticket purchased successfully!')
            router.push(`/dashboard/tickets`)
          }}
          event={event}
          ticketType={{
            _id: selectedTicketType._id,
            id: selectedTicketType._id,
            name: selectedTicketType.name,
            category: selectedTicketType.category,
            price: selectedTicketType.price,
            // Convert 0 to 100000 for unlimited tickets in the modal
            maxSupply: selectedTicketType.maxSupply === 0 ? 100000 : selectedTicketType.maxSupply,
            currentSupply: selectedTicketType.currentSupply
          }}
          quantity={selectedQuantity}
        />
      )}
    </div>
  )
}