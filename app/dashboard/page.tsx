// app/dashboard/page.tsx - FIXED with real-time ETH balance
'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  Ticket, Wallet, Plus, History, Send, Settings, 
  Calendar, Users, QrCode, ChevronRight, Sparkles,
  LogIn, User, CreditCard, Globe, Copy, RefreshCw,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import { ethers } from 'ethers'

interface DashboardStats {
  ethBalance: string
  usdBalance: string
  ticketCount: number
  upcomingEvents: number
  isLoading: boolean
  error: string | null
}

// Helper function to extract wallet address from Privy user
function getWalletAddressFromUser(user: any): string | null {
  if (!user) return null
  
  // Log user object for debugging
  console.log('🔍 Privy user object:', {
    hasWallet: !!user.wallet,
    walletAddress: user.wallet?.address,
    linkedAccountsCount: user.linkedAccounts?.length || 0,
    linkedAccounts: user.linkedAccounts || []
  })
  
  // Check direct wallet object (for embedded wallets)
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    console.log('✅ Found wallet address in user.wallet:', user.wallet.address)
    return user.wallet.address
  }
  
  // Check linked accounts
  const linkedAccounts = user.linkedAccounts || []
  
  // Look for embedded wallet in linked accounts
  const embeddedWallet = linkedAccounts.find(
    (acc: any) => acc.type === 'wallet' && acc.walletClientType === 'privy'
  )
  
  if (embeddedWallet?.address) {
    console.log('✅ Found wallet address in linked accounts:', embeddedWallet.address)
    return embeddedWallet.address
  }
  
  // Try to find any wallet address
  for (const account of linkedAccounts) {
    if (account.type === 'wallet' && account.address) {
      console.log('✅ Found wallet address in linked account:', account.address)
      return account.address
    }
  }
  
  console.log('❌ No wallet address found in user object')
  return null
}

// Function to fetch ETH balance from blockchain
async function fetchETHBalance(walletAddress: string): Promise<{
  ethBalance: string;
  usdBalance: string;
  success: boolean;
  error?: string;
}> {
  try {
    console.log('💰 Fetching ETH balance for:', walletAddress)
    
    // Use Lisk Sepolia RPC URL
    const rpcUrl = process.env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com'
    console.log('🔗 Using RPC URL:', rpcUrl)
    
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    
    // Test connection
    try {
      const network = await provider.getNetwork()
      console.log('✅ Connected to network:', network.name, 'Chain ID:', network.chainId)
    } catch (networkError) {
      console.error('❌ Network connection error:', networkError)
      return {
        ethBalance: '0.0000',
        usdBalance: '0.00',
        success: false,
        error: 'Network connection failed'
      }
    }
    
    // Get ETH balance in wei
    const balanceWei = await provider.getBalance(walletAddress)
    console.log('📊 Raw balance (wei):', balanceWei.toString())
    
    // Convert wei to ETH
    const ethBalance = ethers.formatEther(balanceWei)
    console.log('📊 ETH balance:', ethBalance)
    
    // Format with 4 decimal places
    const ethBalanceFormatted = parseFloat(ethBalance).toFixed(4)
    
    // Convert to USD (1 ETH = 2700 USD)
    const ethToUsdRate = 2700
    const usdValue = parseFloat(ethBalance) * ethToUsdRate
    const usdBalance = usdValue.toFixed(2)
    
    console.log('✅ Balance fetched successfully:', {
      eth: ethBalanceFormatted,
      usd: usdBalance
    })
    
    return {
      ethBalance: ethBalanceFormatted,
      usdBalance: usdBalance,
      success: true
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching ETH balance:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    })
    return {
      ethBalance: '0.0000',
      usdBalance: '0.00',
      success: false,
      error: error.message || 'Failed to fetch balance'
    }
  }
}

