// app/dashboard/wallet/page.tsx
// COMPLETE ARC MAINNET VERSION — BLOCKSCOUT API FOR TRANSACTIONS

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
  ShoppingCart,
  Sparkles,
} from 'lucide-react'

import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import QRCode from 'qrcode'

// ============================================================
// ARC MAINNET CONFIG
// ============================================================

const ARC_CONFIG = {
  CHAIN_ID: 5042,
  CHAIN_ID_HEX: '0x13b2',
  EXPLORER_URL: 'https://arcscan.app',
  BLOCKSCOUT_API: 'https://explorer.arc.io/api/v2',
  RPC_URL:
    process.env.NEXT_PUBLIC_ARC_MAINNET_RPC_URL ||
    'https://rpc.mainnet.arc.io',
  NATIVE_DECIMALS: 18,
} as const

const BALANCE_POLL_INTERVAL = 30000

// ============================================================
// EXTERNAL ONRAMP SERVICES
// ============================================================

const ONRAMP_SERVICES = {
  RAMP_NOW: 'https://rampnow.io/en/buy/usdc',
  ONRAMP_MONEY: 'https://onramp.money',
} as const

// ============================================================
// TYPES
// ============================================================

interface WalletBalance {
  usdc: string
  usd: string
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
  tokenSymbol?: string
}

interface PaginationInfo {
  page: number
  totalPages: number
  totalItems: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// ============================================================
// HELPERS
// ============================================================

function getWalletAddressFromUser(user: any): string | null {
  if (!user) return null
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    return user.wallet.address
  }
  const linkedAccounts = user.linkedAccounts || []
  const embeddedWallet = linkedAccounts.find(
    (acc: any) => acc.type === 'wallet' && acc.walletClientType === 'privy'
  )
  if (embeddedWallet?.address) return embeddedWallet.address
  for (const account of linkedAccounts) {
    if (account.type === 'wallet' && account.address) return account.address
  }
  return null
}

