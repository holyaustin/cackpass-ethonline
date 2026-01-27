// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  Ticket, Wallet, Plus, History, Send, Settings, 
  Calendar, Users, QrCode, ChevronRight, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface DashboardStats {
  balance: string
  ticketCount: number
  upcomingEvents: number
}

export default function DashboardPage() {
  const { user, authenticated, ready } = usePrivy()
  const [stats, setStats] = useState<DashboardStats>({
    balance: '0.00',
    ticketCount: 0,
    upcomingEvents: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authenticated && ready) {
      fetchDashboardData()
    }
  }, [authenticated, ready])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockStats = {
        balance: '245.50',
        ticketCount: 3,
        upcomingEvents: 2,
      }
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in to access your dashboard
          </p>
        </div>
      </div>
    )
  }

  const userName = user?.email?.address?.split('@')[0] || user?.google?.name || 'User'

  // Dashboard menu items
  const menuItems = [
    {
      title: 'My Tickets',
      description: 'View and manage your tickets',
      icon: <Ticket className="h-5 w-5" />,
      href: '/dashboard/tickets',
      color: 'bg-orange-500',
      count: stats.ticketCount,
    },
    {
      title: 'Wallet',
      description: 'View balance and transactions',
      icon: <Wallet className="h-5 w-5" />,
      href: '/dashboard/wallet',
      color: 'bg-emerald-500',
      count: null,
    },
    {
      title: 'Create Ticket',
      description: 'Design custom digital tickets',
      icon: <Plus className="h-5 w-5" />,
      href: '/dashboard/create-ticket',
      color: 'bg-blue-500',
      count: null,
    },
    {
      title: 'Transfer Tickets',
      description: 'Share tickets with friends',
      icon: <Send className="h-5 w-5" />,
      href: '/dashboard/transfers',
      color: 'bg-purple-500',
      count: null,
    },
    {
      title: 'Transaction History',
      description: 'View all your transactions',
      icon: <History className="h-5 w-5" />,
      href: '/dashboard/transactions',
      color: 'bg-gray-500',
      count: null,
    },
    {
      title: 'Settings',
      description: 'Manage account preferences',
      icon: <Settings className="h-5 w-5" />,
      href: '/dashboard/settings',
      color: 'bg-gray-600',
      count: null,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {userName}!</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Your event ticketing dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="glass-card rounded-3xl p-6 mb-8 bg-gradient-to-r from-primary to-primary-dark text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90">Total Balance</p>
              <p className="text-3xl font-bold mt-1">${stats.balance}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/dashboard/wallet"
              className="flex-1 py-3 bg-white text-primary font-semibold rounded-xl text-center hover:bg-gray-50 transition-colors"
            >
              Manage Wallet
            </Link>
            <Link 
              href="/dashboard/transactions"
              className="flex-1 py-3 bg-white/20 text-white rounded-xl text-center hover:bg-white/30 transition-colors"
            >
              View Transactions
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Tickets</p>
                <p className="text-2xl font-bold mt-1">{stats.ticketCount}</p>
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Ticket className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming Events</p>
                <p className="text-2xl font-bold mt-1">{stats.upcomingEvents}</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Menu */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          {menuItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="glass-card rounded-2xl p-4 block hover:scale-[1.02] transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${item.color}/10 rounded-xl flex items-center justify-center`}>
                    <div className={`${item.color} text-white p-2 rounded-lg`}>
                      {item.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.count !== null && item.count > 0 && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {item.count}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Events Quick Access */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Discover Events</h2>
            <Link 
              href="/events" 
              className="text-primary text-sm font-medium"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link 
              href="/events?category=music"
              className="glass-card rounded-2xl p-4 bg-gradient-to-br from-orange-500/10 to-orange-400/5"
            >
              <div className="text-orange-600 dark:text-orange-400">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-2">
                  <Users className="h-5 w-5" />
                </div>
                <p className="font-medium">Music Events</p>
                <p className="text-xs opacity-75">Concerts & Festivals</p>
              </div>
            </Link>
            <Link 
              href="/events?category=tech"
              className="glass-card rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 to-blue-400/5"
            >
              <div className="text-blue-600 dark:text-blue-400">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
                  <QrCode className="h-5 w-5" />
                </div>
                <p className="font-medium">Tech Conferences</p>
                <p className="text-xs opacity-75">Networking & Learning</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}