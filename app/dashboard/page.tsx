'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  Ticket, Wallet, Plus, History, Send, Settings, 
  Calendar, Users, QrCode, ChevronRight, Sparkles,
  LogIn, User, CreditCard, Globe, Copy, RefreshCw,
  AlertCircle, Loader2, Shield, Mail, Scan
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'

// Lazy load heavy components
const LoadingSpinner = dynamic(() => 
  import('@/components/common/LoadingSpinner').then(mod => ({ default: mod.LoadingSpinner })),
  { ssr: false }
)

const ARC_CONFIG = {
  RPC_URL: 'https://rpc.testnet.arc.io',
  BLOCKSCOUT_API: 'https://testnet.arcscan.app/api/v2',
  CHAIN_ID: 5042002,
}

// Arc Testnet USDC address
const ARC_USDC_ADDRESS = '0xF56D154E8A75C81f7bAC1F83E1C634F6A53C9e8E'  // Verify from docs

// USDC ABI - Minimal interface for balanceOf
const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
]

// Module cache for ethers - lazy load only when needed
let ethersModuleCache: any = null
let ethersLoadPromise: Promise<any> | null = null

// Helper function to dynamically load ethers only once
async function loadEthers() {
  if (ethersModuleCache) return ethersModuleCache
  
  if (!ethersLoadPromise) {
    ethersLoadPromise = import('ethers').then(module => {
      ethersModuleCache = module
      return module
    })
  }
  
  return ethersLoadPromise
}

interface DashboardStats {
  usdcBalance: string
  usdBalance: string
  ticketCount: number
  upcomingEvents: number
  isLoading: boolean
  error: string | null
}

// Skeleton component for balance card
function BalanceCardSkeleton() {
  return (
    <div className="glass-card rounded-3xl p-6 mb-8 bg-gradient-to-r from-primary to-primary-dark text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="h-4 w-24 bg-white/20 rounded animate-pulse mb-2"></div>
          <div className="h-8 w-32 bg-white/20 rounded animate-pulse"></div>
        </div>
        <div className="h-12 w-32 bg-white/20 rounded-2xl animate-pulse"></div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 h-12 bg-white/20 rounded-xl animate-pulse"></div>
        <div className="flex-1 h-12 bg-white/20 rounded-xl animate-pulse"></div>
      </div>
    </div>
  )
}

// Skeleton for menu items
function MenuItemsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-card rounded-2xl p-4 h-20 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
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

// Function to fetch USDC balance from Lisk Mainnet with dynamic ethers
async function fetchUSDCBalance(walletAddress: string): Promise<{
  usdcBalance: string;
  usdBalance: string;
  success: boolean;
  error?: string;
}> {
  try {
    console.log('💰 Fetching USDC balance for:', walletAddress)
    
    // Dynamically load ethers only when needed
    const { ethers } = await loadEthers()
    const provider = new ethers.JsonRpcProvider(ARC_CONFIG.RPC_URL)
    
    try {
      const network = await provider.getNetwork()
      console.log('✅ Connected to Arc Testnet:', {
        name: network.name,
        chainId: network.chainId
      })
    } catch (networkError) {
      console.error('❌ Arc Testnet connection error:', networkError)
      return {
        usdcBalance: '0.00',
        usdBalance: '0.00',
        success: false,
        error: 'Failed to connect to Lisk Mainnet'
      }
    }
    
    const usdcContract = new ethers.Contract(
      ARC_USDC_ADDRESS,
      USDC_ABI,
      provider
    )
    
    // Parallel fetch for better performance
    const [rawBalance, decimals] = await Promise.all([
      usdcContract.balanceOf(walletAddress),
      usdcContract.decimals()
    ])
    
    const usdcBalance = ethers.formatUnits(rawBalance, decimals)
    const usdcBalanceFormatted = parseFloat(usdcBalance).toFixed(6)
    const usdBalance = usdcBalanceFormatted
    
    console.log('✅ USDC balance fetched successfully:', {
      usdc: usdcBalanceFormatted,
      usd: usdBalance
    })
    
    return {
      usdcBalance: usdcBalanceFormatted,
      usdBalance: usdBalance,
      success: true
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching USDC balance:', {
      error: error.message,
      code: error.code
    })
    return {
      usdcBalance: '0.00',
      usdBalance: '0.00',
      success: false,
      error: error.message || 'Failed to fetch USDC balance'
    }
  }
}

