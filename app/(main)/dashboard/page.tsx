// app/(main)/dashboard/page.tsx - Updated version
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Ticket, Calendar, DollarSign, Users, Wallet, CreditCard, TrendingUp, Globe } from 'lucide-react'
import { TicketCard } from '@/components/tickets/TicketCard'
import { FundWallet } from '@/components/wallet/FundWallet'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'

interface DashboardStats {
  totalTickets: number
  upcomingEvents: number
  totalSpent: number
  walletBalance: {
    usdc: string
    eth: string
    usd: string
    ngn: string
  }
}

interface TicketData {
  id: string
  eventName: string
  eventDate: string
  venue: string
  ticketType: string
  price: number
  qrCode: string
  status: 'active' | 'used' | 'transferred'
  eventImage?: string
}

export default function DashboardPage() {
  const { user, authenticated, ready } = usePrivy()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    upcomingEvents: 0,
    totalSpent: 0,
    walletBalance: {
      usdc: '0.00',
      eth: '0.00',
      usd: '0.00',
      ngn: '0.00',
    },
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showFundModal, setShowFundModal] = useState(false)

  useEffect(() => {
    if (authenticated && ready) {
      fetchDashboardData()
      // Start polling for wallet balance updates
      const interval = setInterval(fetchWalletBalance, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [authenticated, ready])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockTickets: TicketData[] = [
        {
          id: '1',
          eventName: 'TechFest Lagos 2024',
          eventDate: '2024-06-15T10:00:00Z',
          venue: 'Lagos Convention Center',
          ticketType: 'VIP Pass',
          price: 150,
          qrCode: '',
          status: 'active',
          eventImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        },
        {
          id: '2',
          eventName: 'AfroBeats Festival',
          eventDate: '2024-05-20T18:00:00Z',
          venue: 'National Stadium',
          ticketType: 'General Admission',
          price: 50,
          qrCode: '',
          status: 'active',
          eventImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
        },
      ]

      // Calculate stats
      const totalTickets = mockTickets.length
      const upcomingEvents = mockTickets.filter(t => 
        new Date(t.eventDate) > new Date() && t.status === 'active'
      ).length
      const totalSpent = mockTickets.reduce((sum, ticket) => sum + ticket.price, 0)

      // Fetch wallet balance
      await fetchWalletBalance()

      setTickets(mockTickets)
      setStats(prev => ({ 
        ...prev,
        totalTickets, 
        upcomingEvents, 
        totalSpent,
      }))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWalletBalance = async () => {
    try {
      // In a real app, you would fetch these from your backend
      // This is mock data that simulates real-time balance updates
      const mockBalance = {
        usdc: '1250.75',
        eth: '0.85',
        usd: '1250.75', // 1 USDC ≈ 1 USD
        ngn: '1875000', // Assuming 1 USD ≈ 1500 NGN
      }
      
      setStats(prev => ({
        ...prev,
        walletBalance: mockBalance,
      }))
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center glass-card p-12 rounded-3xl">
          <Wallet className="h-16 w-16 text-primary-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Welcome to CACK-pass</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
            Sign in with your email or social account to access your dashboard and manage tickets
          </p>
          <ConnectWallet />
        </div>
      </div>
    )
  }

  const userEmail = user?.email?.address?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, <span className="gradient-text">{userEmail}</span>!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Here's your ticket overview and wallet information
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowFundModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              Fund Wallet
            </button>
            <ConnectWallet />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400">USDC Balance</p>
                <p className="text-2xl md:text-3xl font-bold mt-2">{stats.walletBalance.usdc} USDC</p>
                <div className="flex gap-2 mt-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">≈ ${stats.walletBalance.usd}</span>
                  <span className="text-gray-600 dark:text-gray-400">≈ ₦{stats.walletBalance.ngn}</span>
                </div>
              </div>
              <Wallet className="h-10 w-10 text-primary-500" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400">ETH Balance</p>
                <p className="text-2xl md:text-3xl font-bold mt-2">{stats.walletBalance.eth} ETH</p>
                <div className="mt-2 text-sm text-green-500 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  ≈ $2,125 USD
                </div>
              </div>
              <Globe className="h-10 w-10 text-secondary-500" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Tickets</p>
                <p className="text-2xl md:text-3xl font-bold mt-2">{stats.totalTickets}</p>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {stats.upcomingEvents} upcoming
                </div>
              </div>
              <Ticket className="h-10 w-10 text-accent-500" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Spent</p>
                <p className="text-2xl md:text-3xl font-bold mt-2">${stats.totalSpent}</p>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  All events
                </div>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tickets */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Your Tickets</h2>
                <button className="btn-primary px-4 py-2">
                  View All
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : tickets.length > 0 ? (
                <div className="space-y-6">
                  {tickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Ticket className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Purchase your first ticket to get started
                  </p>
                  <a
                    href="/events"
                    className="btn-primary"
                  >
                    Browse Events
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Wallet & Actions */}
          <div className="space-y-6">
            {/* Fund Wallet Card */}
            <FundWallet />

            {/* Quick Actions */}
            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a
                  href="/events"
                  className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-primary-500" />
                    </div>
                    <div>
                      <div className="font-medium">Browse Events</div>
                      <div className="text-sm text-gray-500">Discover upcoming events</div>
                    </div>
                  </div>
                </a>
                
                <button
                  onClick={() => setShowFundModal(true)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <div className="font-medium">Add Funds</div>
                      <div className="text-sm text-gray-500">Top up your wallet</div>
                    </div>
                  </div>
                </button>
                
                <a
                  href="/tickets/transfer"
                  className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium">Transfer Tickets</div>
                      <div className="text-sm text-gray-500">Share with friends</div>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
              <div className="space-y-4">
                {[
                  { type: 'Received', amount: '0.5 ETH', from: 'Ticket Sale', time: '2 hours ago', usd: '$1,250' },
                  { type: 'Sent', amount: '0.1 ETH', to: 'Event Payment', time: '1 day ago', usd: '$250' },
                  { type: 'Received', amount: '250 USDC', from: 'Ticket Resale', time: '3 days ago', usd: '$250' },
                ].map((tx, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{tx.type}</div>
                      <div className="text-sm text-gray-500">
                        {tx.type === 'Received' ? `From: ${tx.from}` : `To: ${tx.to}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${tx.type === 'Received' ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.type === 'Received' ? '+' : '-'}{tx.amount}
                      </div>
                      <div className="text-sm text-gray-500">{tx.usd}</div>
                      <div className="text-xs text-gray-500">{tx.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fund Modal */}
      {showFundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="glass-card rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-6">Fund Your Wallet</h3>
              <FundWallet />
              <button
                onClick={() => setShowFundModal(false)}
                className="w-full mt-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}