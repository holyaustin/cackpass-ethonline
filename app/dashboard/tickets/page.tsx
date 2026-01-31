// /app/dashboard/tickets/page.tsx - COMPLETELY FIXED VERSION
'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  Ticket, Calendar, MapPin, Filter, Search, Plus, 
  Download, QrCode, Send, Eye, Clock, CheckCircle, 
  XCircle, ArrowUpRight, Loader2, Sparkles, User,
  CreditCard, Smartphone, Globe, Hash, Tag,
  ChevronRight, AlertCircle, ExternalLink, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import { format } from 'date-fns'
import QRCode from 'qrcode'

// Define proper TypeScript interfaces
interface TicketOrder {
  _id: string
  paymentMethod: 'crypto' | 'paystack' | 'free'
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
  totalAmount: number
  currency: string
  createdAt: string
}

interface TicketTypeData {
  _id: string
  name: string
  category: string
  price: number
}

interface EventData {
  _id: string
  title: string
  venue: string
  location?: {
    address?: string
  }
  startDate: string
  endDate: string
  startDateTime?: string
  endDateTime?: string
  imageCid?: string
  bannerImage?: string
  isVirtual: boolean
  isFree: boolean
  price: number
  currency: string
}

interface TicketData {
  _id: string
  ticketNumber: string
  qrCode: string
  qrCodeCid: string
  status: 'active' | 'used' | 'transferred' | 'cancelled' | 'refunded'
  seatNumber?: string
  zone?: string
  createdAt: string
  updatedAt: string
  isPast: boolean
  isActive: boolean
  canTransfer: boolean
  
  event: EventData | null
  ticketType: TicketTypeData | null
  order: TicketOrder | null
}

interface TicketsResponse {
  success: boolean
  tickets: TicketData[]
  stats: {
    totalTickets: number
    activeTickets: number
    pastTickets: number
    transferredTickets: number
  }
  pagination: {
    page: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// Helper function to get wallet address from Privy user
function getWalletAddressFromUser(user: any): string | null {
  if (!user) return null
  
  // Check direct wallet object (for embedded wallets)
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    return user.wallet.address
  }
  
  // Check linked accounts
  const linkedAccounts = user.linkedAccounts || []
  
  // Look for wallet accounts in linked accounts
  for (const account of linkedAccounts) {
    if ((account.type === 'wallet' || account.type === 'smart_wallet') && account.address) {
      return account.address
    }
  }
  
  return null
}

// Generate QR code for ticket
async function generateTicketQRCode(ticket: TicketData): Promise<string> {
  try {
    // Create ticket data for QR code
    const ticketData = {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      eventId: ticket.event?._id || '',
      eventTitle: ticket.event?.title || '',
      ticketType: ticket.ticketType?.name || '',
      userId: 'verified'
    }
    
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(ticketData), {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return qrCodeDataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    return ''
  }
}

export default function TicketsPage() {
  const { user, authenticated, ready } = usePrivy()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'past' | 'transferred'>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    totalTickets: 0,
    activeTickets: 0,
    pastTickets: 0,
    transferredTickets: 0
  })
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [showQRCode, setShowQRCode] = useState<{ ticketId: string; qrCode: string } | null>(null)
  const [generatingQR, setGeneratingQR] = useState<string | null>(null)

  // Extract wallet address when user is authenticated
  useEffect(() => {
    if (authenticated && ready && user) {
      const address = getWalletAddressFromUser(user)
      setWalletAddress(address)
    }
  }, [authenticated, ready, user])

  // Fetch tickets when wallet address or filters change
  useEffect(() => {
    if (walletAddress) {
      fetchTickets(1, true)
    } else if (authenticated && ready) {
      setIsLoading(false)
    }
  }, [walletAddress, filter, search, authenticated, ready])