export default function DashboardPage() {
  const { user, authenticated, ready, login } = usePrivy()
  const [stats, setStats] = useState<DashboardStats>({
    usdcBalance: '0.00',
    usdBalance: '0.00',
    ticketCount: 0,
    upcomingEvents: 0,
    isLoading: false,
    error: null
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [balanceUpdateTime, setBalanceUpdateTime] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [pageLoaded, setPageLoaded] = useState(false)

  // Events the user can scan (organiser or scanner)
  const [scanEvents, setScanEvents] = useState<any[]>([])
  const [loadingScanEvents, setLoadingScanEvents] = useState(false)

  // Set page as loaded immediately for instant render
  useEffect(() => {
    setPageLoaded(true)
  }, [])

  // Fetch wallet address and email when user is authenticated
  useEffect(() => {
    if (authenticated && ready && user) {
      const address = getWalletAddressFromUser(user)
      setWalletAddress(address)
      const email = user?.email?.address || null
      setUserEmail(email)
    }
  }, [authenticated, ready, user])

  // Fetch balance when wallet address changes - with debounce
  useEffect(() => {
    if (!walletAddress) {
      if (authenticated && ready) {
        setStats(prev => ({
          ...prev,
          isLoading: false,
          error: 'No wallet address found. Please connect your wallet.'
        }))
      }
      return
    }

    // Delay balance fetch slightly to prioritize page render
    const timer = setTimeout(() => {
      fetchDashboardData()
    }, 100)

    return () => clearTimeout(timer)
  }, [walletAddress, authenticated, ready])

  // Fetch scan-authorised events - low priority, fetch after balance
  useEffect(() => {
    if (!walletAddress && !userEmail) return
    
    // Delay this fetch to not block critical UI
    const timer = setTimeout(() => {
      const fetchScanEvents = async () => {
        setLoadingScanEvents(true)
        try {
          const res = await fetch(`/api/events/scan-authorised`, {
            headers: {
              'x-wallet-address': walletAddress || '',
              'x-user-email': userEmail || '',
            },
          })
          const data = await res.json()
          if (data.events) {
            setScanEvents(data.events)
          }
        } catch (error) {
          console.error('Failed to fetch scan events', error)
        } finally {
          setLoadingScanEvents(false)
        }
      }
      fetchScanEvents()
    }, 500) // Fetch after 500ms to prioritize balance

    return () => clearTimeout(timer)
  }, [walletAddress, userEmail])

  const fetchDashboardData = async (showToast = false) => {
    if (!walletAddress) {
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
      // Fetch balance in background
      const balancePromise = fetchUSDCBalance(walletAddress)
      
      // Simulate other dashboard data (replace with actual API calls)
      const statsPromise = Promise.resolve({
        ticketCount: 3,
        upcomingEvents: 2
      })

      // Fetch in parallel
      const [balanceData, statsData] = await Promise.all([
        balancePromise,
        statsPromise
      ])
      
      if (balanceData.success) {
        setStats(prev => ({
          ...prev,
          usdcBalance: balanceData.usdcBalance,
          usdBalance: balanceData.usdBalance,
          ticketCount: statsData.ticketCount,
          upcomingEvents: statsData.upcomingEvents,
          isLoading: false,
          error: null
        }))
        
        const now = new Date()
        setBalanceUpdateTime(now.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }))
        
        if (showToast) {
          toast.success('Balance updated successfully!')
        }
      } else {
        setStats(prev => ({
          ...prev,
          ticketCount: statsData.ticketCount,
          upcomingEvents: statsData.upcomingEvents,
          isLoading: false,
          error: balanceData.error || 'Failed to fetch balance'
        }))
        
        if (showToast) {
          toast.error('Failed to update balance')
        }
      }
      
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

  // Show loading only for auth, not for the whole page
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Suspense fallback={<div>Loading...</div>}>
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </Suspense>
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

  // Dashboard menu items - static data
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

  // Filter only upcoming events (startDate > now)
  const upcomingScanEvents = scanEvents.filter(ev => {
    const eventDate = new Date(ev.startDate)
    return eventDate > new Date()
  })

  // Show section only if there is at least one upcoming event
  const showScanSection = upcomingScanEvents.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header - Renders immediately */}
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

        {/* Balance Card - Show skeleton while loading */}
        {stats.isLoading && !stats.usdcBalance ? (
          <BalanceCardSkeleton />
        ) : (
          <div className="glass-card rounded-3xl p-6 mb-8 bg-gradient-to-r from-primary to-primary-dark text-white font-extrabold">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
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
                
                {stats.error ? (
                  <div className="flex items-center gap-2 text-yellow-300">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">{stats.error}</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-extrabold">${stats.usdBalance}</p>
                      <p className="text-sm opacity-80 font-extrabold">USDC</p>
                    </div>
                    <p className="text-xs opacity-70 mt-2 font-extrabold">USDC on Lisk Mainnet (1:1 with USD)</p>
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
            
            <div className="flex gap-3 text-lg">
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
        )}

        {/* Quick Actions Menu - Renders immediately */}
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

        {/* Events You Can Scan – lazy loaded */}
        {showScanSection && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Events You Can Scan</h2>
            </div>
            <div className="space-y-3">
              {loadingScanEvents ? (
                <div className="glass-card rounded-2xl p-4 h-20 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              ) : (
                upcomingScanEvents.map((ev) => (
                  <div key={ev._id} className="glass-card rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Scan className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{ev.title}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(ev.startDate).toLocaleDateString()}
                        </p>
                        {ev.isOrganizer && (
                          <span className="inline-block text-xs text-primary mt-1 bg-primary/10 px-2 py-0.5 rounded-full">
                            Organizer
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {ev.isOrganizer && (
                        <Link
                          href={`/dashboard/event-scanners/${ev._id}`}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <Mail className="h-4 w-4" />
                          Manage Scanners
                        </Link>
                      )}
                      <Link
                        href={`/events/${ev._id}/scan`}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                      >
                        <QrCode className="h-4 w-4" />
                        Scan Tickets
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Events Quick Access - Renders immediately */}
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