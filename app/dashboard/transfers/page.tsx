// /app/dashboard/transfers/page.tsx - PRODUCTION VERSION
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import {
  Send, ArrowUpRight, ArrowDownRight, User, Search,
  Calendar, MapPin, Ticket, CheckCircle, XCircle,
  Clock, Loader2, Filter, ExternalLink, Hash,
  QrCode, Eye, Copy, Mail, Wallet, AlertCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TransferTicket {
  _id: string
  ticketNumber: string
  status: 'active' | 'used' | 'transferred' | 'cancelled' | 'refunded'
  seatNumber?: string
  zone?: string
  createdAt: string
  updatedAt: string
  transferredTo?: string
  transferredAt?: string
  
  event: {
    _id: string
    title: string
    venue: string
    startDate: string
    endDate: string
    startDateTime?: string
    endDateTime?: string
    imageCid?: string
    bannerImage?: string
    isVirtual: boolean
  } | null
  
  ticketType: {
    _id: string
    name: string
    category: string
    price: number
  } | null
  
  order: {
    _id: string
    paymentMethod: 'crypto' | 'paystack' | 'free'
    totalAmount: number
    currency: string
  } | null
  
  // For received transfers
  fromUser?: {
    _id: string
    walletAddress: string
    email?: string
    firstName?: string
    lastName?: string
  }
  
  // For sent transfers
  toUser?: {
    _id: string
    walletAddress: string
    email?: string
    firstName?: string
    lastName?: string
  }
}

interface TransferResponse {
  success: boolean
  error?: string
  transfers: TransferTicket[]
  stats: {
    sentTransfers: number
    receivedTransfers: number
    pendingTransfers: number
    totalTransfers: number
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
  
  // Check direct wallet object
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    return user.wallet.address
  }
  
  // Check linked accounts
  const linkedAccounts = user.linkedAccounts || []
  
  for (const account of linkedAccounts) {
    if ((account.type === 'wallet' || account.type === 'smart_wallet') && account.address) {
      return account.address
    }
  }
  
  return null
}

export default function TransfersPage() {
  const { user, authenticated, ready } = usePrivy()
  const [transfers, setTransfers] = useState<TransferTicket[]>([])
  const [activeTab, setActiveTab] = useState<'sent' | 'received' | 'all'>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [transferToAddress, setTransferToAddress] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [stats, setStats] = useState({
    sentTransfers: 0,
    receivedTransfers: 0,
    pendingTransfers: 0,
    totalTransfers: 0
  })

  // Extract wallet address
  useEffect(() => {
    if (authenticated && ready && user) {
      const address = getWalletAddressFromUser(user)
      setWalletAddress(address)
    }
  }, [authenticated, ready, user])

  // Fetch transfers
  useEffect(() => {
    if (walletAddress) {
      fetchTransfers(1, true)
    }
  }, [walletAddress, activeTab, search])

  const fetchTransfers = async (page = 1, reset = false) => {
    if (!walletAddress) return

    try {
      if (page === 1) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        type: activeTab,
        search: search,
        walletAddress: walletAddress
      })

      const response = await fetch(`/api/transfers?${params}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // API endpoint doesn't exist yet - show empty state
          setTransfers([])
          setStats({
            sentTransfers: 0,
            receivedTransfers: 0,
            pendingTransfers: 0,
            totalTransfers: 0
          })
          return
        }
        throw new Error(`Failed to fetch transfers (${response.status})`)
      }

      const data: TransferResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch transfers')
      }

      if (reset || page === 1) {
        setTransfers(data.transfers || [])
      } else {
        setTransfers(prev => [...prev, ...(data.transfers || [])])
      }
      
      setStats(data.stats || {
        sentTransfers: 0,
        receivedTransfers: 0,
        pendingTransfers: 0,
        totalTransfers: 0
      })
      
      setTotalPages(data.pagination?.totalPages || 1)
      setCurrentPage(data.pagination?.page || 1)
      
    } catch (error) {
      console.error('Error fetching transfers:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load transfers')
      setTransfers([])
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (currentPage < totalPages && !isLoadingMore) {
      fetchTransfers(currentPage + 1)
    }
  }

  const initiateTransfer = async (ticketId: string) => {
    if (!transferToAddress.trim()) {
      toast.error('Please enter a recipient wallet address')
      return
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(transferToAddress.trim())) {
      toast.error('Please enter a valid wallet address')
      return
    }

    setIsTransferring(true)

    try {
      const response = await fetch('/api/transfers/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          recipientAddress: transferToAddress.trim(),
          walletAddress: walletAddress
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Transfer failed')
      }

      toast.success('Transfer initiated successfully!')
      setSelectedTicket(null)
      setTransferToAddress('')
      
      // Refresh transfers list
      fetchTransfers(1, true)
      
    } catch (error) {
      console.error('Transfer error:', error)
      toast.error(error instanceof Error ? error.message : 'Transfer failed')
    } finally {
      setIsTransferring(false)
    }
  }

  const cancelTransfer = async (transferId: string) => {
    if (!confirm('Are you sure you want to cancel this transfer?')) return

    try {
      const response = await fetch('/api/transfers/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferId,
          walletAddress: walletAddress
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel transfer')
      }

      toast.success('Transfer cancelled successfully')
      fetchTransfers(1, true)
      
    } catch (error) {
      console.error('Cancel transfer error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to cancel transfer')
    }
  }

  const acceptTransfer = async (transferId: string) => {
    try {
      const response = await fetch('/api/transfers/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferId,
          walletAddress: walletAddress
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept transfer')
      }

      toast.success('Transfer accepted successfully!')
      fetchTransfers(1, true)
      
    } catch (error) {
      console.error('Accept transfer error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to accept transfer')
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      return 'Invalid date'
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return format(date, 'MMM d, yyyy h:mm a')
    } catch (error) {
      return 'Invalid date'
    }
  }

  const getStatusIcon = (status: TransferTicket['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'transferred':
        return <ArrowUpRight className="h-4 w-4 text-blue-500" />
      case 'used':
        return <CheckCircle className="h-4 w-4 text-gray-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'refunded':
        return <ArrowDownRight className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: TransferTicket['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'transferred':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'used':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'refunded':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to view transfers</div>

  if (!walletAddress && ready && authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Wallet Connected</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your wallet to manage ticket transfers.
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

  const filteredTransfers = transfers.filter(transfer => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        transfer.event?.title?.toLowerCase().includes(searchLower) ||
        transfer.ticketNumber?.toLowerCase().includes(searchLower) ||
        transfer.fromUser?.walletAddress?.toLowerCase().includes(searchLower) ||
        transfer.toUser?.walletAddress?.toLowerCase().includes(searchLower) ||
        transfer.fromUser?.email?.toLowerCase().includes(searchLower) ||
        transfer.toUser?.email?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Ticket Transfers</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Transfer tickets to friends or manage received transfers
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wallet className="h-4 w-4" />
              <span className="font-mono">
                {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </span>
            </div>
          </div>

    {/* Stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="card rounded-2xl p-4 border-2 border-gray-200 dark:border-gray-700 shadow-sm text-accent dark:text-accent">
        <div className="flex items-center justify-between mb-3 ">
          <p className="text-sm font-semibold  ">Total Transfers</p>
          <Send className="h-5 w-5 text-primary" />
        </div>
        <p className="text-3xl font-black ">{stats.totalTransfers}</p>
      </div>
  
  <div className="card rounded-2xl p-4 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-semibold ">Sent</p>
      <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    </div>
    <p className="text-3xl font-black text-blue-700 dark:text-blue-300">{stats.sentTransfers}</p>
  </div>
  
  <div className="card rounded-2xl p-4 border-2 border-green-200 dark:border-green-800 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-semibold ">Received</p>
      <ArrowDownRight className="h-5 w-5 text-green-600 dark:text-green-400" />
    </div>
    <p className="text-3xl font-black text-green-700 dark:text-green-300">{stats.receivedTransfers}</p>
  </div>
  
  <div className="card rounded-2xl p-4 border-2 border-yellow-200 dark:border-yellow-800 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-semibold  ">Pending</p>
      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
    </div>
    <p className="text-3xl font-black text-yellow-700 dark:text-yellow-300">{stats.pendingTransfers}</p>
  </div>
</div>

          {/* Tabs & Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              {['all', 'sent', 'received'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-3 rounded-2xl font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by event, ticket number, or wallet address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Transfer Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card p-8 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Transfer Ticket</h3>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Recipient Wallet Address
                  </label>
                  <input
                    type="text"
                    value={transferToAddress}
                    onChange={(e) => setTransferToAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the recipient's wallet address (0x...)
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => initiateTransfer(selectedTicket)}
                    disabled={isTransferring || !transferToAddress.trim()}
                    className="btn-primary flex-1 py-3 disabled:opacity-50"
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Transferring...
                      </>
                    ) : (
                      'Confirm Transfer'
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transfers List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card rounded-2xl p-6 animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : filteredTransfers.length > 0 ? (
          <>
            <div className="space-y-4 mb-8">
              {filteredTransfers.map((transfer) => (
                <div key={transfer._id} className="card rounded-2xl p-4 hover:shadow-sm transition-all">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Event Image */}
                    <div className="lg:w-1/4">
                      <div className="relative h-48 lg:h-full rounded-xl overflow-hidden">
                        <img
                          src={transfer.event?.imageCid 
                            ? `https://gateway.pinata.cloud/ipfs/${transfer.event.imageCid}`
                            : transfer.event?.bannerImage || '/placeholder-event.jpg'
                          }
                          alt={transfer.event?.title || 'Event'}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(transfer.status)} flex items-center gap-1`}>
                            {getStatusIcon(transfer.status)}
                            <span>{transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transfer Details */}
                    <div className="lg:flex-1">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2">
                            {transfer.event?.title || 'Unknown Event'}
                          </h3>
                          
                          <div className="space-y-2 text-sm">
                            {/* Ticket Info */}
                            <div className="flex items-center gap-4">
                              <span className="flex items-center text-gray-600 dark:text-gray-400">
                                <Ticket className="h-4 w-4 mr-2" />
                                {transfer.ticketType?.name || 'General Ticket'}
                              </span>
                              <span className="font-mono text-gray-500">
                                #{transfer.ticketNumber}
                              </span>
                            </div>
                            
                            {/* Date & Location */}
                            <div className="flex items-center gap-4">
                              <span className="flex items-center text-gray-600 dark:text-gray-400">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatDate(transfer.event?.startDate || '')}
                              </span>
                              {!transfer.event?.isVirtual && (
                                <span className="flex items-center text-gray-600 dark:text-gray-400">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  {transfer.event?.venue || 'Venue TBA'}
                                </span>
                              )}
                            </div>
                            
                            {/* Transfer Parties */}
                            <div className="space-y-2">
                              {transfer.fromUser && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">From:</span>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span className="font-mono text-sm">
                                      {transfer.fromUser.walletAddress?.slice(0, 6)}...{transfer.fromUser.walletAddress?.slice(-4)}
                                    </span>
                                    {transfer.fromUser.email && (
                                      <span className="text-gray-500 text-xs">
                                        ({transfer.fromUser.email})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {transfer.toUser && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">To:</span>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span className="font-mono text-sm">
                                      {transfer.toUser.walletAddress?.slice(0, 6)}...{transfer.toUser.walletAddress?.slice(-4)}
                                    </span>
                                    {transfer.toUser.email && (
                                      <span className="text-gray-500 text-xs">
                                        ({transfer.toUser.email})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Transfer Dates */}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Created: {formatDateTime(transfer.createdAt)}</span>
                              {transfer.transferredAt && (
                                <span>Transferred: {formatDateTime(transfer.transferredAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {transfer.status === 'active' && !transfer.transferredTo && (
                            <button
                              onClick={() => setSelectedTicket(transfer._id)}
                              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                            >
                              <Send className="h-4 w-4" />
                              Transfer
                            </button>
                          )}
                          
                          {transfer.status === 'transferred' && transfer.transferredTo && (
                            <div className="flex gap-2">
                              {activeTab === 'received' ? (
                                <button
                                  onClick={() => acceptTransfer(transfer._id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Accept
                                </button>
                              ) : (
                                <button
                                  onClick={() => cancelTransfer(transfer._id)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                          
                          <button
                            onClick={() => {
                              // View ticket details
                              toast.info('Viewing ticket details...')
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </button>
                        </div>
                      </div>
                      
                      {/* Price & Payment */}
                      {transfer.order && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex justify-between items-center">
                            <div className="text-sm">
                              <span className="text-gray-500">Payment: </span>
                              <span className="font-medium">
                                {transfer.order.paymentMethod === 'free' ? 'Free' : 
                                 `${transfer.order.currency} ${transfer.order.totalAmount}`}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {transfer.order.paymentMethod}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More */}
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
                    'Load More Transfers'
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 card rounded-2xl">
            <Send className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No transfers found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {search 
                ? 'No transfers match your search.'
                : activeTab !== 'all'
                ? `You have no ${activeTab} transfers.`
                : 'You haven\'t sent or received any ticket transfers yet.'
              }
            </p>
            {!search && activeTab === 'all' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Transfer tickets to friends or accept transfers from others.
                </p>
                <button
                  onClick={() => {
                    // Navigate to tickets page to initiate transfer
                    window.location.href = '/dashboard/tickets'
                  }}
                  className="btn-primary px-6 py-3"
                >
                  Go to My Tickets
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}