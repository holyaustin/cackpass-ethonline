// app/dashboard/wallet/page.tsx
// COMPLETE ARC TESTNET + BASE MAINNET PRIVY FIAT ONRAMP VERSION

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  usePrivy,
  useWallets,
  useFiatOnramp,
} from '@privy-io/react-auth'

import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  QrCode,
  ExternalLink,
  RefreshCw,
  Send,
  Receipt,
  Shield,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
  DollarSign,
  ShoppingCart,
  Sparkles,
  CreditCard,
} from 'lucide-react'

import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import QRCode from 'qrcode'

// ============================================================
// NETWORK CONFIGURATION
// ============================================================

const ARC_CONFIG = {
  RPC_URL:
    typeof window !== 'undefined'
      ? 'https://arc-testnet.drpc.org'
      : 'https://rpc.testnet.arc.network',

  RPC_URL_FALLBACK: 'https://rpc.testnet.arc.network',

  EXPLORER_URL: 'https://testnet.arcscan.app',

  BLOCKSCOUT_API: 'https://testnet.arcscan.app/api/v2',

  CHAIN_ID: 5042002,

  CAIP2_CHAIN_ID: 'eip155:5042002' as const,

  NATIVE_CURRENCY: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
  },
} as const

// Arc Testnet USDC
const ARC_USDC_CONTRACT_ADDRESS =
  '0x3600000000000000000000000000000000000000'

const USDC_DECIMALS = 6

// Keep this alias because the rest of the wallet page
// uses USDC_CONTRACT_ADDRESS for Arc Testnet operations.
const USDC_CONTRACT_ADDRESS = ARC_USDC_CONTRACT_ADDRESS

// ============================================================
// BASE MAINNET — PRIVY FIAT ONRAMP ONLY
// ============================================================

const BASE_ONRAMP_CONFIG = {
  NAME: 'Base Mainnet',
  CHAIN_ID: 8453,
  CAIP2_CHAIN_ID: 'eip155:8453' as const,
  RPC_URL: 'https://mainnet.base.org',
  USDC_CONTRACT_ADDRESS:
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDC_DECIMALS: 6,
} as const

// ============================================================
// PRIVY FIAT ONRAMP CONFIG
// ============================================================

const PRIVY_ONRAMP_CONFIG: {
  DEFAULT_FIAT: 'usd' | 'eur' | 'gbp'
  FIAT_ASSETS: ('usd' | 'eur' | 'gbp')[]
  DEFAULT_AMOUNT: string
} = {
  DEFAULT_FIAT: 'usd',
  FIAT_ASSETS: ['usd', 'eur', 'gbp'],
  DEFAULT_AMOUNT: '20',
}

// ============================================================
// EXTERNAL ONRAMP SERVICES
// ============================================================

const ONRAMP_SERVICES = {
  RAMP_NOW: 'https://rampnow.io/en/buy/usdc',
  ONRAMP_MONEY: 'https://onramp.money',
} as const

const ARC_USDC_DECIMALS = 6

// ============================================
// USDC ABI
// ============================================

const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]

// ============================================
// RATE LIMITING
// ============================================

const RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  timeWindow: 60000,
  retryAfter: 2000,
}

const BALANCE_POLL_INTERVAL = 30000

// ============================================
// ETHERS MODULE CACHE
// ============================================

let ethersModuleCache: any = null

async function loadEthers() {
  if (!ethersModuleCache) {
    ethersModuleCache = await import('ethers')
  }

  return ethersModuleCache
}

// ============================================
// RATE LIMITER
// ============================================

class RateLimiter {
  private requests: number[] = []
  private maxRequests: number
  private timeWindow: number
  private retryAfter: number

  constructor(
    maxRequests: number,
    timeWindow: number,
    retryAfter: number
  ) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
    this.retryAfter = retryAfter
  }

  async acquire(): Promise<void> {
    const now = Date.now()

    this.requests = this.requests.filter(
      (time) => now - time < this.timeWindow
    )

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]

      const waitTime =
        oldestRequest + this.timeWindow - now

      if (waitTime > 0) {
        console.log(
          `Rate limited. Waiting ${waitTime}ms before retrying...`
        )

        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.max(waitTime, this.retryAfter)
          )
        )

        return this.acquire()
      }
    }

    this.requests.push(Date.now())
  }
}

const apiRateLimiter = new RateLimiter(
  RATE_LIMIT_CONFIG.maxRequests,
  RATE_LIMIT_CONFIG.timeWindow,
  RATE_LIMIT_CONFIG.retryAfter
)

// ============================================
// TYPES
// ============================================

interface WalletBalance {
  usdc: string
  usd: string
  isLoading: boolean
  error: string | null
}

interface BaseBalance {
  usdc: string
  isLoading: boolean
  error: string | null
}

interface Transaction {
  hash: string
  type: 'received' | 'sent'
  status: 'completed' | 'pending' | 'failed'
  amount: string
  currency: string
  description: string
  timestamp: string
  usdValue: string
  from: string
  to: string
  blockNumber?: number
  gasUsed?: string
  tokenSymbol?: string
}

interface PaginationInfo {
  page: number
  totalPages: number
  totalItems: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// ============================================
// GET WALLET ADDRESS FROM PRIVY
// ============================================

function getWalletAddressFromUser(
  user: any
): string | null {
  if (!user) return null

  if (
    user.wallet?.address &&
    typeof user.wallet.address === 'string'
  ) {
    return user.wallet.address
  }

  const linkedAccounts = user.linkedAccounts || []

  const embeddedWallet = linkedAccounts.find(
    (acc: any) =>
      acc.type === 'wallet' &&
      acc.walletClientType === 'privy'
  )

  if (embeddedWallet?.address) {
    return embeddedWallet.address
  }

  for (const account of linkedAccounts) {
    if (
      account.type === 'wallet' &&
      account.address
    ) {
      return account.address
    }
  }

  return null
}

// ============================================
// GENERATE QR CODE
// ============================================

async function generateQRCode(
  walletAddress: string
): Promise<string> {
  try {
    const qrCodeDataUrl =
      await QRCode.toDataURL(walletAddress, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

    return qrCodeDataUrl
  } catch (error) {
    console.error(
      'Error generating QR code:',
      error
    )

    return ''
  }
}

// ============================================
// RATE-LIMITED FETCH
// ============================================

async function rateLimitedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  await apiRateLimiter.acquire()

  try {
    const response = await fetch(url, options)

    if (response.status === 429) {
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          RATE_LIMIT_CONFIG.retryAfter
        )
      )

      return rateLimitedFetch(url, options)
    }

    return response
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}

// ============================================
// FETCH ARC USDC BALANCE
// ============================================
//
// THIS FUNCTION ONLY READS ARC TESTNET.
//
// It must never use the Base USDC contract.
//