  const fetchTickets = useCallback(async (page = 1, reset = false) => {
    if (!walletAddress) return

    try {
      if (page === 1) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        filter: filter,
        search: search,
        walletAddress: walletAddress
      })

      console.log('📡 Fetching tickets for wallet:', walletAddress)
      
      const response = await fetch(`/api/tickets/my-tickets?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch tickets')
      }

      const data: TicketsResponse = await response.json()
      
      if (!data.success) {
        throw new Error('Failed to fetch tickets')
      }

      console.log('✅ Tickets fetched:', data.tickets.length)
      
      if (reset || page === 1) {
        setTickets(data.tickets)
      } else {
        setTickets(prev => [...prev, ...data.tickets])
      }
      
      setStats(data.stats)
      setTotalPages(data.pagination.totalPages)
      setCurrentPage(data.pagination.page)
      
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load tickets')
      setTickets([])
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [walletAddress, filter, search])

  const loadMore = () => {
    if (currentPage < totalPages && !isLoadingMore) {
      fetchTickets(currentPage + 1)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const handleFilterChange = (newFilter: 'all' | 'active' | 'past' | 'transferred') => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  const handleShowQRCode = async (ticket: TicketData) => {
    if (!ticket.isActive) {
      toast.error('QR code is only available for active tickets')
      return
    }

    setGeneratingQR(ticket._id)
    
    try {
      // If we already have a QR code, use it
      if (ticket.qrCode) {
        setShowQRCode({ ticketId: ticket._id, qrCode: ticket.qrCode })
      } else {
        // Generate new QR code
        const qrCode = await generateTicketQRCode(ticket)
        if (qrCode) {
          setShowQRCode({ ticketId: ticket._id, qrCode })
        } else {
          toast.error('Failed to generate QR code')
        }
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Failed to generate QR code')
    } finally {
      setGeneratingQR(null)
    }
  }

  const handleTransferTicket = (ticket: TicketData) => {
    if (!ticket.canTransfer) {
      toast.error('This ticket cannot be transferred')
      return
    }
    
    toast.info('Ticket transfer feature coming soon!')
  }

  const handleDownloadTicket = (ticket: TicketData) => {
    if (!ticket.isActive) {
      toast.error('Only active tickets can be downloaded')
      return
    }
    
    toast.info('Ticket download feature coming soon!')
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Date not set'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      return 'Invalid date'
    }
  }

  const formatTime = (dateString: string): string => {
    if (!dateString) return 'Time TBD'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid time'
      return format(date, 'h:mm a')
    } catch (error) {
      return 'Invalid time'
    }
  }

  const formatDateTime = (ticket: TicketData): string => {
    const event = ticket.event
    if (!event) return 'Date not set'
    
    const date = event.startDate || event.startDateTime || ''
    const time = event.startDateTime ? formatTime(event.startDateTime) : 'Time TBD'
    
    if (!date) return 'Date not set'
    return `${formatDate(date)} • ${time}`
  }

  const getStatusIcon = (status: TicketData['status'], isPast: boolean): React.ReactNode => {
    if (isPast) return <Clock className="h-4 w-4 text-gray-500" />
    
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'used':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'transferred':
        return <ArrowUpRight className="h-4 w-4 text-purple-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'refunded':
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: TicketData['status'], isPast: boolean): string => {
    if (isPast) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'used':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'transferred':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'refunded':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getPaymentMethodIcon = (method?: 'crypto' | 'paystack' | 'free'): React.ReactNode => {
    switch (method) {
      case 'crypto':
        return <Hash className="h-3 w-3" />
      case 'paystack':
        return <CreditCard className="h-3 w-3" />
      case 'free':
        return <Ticket className="h-3 w-3" />
      default:
        return <CreditCard className="h-3 w-3" />
    }
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to view tickets</div>

  if (!walletAddress && ready && authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Wallet Connected</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find a connected wallet address. Please ensure your wallet is connected via Privy.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-3"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Tickets</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your digital tickets and access
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-mono">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </span>
              </div>
              <Link
                href="/events"
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Browse Events
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">{stats.totalTickets}</p>
            </div>
            <div className="card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.activeTickets}</p>
            </div>
            <div className="card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Past Events</p>
                <Clock className="h-4 w-4 text-gray-500" />
              </div>
              <p className="text-2xl font-bold text-gray-600">{stats.pastTickets}</p>
            </div>
            <div className="card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Transferred</p>
                <ArrowUpRight className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.transferredTickets}</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tickets by event, venue, or ticket number..."
                value={search}
                onChange={handleSearch}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 text-white rounded-2xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'past', 'transferred'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleFilterChange(tab as any)}
                  className={`px-4 py-3 rounded-2xl font-medium transition-colors ${
                    filter === tab
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tickets Grid */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card rounded-2xl p-6 animate-pulse">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : tickets.length > 0 ? (
          <>
            <div className="space-y-4 mb-8">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket._id}
                  ticket={ticket}
                  onShowQR={handleShowQRCode}
                  onTransfer={handleTransferTicket}
                  onDownload={handleDownloadTicket}
                  generatingQR={generatingQR === ticket._id}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  formatDateTime={formatDateTime}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                  getPaymentMethodIcon={getPaymentMethodIcon}
                />
              ))}
            </div>
            
            {/* Load More Button */}
            {currentPage < totalPages && (
              <div className="text-center mb-8">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="btn-primary px-8 py-3 flex items-center gap-2 mx-auto"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Tickets'
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 card rounded-2xl">
            <Ticket className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {search 
                ? 'No tickets match your search. Try a different search term.'
                : filter !== 'all'
                ? `You have no ${filter} tickets.`
                : 'You haven\'t purchased any tickets yet. Browse events to get started!'
              }
            </p>
            {!search && filter === 'all' && (
              <Link href="/events" className="btn-primary px-6 py-3">
                Browse Events
              </Link>
            )}
          </div>
        )}

        {/* QR Code Modal */}
        {showQRCode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card p-8 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Ticket QR Code</h3>
                <button
                  onClick={() => setShowQRCode(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-center">
                <div className="w-64 h-64 mx-auto mb-6">
                  <img 
                    src={showQRCode.qrCode} 
                    alt="Ticket QR Code" 
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Present this QR code at the event entrance
                </p>
                <p className="text-xs text-gray-500 mb-6">
                  Do not share this QR code with others
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Download QR code
                      const link = document.createElement('a')
                      link.href = showQRCode.qrCode
                      link.download = `ticket-${showQRCode.ticketId.slice(-8)}.png`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                    className="btn-outline flex-1 py-2"
                  >
                    <Download className="h-4 w-4 inline mr-2" />
                    Save
                  </button>
                  <button
                    onClick={() => setShowQRCode(null)}
                    className="btn-primary flex-1 py-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Ticket Card Component with explicit types
interface TicketCardProps {
  ticket: TicketData
  onShowQR: (ticket: TicketData) => void
  onTransfer: (ticket: TicketData) => void
  onDownload: (ticket: TicketData) => void
  generatingQR: boolean
  formatDate: (date: string) => string
  formatTime: (date: string) => string
  formatDateTime: (ticket: TicketData) => string
  getStatusIcon: (status: TicketData['status'], isPast: boolean) => React.ReactNode
  getStatusColor: (status: TicketData['status'], isPast: boolean) => string
  getPaymentMethodIcon: (method?: 'crypto' | 'paystack' | 'free') => React.ReactNode
}

function TicketCard({ 
  ticket, 
  onShowQR, 
  onTransfer, 
  onDownload,
  generatingQR,
  formatDate,
  formatTime,
  formatDateTime,
  getStatusIcon,
  getStatusColor,
  getPaymentMethodIcon
}: TicketCardProps): React.ReactElement {
  const event = ticket.event
  const ticketType = ticket.ticketType
  const order = ticket.order

  const imageUrl = event?.imageCid 
    ? `https://gateway.pinata.cloud/ipfs/${event.imageCid}`
    : event?.bannerImage || '/placeholder-event.jpg'

  return (
    <div className="card rounded-2xl p-4 hover:shadow-lg transition-all">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Event Image */}
        <div className="lg:w-1/4">
          <div className="relative h-48 lg:h-full rounded-xl overflow-hidden">
            <img
              src={imageUrl}
              alt={event?.title || 'Event'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-event.jpg'
              }}
            />
            <div className="absolute top-2 left-2">
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(ticket.status, ticket.isPast)} flex items-center gap-1`}>
                {getStatusIcon(ticket.status, ticket.isPast)}
                <span>{ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}</span>
              </span>
            </div>
            {event?.isVirtual && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full backdrop-blur-sm flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Virtual
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div className="lg:flex-1">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg line-clamp-1">{event?.title || 'Unknown Event'}</h3>
                {ticket.seatNumber && (
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    Seat {ticket.seatNumber}
                  </span>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                {/* Date & Time */}
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{formatDateTime(ticket)}</span>
                </div>
                
                {/* Location */}
                {!event?.isVirtual && event?.venue && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                )}
                
                {/* Ticket Type & Price */}
                <div className="flex items-center gap-4">
                  {ticketType && (
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">{ticketType.name}</span>
                    </div>
                  )}
                  
                  {order && (
                    <div className="flex items-center">
                      {getPaymentMethodIcon(order.paymentMethod)}
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {order.paymentMethod === 'free' ? 'Free' : `${order.currency} ${order.totalAmount}`}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Ticket Number */}
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Hash className="h-4 w-4 mr-2" />
                  <span className="font-mono text-xs">{ticket.ticketNumber}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {ticket.isActive && (
                <>
                  <button
                    onClick={() => onShowQR(ticket)}
                    disabled={generatingQR}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {generatingQR ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4" />
                    )}
                    Show QR
                  </button>
                  
                  <button
                    onClick={() => onDownload(ticket)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  
                  {ticket.canTransfer && (
                    <button
                      onClick={() => onTransfer(ticket)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Transfer
                    </button>
                  )}
                </>
              )}
              
              <Link
                href={`/events/${event?._id || '#'}`}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Event
              </Link>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-gray-500 mb-1">Purchase Date</p>
                <p className="font-medium">{order ? formatDate(order.createdAt) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Payment Status</p>
                <p className={`font-medium ${
                  order?.paymentStatus === 'completed' ? 'text-green-600' :
                  order?.paymentStatus === 'pending' ? 'text-yellow-600' :
                  order?.paymentStatus === 'failed' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {order?.paymentStatus ? order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Ticket Created</p>
                <p className="font-medium">{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Last Updated</p>
                <p className="font-medium">{formatDate(ticket.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}