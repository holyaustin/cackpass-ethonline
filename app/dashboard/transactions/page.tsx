'use client'

import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  Filter, Search, Download, Calendar, 
  CreditCard, ExternalLink, Clock, CheckCircle, XCircle,
  Ticket, Wallet, Loader2, Eye, Receipt,
  Hash, Coins, Tag
} from 'lucide-react'
import { toast } from 'sonner'

// Lazy load date-fns only when needed
const loadDateFns = () => import('date-fns');

interface Transaction {
  _id: string
  userId: string
  eventId?: any
  ticketTypeId?: any
  quantity: number
  totalAmount: number
  currency: string
  paymentMethod: 'crypto' | 'paystack' | 'free'
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentReference?: string
  mintStatus?: 'pending' | 'minted' | 'failed'
  transactionHash?: string
  createdAt: string
  updatedAt: string
  event?: {
    _id: string
    title: string
    venue?: string
    imageCid?: string
  }
  ticketType?: {
    _id: string
    name: string
    category: string
    price: number
  }
  user?: {
    _id: string
    walletAddress: string
    email?: string
  }
}

interface PaginationInfo {
  page: number
  totalPages: number
  totalItems: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Loading skeleton component
const TransactionSkeleton = () => (
  <div className="glass-card rounded-2xl p-6 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
      <div className="flex-1 space-y-3">
        <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 w-1/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  </div>
);

// Helper to get wallet address
function getWalletAddressFromUser(user: any): string | null {
  if (!user) return null
  
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    return user.wallet.address
  }
  
  const linkedAccounts = user.linkedAccounts || []
  for (const account of linkedAccounts) {
    if (account.type === 'wallet' || account.type === 'smart_wallet') {
      if (account.address && typeof account.address === 'string') {
        return account.address
      }
    }
  }
  
  return null
}

// Format date - lazy loaded
async function formatDate(dateString: string, formatStr: string): Promise<string> {
  try {
    const { format } = await loadDateFns();
    return format(new Date(dateString), formatStr);
  } catch {
    return new Date(dateString).toLocaleDateString();
  }
}