async function fetchUSDCBalance(
  walletAddress: string
): Promise<{
  usdcBalance: string
  usdBalance: string
  success: boolean
  error?: string
}> {
  try {
    console.log(
      '💰 Fetching USDC balance from Arc Testnet for:',
      walletAddress
    )

    const { ethers } = await loadEthers()

    const provider =
      new ethers.JsonRpcProvider(
        ARC_CONFIG.RPC_URL,
        {
          chainId: ARC_CONFIG.CHAIN_ID,
          name: 'arc-testnet',
        },
        {
          staticNetwork: true,
          batchMaxCount: 1,
          polling: false,
        }
      )

    const usdcContract =
      new ethers.Contract(
        ARC_USDC_CONTRACT_ADDRESS,
        USDC_ABI,
        provider
      )

    const rawBalance =
      await usdcContract.balanceOf(walletAddress)

    const usdcBalance =
      ethers.formatUnits(
        rawBalance,
        ARC_USDC_DECIMALS
      )

    const usdcBalanceFormatted =
      parseFloat(usdcBalance).toFixed(6)

    console.log(
      '✅ USDC balance on Arc:',
      usdcBalanceFormatted
    )

    return {
      usdcBalance: usdcBalanceFormatted,
      usdBalance: usdcBalanceFormatted,
      success: true,
    }
  } catch (error: any) {
    console.error(
      '❌ Error fetching Arc USDC balance:',
      error.message
    )

    return {
      usdcBalance: '0.000000',
      usdBalance: '0.000000',
      success: false,
      error:
        error.message ||
        'Failed to fetch Arc USDC balance',
    }
  }
}

// ============================================
// FETCH BASE MAINNET USDC BALANCE
// ============================================
//
// This is deliberately separate from the Arc balance.
//
// If a user purchases USDC through Privy:
//
// Privy -> Base Mainnet -> Same wallet address
//
// It will appear here, NOT in the Arc balance.
//

async function fetchBaseUSDCBalance(
  walletAddress: string
): Promise<{
  usdcBalance: string
  success: boolean
  error?: string
}> {
  try {
    console.log(
      '💳 Fetching Base Mainnet USDC balance for:',
      walletAddress
    )

    const { ethers } = await loadEthers()

    const provider =
      new ethers.JsonRpcProvider(
        BASE_ONRAMP_CONFIG.RPC_URL,
        {
          chainId: BASE_ONRAMP_CONFIG.CHAIN_ID,
          name: 'base',
        },
        {
          staticNetwork: true,
          batchMaxCount: 1,
          polling: false,
        }
      )

    const usdcContract =
      new ethers.Contract(
        BASE_ONRAMP_CONFIG.USDC_CONTRACT_ADDRESS,
        USDC_ABI,
        provider
      )

    const rawBalance =
      await usdcContract.balanceOf(walletAddress)

    const usdcBalance =
      ethers.formatUnits(
        rawBalance,
        BASE_ONRAMP_CONFIG.USDC_DECIMALS
      )

    const formatted =
      parseFloat(usdcBalance).toFixed(6)

    console.log(
      '✅ USDC balance on Base:',
      formatted
    )

    return {
      usdcBalance: formatted,
      success: true,
    }
  } catch (error: any) {
    console.error(
      '❌ Error fetching Base USDC balance:',
      error.message
    )

    return {
      usdcBalance: '0.000000',
      success: false,
      error:
        error.message ||
        'Failed to fetch Base USDC balance',
    }
  }
}

// ============================================
// FETCH ARC USDC TRANSACTIONS
// ============================================

async function fetchUSDCTransactions(
  walletAddress: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{
  transactions: Transaction[]
  pagination: PaginationInfo
}> {
  try {
    console.log(
      '📝 Fetching USDC transactions from Arc Testnet for:',
      walletAddress
    )

    const { ethers } = await loadEthers()

    const transactions: Transaction[] = []

    try {
      const tokenResponse =
        await rateLimitedFetch(
          `${ARC_CONFIG.BLOCKSCOUT_API}/addresses/${walletAddress}/token-transfers`
        )

      if (tokenResponse.ok) {
        const data =
          await tokenResponse.json()

        const items =
          data.items || data || []

        const usdcTransactions =
          items.filter(
            (transfer: any) =>
              transfer.token?.contract_address?.toLowerCase() ===
                ARC_USDC_CONTRACT_ADDRESS.toLowerCase() ||
              transfer.token?.symbol === 'USDC'
          )

        for (
          const transfer of usdcTransactions
        ) {
          try {
            const isReceived =
              transfer.to?.hash?.toLowerCase() ===
              walletAddress.toLowerCase()

            const decimals = parseInt(
              transfer.token?.decimals || '6'
            )

            const value =
              ethers.formatUnits(
                transfer.total?.value || '0',
                decimals
              )

            const amount =
              parseFloat(value).toFixed(6)

            transactions.push({
              hash:
                transfer.transaction_hash ||
                transfer.hash,

              type: isReceived
                ? 'received'
                : 'sent',

              status: 'completed',

              amount,

              currency: 'USDC',

              description: `${
                isReceived
                  ? 'Received'
                  : 'Sent'
              } USDC`,

              timestamp:
                transfer.timestamp
                  ? new Date(
                      transfer.timestamp
                    ).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )
                  : 'Unknown date',

              usdValue: `$${amount}`,

              from:
                transfer.from?.hash ||
                'Unknown',

              to:
                transfer.to?.hash ||
                'Unknown',

              tokenSymbol: 'USDC',
            })
          } catch (transferError) {
            console.error(
              'Error processing USDC transfer:',
              transferError
            )
          }
        }
      }
    } catch (apiError) {
      console.warn(
        'ArcScan API unavailable, transactions will be empty:',
        apiError
      )
    }

    transactions.sort((a, b) => {
      const dateA =
        a.timestamp === 'Unknown date'
          ? new Date(0)
          : new Date(a.timestamp)

      const dateB =
        b.timestamp === 'Unknown date'
          ? new Date(0)
          : new Date(b.timestamp)

      return (
        dateB.getTime() -
        dateA.getTime()
      )
    })

    const totalItems =
      transactions.length

    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / pageSize)
    )

    const startIndex =
      (page - 1) * pageSize

    return {
      transactions:
        transactions.slice(
          startIndex,
          startIndex + pageSize
        ),

      pagination: {
        page,
        totalPages,
        totalItems,
        hasNextPage:
          page < totalPages,
        hasPrevPage:
          page > 1,
      },
    }
  } catch (error) {
    console.error(
      '❌ Error fetching transactions:',
      error
    )

    return {
      transactions: [],

      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  }
}

// ============================================
// MAIN WALLET PAGE
// ============================================

