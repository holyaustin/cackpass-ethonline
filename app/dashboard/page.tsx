// app/dashboard/page.tsx - Updated wallet address display
'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  Ticket, Wallet, Plus, History, Send, Settings, 
  Calendar, Users, QrCode, ChevronRight, Sparkles,
  LogIn, User, CreditCard, Globe, Copy
} from 'lucide-react' // Added Copy icon
import Link from 'next/link'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'

interface DashboardStats {
  balance: string
  ticketCount: number
  upcomingEvents: number
}

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
  
  return embeddedWallet?.address || null
}

export default function DashboardPage() {
  const { user, authenticated, ready, login } = usePrivy()
  const [stats, setStats] = useState<DashboardStats>({
    balance: '0.00',
    ticketCount: 0,
    upcomingEvents: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  useEffect(() => {
    if (authenticated && ready && user) {
      fetchDashboardData()
      // Extract wallet address from user
      const address = getWalletAddressFromUser(user)
      setWalletAddress(address)
    }
  }, [authenticated, ready, user])

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

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      toast.success('Wallet address copied to clipboard!')
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
        <div className="max-w-md w-full text-center glass-card p-8 rounded-3xl">
          <Wallet className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Welcome to CACK-pass</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Login to access your digital tickets and wallet
          </p>
          <button
            onClick={login}
            className="btn-primary px-8 py-3 text-lg flex items-center justify-center gap-2 mx-auto"
          >
            <LogIn className="h-5 w-5" />
            Login to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const userName = user?.email?.address?.split('@')[0] || user?.google?.name || 'User'

  // Dashboard menu items - UPDATED ORDER
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
      title: 'Create Ticket',
      description: 'Design custom digital tickets',
      icon: <Plus className="h-5 w-5" />,
      href: '/dashboard/create-ticket',
      color: 'bg-blue-500',
      count: null,
    },
    {
      title: 'Fund Wallet',
      description: 'Add funds and manage wallet',
      icon: <CreditCard className="h-5 w-5" />,
      href: '/dashboard/wallet',
      color: 'bg-emerald-500',
      count: null,
    },
    {
      title: 'Update Profile',
      description: 'Edit your personal information',
      icon: <User className="h-5 w-5" />,
      href: '/profile',
      color: 'bg-purple-500',
      count: null,
    },
    {
      title: 'Transfer Tickets',
      description: 'Share tickets with friends',
      icon: <Send className="h-5 w-5" />,
      href: '/dashboard/transfers',
      color: 'bg-pink-500',
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

        {/* Balance Card - UPDATED BUTTON ORDER */}
        <div className="glass-card rounded-3xl p-6 mb-8 bg-gradient-to-r from-primary to-primary-dark text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90">Total Balance</p>
              <p className="text-3xl font-bold mt-1">${stats.balance}</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Wallet className="h-6 w-6" />
              {walletAddress && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono max-w-[120px] truncate">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <button 
                    onClick={copyWalletAddress}
                    className="p-1 hover:bg-white/20 rounded-md transition-colors"
                    title="Copy wallet address"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/dashboard/create-ticket"  // Changed to Create Ticket
              className="flex-1 py-3 bg-white text-primary font-semibold rounded-xl text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Ticket
            </Link>
            <Link 
              href="/dashboard/wallet"  // Changed to Fund Wallet
              className="flex-1 py-3 bg-white/20 text-white rounded-xl text-center hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Fund Wallet
            </Link>
          </div>
        </div>

        {/* Dashboard Menu - UPDATED ORDER */}
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
              className="text-primary text-sm font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link 
              href="/events?category=music"
              className="glass-card rounded-2xl p-4 bg-gradient-to-br from-orange-500/10 to-orange-400/5 hover:from-orange-500/20 hover:to-orange-400/10 transition-all"
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
              className="glass-card rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 to-blue-400/5 hover:from-blue-500/20 hover:to-blue-400/10 transition-all"
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