// app/(main)/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Ticket, Calendar, Wallet, Users, CreditCard, ArrowRight, Plus, History, Settings } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import Link from 'next/link'

interface DashboardStats {
  walletBalance: {
    usdc: string
    eth: string
    usd: string
    ngn: string
  }
  totalTickets: number
  upcomingEvents: number
}

export default function DashboardPage() {
  const { user, authenticated, ready } = usePrivy()
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    upcomingEvents: 0,
    walletBalance: {
      usdc: '0.00',
      eth: '0.00',
      usd: '0.00',
      ngn: '0.00',
    },
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
      // Mock data
      const mockBalance = {
        usdc: '100.00',
        eth: '0.00034',
        usd: '100.00',
        ngn: '146500.00',
      }
      
      setStats(prev => ({
        ...prev,
        totalTickets: 2,
        upcomingEvents: 1,
        walletBalance: mockBalance,
      }))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center glass-card p-8 rounded-3xl">
          <Wallet className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Welcome to CACK-pass</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Sign in to access your digital tickets and wallet
          </p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  const userName = user?.email?.address?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            Welcome back, <span className="text-primary">{userName}</span>!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Your digital ticket hub
          </p>
        </div>

        {/* Wallet Balance Card */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Balance</p>
              <p className="text-2xl font-bold mt-1">${stats.walletBalance.usd}</p>
              <div className="flex gap-3 mt-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">{stats.walletBalance.usdc} USDC</span>
                <span className="text-gray-600 dark:text-gray-400">{stats.walletBalance.eth} ETH</span>
                <span className="text-gray-600 dark:text-gray-400">₦{stats.walletBalance.ngn}</span>
              </div>
            </div>
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          
          <div className="flex gap-3">
            <Link 
              href="/dashboard/wallet"
              className="flex-1 btn-primary py-3 text-center flex items-center justify-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Manage Wallet
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link 
            href="/dashboard/tickets"
            className="glass-card rounded-2xl p-4 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Tickets</p>
                <p className="text-xl font-bold mt-1">{stats.totalTickets}</p>
              </div>
              <Ticket className="h-8 w-8 text-accent" />
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              {stats.upcomingEvents} upcoming
            </div>
          </Link>

          <Link 
            href="/dashboard/create-ticket"
            className="glass-card rounded-2xl p-4 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Create Ticket</p>
                <p className="text-xl font-bold mt-1">New</p>
              </div>
              <Plus className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Design custom tickets
            </div>
          </Link>
        </div>

        {/* Main Menu Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <MenuCard
            title="My Tickets"
            description="View & manage tickets"
            icon={<Ticket className="h-5 w-5" />}
            href="/dashboard/tickets"
            color="bg-orange-500/10 text-orange-600"
          />
          
          <MenuCard
            title="Create Ticket"
            description="Design custom tickets"
            icon={<Plus className="h-5 w-5" />}
            href="/dashboard/create-ticket"
            color="bg-green-500/10 text-green-600"
          />
          
          <MenuCard
            title="Events"
            description="Browse & book events"
            icon={<Calendar className="h-5 w-5" />}
            href="/events"
            color="bg-blue-500/10 text-blue-600"
          />
          
          <MenuCard
            title="Wallet"
            description="Manage funds & transactions"
            icon={<Wallet className="h-5 w-5" />}
            href="/dashboard/wallet"
            color="bg-purple-500/10 text-purple-600"
          />
        </div>

        {/* Additional Options */}
        <div className="space-y-3">
          <Link 
            href="/dashboard/transfers"
            className="flex items-center justify-between p-4 glass-card rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </Link>

          <Link 
            href="/dashboard/transactions"
            className="flex items-center justify-between p-4 glass-card rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-500/10 rounded-lg flex items-center justify-center">
                <History className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <div className="font-medium">Transaction History</div>
                <div className="text-sm text-gray-500">View all transactions</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </Link>

          <Link 
            href="/dashboard/settings"
            className="flex items-center justify-between p-4 glass-card rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-500/10 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <div className="font-medium">Settings</div>
                <div className="text-sm text-gray-500">Account preferences</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function MenuCard({ title, description, icon, href, color }: {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
}) {
  return (
    <Link 
      href={href}
      className="glass-card rounded-2xl p-4 hover:scale-[1.02] transition-transform"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
    </Link>
  )
}