export default function DashboardPage() {
  const { user, authenticated, ready, login } = usePrivy()
  const [stats, setStats] = useState<DashboardStats>({
    ethBalance: '0.0000',
    usdBalance: '0.00',
    ticketCount: 0,
    upcomingEvents: 0,
    isLoading: true,
    error: null
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [balanceUpdateTime, setBalanceUpdateTime] = useState<string>('')

  // Fetch wallet address when user is authenticated
  useEffect(() => {
    if (authenticated && ready && user) {
      const address = getWalletAddressFromUser(user)
      setWalletAddress(address)
      console.log('🏷️ Wallet address set:', address)
    }
  }, [authenticated, ready, user])

  // Fetch balance when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      console.log('🚀 Fetching dashboard data with wallet:', walletAddress)
      fetchDashboardData()
    } else if (authenticated && ready) {
      // User is authenticated but no wallet found
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: 'No wallet address found. Please connect your wallet.'
      }))
    }
  }, [walletAddress, authenticated, ready])

  const fetchDashboardData = async (showToast = false) => {
    console.log('🔄 fetchDashboardData called, walletAddress:', walletAddress)
    
    if (!walletAddress) {
      console.log('⚠️ No wallet address, skipping balance fetch')
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: 'No wallet address available'
      }))
      return
    }

    if (showToast) {
      setIsRefreshing(true)
    }

    setStats(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Fetch real ETH balance
      const balanceData = await fetchETHBalance(walletAddress)
      
      if (balanceData.success) {
        // Update stats with real balance data
        setStats(prev => ({
          ...prev,
          ethBalance: balanceData.ethBalance,
          usdBalance: balanceData.usdBalance,
          isLoading: false,
          error: null
        }))
        
        // Set update time
        const now = new Date()
        setBalanceUpdateTime(now.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }))
        
        if (showToast) {
          toast.success('Balance updated successfully!')
        }
        
        console.log('✅ Dashboard data updated:', {
          eth: balanceData.ethBalance,
          usd: balanceData.usdBalance,
          time: balanceUpdateTime
        })
      } else {
        // Handle balance fetch error
        setStats(prev => ({
          ...prev,
          isLoading: false,
          error: balanceData.error || 'Failed to fetch balance'
        }))
        
        if (showToast) {
          toast.error('Failed to update balance')
        }
        
        console.error('❌ Balance fetch failed:', balanceData.error)
      }
      
      // Fetch other dashboard data (tickets, events count)
      // For now, using mock data for tickets and events
      // TODO: Replace with actual API calls
      const ticketCount = 3
      const upcomingEvents = 2
      
      setStats(prev => ({
        ...prev,
        ticketCount,
        upcomingEvents
      }))
      
    } catch (error: any) {
      console.error('❌ Failed to fetch dashboard data:', error)
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch data'
      }))
      
      if (showToast) {
        toast.error('Failed to update balance')
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      toast.success('Wallet address copied to clipboard!')
    } else {
      toast.error('No wallet address available')
    }
  }

  const refreshBalance = () => {
    if (!walletAddress) {
      toast.error('No wallet address available')
      return
    }
    fetchDashboardData(true)
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

  // Dashboard menu items
  const menuItems = [
    {
      title: 'My Tickets',
      description: 'View and manage your tickets',
      icon: <Ticket className="h-5 w-5" />,
      href: '/dashboard/tickets',
      color: 'bg-orange-500',
      count: null,
    },
    {
      title: 'My Events',
      description: 'View the events you created',
      icon: <Ticket className="h-5 w-5" />,
      href: '/events',
      color: 'bg-orange-500',
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

        {/* Balance Card */}
        <div className="glass-card rounded-3xl p-6 mb-8 bg-gradient-to-r from-primary to-primary-dark text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <p className="text-sm opacity-90">Total Balance</p>
                <button 
                  onClick={refreshBalance}
                  disabled={isRefreshing || stats.isLoading}
                  className="p-1 hover:bg-white/20 rounded-md transition-colors disabled:opacity-50"
                  title="Refresh balance"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                {balanceUpdateTime && (
                  <span className="text-xs opacity-70">Updated at {balanceUpdateTime}</span>
                )}
              </div>
              
              {stats.isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-32 bg-white/20 rounded animate-pulse"></div>
                </div>
              ) : stats.error ? (
                <div className="flex items-center gap-2 text-yellow-300">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{stats.error}</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold mt-1">${stats.usdBalance}</p>
                    <p className="text-sm opacity-80">({stats.ethBalance} ETH)</p>
                  </div>
                  <p className="text-xs opacity-70 mt-2">1 ETH = $2,700.00</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Wallet className="h-6 w-6" />
              {walletAddress ? (
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
              ) : (
                <span className="text-sm opacity-70">No wallet</span>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            <Link 
              href="/dashboard/create-ticket"
              className="flex-1 py-3 bg-white text-primary font-semibold rounded-xl text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Ticket
            </Link>
            <Link 
              href="/dashboard/wallet"
              className="flex-1 py-3 bg-white/20 text-white rounded-xl text-center hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Fund Wallet
            </Link>
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