export default function WalletPage() {
  const {
    authenticated,
    ready,
    user,
  } = usePrivy()

  const { wallets } = useWallets()

  // ==========================================
  // PRIVY FIAT ONRAMP
  // ==========================================

  const { fund } = useFiatOnramp()

  // ==========================================
  // STATE
  // ==========================================

  const [balance, setBalance] =
    useState<WalletBalance>({
      usdc: '0.000000',
      usd: '0.000000',
      isLoading: true,
      error: null,
    })

  const [baseBalance, setBaseBalance] =
    useState<BaseBalance>({
      usdc: '0.000000',
      isLoading: false,
      error: null,
    })

  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [pagination, setPagination] =
    useState<PaginationInfo>({
      page: 1,
      totalPages: 1,
      totalItems: 0,
      hasNextPage: false,
      hasPrevPage: false,
    })

  const [isLoading, setIsLoading] =
    useState(true)

  const [isRefreshing, setIsRefreshing] =
    useState(false)

  const [copied, setCopied] =
    useState(false)

  const [activeTab, setActiveTab] =
    useState<
      'overview' | 'send' | 'receive'
    >('overview')

  const [sendAmount, setSendAmount] =
    useState('')

  const [sendToAddress, setSendToAddress] =
    useState('')

  const [isSending, setIsSending] =
    useState(false)

  const [balanceUpdateTime, setBalanceUpdateTime] =
    useState<string>('')

  const [qrCodeUrl, setQrCodeUrl] =
    useState<string>('')

  const [walletAddress, setWalletAddress] =
    useState<string | null>(null)

  const [
    hasPendingTransaction,
    setHasPendingTransaction,
  ] = useState(false)

  const [lastBalanceCheck, setLastBalanceCheck] =
    useState<number>(0)

  const [isFunding, setIsFunding] =
    useState(false)

  const balancePollIntervalRef =
    useRef<NodeJS.Timeout | null>(null)

  const transactionCheckIntervalRef =
    useRef<NodeJS.Timeout | null>(null)

  // ==========================================
  // GET WALLET ADDRESS
  // ==========================================

  useEffect(() => {
    if (
      authenticated &&
      ready &&
      user
    ) {
      const address =
        getWalletAddressFromUser(user)

      setWalletAddress(address)
    }
  }, [
    authenticated,
    ready,
    user,
  ])

  // ==========================================
  // GENERATE QR
  // ==========================================

  useEffect(() => {
    if (walletAddress) {
      generateQRCode(walletAddress)
        .then(setQrCodeUrl)
    }
  }, [walletAddress])

  // ==========================================
  // FETCH BALANCE
  // ==========================================

  const fetchBalance =
    useCallback(
      async (
        showToast = false
      ): Promise<boolean> => {
        if (!walletAddress) {
          setBalance((prev) => ({
            ...prev,
            isLoading: false,
            error:
              'No wallet address available',
          }))

          return false
        }

        if (showToast) {
          setIsRefreshing(true)
        }

        try {
          const balanceData =
            await fetchUSDCBalance(
              walletAddress
            )

          if (balanceData.success) {
            setBalance({
              usdc:
                balanceData.usdcBalance,

              usd:
                balanceData.usdBalance,

              isLoading: false,

              error: null,
            })

            const now = new Date()

            setBalanceUpdateTime(
              now.toLocaleTimeString(
                [],
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )
            )

            setLastBalanceCheck(
              Date.now()
            )

            if (showToast) {
              toast.success(
                'Arc balance updated successfully!'
              )
            }

            return true
          }

          setBalance((prev) => ({
            ...prev,
            isLoading: false,
            error:
              balanceData.error ||
              'Failed to fetch balance',
          }))

          if (showToast) {
            toast.error(
              'Failed to update Arc balance'
            )
          }

          return false
        } catch (error: any) {
          console.error(
            '❌ Failed to fetch balance:',
            error
          )

          setBalance((prev) => ({
            ...prev,
            isLoading: false,
            error:
              error.message ||
              'Failed to fetch data',
          }))

          if (showToast) {
            toast.error(
              'Failed to update Arc balance'
            )
          }

          return false
        } finally {
          setIsRefreshing(false)
        }
      },
      [walletAddress]
    )

  // ==========================================
  // FETCH BASE BALANCE
  // ==========================================

  const fetchBaseBalance =
    useCallback(
      async () => {
        if (!walletAddress) return

        try {
          setBaseBalance((prev) => ({
            ...prev,
            isLoading: true,
          }))

          const result =
            await fetchBaseUSDCBalance(
              walletAddress
            )

          if (result.success) {
            setBaseBalance({
              usdc:
                result.usdcBalance,
              isLoading: false,
              error: null,
            })
          } else {
            setBaseBalance({
              usdc:
                result.usdcBalance,
              isLoading: false,
              error:
                result.error ||
                'Unable to fetch Base balance',
            })
          }
        } catch (error: any) {
          console.error(
            '❌ Failed to fetch Base balance:',
            error
          )

          setBaseBalance({
            usdc: '0.000000',
            isLoading: false,
            error:
              error?.message ||
              'Unable to fetch Base balance',
          })
        }
      },
      [walletAddress]
    )

  // ==========================================
  // FETCH TRANSACTIONS
  // ==========================================

  const fetchTransactions =
    useCallback(
      async (page: number = 1) => {
        if (!walletAddress) return

        try {
          const {
            transactions: txData,
            pagination: paginationData,
          } =
            await fetchUSDCTransactions(
              walletAddress,
              page
            )

          setTransactions(txData)

          setPagination(
            paginationData
          )
        } catch (error: any) {
          console.error(
            'Failed to fetch transactions:',
            error
          )
        }
      },
      [walletAddress]
    )

  // ==========================================
  // FETCH ALL WALLET DATA
  // ==========================================

  const fetchWalletData =
    useCallback(
      async (
        showToast = false,
        page: number = 1
      ) => {
        if (!walletAddress) {
          setBalance((prev) => ({
            ...prev,
            isLoading: false,
            error:
              'No wallet address available',
          }))

          return
        }

        setIsLoading(true)

        try {
          await Promise.all([
            fetchBalance(showToast),
            fetchBaseBalance(),
            fetchTransactions(page),
          ])
        } catch (error: any) {
          console.error(
            'Failed to fetch wallet data:',
            error
          )

          toast.error(
            'Failed to load wallet data'
          )
        } finally {
          setIsLoading(false)
        }
      },
      [
        walletAddress,
        fetchBalance,
        fetchBaseBalance,
        fetchTransactions,
      ]
    )

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    if (
      authenticated &&
      ready &&
      walletAddress
    ) {
      fetchWalletData()
    }
  }, [
    authenticated,
    ready,
    walletAddress,
    fetchWalletData,
  ])

  // ==========================================
  // BALANCE POLLING
  // ==========================================

  useEffect(() => {
    if (
      !walletAddress ||
      !authenticated
    ) {
      if (
        balancePollIntervalRef.current
      ) {
        clearInterval(
          balancePollIntervalRef.current
        )

        balancePollIntervalRef.current =
          null
      }

      return
    }

    balancePollIntervalRef.current =
      setInterval(() => {
        const now = Date.now()

        if (
          now - lastBalanceCheck >
          BALANCE_POLL_INTERVAL
        ) {
          fetchBalance(false)
          fetchBaseBalance()
        }
      }, BALANCE_POLL_INTERVAL)

    return () => {
      if (
        balancePollIntervalRef.current
      ) {
        clearInterval(
          balancePollIntervalRef.current
        )

        balancePollIntervalRef.current =
          null
      }
    }
  }, [
    walletAddress,
    authenticated,
    lastBalanceCheck,
    fetchBalance,
    fetchBaseBalance,
  ])

  // ==========================================
  // COPY WALLET ADDRESS
  // ==========================================

  const copyAddress = () => {
    if (!walletAddress) {
      toast.error(
        'No wallet address found'
      )

      return
    }

    navigator.clipboard.writeText(
      walletAddress
    )

    setCopied(true)

    toast.success(
      'Wallet address copied to clipboard!'
    )

    setTimeout(
      () => setCopied(false),
      2000
    )
  }

  // ==========================================
  // REFRESH
  // ==========================================

  const refreshData = () => {
    if (!walletAddress) {
      toast.error(
        'No wallet address available'
      )

      return
    }

    fetchWalletData(
      true,
      pagination.page
    )
  }

  // ==========================================
  // PAGE CHANGE
  // ==========================================

  const handlePageChange = (
    newPage: number
  ) => {
    if (
      newPage >= 1 &&
      newPage <= pagination.totalPages
    ) {
      fetchWalletData(
        false,
        newPage
      )
    }
  }

  // ==========================================
  // PRIVY FIAT ONRAMP
  // ==========================================
  //
  // IMPORTANT:
  //
  // The onramp destination is BASE MAINNET.
  //
  // It does NOT switch the application's
  // default network to Base.
  //
  // Arc remains the application's normal
  // wallet network.
  //
  // Privy sends the purchased USDC to the
  // same wallet address on Base.
  //

