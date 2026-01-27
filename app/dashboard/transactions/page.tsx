// app/dashboard/transactions/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  Filter, Search, Download, Calendar, 
  ArrowUpRight, ArrowDownRight, CreditCard, 
  ExternalLink, Clock, CheckCircle, XCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface Transaction {
  id: string
  type: 'purchase' | 'sale' | 'transfer' | 'deposit' | 'withdrawal'
  status: 'completed' | 'pending' | 'failed'
  amount: string
  currency: string
  description: string
  date: string
  time: string
  txHash?: string
}

export default function TransactionsPage() {
  const { authenticated, ready } = usePrivy()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all')

  useEffect(() => {
    if (authenticated && ready) {
      fetchTransactions()
    }
  }, [authenticated, ready, filter, dateRange])

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with API call
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'purchase',
          status: 'completed',
          amount: '50',
          currency: 'USDC',
          description: 'TechFest 2024 Ticket',
          date: '2024-03-15',
          time: '14:30',
          txHash: '0x123...456',
        },
        {
          id: '2',
          type: 'sale',
          status: 'completed',
          amount: '150',
          currency: 'USDC',
          description: 'VIP Ticket Sale',
          date: '2024-03-14',
          time: '11:20',
          txHash: '0x789...012',
        },
        {
          id: '3',
          type: 'deposit',
          status: 'pending',
          amount: '100',
          currency: 'USDC',
          description: 'Wallet Deposit',
          date: '2024-03-14',
          time: '09:15',
        },
        {
          id: '4',
          type: 'transfer',
          status: 'completed',
          amount: '75',
          currency: 'USDC',
          description: 'Ticket Transfer',
          date: '2024-03-13',
          time: '16:45',
          txHash: '0x345...678',
        },
        {
          id: '5',
          type: 'withdrawal',
          status: 'failed',
          amount: '200',
          currency: 'USDC',
          description: 'Withdrawal to Bank',
          date: '2024-03-12',
          time: '10:30',
        },
      ]
      setTransactions(mockTransactions)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(search.toLowerCase()) ||
                         tx.amount.includes(search)
    const matchesFilter = filter === 'all' || tx.status === filter
    return matchesSearch && matchesFilter
  })

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'purchase':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />
      case 'sale':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case 'deposit':
        return <ArrowDownRight className="h-4 w-4 text-blue-500" />
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />
      case 'transfer':
        return <ArrowUpRight className="h-4 w-4 text-purple-500" />
    }
  }

  const exportTransactions = () => {
    // Implement CSV export
    alert('Export functionality coming soon!')
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to view transactions</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Transaction History</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all your ticket transactions and payments
          </p>
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
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Time</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="year">Last Year</option>
              </select>
              
              <button
                onClick={exportTransactions}
                className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {['all', 'completed', 'pending', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
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
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="glass-card rounded-2xl p-4 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {getTypeIcon(tx.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{tx.description}</h4>
                        {getStatusIcon(tx.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {tx.date} • {tx.time}
                        </span>
                        <span className="capitalize">{tx.type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      tx.type === 'purchase' || tx.type === 'withdrawal'
                        ? 'text-red-500'
                        : 'text-green-500'
                    }`}>
                      {tx.type === 'purchase' || tx.type === 'withdrawal' ? '-' : '+'}
                      ${tx.amount}
                    </div>
                    <div className="text-sm text-gray-500">{tx.currency}</div>
                    {tx.txHash && (
                      <button className="mt-2 text-primary text-sm flex items-center gap-1">
                        View on Explorer <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-card rounded-2xl">
            <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No transactions found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all' ? 'No transactions yet' : 'No transactions match your filter'}
            </p>
          </div>
        )}

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
            <p className="text-2xl font-bold mt-1">{transactions.length}</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
            <p className="text-2xl font-bold mt-1">$325.00</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Received</p>
            <p className="text-2xl font-bold mt-1">$225.00</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
            <p className="text-2xl font-bold mt-1">
              {transactions.filter(t => t.status === 'completed').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}