export default function TransactionsPage() {
  const { authenticated, ready, user } = usePrivy()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [hasCheckedWallet, setHasCheckedWallet] = useState(false)
  const [formattedDates, setFormattedDates] = useState<{ [key: string]: string }>({})

  // Extract wallet address
  useEffect(() => {
    if (authenticated && ready && user) {
      const address = getWalletAddressFromUser(user)
      setWalletAddress(address)
      setHasCheckedWallet(true)
    } else if (ready) {
      setHasCheckedWallet(true)
    }
  }, [authenticated, ready, user])

  // Format dates for all transactions
  useEffect(() => {
    const formatAllDates = async () => {
      if (transactions.length === 0) return;
      
      const dates: { [key: string]: string } = {};
      
      for (const tx of transactions) {
        dates[`${tx._id}-created`] = await formatDate(tx.createdAt, 'MMM d, yyyy h:mm a');
        dates[`${tx._id}-updated`] = await formatDate(tx.updatedAt, 'MMM d, yyyy');
      }
      
      setFormattedDates(dates);
    };
    
    formatAllDates();
  }, [transactions]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (page = 1, reset = false) => {
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
        status: filter !== 'all' ? filter : '',
        search: search || '',
        walletAddress: walletAddress
      })

      const response = await fetch(`/api/transactions?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch transactions')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch transactions')
      }

      if (reset || page === 1) {
        setTransactions(data.transactions || [])
      } else {
        setTransactions(prev => [...prev, ...(data.transactions || [])])
      }
      
      setPagination(data.pagination || {
        page: 1,
        totalPages: 1,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false
      })
      
      setCurrentPage(data.pagination?.page || 1)
      
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load transactions')
      setTransactions([])
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [walletAddress, filter, search])

  // Initial fetch
  useEffect(() => {
    if (!hasCheckedWallet) return
    
    if (walletAddress) {
      fetchTransactions(1, true)
    } else if (authenticated && ready && hasCheckedWallet) {
      setIsLoading(false)
    }
  }, [walletAddress, filter, search, authenticated, ready, hasCheckedWallet, fetchTransactions])

  const loadMore = () => {
    if (pagination.hasNextPage && !isLoadingMore) {
      fetchTransactions(pagination.page + 1)
    }
  }

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  const handleFilterChange = useCallback((newFilter: 'all' | 'completed' | 'pending' | 'failed') => {
    setFilter(newFilter)
    setCurrentPage(1)
  }, [])

  const exportTransactions = useCallback(async () => {
    const { format } = await loadDateFns();
    
    const headers = ['Date', 'Event', 'Ticket Type', 'Quantity', 'Amount', 'Currency', 'Payment Method', 'Status']
    const csvData = transactions.map(tx => [
      format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      tx.event?.title || 'Unknown Event',
      tx.ticketType?.name || 'General',
      tx.quantity.toString(),
      tx.totalAmount.toString(),
      tx.currency,
      tx.paymentMethod,
      tx.paymentStatus
    ])

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Transactions exported successfully!')
  }, [transactions])

  const getStatusIcon = (status: Transaction['paymentStatus']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'refunded': return <CheckCircle className="h-4 w-4 text-blue-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: Transaction['paymentStatus']) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900'
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900'
      case 'failed': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
      case 'refunded': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900'
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-900'
    }
  }

  const getPaymentMethodIcon = (method: Transaction['paymentMethod']) => {
    switch (method) {
      case 'crypto': return <Coins className="h-4 w-4" />
      case 'paystack': return <CreditCard className="h-4 w-4" />
      case 'free': return <Ticket className="h-4 w-4" />
      default: return <CreditCard className="h-4 w-4" />
    }
  }

  const viewTransactionDetails = (transaction: Transaction) => {
    toast.info(`Transaction ${transaction._id.slice(-8)}`, {
      description: `${transaction.quantity} × ${transaction.ticketType?.name || 'Ticket'} - ${transaction.paymentStatus}`,
      duration: 3000
    })
  }

  const viewOnExplorer = (txHash?: string) => {
    if (!txHash) {
      toast.error('No transaction hash available')
      return
    }
    window.open(`https://testnet.arcscan.app/tx/${txHash}`, '_blank')
  }

  // Loading state
  if (!ready || !hasCheckedWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!authenticated) {
    return <div className="p-8 text-center">Please sign in to view transactions</div>
  }

  // No wallet
  if (!walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Wallet Connected</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please connect a wallet to view your transactions.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-3 w-full"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  const filteredTransactions = transactions.filter(tx => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        tx.event?.title?.toLowerCase().includes(searchLower) ||
        tx.ticketType?.name?.toLowerCase().includes(searchLower) ||
        tx.paymentReference?.toLowerCase().includes(searchLower) ||
        tx._id.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Transaction History</h1>
              <p className="text-gray-600 dark:text-gray-400">
                View all your ticket purchases and payments
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wallet className="h-4 w-4" />
              <span className="font-mono">
                {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={handleSearch}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <button
              onClick={exportTransactions}
              disabled={transactions.length === 0}
              className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {['all', 'completed', 'pending', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status as any)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <TransactionSkeleton key={i} />)}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <>
            <div className="space-y-3 mb-6">
              {filteredTransactions.map((transaction) => (
                <div key={transaction._id} className="glass-card rounded-2xl p-4 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(transaction.paymentStatus)}`}>
                        {getStatusIcon(transaction.paymentStatus)}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                          <div>
                            <h4 className="font-semibold text-lg mb-1">
                              {transaction.event?.title || 'Unknown Event'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <span className="flex items-center gap-1">
                                <Ticket className="h-3 w-3" />
                                {transaction.ticketType?.name || 'General'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formattedDates[`${transaction._id}-created`] || 'Loading...'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xl font-bold text-primary">
                              {transaction.totalAmount} {transaction.currency}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.quantity} × {transaction.ticketType?.price || 0}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.paymentStatus)}`}>
                              {transaction.paymentStatus.toUpperCase()}
                            </span>
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium flex items-center gap-1">
                              {getPaymentMethodIcon(transaction.paymentMethod)}
                              {transaction.paymentMethod.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => viewTransactionDetails(transaction)}
                              className="px-3 py-1 text-primary text-sm font-medium flex items-center gap-1 hover:bg-primary/10 rounded-lg"
                            >
                              <Eye className="h-3 w-3" />
                              Details
                            </button>
                            {transaction.transactionHash && (
                              <button
                                onClick={() => viewOnExplorer(transaction.transactionHash)}
                                className="px-3 py-1 text-primary text-sm font-medium flex items-center gap-1 hover:bg-primary/10 rounded-lg"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Explorer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More */}
            {pagination.hasNextPage && (
              <div className="text-center mt-8">
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
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 glass-card rounded-2xl">
            <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No transactions found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {search ? 'Try a different search' : 'No transactions yet'}
            </p>
            <a href="/events" className="btn-primary px-6 py-3">
              Browse Events
            </a>
          </div>
        )}
      </div>
    </div>
  )
}