const handlePrivyFunding = async () => {
  if (!walletAddress) {
    toast.error('Wallet address is not available')
    return
  }

  if (isFunding) {
    return
  }

  try {
    setIsFunding(true)

    console.log('💳 Starting Privy fiat onramp...')
    console.log('📍 Wallet address:', walletAddress)

    // IMPORTANT:
    // The application remains on Arc Testnet.
    //
    // Privy onramp is intentionally configured to purchase
    // USDC on Base Mainnet.
    //
    // The resulting Base USDC is NOT automatically bridged
    // to Arc Testnet.

    console.log(
      '🌐 Onramp destination:',
      BASE_ONRAMP_CONFIG.CAIP2_CHAIN_ID
    )

    console.log(
      '🪙 Onramp asset: USDC on Base Mainnet'
    )

    console.log(
      '📍 Base USDC contract:',
      BASE_ONRAMP_CONFIG.USDC_CONTRACT_ADDRESS
    )

    const result = await fund({
      source: {
        assets: PRIVY_ONRAMP_CONFIG.FIAT_ASSETS,
        defaultAsset: PRIVY_ONRAMP_CONFIG.DEFAULT_FIAT,
      },

      destination: {
        // IMPORTANT:
        // Privy's fiat onramp expects the supported asset
        // identifier here, not the ERC20 contract address.
        asset: 'usdc',

        // IMPORTANT:
        // Fiat onramp goes to Base Mainnet.
        chain: BASE_ONRAMP_CONFIG.CAIP2_CHAIN_ID,

        // Same Privy embedded wallet address.
        address: walletAddress,
      },

      environment: 'production',

      defaultAmount:
        PRIVY_ONRAMP_CONFIG.DEFAULT_AMOUNT,
    })

    console.log('✅ Privy onramp result:', result)

    // Do NOT refresh Arc balance here.
    //
    // The purchase is on Base Mainnet, therefore it should
    // not be represented as an Arc Testnet balance increase.

    const resultStatus =
      typeof result === 'object' &&
      result !== null &&
      'status' in result
        ? String(
            (result as { status?: unknown }).status ?? ''
          ).toLowerCase()
        : ''

    if (
      resultStatus === 'confirmed' ||
      resultStatus === 'complete' ||
      resultStatus === 'completed'
    ) {
      toast.success(
        'Purchase confirmed. USDC is being delivered to your wallet on Base Mainnet.'
      )

      return
    }

    if (
      resultStatus === 'submitted' ||
      resultStatus === 'pending' ||
      resultStatus === 'processing'
    ) {
      toast.success(
        'Purchase submitted. USDC will appear on Base Mainnet once the provider completes the purchase.'
      )

      return
    }

    toast.success(
      'Privy onramp opened. Complete the purchase to receive USDC on Base Mainnet.'
    )
  } catch (error: any) {
    console.error('❌ Privy fiat onramp error:', error)

    const message =
      error?.message ||
      error?.error?.message ||
      'Unable to start the fiat onramp'

    toast.error(message)
  } finally {
    setIsFunding(false)
  }
}
  
    // ==========================================
  
    // SEND TRANSACTION
  // ==========================================
  //
  // SEND ALWAYS OPERATES ON ARC TESTNET.
  //

  const handleSendTransaction =
    async () => {
      if (!user || !walletAddress) {
        toast.error(
          'Please connect your wallet'
        )

        return
      }

      if (
        !sendAmount ||
        parseFloat(sendAmount) <= 0
      ) {
        toast.error(
          'Please enter a valid amount'
        )

        return
      }

      if (!sendToAddress) {
        toast.error(
          'Please enter a recipient address'
        )

        return
      }

      setIsSending(true)
      setHasPendingTransaction(true)

      try {
        const { ethers } =
          await loadEthers()

        if (
          !ethers.isAddress(
            sendToAddress
          )
        ) {
          toast.error(
            'Please enter a valid recipient address'
          )

          setIsSending(false)
          setHasPendingTransaction(false)

          return
        }

        const embeddedWallet =
          wallets.find(
            (w) =>
              w.walletClientType ===
              'privy'
          )

        if (!embeddedWallet) {
          throw new Error(
            'No Privy embedded wallet found. Please make sure you are logged in with Privy.'
          )
        }

        console.log(
          '✅ Embedded wallet address:',
          embeddedWallet.address
        )

        console.log(
          '📤 Recipient:',
          sendToAddress
        )

        console.log(
          '💰 Amount:',
          sendAmount
        )

        console.log(
          '🌐 Target chain: Arc Testnet (Chain ID: 5042002)'
        )

        // ========================================
        // ALWAYS SWITCH TO ARC FOR NORMAL SENDS
        // ========================================

        try {
          await embeddedWallet.switchChain(
            ARC_CONFIG.CHAIN_ID
          )

          console.log(
            '✅ Switched embedded wallet to Arc Testnet'
          )

          await new Promise(
            (resolve) =>
              setTimeout(resolve, 500)
          )
        } catch (switchError: any) {
          console.warn(
            'Chain switch warning:',
            switchError.message
          )
        }

        const privyProvider =
          await embeddedWallet.getEthereumProvider()

        const accounts =
          await privyProvider.request(
            {
              method: 'eth_accounts',
            }
          )

        const connectedAddress =
          accounts[0]?.toLowerCase()

        const embeddedAddress =
          embeddedWallet.address.toLowerCase()

        console.log(
          '🔗 Privy provider accounts:',
          accounts
        )

        console.log(
          '🎯 Expected embedded wallet:',
          embeddedWallet.address
        )

        if (
          connectedAddress !==
          embeddedAddress
        ) {
          throw new Error(
            `Privy provider mismatch: Got ${connectedAddress} but expected ${embeddedAddress}.`
          )
        }

        const ethersProvider =
          new ethers.BrowserProvider(
            privyProvider
          )

        const signer =
          await ethersProvider.getSigner()

        const signerAddress =
          await signer.getAddress()

        console.log(
          '✅ Signer address:',
          signerAddress
        )

        if (
          signerAddress.toLowerCase() !==
          embeddedAddress
        ) {
          throw new Error(
            `Signer mismatch: Got ${signerAddress} but expected ${embeddedAddress}.`
          )
        }

        const network =
          await ethersProvider.getNetwork()

        console.log(
          '🔗 Current chain ID:',
          network.chainId.toString()
        )

        if (
          Number(network.chainId) !==
          ARC_CONFIG.CHAIN_ID
        ) {
          throw new Error(
            `Wallet is not on Arc Testnet. Expected chain ID ${ARC_CONFIG.CHAIN_ID}, got ${network.chainId}.`
          )
        }

        // ========================================
        // VERIFY ARC USDC CONTRACT
        // ========================================

        const code =
          await ethersProvider.getCode(
            ARC_USDC_CONTRACT_ADDRESS
          )

        if (
          code === '0x' ||
          code === '0x0'
        ) {
          throw new Error(
            `USDC contract not found on Arc Testnet at ${ARC_USDC_CONTRACT_ADDRESS}.`
          )
        }

        console.log(
          '✅ Arc USDC contract verified'
        )

        const usdcContract =
          new ethers.Contract(
            ARC_USDC_CONTRACT_ADDRESS,
            USDC_ABI,
            signer
          )

        const decimals =
          await usdcContract.decimals()

        console.log(
          '✅ USDC decimals:',
          decimals
        )

        const amount =
          ethers.parseUnits(
            sendAmount,
            decimals
          )

        const currentBalance =
          await usdcContract.balanceOf(
            embeddedWallet.address
          )

        const formattedBalance =
          ethers.formatUnits(
            currentBalance,
            decimals
          )

        console.log(
          '💰 Embedded wallet Arc USDC balance:',
          formattedBalance
        )

        console.log(
          '💰 Sending amount:',
          sendAmount
        )

        if (
          currentBalance <
          amount
        ) {
          throw new Error(
            `Insufficient USDC balance. Your wallet has ${formattedBalance} USDC but you're trying to send ${sendAmount} USDC.`
          )
        }

        console.log(
          '📝 Sending USDC transfer on Arc Testnet...'
        )

        const tx =
          await usdcContract.transfer(
            sendToAddress,
            amount
          )

        toast.success(
          'USDC Transfer sent!',
          {
            description: `Hash: ${tx.hash.slice(
              0,
              10
            )}...`,

            duration: 5000,

            action: {
              label: 'View',

              onClick: () =>
                window.open(
                  `${ARC_CONFIG.EXPLORER_URL}/tx/${tx.hash}`,
                  '_blank'
                ),
            },
          }
        )

        const receipt =
          await tx.wait()

        if (
          receipt?.status === 1
        ) {
          toast.success(
            'USDC Transfer confirmed!',
            {
              duration: 5000,

              action: {
                label: 'View',

                onClick: () =>
                  window.open(
                    `${ARC_CONFIG.EXPLORER_URL}/tx/${tx.hash}`,
                    '_blank'
                  ),
              },
            }
          )

          setTimeout(() => {
            fetchBalance(true)

            fetchTransactions(
              pagination.page
            )
          }, 2000)
        } else {
          toast.error(
            'USDC Transfer failed'
          )
        }

        setSendAmount('')
        setSendToAddress('')
        setActiveTab('overview')
      } catch (error: any) {
        console.error(
          '❌ Transaction error:',
          error
        )

        let userMessage =
          error.message ||
          'Please try again'

        if (
          error.message?.includes(
            'insufficient funds'
          )
        ) {
          userMessage =
            'Insufficient USDC for gas + transfer amount. On Arc, gas is paid in USDC.'
        }

        toast.error(
          'Transaction failed',
          {
            description:
              userMessage,
          }
        )
      } finally {
        setIsSending(false)

        setTimeout(
          () =>
            setHasPendingTransaction(
              false
            ),
          30000
        )
      }
    }

  // ==========================================
  // VIEW EXPLORER
  // ==========================================

  const viewOnExplorer = (
    txHash?: string
  ) => {
    if (!txHash) return

    window.open(
      `${ARC_CONFIG.EXPLORER_URL}/tx/${txHash}`,
      '_blank'
    )
  }

  // ==========================================
  // OPEN EXTERNAL SERVICE
  // ==========================================

  const handleOnrampRedirect = (
    url: string
  ) => {
    if (walletAddress) {
      window.open(
        url,
        '_blank'
      )
    } else {
      toast.error(
        'Wallet address not available'
      )
    }
  }

  // ==========================================
  // LOADING / AUTH
  // ==========================================

  if (!ready) {
    return (
      <LoadingSpinner fullScreen />
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card p-8 rounded-3xl text-center">
          <Wallet className="h-16 w-16 text-primary mx-auto mb-6" />

          <h2 className="text-2xl font-bold mb-4">
            Wallet Access
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Please sign in to view and manage your wallet
          </p>
        </div>
      </div>
    )
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-6 max-w-6xl">

        {/* HEADER */}

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">

            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Fund Wallet
              </h1>

              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage your USDC balance on Arc Testnet
              </p>
            </div>

          </div>
        </div>

        {/* TABS */}

        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">

          <button
            onClick={() =>
              setActiveTab('overview')
            }
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-light hover:text-text'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() =>
              setActiveTab('send')
            }
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'send'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-light hover:text-text'
            }`}
          >
            <Send className="h-4 w-4 inline mr-2" />
            Send
          </button>

          <button
            onClick={() =>
              setActiveTab('receive')
            }
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'receive'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-light hover:text-text'
            }`}
          >
            <Receipt className="h-4 w-4 inline mr-2" />
            Receive
          </button>

        </div>

        {/* ====================================== */}
        {/* OVERVIEW */}
        {/* ====================================== */}

        {activeTab === 'overview' && (
          <>

            {/* ARC BALANCE CARD */}

            <div className="glass-card rounded-3xl p-6 mb-8 bg-gradient-to-r from-primary to-primary-dark text-white font-extrabold">

              <div className="flex items-center justify-between mb-6">

                <div>

                  <div className="flex items-center gap-3 mb-2">

                    <p className="text-sm opacity-90">
                      Arc Testnet Balance
                    </p>

                    <button
                      onClick={refreshData}
                      disabled={
                        isRefreshing ||
                        balance.isLoading
                      }
                      className="p-1 hover:bg-white/20 rounded-md transition-colors disabled:opacity-50"
                      title="Refresh balance"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${
                          isRefreshing
                            ? 'animate-spin'
                            : ''
                        }`}
                      />
                    </button>

                    {balanceUpdateTime && (
                      <span className="text-xs opacity-70">
                        Updated at{' '}
                        {balanceUpdateTime}
                      </span>
                    )}

                  </div>

                  {balance.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-32 bg-white/20 rounded animate-pulse"></div>
                    </div>
                  ) : balance.error ? (
                    <div className="flex items-center gap-2 text-yellow-300">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm">
                        {balance.error}
                      </p>
                    </div>
                  ) : (
                    <div>

                      <div className="flex items-baseline gap-2">

                        <p className="text-3xl font-extrabold">
                          ${balance.usd}
                        </p>

                        <p className="text-sm opacity-80 font-extrabold">
                          USDC
                        </p>

                      </div>

                      <p className="text-xs opacity-70 mt-2 font-extrabold">
                        USDC on Arc Testnet (1:1 with USD)
                      </p>

                    </div>
                  )}

                </div>

                <div className="flex items-center gap-3 p-3 bg-white/20 rounded-2xl backdrop-blur-sm">

                  <Wallet className="h-6 w-6" />

                  {walletAddress ? (
                    <div className="flex items-center gap-2">

                      <span className="text-sm font-mono max-w-[120px] truncate">
                        {walletAddress.slice(
                          0,
                          6
                        )}
                        ...
                        {walletAddress.slice(
                          -4
                        )}
                      </span>

                      <button
                        onClick={
                          copyAddress
                        }
                        className="p-1 hover:bg-white/20 rounded-md transition-colors"
                        title="Copy wallet address"
                      >
                        <Copy className="h-3 w-3" />
                      </button>

                    </div>
                  ) : (
                    <span className="text-sm opacity-70">
                      No wallet
                    </span>
                  )}

                </div>

              </div>

              <div className="flex gap-3">

                <button
                  onClick={() =>
                    setActiveTab(
                      'send'
                    )
                  }
                  className="flex-1 py-3 bg-white text-primary font-semibold rounded-xl text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send USDC
                </button>

                <button
                  onClick={() =>
                    setActiveTab(
                      'receive'
                    )
                  }
                  className="flex-1 py-3 bg-white/20 text-white rounded-xl text-center hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Receive USDC
                </button>

              </div>

            </div>

            {/* NETWORK BALANCES */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

              {/* ARC */}

              <div className="card rounded-2xl p-5 border border-primary/20">

                <div className="flex items-center justify-between mb-3">

                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-light">
                      Default Network
                    </p>

                    <h3 className="font-bold">
                      Arc Testnet
                    </h3>
                  </div>

                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    Active
                  </span>

                </div>

                <p className="text-2xl font-bold">
                  {balance.usdc}{' '}
                  <span className="text-sm font-medium">
                    USDC
                  </span>
                </p>

                <p className="text-xs text-text-light mt-2">
                  Chain ID: 5042002
                </p>

              </div>

              {/* BASE */}

              <div className="card rounded-2xl p-5 border border-blue-500/20">

                <div className="flex items-center justify-between mb-3">

                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-light">
                      Fiat Onramp Network
                    </p>

                    <h3 className="font-bold">
                      Base Mainnet
                    </h3>
                  </div>

                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">
                    Onramp
                  </span>

                </div>

                {baseBalance.isLoading ? (
                  <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold">
                    {baseBalance.usdc}{' '}
                    <span className="text-sm font-medium">
                      USDC
                    </span>
                  </p>
                )}

                <p className="text-xs text-text-light mt-2">
                  Chain ID: 8453
                </p>

              </div>

            </div>

            {/* NETWORK EXPLANATION */}

            <div className="p-4 mb-8 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">

              <div className="flex items-start gap-3">

                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />

                <div className="text-sm">

                  <p className="font-semibold text-blue-800 dark:text-blue-300">
                    Arc and Base are separate networks
                  </p>

                  <p className="text-blue-700 dark:text-blue-400 mt-1">
                    Your normal CACK-pass wallet activity uses Arc Testnet. Privy fiat purchases are delivered as USDC on Base Mainnet. USDC purchased on Base will not automatically appear in your Arc balance.
                  </p>

                </div>

              </div>

            </div>

            {/* TRANSACTIONS */}

            <div className="mb-8">

              <div className="flex items-center justify-between mb-4">

                <h2 className="text-xl font-bold">
                  Recent Arc USDC Transactions
                </h2>

                <button
                  onClick={
                    refreshData
                  }
                  disabled={
                    isRefreshing
                  }
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${
                      isRefreshing
                        ? 'animate-spin'
                        : ''
                    }`}
                  />
                  Refresh
                </button>

              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(
                    (i) => (
                      <div
                        key={i}
                        className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
                      />
                    )
                  )}
                </div>
              ) : transactions.length > 0 ? (
                <>
                  <div className="space-y-3 mb-6">

                    {transactions.map(
                      (tx) => (
                        <TransactionItem
                          key={
                            tx.hash
                          }
                          transaction={
                            tx
                          }
                          onView={
                            viewOnExplorer
                          }
                        />
                      )
                    )}

                  </div>

                  {pagination.totalPages >
                    1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">

                      <button
                        onClick={() =>
                          handlePageChange(
                            pagination.page -
                              1
                          )
                        }
                        disabled={
                          !pagination.hasPrevPage
                        }
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>

                      <span className="text-sm text-text-light">
                        Page{' '}
                        {
                          pagination.page
                        }{' '}
                        of{' '}
                        {
                          pagination.totalPages
                        }
                      </span>

                      <button
                        onClick={() =>
                          handlePageChange(
                            pagination.page +
                              1
                          )
                        }
                        disabled={
                          !pagination.hasNextPage
                        }
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>

                    </div>
                  )}

                </>
              ) : (
                <div className="text-center py-8 card rounded-2xl">

                  <div className="flex flex-col items-center gap-3">

                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-gray-400" />
                    </div>

                    <p className="text-text-light">
                      No Arc USDC transactions yet
                    </p>

                    <p className="text-sm text-text-light max-w-md">
                      Your Arc USDC transaction history will appear here once you send or receive USDC on Arc Testnet.
                    </p>

                    <button
                      onClick={() =>
                        setActiveTab(
                          'receive'
                        )
                      }
                      className="btn-primary mt-4 px-4 py-2 text-sm"
                    >
                      Add USDC to Get Started
                    </button>

                  </div>

                </div>
              )}

            </div>
          </>
        )}

        {/* ====================================== */}
        {/* SEND */}
        {/* ====================================== */}

        {activeTab === 'send' && (
          <SendTab
            sendAmount={
              sendAmount
            }
            setSendAmount={
              setSendAmount
            }
            sendToAddress={
              sendToAddress
            }
            setSendToAddress={
              setSendToAddress
            }
            balance={
              balance
            }
            isSending={
              isSending
            }
            handleSendTransaction={
              handleSendTransaction
            }
            setActiveTab={
              setActiveTab
            }
            walletAddress={
              walletAddress
            }
          />
        )}

        {/* ====================================== */}
        {/* RECEIVE */}
        {/* ====================================== */}

        {activeTab === 'receive' && (
          <ReceiveTab
            qrCodeUrl={
              qrCodeUrl
            }
            walletAddress={
              walletAddress
            }
            copyAddress={
              copyAddress
            }
            copied={
              copied
            }
            handleOnrampRedirect={
              handleOnrampRedirect
            }
            handlePrivyFunding={
              handlePrivyFunding
            }
            isFunding={
              isFunding
            }
            baseBalance={
              baseBalance
            }
          />
        )}

      </div>
    </div>
  )
}