async function generateQRCode(walletAddress: string): Promise<string> {
  try {
    return await QRCode.toDataURL(walletAddress, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
  } catch {
    return ''
  }
}

// ============================================================
// MAIN WALLET PAGE
// ============================================================

export default function WalletPage() {
  const { authenticated, ready, user } = usePrivy()
  const { wallets } = useWallets()
  const { fund } = useFiatOnramp()

  // ── State ──
  const [balance, setBalance] = useState<WalletBalance>({
    usdc: '0.000000',
    usd: '0.000000',
    isLoading: true,
    error: null,
  })

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive'>('overview')

  const [sendAmount, setSendAmount] = useState('')
  const [sendToAddress, setSendToAddress] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [balanceUpdateTime, setBalanceUpdateTime] = useState<string>('')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [lastBalanceCheck, setLastBalanceCheck] = useState<number>(0)
  const [isFunding, setIsFunding] = useState(false)

  const balancePollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ── Resolve wallet address ──
  useEffect(() => {
    if (authenticated && ready && user) {
      setWalletAddress(getWalletAddressFromUser(user))
    }
  }, [authenticated, ready, user])

  // ── Generate QR code ──
  useEffect(() => {
    if (walletAddress) {
      generateQRCode(walletAddress).then(setQrCodeUrl)
    }
  }, [walletAddress])

  // ── Fetch balance using the Privy embedded wallet provider ──
  const fetchBalance = useCallback(
    async (showToast = false): Promise<boolean> => {
      if (!walletAddress) {
        setBalance((prev) => ({
          ...prev,
          isLoading: false,
          error: 'No wallet address available',
        }))
        return false
      }

      if (showToast) setIsRefreshing(true)

      try {
        const embeddedWallet = wallets.find(
          (w) => w.walletClientType === 'privy'
        )

        if (!embeddedWallet) {
          const { ethers } = await import('ethers')
          const provider = new ethers.JsonRpcProvider(ARC_CONFIG.RPC_URL, undefined, {
            staticNetwork: true,
            batchMaxCount: 1,
          })
          const rawBalance = await provider.getBalance(walletAddress)
          const formatted = parseFloat(
            ethers.formatUnits(rawBalance, ARC_CONFIG.NATIVE_DECIMALS)
          ).toFixed(6)

          setBalance({
            usdc: formatted,
            usd: formatted,
            isLoading: false,
            error: null,
          })
          setBalanceUpdateTime(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          )
          setLastBalanceCheck(Date.now())

          if (showToast) toast.success('Balance updated!')
          return true
        }

        const provider = await embeddedWallet.getEthereumProvider()
        const { ethers } = await import('ethers')
        const ethersProvider = new ethers.BrowserProvider(provider)
        const rawBalance = await ethersProvider.getBalance(walletAddress)
        const formatted = parseFloat(
          ethers.formatUnits(rawBalance, ARC_CONFIG.NATIVE_DECIMALS)
        ).toFixed(6)

        setBalance({
          usdc: formatted,
          usd: formatted,
          isLoading: false,
          error: null,
        })
        setBalanceUpdateTime(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        )
        setLastBalanceCheck(Date.now())

        if (showToast) toast.success('Balance updated!')
        return true
      } catch (error: any) {
        console.error('❌ Error fetching Arc balance:', error.message)
        setBalance((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to fetch balance',
        }))
        if (showToast) toast.error('Failed to update balance')
        return false
      } finally {
        setIsRefreshing(false)
      }
    },
    [walletAddress, wallets]
  )

  // ── Fetch transactions via Blockscout API ──
  const fetchTransactions = useCallback(
    async (page: number = 1) => {
      if (!walletAddress) return

      try {
        console.log('🔍 [TX FETCH] Blockscout API:', ARC_CONFIG.BLOCKSCOUT_API)
        console.log('🔍 [TX FETCH] Wallet:', walletAddress)

        const response = await fetch(
          `${ARC_CONFIG.BLOCKSCOUT_API}/addresses/${walletAddress}/transactions`
        )

        if (!response.ok) {
          console.error(`Blockscout API error: ${response.status}`)
          setTransactions([])
          setPagination({
            page: 1,
            totalPages: 1,
            totalItems: 0,
            hasNextPage: false,
            hasPrevPage: false,
          })
          return
        }

        const data = await response.json()

        // Blockscout v2 returns { items: [...] }
        const items = data.items || []

        const { ethers } = await import('ethers')
        const walletLower = walletAddress.toLowerCase()

        const txs: Transaction[] = []

        for (const item of items) {
          try {
            // Only include native value transfers
            const valueWei = item.value ?? '0'
            if (valueWei === '0' || valueWei === 0) continue

            const from = (item.from?.hash || '').toLowerCase()
            const to = (item.to?.hash || '').toLowerCase()

            if (from !== walletLower && to !== walletLower) continue

            const isReceived = to === walletLower
            const valueFormatted = ethers.formatUnits(
              valueWei.toString(),
              ARC_CONFIG.NATIVE_DECIMALS
            )
            const amount = parseFloat(valueFormatted).toFixed(6)

            const timestamp = item.timestamp
              ? new Date(item.timestamp).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Unknown date'

            txs.push({
              hash: item.hash,
              type: isReceived ? 'received' : 'sent',
              status: item.status === 'ok' ? 'completed' : 'failed',
              amount,
              currency: 'USDC',
              description: isReceived ? 'Received USDC' : 'Sent USDC',
              timestamp,
              usdValue: `$${amount}`,
              from: item.from?.hash || 'Unknown',
              to: item.to?.hash || 'Unknown',
              blockNumber: item.block,
              tokenSymbol: 'USDC',
            })
          } catch (txErr) {
            console.error('Error processing transaction:', txErr)
          }
        }

        // Blockscout returns newest first already; keep that order
        const pageSize = 10
        const totalItems = txs.length
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
        const startIndex = (page - 1) * pageSize
        const paginated = txs.slice(startIndex, startIndex + pageSize)

        setTransactions(paginated)
        setPagination({
          page,
          totalPages,
          totalItems,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        })
      } catch (error: any) {
        console.error('❌ Failed to fetch transactions:', error.message)
        setTransactions([])
        setPagination({
          page: 1,
          totalPages: 1,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false,
        })
      }
    },
    [walletAddress]
  )

  // ── Fetch all wallet data ──
  const fetchWalletData = useCallback(
    async (showToast = false, page: number = 1) => {
      if (!walletAddress) {
        setBalance((prev) => ({
          ...prev,
          isLoading: false,
          error: 'No wallet address available',
        }))
        return
      }

      setIsLoading(true)
      try {
        await Promise.all([fetchBalance(showToast), fetchTransactions(page)])
      } catch (error) {
        console.error('Failed to fetch wallet data:', error)
        toast.error('Failed to load wallet data')
      } finally {
        setIsLoading(false)
      }
    },
    [walletAddress, fetchBalance, fetchTransactions]
  )

  // ── Initial load ──
  useEffect(() => {
    if (authenticated && ready && walletAddress) {
      fetchWalletData()
    }
  }, [authenticated, ready, walletAddress, fetchWalletData])

  // ── Balance polling ──
  useEffect(() => {
    if (!walletAddress || !authenticated) {
      if (balancePollIntervalRef.current) {
        clearInterval(balancePollIntervalRef.current)
        balancePollIntervalRef.current = null
      }
      return
    }

    balancePollIntervalRef.current = setInterval(() => {
      const now = Date.now()
      if (now - lastBalanceCheck > BALANCE_POLL_INTERVAL) {
        fetchBalance(false)
      }
    }, BALANCE_POLL_INTERVAL)

    return () => {
      if (balancePollIntervalRef.current) {
        clearInterval(balancePollIntervalRef.current)
        balancePollIntervalRef.current = null
      }
    }
  }, [walletAddress, authenticated, lastBalanceCheck, fetchBalance])

  // ── Copy address ──
  const copyAddress = () => {
    if (!walletAddress) {
      toast.error('No wallet address found')
      return
    }
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    toast.success('Wallet address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Refresh ──
  const refreshData = () => {
    if (!walletAddress) {
      toast.error('No wallet address available')
      return
    }
    fetchWalletData(true, pagination.page)
  }

  // ── Page change ──
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchWalletData(false, newPage)
    }
  }

  // ── Privy fiat onramp ──
  const handlePrivyFunding = async () => {
    if (!walletAddress) {
      toast.error('Wallet address is not available')
      return
    }
    if (isFunding) return

    try {
      setIsFunding(true)
      console.log('💳 Starting Privy fiat onramp for:', walletAddress)

      const result = await fund({
        source: {
          assets: ['ngn', 'usd', 'eur', 'gbp'],
          defaultAsset: 'ngn',
        },
        destination: {
          asset: 'usdc',
          chain: 'eip155:5042',
          address: walletAddress,
        },
        environment: 'production',
        defaultAmount: '10000',
      })

      console.log('✅ Privy onramp result:', result)
      toast.success('Fiat onramp opened. Complete the purchase to receive USDC.')
    } catch (error: any) {
      console.error('❌ Privy onramp error:', error)
      toast.error(error?.message || 'Unable to start fiat onramp')
    } finally {
      setIsFunding(false)
    }
  }

  // ── Send transaction (native USDC transfer) ──
  const handleSendTransaction = async () => {
    if (!user || !walletAddress) {
      toast.error('Please connect your wallet')
      return
    }
    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!sendToAddress) {
      toast.error('Please enter a recipient address')
      return
    }

    setIsSending(true)
    try {
      const { ethers } = await import('ethers')

      if (!ethers.isAddress(sendToAddress)) {
        toast.error('Please enter a valid recipient address')
        return
      }

      const embeddedWallet = wallets.find(
        (w) => w.walletClientType === 'privy'
      )
      if (!embeddedWallet) {
        throw new Error('No Privy embedded wallet found')
      }

      try {
        await embeddedWallet.switchChain(ARC_CONFIG.CHAIN_ID)
        await new Promise((r) => setTimeout(r, 500))
      } catch (switchError: any) {
        console.warn('Chain switch warning:', switchError.message)
      }

      const rawProvider = await embeddedWallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(rawProvider)
      const signer = await ethersProvider.getSigner()

      const amountWei = ethers.parseUnits(
        sendAmount,
        ARC_CONFIG.NATIVE_DECIMALS
      )

      const currentBalance = await ethersProvider.getBalance(walletAddress)
      if (currentBalance < amountWei) {
        const have = ethers.formatUnits(currentBalance, ARC_CONFIG.NATIVE_DECIMALS)
        throw new Error(
          `Insufficient balance. You have ${have} USDC but tried to send ${sendAmount} USDC (gas not included).`
        )
      }

      const tx = await signer.sendTransaction({
        to: sendToAddress,
        value: amountWei,
      })

      toast.success('USDC transfer sent!', {
        description: `Hash: ${tx.hash.slice(0, 10)}...`,
        duration: 5000,
        action: {
          label: 'View',
          onClick: () =>
            window.open(`${ARC_CONFIG.EXPLORER_URL}/tx/${tx.hash}`, '_blank'),
        },
      })

      const receipt = await tx.wait()

      if (receipt?.status === 1) {
        toast.success('Transaction confirmed!', {
          duration: 5000,
          action: {
            label: 'View',
            onClick: () =>
              window.open(`${ARC_CONFIG.EXPLORER_URL}/tx/${tx.hash}`, '_blank'),
          },
        })
        setTimeout(() => {
          fetchBalance(true)
          fetchTransactions(pagination.page)
        }, 2000)
      } else {
        toast.error('Transaction failed')
      }

      setSendAmount('')
      setSendToAddress('')
      setActiveTab('overview')
    } catch (error: any) {
      console.error('❌ Transaction error:', error)
      let msg = error.message || 'Please try again'
      if (msg.includes('insufficient funds')) {
        msg =
          'Insufficient USDC for gas + transfer amount. On Arc, gas is paid in USDC.'
      }
      toast.error('Transaction failed', { description: msg })
    } finally {
      setIsSending(false)
    }
  }

  // ── View explorer ──
  const viewOnExplorer = (txHash?: string) => {
    if (!txHash) return
    window.open(`${ARC_CONFIG.EXPLORER_URL}/tx/${txHash}`, '_blank')
  }

  // ── Onramp redirect ──
  const handleOnrampRedirect = (url: string) => {
    if (walletAddress) {
      window.open(url, '_blank')
    } else {
      toast.error('Wallet address not available')
    }
  }

  // ── Render guards ──
  if (!ready) return <LoadingSpinner fullScreen />

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card p-8 rounded-3xl text-center">
          <Wallet className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Wallet Access</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Please sign in to view and manage your wallet
          </p>
        </div>
      </div>
    )
  }

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
              <h1 className="text-2xl font-bold">Fund Wallet</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage your USDC balance on Arc Mainnet
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-light hover:text-text'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('send')}
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
            onClick={() => setActiveTab('receive')}
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

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div className="glass-card rounded-3xl p-6 mb-8 bg-gradient-to-r from-primary to-primary-dark text-white font-extrabold">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-sm opacity-90">Arc Mainnet Balance</p>
                    <button
                      onClick={refreshData}
                      disabled={isRefreshing || balance.isLoading}
                      className="p-1 hover:bg-white/20 rounded-md transition-colors disabled:opacity-50"
                      title="Refresh balance"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`}
                      />
                    </button>
                    {balanceUpdateTime && (
                      <span className="text-xs opacity-70">
                        Updated at {balanceUpdateTime}
                      </span>
                    )}
                  </div>

                  {balance.isLoading ? (
                    <div className="h-8 w-32 bg-white/20 rounded animate-pulse" />
                  ) : balance.error ? (
                    <div className="flex items-center gap-2 text-yellow-300">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm">{balance.error}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-extrabold">${balance.usd}</p>
                        <p className="text-sm opacity-80 font-extrabold">USDC</p>
                      </div>
                      <p className="text-xs opacity-70 mt-2 font-extrabold">
                        USDC on Arc Mainnet (1:1 with USD)
                      </p>
                    </>
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
                        onClick={copyAddress}
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
                <button
                  onClick={() => setActiveTab('send')}
                  className="flex-1 py-3 bg-white text-primary font-semibold rounded-xl text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send USDC
                </button>
                <button
                  onClick={() => setActiveTab('receive')}
                  className="flex-1 py-3 bg-white/20 text-white rounded-xl text-center hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Receive USDC
                </button>
              </div>
            </div>

            {/* Transactions */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Recent Transactions</h2>
                <button
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <>
                  <div className="space-y-3 mb-6">
                    {transactions.map((tx) => (
                      <TransactionItem
                        key={tx.hash}
                        transaction={tx}
                        onView={viewOnExplorer}
                      />
                    ))}
                  </div>

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrevPage}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <span className="text-sm text-text-light">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNextPage}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 card rounded-2xl">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-text-light">No recent transactions</p>
                  <button
                    onClick={() => setActiveTab('receive')}
                    className="btn-primary mt-4 px-4 py-2 text-sm"
                  >
                    Receive USDC
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* SEND */}
        {activeTab === 'send' && (
          <SendTab
            sendAmount={sendAmount}
            setSendAmount={setSendAmount}
            sendToAddress={sendToAddress}
            setSendToAddress={setSendToAddress}
            balance={balance}
            isSending={isSending}
            handleSendTransaction={handleSendTransaction}
            setActiveTab={setActiveTab}
            walletAddress={walletAddress}
          />
        )}

        {/* RECEIVE */}
        {activeTab === 'receive' && (
          <ReceiveTab
            qrCodeUrl={qrCodeUrl}
            walletAddress={walletAddress}
            copyAddress={copyAddress}
            copied={copied}
            handleOnrampRedirect={handleOnrampRedirect}
            handlePrivyFunding={handlePrivyFunding}
            isFunding={isFunding}
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
  setSendAmount: (amount: string) => void
  sendToAddress: string
  setSendToAddress: (address: string) => void
  balance: WalletBalance
  isSending: boolean
  handleSendTransaction: () => Promise<void>
  setActiveTab: (tab: 'overview' | 'send' | 'receive') => void
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
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.000001"
                className="input-field pl-4 pr-20"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <span className="font-medium">USDC</span>
              </div>
            </div>
            <div className="flex justify-between text-sm text-text-light mt-2">
              <span>
                Available: {balance.usdc} USDC
              </span>
              <button
                type="button"
                onClick={() => setSendAmount(balance.usdc)}
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
              value={sendToAddress}
              onChange={(e) => setSendToAddress(e.target.value)}
              placeholder="0x..."
              className="input-field font-mono"
            />
          </div>

          {sendAmount && sendToAddress && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <h3 className="font-medium mb-3">Transaction Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-light">Amount</span>
                  <span>{sendAmount} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-light">Network</span>
                  <span>Arc Mainnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-light">Gas</span>
                  <span className="text-green-600">Paid in USDC</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('overview')}
              className="btn-outline flex-1 py-3"
            >
              Cancel
            </button>
            <button
              onClick={handleSendTransaction}
              disabled={
                isSending ||
                !sendAmount ||
                !sendToAddress ||
                parseFloat(sendAmount) <= 0
              }
              className="btn-primary flex-1 py-3 disabled:opacity-50"
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
                  On Arc, USDC is the native gas token. You don&apos;t need ETH to send transactions. Gas fees are automatically deducted in USDC.
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
}: {
  qrCodeUrl: string
  walletAddress: string | null
  copyAddress: () => void
  copied: boolean
  handleOnrampRedirect: (url: string) => void
  handlePrivyFunding: () => Promise<void>
  isFunding: boolean
}) {
  return (
    <div className="flex justify-center">
      <div className="card p-8 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Receive USDC
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="w-64 h-64 mx-auto mb-4">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Wallet QR Code"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <QrCode className="h-32 w-32 text-gray-400" />
                  </div>
                )}
              </div>

              <label className="block text-sm font-medium mb-2 text-primary">
                Your Wallet Address
              </label>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-3">
                {walletAddress ? (
                  <p className="text-sm font-mono break-all text-text text-center">
                    {walletAddress}
                  </p>
                ) : (
                  <p className="text-text-light text-center">
                    No wallet address available
                  </p>
                )}
              </div>
              <button
                onClick={copyAddress}
                className="btn-primary px-6 py-2 w-full"
                disabled={!walletAddress}
              >
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <h3 className="font-medium mb-4">Arc Mainnet Information</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Network</span>
                  <span className="font-mono">Arc Mainnet</span>
                </div>
                <div className="flex justify-between">
                  <span>Chain ID</span>
                  <span className="font-mono">5042</span>
                </div>
                <div className="flex justify-between">
                  <span>Gas Token</span>
                  <span className="font-mono">USDC</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Get USDC
            </h3>

            <p className="text-text-light mb-6">
              Fund your wallet with USDC on Arc Mainnet.
            </p>

            <div className="space-y-4">
              <div className="card rounded-2xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <ExternalLink className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1">External Onramp</h4>
                    <p className="text-sm text-text-light mb-3">
                      Alternative onramp services that deliver USDC to your wallet.
                    </p>
                    <button
                      onClick={() => handleOnrampRedirect(ONRAMP_SERVICES.RAMP_NOW)}
                      className="btn-outline w-full py-3 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open RampNow
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary-dark/10 rounded-xl">
              <h4 className="font-medium mb-2 text-primary">
                💡 Network Tips
              </h4>
              <ul className="text-sm text-text-light space-y-1">
                <li>• USDC is the native gas token on Arc Mainnet</li>
                <li>• View transactions on ArcScan</li>
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
  onView: (txHash?: string) => void
}) {
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
      case 'received':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />
      case 'sent':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <div className="card rounded-2xl p-4 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              transaction.type === 'received'
                ? 'bg-green-500/10'
                : 'bg-red-500/10'
            }`}
          >
            {getTypeIcon(transaction.type)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{transaction.description}</h4>
              {getStatusIcon(transaction.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-text-light">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {transaction.timestamp}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-lg font-bold ${
              transaction.type === 'received'
                ? 'text-green-500'
                : 'text-red-500'
            }`}
          >
            {transaction.type === 'received' ? '+' : '-'}
            {transaction.amount} USDC
          </div>
          <div className="text-sm text-text-light">{transaction.usdValue}</div>
          <button
            onClick={() => onView(transaction.hash)}
            className="mt-2 text-primary text-sm flex items-center gap-1"
          >
            View
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}