// ============================================
// SEND TAB
// ============================================

function SendTab({
  sendAmount,
  setSendAmount,
  sendToAddress,
  setSendToAddress,
  balance,
  isSending,
  handleSendTransaction,
  setActiveTab,
  walletAddress,
}: {
  sendAmount: string
  setSendAmount: (
    amount: string
  ) => void
  sendToAddress: string
  setSendToAddress: (
    address: string
  ) => void
  balance: WalletBalance
  isSending: boolean
  handleSendTransaction: () => Promise<void>
  setActiveTab: (
    tab:
      | 'overview'
      | 'send'
      | 'receive'
  ) => void
  walletAddress: string | null
}) {
  return (
    <div className="flex justify-center">

      <div className="card p-8 w-full max-w-md">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Send USDC on Arc
        </h2>

        <div className="space-y-6">

          <div>

            <label className="block text-sm font-medium mb-2">
              Amount (USDC)
            </label>

            <div className="relative">

              <input
                type="number"
                value={
                  sendAmount
                }
                onChange={(e) =>
                  setSendAmount(
                    e.target.value
                  )
                }
                placeholder="0.00"
                min="0"
                step="0.000001"
                className="input-field pl-4 pr-20"
              />

              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <span className="font-medium">
                  USDC
                </span>
              </div>

            </div>

            <div className="flex justify-between text-sm text-text-light mt-2">

              <span>
                Available:{' '}
                {
                  balance.usdc
                }{' '}
                USDC
              </span>

              <button
                type="button"
                onClick={() =>
                  setSendAmount(
                    balance.usdc
                  )
                }
                className="text-primary hover:underline"
              >
                Max
              </button>

            </div>

          </div>

          <div>

            <label className="block text-sm font-medium mb-2">
              Recipient Address
            </label>

            <input
              type="text"
              value={
                sendToAddress
              }
              onChange={(e) =>
                setSendToAddress(
                  e.target.value
                )
              }
              placeholder="0x..."
              className="input-field font-mono"
            />

          </div>

          {sendAmount &&
            sendToAddress && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">

                <h3 className="font-medium mb-3">
                  Transaction Summary
                </h3>

                <div className="space-y-2 text-sm">

                  <div className="flex justify-between">
                    <span className="text-text-light">
                      Amount
                    </span>

                    <span>
                      {
                        sendAmount
                      }{' '}
                      USDC
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-text-light">
                      Network
                    </span>

                    <span>
                      Arc Testnet
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-text-light">
                      Gas
                    </span>

                    <span className="text-green-600">
                      Paid in USDC
                    </span>
                  </div>

                  <div className="border-t pt-2">

                    <div className="flex justify-between font-medium">

                      <span>
                        Total
                      </span>

                      <span>
                        {
                          sendAmount
                        }{' '}
                        USDC
                      </span>

                    </div>

                  </div>

                </div>

              </div>
            )}

          <div className="flex gap-3">

            <button
              onClick={() =>
                setActiveTab(
                  'overview'
                )
              }
              className="btn-outline flex-1 py-3"
            >
              Cancel
            </button>

            <button
              onClick={
                handleSendTransaction
              }
              disabled={
                isSending ||
                !sendAmount ||
                !sendToAddress ||
                parseFloat(
                  sendAmount
                ) <= 0
              }
              className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >

              {isSending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                'Send USDC'
              )}

            </button>

          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">

            <div className="flex items-start gap-3">

              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />

              <div className="text-sm">

                <p className="font-medium text-blue-800 dark:text-blue-300">
                  Arc Network Info
                </p>

                <p className="text-blue-600 dark:text-blue-400 mt-1">
                  On Arc, USDC is the native gas token. You don't need ETH to send transactions. Gas fees are automatically deducted in USDC.
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

// ============================================
// RECEIVE TAB
// ============================================

function ReceiveTab({
  qrCodeUrl,
  walletAddress,
  copyAddress,
  copied,
  handleOnrampRedirect,
  handlePrivyFunding,
  isFunding,
  baseBalance,
}: {
  qrCodeUrl: string
  walletAddress: string | null
  copyAddress: () => void
  copied: boolean
  handleOnrampRedirect: (
    url: string
  ) => void
  handlePrivyFunding: () => Promise<void>
  isFunding: boolean
  baseBalance: BaseBalance
}) {
  return (
    <div className="flex justify-center">

      <div className="card p-8 w-full max-w-2xl">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Receive USDC
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT SIDE */}

          <div className="space-y-6">

            <div className="bg-white p-6 rounded-2xl shadow-sm">

              <div className="w-64 h-64 mx-auto mb-4">

                {qrCodeUrl ? (
                  <img
                    src={
                      qrCodeUrl
                    }
                    alt="Wallet QR Code"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">

                    <QrCode className="h-32 w-32 text-gray-400" />

                  </div>
                )}

              </div>

              <label className="block text-sm font-medium mb-2 text-primary dark:text-primary-light">
                Your Wallet Address
              </label>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-3">

                {walletAddress ? (
                  <p className="text-sm font-mono break-all text-text text-center">
                    {
                      walletAddress
                    }
                  </p>
                ) : (
                  <p className="text-text-light text-center">
                    No wallet address available
                  </p>
                )}

              </div>

              <button
                onClick={
                  copyAddress
                }
                className="btn-primary px-6 py-2 w-full"
                disabled={
                  !walletAddress
                }
              >
                {copied
                  ? 'Copied!'
                  : 'Copy Address'}
              </button>

            </div>

            <div className="space-y-4">

              <div className="p-4 bg-blue-50 dark:bg-black-800 rounded-xl pb-7">

                <h3 className="font-medium mb-2 flex items-center gap-2 text-primary dark:text-primary-light">

                  <CreditCardIcon className="h-4 w-4" />

                  How to receive USDC on Arc

                </h3>

                <ol className="list-decimal pl-5 space-y-2 text-sm text-text-light">

                  <li>
                    Share your wallet address with the sender
                  </li>

                  <li>
                    Only send USDC to this address on Arc Testnet
                  </li>

                  <li>
                    USDC will appear in your Arc wallet after network confirmation
                  </li>

                  <li>
                    Get testnet USDC from the Circle faucet
                  </li>

                </ol>

              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">

                <h3 className="font-medium mb-4">
                  Arc Testnet Information
                </h3>

                <div className="text-sm text-text-light space-y-1 text-gray-700 dark:text-gray-300">

                  <div className="flex justify-between">
                    <span>
                      Network
                    </span>

                    <span className="font-mono">
                      Arc Testnet
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Chain ID
                    </span>

                    <span className="font-mono">
                      5042002
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Gas Token
                    </span>

                    <span className="font-mono">
                      USDC
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">

                    <span>
                      USDC Address
                    </span>

                    <a
                      href={`https://testnet.arcscan.app/token/${ARC_USDC_CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs truncate max-w-[150px]"
                      title={
                        ARC_USDC_CONTRACT_ADDRESS
                      }
                    >
                      {
                        ARC_USDC_CONTRACT_ADDRESS.slice(
                          0,
                          10
                        )
                      }
                      ...
                      {
                        ARC_USDC_CONTRACT_ADDRESS.slice(
                          -8
                        )
                      }
                    </a>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* RIGHT SIDE */}

          <div>

            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">

              <CreditCardIcon className="h-5 w-5" />

              Get USDC

            </h3>

            <p className="text-text-light mb-6">
              Fund your wallet with USDC. Arc Testnet remains the default network, while Privy fiat purchases are delivered on Base Mainnet.
            </p>

            <div className="space-y-4">

              {/* ================================= */}
              {/* PRIVY FIAT ONRAMP — FIRST */}
              {/* ================================= */}

              <div className="card rounded-2xl p-5 border-2 border-primary/20 hover:border-primary/40 hover:shadow-md transition-all">

                <div className="flex items-start gap-4">

                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shrink-0">

                    <CreditCard className="h-6 w-6 text-white" />

                  </div>

                  <div className="flex-1">

                    <div className="flex items-center justify-between gap-3 mb-1">

                      <h4 className="font-bold">
                        Buy USDC with Fiat
                      </h4>

                      <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                        Base Mainnet
                      </span>

                    </div>

                    <p className="text-sm text-text-light mb-3">
                      Buy USDC with your card or supported payment method through Privy. Purchased USDC is delivered directly to your embedded wallet on Base Mainnet.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">

                      <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
                        NGN
                      </span>

                      <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
                        USD
                      </span>

                      <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
                        EUR
                      </span>

                      <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
                        Card
                      </span>

                    </div>

                    <button
                      type="button"
                      onClick={
                        handlePrivyFunding
                      }
                      disabled={
                        isFunding ||
                        !walletAddress
                      }
                      className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >

                      {isFunding ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Opening payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Buy USDC
                        </>
                      )}

                    </button>

                    <p className="text-[11px] text-text-light mt-3 text-center">
                      Powered by Privy. USDC purchased through this option is delivered on Base Mainnet.
                    </p>

                  </div>

                </div>

              </div>

              {/* BASE BALANCE */}

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">

                <div className="flex items-start gap-3">

                  <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />

                  <div className="flex-1">

                    <div className="flex items-center justify-between">

                      <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                        Base Mainnet USDC
                      </h4>

                      <span className="font-bold text-blue-800 dark:text-blue-300">
                        {baseBalance.isLoading
                          ? 'Loading...'
                          : `${baseBalance.usdc} USDC`}
                      </span>

                    </div>

                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      USDC purchased through Privy appears here.
                    </p>

                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      Chain ID: 8453
                    </p>

                  </div>

                </div>

              </div>

              {/* ================================= */}
              {/* CIRCLE FAUCET */}
              {/* ================================= */}

              <div className="card rounded-2xl p-5 hover:shadow-md transition-shadow">

                <div className="flex items-start gap-4">

                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">

                    <DollarSign className="h-6 w-6 text-white" />

                  </div>

                  <div className="flex-1">

                    <h4 className="font-bold mb-1">
                      Circle Faucet (Testnet Only)
                    </h4>

                    <p className="text-sm text-text-light mb-3">
                      Get free testnet USDC to test transactions on Arc Testnet.
                    </p>

                    <button
                      onClick={() =>
                        handleOnrampRedirect(
                          'https://faucet.circle.com'
                        )
                      }
                      className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                    >

                      <ExternalLink className="h-4 w-4" />

                      Open Circle Faucet

                    </button>

                  </div>

                </div>

              </div>

              {/* ================================= */}
              {/* RAMP NOW */}
              {/* ================================= */}

              <div className="card rounded-2xl p-5 hover:shadow-md transition-shadow">

                <div className="flex items-start gap-4">

                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">

                    <ShoppingCart className="h-6 w-6 text-white" />

                  </div>

                  <div className="flex-1">

                    <h4 className="font-bold mb-1">
                      Buy Real USDC
                    </h4>

                    <p className="text-sm text-text-light mb-3">
                      For production use, buy USDC with credit card or bank transfer.
                    </p>

                    <button
                      onClick={() =>
                        handleOnrampRedirect(
                          ONRAMP_SERVICES.RAMP_NOW
                        )
                      }
                      className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                    >

                      <ShoppingCart className="h-4 w-4" />

                      Buy USDC on RampNow

                    </button>

                  </div>

                </div>

              </div>

            </div>

            {/* TIPS */}

            <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary-dark/10 rounded-xl">

              <h4 className="font-medium mb-2 text-primary">
                💡 Network Tips
              </h4>

              <ul className="text-sm text-text-light space-y-1">

                <li>
                  • Arc Testnet is the default CACK-pass network
                </li>

                <li>
                  • Arc Testnet gas is paid in USDC
                </li>

                <li>
                  • Privy fiat onramp deposits USDC on Base Mainnet
                </li>

                <li>
                  • Base Mainnet transactions require ETH for gas
                </li>

                <li>
                  • Base USDC and Arc USDC are separate network balances
                </li>

                <li>
                  • Use the Circle faucet for Arc Testnet USDC
                </li>

                <li>
                  • View Arc transactions on ArcScan
                </li>

              </ul>

            </div>

          </div>

        </div>

      </div>
    </div>
  )
}

// ============================================
// TRANSACTION ITEM
// ============================================

function TransactionItem({
  transaction,
  onView,
}: {
  transaction: Transaction
  onView: (
    txHash?: string
  ) => void
}) {
  const getStatusIcon = (
    status: Transaction['status']
  ) => {
    switch (status) {
      case 'completed':
        return (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )

      case 'pending':
        return (
          <Clock className="h-4 w-4 text-yellow-500" />
        )

      case 'failed':
        return (
          <XCircle className="h-4 w-4 text-red-500" />
        )
    }
  }

  const getTypeIcon = (
    type: Transaction['type']
  ) => {
    switch (type) {
      case 'received':
        return (
          <ArrowDownRight className="h-4 w-4 text-green-500" />
        )

      case 'sent':
        return (
          <ArrowUpRight className="h-4 w-4 text-red-500" />
        )
    }
  }

  return (
    <div className="card rounded-2xl p-4 hover:shadow-sm transition-all">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              transaction.type ===
              'received'
                ? 'bg-green-500/10'
                : 'bg-red-500/10'
            }`}
          >
            {getTypeIcon(
              transaction.type
            )}
          </div>

          <div>

            <div className="flex items-center gap-2 mb-1">

              <h4 className="font-semibold">
                {
                  transaction.description
                }
              </h4>

              {getStatusIcon(
                transaction.status
              )}

            </div>

            <div className="flex items-center gap-4 text-sm text-text-light">

              <span className="flex items-center gap-1">

                <Clock className="h-3 w-3" />

                {
                  transaction.timestamp
                }

              </span>

              <span className="capitalize">
                {
                  transaction.type
                }
              </span>

            </div>

          </div>

        </div>

        <div className="text-right">

          <div
            className={`text-lg font-bold ${
              transaction.type ===
              'received'
                ? 'text-green-500'
                : 'text-red-500'
            }`}
          >
            {transaction.type ===
            'received'
              ? '+'
              : '-'}
            {
              transaction.amount
            }{' '}
            USDC
          </div>

          <div className="text-sm text-text-light">
            {
              transaction.usdValue
            }
          </div>

          <button
            onClick={() =>
              onView(
                transaction.hash
              )
            }
            className="mt-2 text-primary text-sm flex items-center gap-1"
          >
            View on Explorer
            <ExternalLink className="h-3 w-3" />
          </button>

        </div>

      </div>

    </div>
  )
}