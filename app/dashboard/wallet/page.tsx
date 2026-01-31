// app/dashboard/wallet/page.tsx - PRODUCTION READY FOR MAINNET
'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  Wallet, CreditCard, ArrowUpRight, ArrowDownRight, 
  Copy, QrCode, ExternalLink, RefreshCw, 
  Send, Receipt, Shield, Loader2, AlertCircle,
  Clock, CheckCircle, XCircle, Coins, Banknote,
  Info as InfoIcon, ChevronLeft, ChevronRight,
  CreditCard as CreditCardIcon, DollarSign, ShoppingCart
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import { ethers } from 'ethers'
import QRCode from 'qrcode'

// Lisk Mainnet Configuration
const LISK_CONFIG = {
  RPC_URL: 'https://rpc.api.lisk.com',
  BLOCKSCOUT_API: 'https://blockscout.lisk.com/api/v2',
  CHAIN_ID: 1135,
  NATIVE_CURRENCY: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  }
}

// Mainnet token addresses for Lisk
const TOKEN_ADDRESSES = {
  // USDC on Lisk Mainnet
  USDC: '0xF2659eD92fA06117d983411e532b490409D1cc71'
}

// On-ramp services URLs
const ONRAMP_SERVICES = {
  RAMP_NOW: 'https://rampnow.io/en/buy/usdc',
  ONRAMP_MONEY: 'https://onramp.money'
}

// ABI for ERC20 tokens
const ERC20_ABI = [
  // Read functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  // Write functions
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
]

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  timeWindow: 60000, // 1 minute in milliseconds
  retryAfter: 2000, // 2 seconds
}

// Rate limiter implementation
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number;
  private retryAfter: number;

  constructor(maxRequests: number, timeWindow: number, retryAfter: number) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.retryAfter = retryAfter;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // Check if rate limit exceeded
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.timeWindow - now;
      
      if (waitTime > 0) {
        console.log(`Rate limited. Waiting ${waitTime}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, this.retryAfter)));
        return this.acquire(); // Retry after waiting
      }
    }
    
    // Add current request
    this.requests.push(now);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}

// Create rate limiter instance
const apiRateLimiter = new RateLimiter(
  RATE_LIMIT_CONFIG.maxRequests,
  RATE_LIMIT_CONFIG.timeWindow,
  RATE_LIMIT_CONFIG.retryAfter
);

interface WalletBalance {
  eth: string
  usdc: string
  usd: string
  isLoading: boolean
  error: string | null
}

interface Transaction {
  hash: string
  type: 'received' | 'sent' | 'purchase'
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

interface BlockscoutTransaction {
  hash: string
  value: string
  from: { hash: string }
  to: { hash: string }
  timestamp: string
  status: 'ok' | 'pending' | 'error'
  block: number
  gas_used: string
  method: string
}

interface BlockscoutTokenTransfer {
  transaction_hash: string
  from: { hash: string }
  to: { hash: string }
  total: { value: string }
  timestamp: string
  token: {
    symbol: string
    decimals: string
    name: string
  }
}

interface BlockscoutAddressInfo {
  hash: string
  coin_balance: string
  token_balances?: Array<{
    token: {
      contract_address: string
      symbol: string
      decimals: string
    }
    value: string
  }>
}

interface PaginationInfo {
  page: number
  totalPages: number
  totalItems: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Helper function to get wallet address from Privy
function getWalletAddressFromUser(user: any): string | null {
  if (!user) return null
  
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    return user.wallet.address
  }
  
  const linkedAccounts = user.linkedAccounts || []
  const embeddedWallet = linkedAccounts.find(
    (acc: any) => acc.type === 'wallet' && acc.walletClientType === 'privy'
  )
  
  return embeddedWallet?.address || null
}

// Generate QR code for wallet address
async function generateQRCode(walletAddress: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(walletAddress, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback to placeholder
    return '';
  }
}

// Rate-limited fetch function
async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  await apiRateLimiter.acquire();
  
  console.log(`API Request: ${url}`);
  console.log(`Remaining requests: ${apiRateLimiter.getRemainingRequests()}`);
  
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      console.log('Rate limit hit by server, waiting...');
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.retryAfter));
      return rateLimitedFetch(url, options);
    }
    
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Fetch balances from Lisk Blockscout API
async function fetchWalletBalances(walletAddress: string): Promise<{
  ethBalance: string;
  usdcBalance: string;
  usdBalance: string;
  success: boolean;
  error?: string;
}> {
  try {
    console.log('💰 Fetching wallet balances for:', walletAddress)
    
    // First try Blockscout API for balance
    try {
      const balanceResponse = await rateLimitedFetch(
        `${LISK_CONFIG.BLOCKSCOUT_API}/addresses/${walletAddress}`
      )
      
      if (balanceResponse.ok) {
        const data: BlockscoutAddressInfo = await balanceResponse.json()
        
        // Convert Wei to ETH
        const ethBalanceWei = data.coin_balance || '0'
        const ethBalance = ethers.formatEther(ethBalanceWei)
        const ethBalanceFormatted = parseFloat(ethBalance).toFixed(4)
        
        // Look for USDC token balance
        let usdcBalance = '0.00'
        if (data.token_balances && data.token_balances.length > 0) {
          const usdcToken = data.token_balances.find(
            token => token.token.symbol === 'USDC' || 
                    token.token.contract_address.toLowerCase() === TOKEN_ADDRESSES.USDC.toLowerCase()
          )
          
          if (usdcToken) {
            const decimals = parseInt(usdcToken.token.decimals)
            usdcBalance = ethers.formatUnits(usdcToken.value, decimals)
          }
        }
        
        const usdcBalanceFormatted = parseFloat(usdcBalance).toFixed(2)
        
        // Calculate USD values
        const ethToUsdRate = 2700
        const usdcToUsdRate = 1.00
        
        const ethUsdValue = parseFloat(ethBalance) * ethToUsdRate
        const usdcUsdValue = parseFloat(usdcBalance) * usdcToUsdRate
        const totalUsdValue = ethUsdValue + usdcUsdValue
        
        console.log('✅ Balances fetched from Blockscout API')
        
        return {
          ethBalance: ethBalanceFormatted,
          usdcBalance: usdcBalanceFormatted,
          usdBalance: totalUsdValue.toFixed(2),
          success: true
        }
      }
    } catch (apiError) {
      console.log('Blockscout API failed, falling back to RPC...')
    }
    
    // Fallback to RPC if API fails
    console.log('🔄 Falling back to RPC provider...')
    const provider = new ethers.JsonRpcProvider(LISK_CONFIG.RPC_URL)
    
    // Fetch ETH balance via RPC
    const ethBalanceWei = await provider.getBalance(walletAddress)
    const ethBalance = ethers.formatEther(ethBalanceWei)
    const ethBalanceFormatted = parseFloat(ethBalance).toFixed(4)
    
    // Try to fetch USDC balance via contract call
    let usdcBalance = '0.00'
    try {
      const usdcContract = new ethers.Contract(TOKEN_ADDRESSES.USDC, ERC20_ABI, provider)
      const decimals = await usdcContract.decimals()
      const usdcBalanceRaw = await usdcContract.balanceOf(walletAddress)
      usdcBalance = ethers.formatUnits(usdcBalanceRaw, decimals)
    } catch (tokenError) {
      console.log('USDC token not available or contract error')
    }
    
    const usdcBalanceFormatted = parseFloat(usdcBalance).toFixed(2)
    
    // Calculate USD values
    const ethToUsdRate = 2700
    const usdcToUsdRate = 1.00
    const ethUsdValue = parseFloat(ethBalance) * ethToUsdRate
    const usdcUsdValue = parseFloat(usdcBalance) * usdcToUsdRate
    const totalUsdValue = ethUsdValue + usdcUsdValue
    
    return {
      ethBalance: ethBalanceFormatted,
      usdcBalance: usdcBalanceFormatted,
      usdBalance: totalUsdValue.toFixed(2),
      success: true
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching wallet balances:', error)
    
    return {
      ethBalance: '0.0000',
      usdcBalance: '0.00',
      usdBalance: '0.00',
      success: false,
      error: error.message || 'Failed to fetch balances from both API and RPC'
    }
  }
}

// Fetch real transactions from Lisk Blockscout API with pagination
async function fetchRealTransactions(
  walletAddress: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{
  transactions: Transaction[];
  pagination: PaginationInfo;
}> {
  try {
    console.log(`📝 Fetching transactions page ${page} for:`, walletAddress)
    
    const transactions: Transaction[] = []
    let totalItems = 0
    let totalPages = 1
    
    // Fetch normal ETH transactions
    try {
      const txResponse = await rateLimitedFetch(
        `${LISK_CONFIG.BLOCKSCOUT_API}/addresses/${walletAddress}/transactions`
      )
      
      if (txResponse.ok) {
        const data = await txResponse.json()
        
        // Handle different response formats
        const items = data.items || data || []
        totalItems = data.total_count || items.length
        totalPages = Math.ceil(totalItems / pageSize)
        
        if (items.length === 0) {
          console.log('No ETH transactions found for address')
        } else {
          console.log(`Found ${items.length} ETH transactions`)
          
          // Calculate pagination slice
          const startIndex = (page - 1) * pageSize
          const paginatedItems = items.slice(startIndex, startIndex + pageSize)
          
          paginatedItems.forEach((tx: any) => {
            try {
              const isReceived = tx.to?.hash?.toLowerCase() === walletAddress.toLowerCase()
              const value = ethers.formatEther(tx.value || '0')
              const amount = parseFloat(value).toFixed(4)
              
              let description = isReceived ? 'Received ETH' : 'Sent ETH'
              if (tx.method) {
                description = `${tx.method} ${isReceived ? 'Received' : 'Sent'}`
              }
              
              transactions.push({
                hash: tx.hash,
                type: isReceived ? 'received' : 'sent',
                status: tx.status === 'ok' ? 'completed' : tx.status === 'pending' ? 'pending' : 'failed',
                amount: amount,
                currency: 'ETH',
                description: description,
                timestamp: tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Unknown date',
                usdValue: `$${(parseFloat(value) * 2700).toFixed(2)}`,
                from: tx.from?.hash || 'Unknown',
                to: tx.to?.hash || 'Unknown',
                blockNumber: tx.block,
                gasUsed: tx.gas_used
              })
            } catch (txError) {
              console.error('Error processing transaction:', txError)
            }
          })
        }
      } else if (txResponse.status === 422) {
        // 422 error means invalid address format or other validation error
        console.log('Address validation failed for ETH transactions, skipping...')
      } else {
        console.error('Failed to fetch ETH transactions:', txResponse.status, txResponse.statusText)
      }
    } catch (ethTxError) {
      console.error('Error fetching ETH transactions:', ethTxError)
    }
    
    // Fetch token transfers
    try {
      const tokenResponse = await rateLimitedFetch(
        `${LISK_CONFIG.BLOCKSCOUT_API}/addresses/${walletAddress}/token-transfers`
      )
      
      if (tokenResponse.ok) {
        const data = await tokenResponse.json()
        
        // Handle different response formats
        const items = data.items || data || []
        
        if (items.length > 0) {
          console.log(`Found ${items.length} token transfers`)
          
          // Calculate pagination slice
          const startIndex = (page - 1) * pageSize
          const paginatedItems = items.slice(startIndex, startIndex + pageSize)
          
          paginatedItems.forEach((transfer: any) => {
            try {
              const isReceived = transfer.to?.hash?.toLowerCase() === walletAddress.toLowerCase()
              const decimals = parseInt(transfer.token?.decimals || '18')
              const value = ethers.formatUnits(transfer.total?.value || '0', decimals)
              const amount = parseFloat(value).toFixed(2)
              
              transactions.push({
                hash: transfer.transaction_hash || transfer.hash,
                type: isReceived ? 'received' : 'sent',
                status: 'completed',
                amount: amount,
                currency: transfer.token?.symbol || 'TOKEN',
                description: `${isReceived ? 'Received' : 'Sent'} ${transfer.token?.symbol || 'Token'}`,
                timestamp: transfer.timestamp ? new Date(transfer.timestamp).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Unknown date',
                usdValue: transfer.token?.symbol === 'USDC' 
                  ? `$${amount}`
                  : `$${(parseFloat(value) * 1).toFixed(2)}`,
                from: transfer.from?.hash || 'Unknown',
                to: transfer.to?.hash || 'Unknown',
                tokenSymbol: transfer.token?.symbol
              })
            } catch (transferError) {
              console.error('Error processing token transfer:', transferError)
            }
          })
        }
      } else if (tokenResponse.status === 422) {
        // 422 error means invalid address format or other validation error
        console.log('Address validation failed for token transfers, skipping...')
      } else {
        console.error('Failed to fetch token transfers:', tokenResponse.status, tokenResponse.statusText)
      }
    } catch (tokenTxError) {
      console.error('Error fetching token transfers:', tokenTxError)
    }
    
    // Sort by timestamp (most recent first)
    transactions.sort((a, b) => {
      const dateA = a.timestamp === 'Unknown date' ? new Date(0) : new Date(a.timestamp)
      const dateB = b.timestamp === 'Unknown date' ? new Date(0) : new Date(b.timestamp)
      return dateB.getTime() - dateA.getTime()
    })
    
    const pagination: PaginationInfo = {
      page,
      totalPages: Math.max(1, totalPages),
      totalItems,
      hasNextPage: page < Math.max(1, totalPages),
      hasPrevPage: page > 1
    }
    
    console.log(`✅ Fetched ${transactions.length} transactions, page ${page} of ${pagination.totalPages}`)
    
    return {
      transactions: transactions.slice(0, pageSize),
      pagination
    }
    
  } catch (error) {
    console.error('❌ Error fetching real transactions:', error)
    
    return {
      transactions: [],
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  }
}

export default function WalletPage() {
  const { authenticated, ready, user } = usePrivy()
  const [balance, setBalance] = useState<WalletBalance>({
    eth: '0.0000',
    usdc: '0.00',
    usd: '0.00',
    isLoading: true,
    error: null
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive'>('overview')
  const [sendAmount, setSendAmount] = useState('')
  const [sendToAddress, setSendToAddress] = useState('')
  const [sendCurrency, setSendCurrency] = useState<'ETH' | 'USDC'>('ETH')
  const [isSending, setIsSending] = useState(false)
  const [balanceUpdateTime, setBalanceUpdateTime] = useState<string>('')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  const fetchWalletData = useCallback(async (showToast = false, page: number = 1) => {
    if (!user) return

    setIsLoading(true)
    if (showToast) {
      setIsRefreshing(true)
    }

    try {
      // Get wallet address
      const walletAddress = getWalletAddressFromUser(user)
      
      if (!walletAddress) {
        setBalance(prev => ({
          ...prev,
          isLoading: false,
          error: 'No wallet address found'
        }))
        toast.error('No wallet address found')
        return
      }

      // Validate address format
      if (!ethers.isAddress(walletAddress)) {
        setBalance(prev => ({
          ...prev,
          isLoading: false,
          error: 'Invalid wallet address format'
        }))
        toast.error('Invalid wallet address format')
        return
      }

      // Generate QR code for wallet address
      try {
        const qrCode = await generateQRCode(walletAddress)
        setQrCodeUrl(qrCode)
      } catch (qrError) {
        console.error('Failed to generate QR code:', qrError)
      }

      // Fetch balances
      const balanceData = await fetchWalletBalances(walletAddress)
      
      if (balanceData.success) {
        setBalance({
          eth: balanceData.ethBalance,
          usdc: balanceData.usdcBalance,
          usd: balanceData.usdBalance,
          isLoading: false,
          error: null
        })
        
        // Set update time
        const now = new Date()
        setBalanceUpdateTime(now.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }))
        
        if (showToast) {
          toast.success('Balance updated successfully!')
        }
      } else {
        setBalance(prev => ({
          ...prev,
          isLoading: false,
          error: balanceData.error || 'Failed to fetch balance'
        }))
        if (showToast) {
          toast.error(balanceData.error || 'Failed to fetch balance')
        }
      }

      // Fetch real transactions with pagination
      const { transactions: txData, pagination: paginationData } = await fetchRealTransactions(walletAddress, page)
      setTransactions(txData)
      setPagination(paginationData)

    } catch (error: any) {
      console.error('Failed to fetch wallet data:', error)
      setBalance(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch wallet data'
      }))
      toast.error('Failed to load wallet data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    if (authenticated && ready && user) {
      fetchWalletData()
    }
  }, [authenticated, ready, user, fetchWalletData])

  const copyAddress = () => {
    const walletAddress = getWalletAddressFromUser(user)
    if (!walletAddress) {
      toast.error('No wallet address found')
      return
    }
    
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    toast.success('Wallet address copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const refreshData = () => {
    fetchWalletData(true)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchWalletData(false, newPage)
    }
  }

  const handleSendTransaction = async () => {
    if (!user) {
      toast.error('Please connect your wallet')
      return
    }

    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!sendToAddress || !ethers.isAddress(sendToAddress)) {
      toast.error('Please enter a valid recipient address')
      return
    }

    setIsSending(true)

    try {
      // Get wallet address
      const walletAddress = getWalletAddressFromUser(user)
      if (!walletAddress) {
        throw new Error('Wallet not available')
      }

      // For embedded wallets, use window.ethereum
      if (!window.ethereum) {
        throw new Error('No Ethereum provider found. Please install MetaMask or use a Web3-enabled browser.')
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      if (sendCurrency === 'ETH') {
        // Send ETH transaction
        const tx = await signer.sendTransaction({
          to: sendToAddress,
          value: ethers.parseEther(sendAmount)
        })

        toast.success('Transaction sent!', {
          description: `Hash: ${tx.hash.slice(0, 10)}...`
        })

        // Wait for confirmation
        const receipt = await tx.wait()
        if (receipt?.status === 1) {
          toast.success('Transaction confirmed!')
        } else {
          toast.error('Transaction failed')
        }

      } else {
        // Send USDC token transaction
        if (!TOKEN_ADDRESSES.USDC || TOKEN_ADDRESSES.USDC === '0x0000000000000000000000000000000000000000') {
          throw new Error('USDC token contract address not configured')
        }
        
        const usdcContract = new ethers.Contract(TOKEN_ADDRESSES.USDC, ERC20_ABI, signer)
        
        // Get decimals
        const decimals = await usdcContract.decimals()
        const amount = ethers.parseUnits(sendAmount, decimals)
        
        // Send token transfer
        const tx = await usdcContract.transfer(sendToAddress, amount)
        
        toast.success('USDC Transfer sent!', {
          description: `Hash: ${tx.hash.slice(0, 10)}...`
        })

        const receipt = await tx.wait()
        if (receipt?.status === 1) {
          toast.success('USDC Transfer confirmed!')
        } else {
          toast.error('USDC Transfer failed')
        }
      }

      // Reset form and refresh data
      setSendAmount('')
      setSendToAddress('')
      setActiveTab('overview')
      
      // Refresh wallet data after delay
      setTimeout(() => fetchWalletData(true), 5000)

    } catch (error: any) {
      console.error('Transaction error:', error)
      toast.error('Transaction failed', {
        description: error.message || 'Please try again'
      })
    } finally {
      setIsSending(false)
    }
  }

  const viewOnExplorer = (txHash?: string) => {
    if (!txHash) return
    window.open(`https://blockscout.lisk.com/tx/${txHash}`, '_blank')
  }

  const getWalletAddress = () => {
    return getWalletAddressFromUser(user)
  }

  const handleOnrampRedirect = (url: string) => {
    const walletAddress = getWalletAddressFromUser(user)
    if (walletAddress) {
      // Some on-ramp services accept wallet address as parameter
      window.open(url, '_blank')
    } else {
      toast.error('Wallet address not available')
    }
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to view wallet</div>

  const walletAddress = getWalletAddress()

  return (
    <div className="min-h-screen bg-gradient-background relative overflow-hidden">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Wallet</h1>
          <p className="text-text-light">Manage your funds and transactions</p>
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

        {activeTab === 'overview' && (
          <>
            {/* Balance Card with Wallet Address */}
            <div className="card rounded-3xl p-6 mb-8 bg-gradient-to-r from-primary to-primary-dark text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm opacity-90">Total Balance</p>
                    <button 
                      onClick={refreshData}
                      disabled={isRefreshing || balance.isLoading}
                      className="p-1 hover:bg-white/20 rounded-md transition-colors disabled:opacity-50"
                      title="Refresh balance"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    {balanceUpdateTime && (
                      <span className="text-xs opacity-70">Updated at {balanceUpdateTime}</span>
                    )}
                  </div>
                  
                  {balance.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-32 bg-white/20 rounded animate-pulse"></div>
                    </div>
                  ) : balance.error ? (
                    <div className="flex items-center gap-2 text-yellow-300">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm">{balance.error}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold mt-1">${balance.usd}</p>
                        <p className="text-sm opacity-80">
                          ({balance.eth} ETH + {balance.usdc} USDC)
                        </p>
                      </div>
                      <div className="flex gap-4 text-xs opacity-70 mt-2">
                        <span>1 ETH = $2,700.00</span>
                        <span>1 USDC = $1.00</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Wallet Address in Balance Card */}
                {walletAddress && (
                  <div className="flex items-center gap-3 p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Wallet className="h-6 w-6" />
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
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('send')}
                  className="flex-1 py-3 bg-white text-primary font-semibold rounded-xl text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
                <button
                  onClick={() => setActiveTab('receive')}
                  className="flex-1 py-3 bg-white/20 text-white rounded-xl text-center hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Receive
                </button>
              </div>
            </div>

            {/* Balances Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-text-light text-sm">ETH</p>
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Coins className="w-4 h-4 text-purple-500" />
                  </div>
                </div>
                {balance.isLoading ? (
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <>
                    <p className="text-xl font-bold">{balance.eth} ETH</p>
                    <p className="text-sm text-text-light">
                      ≈ ${(parseFloat(balance.eth) * 2700).toFixed(2)}
                    </p>
                  </>
                )}
              </div>

              <div className="card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-text-light text-sm">USDC</p>
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
                {balance.isLoading ? (
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <>
                    <p className="text-xl font-bold">{balance.usdc} USDC</p>
                    <p className="text-sm text-text-light">
                      ≈ ${(parseFloat(balance.usdc) * 1).toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Recent Transactions</h2>
                <button 
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <>
                  <div className="space-y-3 mb-6">
                    {transactions.map((tx) => (
                      <TransactionItem key={tx.hash} transaction={tx} onView={viewOnExplorer} />
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrevPage}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-light">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <span className="text-xs text-text-light">
                          ({pagination.totalItems} total transactions)
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNextPage}
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
                    <p className="text-text-light">No transactions yet</p>
                    <p className="text-sm text-text-light max-w-md">
                      Your transaction history will appear here once you send or receive funds on the Lisk network.
                    </p>
                    <button 
                      onClick={() => setActiveTab('receive')}
                      className="btn-primary mt-4 px-4 py-2 text-sm"
                    >
                      Add Funds to Get Started
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'send' && (
          <div className="flex justify-center">
            <div className="card p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-center">Send Funds</h2>
              
              <div className="space-y-6">
                {/* Currency Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Currency
                  </label>
                  <div className="flex gap-3">
                    {['ETH', 'USDC'].map((currency) => (
                      <button
                        key={currency}
                        type="button"
                        onClick={() => setSendCurrency(currency as 'ETH' | 'USDC')}
                        className={`px-4 py-3 rounded-xl font-medium transition-all flex-1 ${
                          sendCurrency === currency
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-text'
                        }`}
                      >
                        {currency}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step={sendCurrency === 'ETH' ? "0.0001" : "0.01"}
                      className="input-field pl-4 pr-20"
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <span className="font-medium">{sendCurrency}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-text-light mt-2">
                    <span>Available: {sendCurrency === 'ETH' ? balance.eth : balance.usdc} {sendCurrency}</span>
                    <button
                      type="button"
                      onClick={() => setSendAmount(sendCurrency === 'ETH' ? balance.eth : balance.usdc)}
                      className="text-primary hover:underline"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Recipient Address */}
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

                {/* Transaction Summary */}
                {sendAmount && sendToAddress && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <h3 className="font-medium mb-3">Transaction Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-light">Amount</span>
                        <span>{sendAmount} {sendCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-light">Network Fee</span>
                        <span>~0.001 ETH</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>{sendAmount} {sendCurrency}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="btn-outline flex-1 py-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendTransaction}
                    disabled={isSending || !sendAmount || !sendToAddress || parseFloat(sendAmount) <= 0}
                    className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      'Send Transaction'
                    )}
                  </button>
                </div>

                {/* Security Warning with Blue Color (matching "How to receive funds") */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-300">
                        Security Warning
                      </p>
                      <p className="text-blue-600 dark:text-blue-400 mt-1">
                        Always verify the recipient address. Transactions on blockchain are irreversible.
                        Make sure you're connected to Lisk Mainnet (Chain ID: {LISK_CONFIG.CHAIN_ID}).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'receive' && (
          <div className="flex justify-center">
            <div className="card p-8 w-full max-w-2xl">
              <h2 className="text-2xl font-bold mb-6 text-center">Receive Funds</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: QR Code, Address, and Instructions */}
                <div className="space-y-6">
                  {/* QR Code with Wallet Address */}
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
                    
                    <label className="block text-sm font-medium mb-2 text-center">
                      Your Wallet Address
                    </label>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-3">
                      {walletAddress ? (
                        <p className="text-sm font-mono break-all text-text text-center">
                          {walletAddress}
                        </p>
                      ) : (
                        <p className="text-text-light text-center">No wallet address available</p>
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

                  {/* Instructions with Network Information */}
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <InfoIcon className="h-4 w-4" />
                        How to receive funds
                      </h3>
                      <ol className="list-decimal pl-5 space-y-2 text-sm text-text-light">
                        <li>Share your wallet address with the sender</li>
                        <li>Only send ETH or supported ERC-20 tokens to this address</li>
                        <li>Funds will appear in your wallet after network confirmation</li>
                        <li>Double-check the address before sharing</li>
                      </ol>
                    </div>

                    {/* Network Information Moved Here */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <h3 className="font-medium mb-2">Network Information</h3>
                      <div className="text-sm text-text-light space-y-1">
                        <div className="flex justify-between">
                          <span>Network</span>
                          <span className="font-mono">Lisk Mainnet</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Chain ID</span>
                          <span className="font-mono">{LISK_CONFIG.CHAIN_ID}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Currency</span>
                          <span className="font-mono">ETH & ERC-20 Tokens</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Block Explorer</span>
                          <a 
                            href="https://blockscout.lisk.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            blockscout.lisk.com
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: On-ramp Services */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5" />
                    Fund Your Wallet
                  </h3>
                  <p className="text-text-light mb-6">
                    Use these services to buy USDC or ETH with your credit card or bank transfer
                  </p>
                  
                  {/* On-ramp Services Cards */}
                  <div className="space-y-4">
                    {/* RampNow Card */}
                    <div className="card rounded-2xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold mb-1">RampNow</h4>
                          <p className="text-sm text-text-light mb-3">
                            Buy USDC directly with credit card or bank transfer. Supports multiple payment methods.
                          </p>
                          <div className="flex flex-wrap gap-2 mb-4">
                                                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-700 rounded text-xs font-medium">
                              Instant
                            </span>
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-700 rounded text-xs font-medium">
                              Credit Card
                            </span>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-700 rounded text-xs font-medium">
                              Bank Transfer
                            </span>

                          </div>
                          <button
                            onClick={() => handleOnrampRedirect(ONRAMP_SERVICES.RAMP_NOW)}
                            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Buy on RampNow
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Onramp.money Card */}
                    <div className="card rounded-2xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                          <CreditCardIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold mb-1">Onramp.money</h4>
                          <p className="text-sm text-text-light mb-3">
                            Fund your wallet with fiat across multiple countries. Supports multiple currencies.
                          </p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-700 rounded text-xs font-medium">
                              Global
                            </span>
                                                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-700 rounded text-xs font-medium">
                              KYC Required
                            </span>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-700 rounded text-xs font-medium">
                              Multiple Currencies
                            </span>

                          </div>
                          <button
                            onClick={() => handleOnrampRedirect(ONRAMP_SERVICES.ONRAMP_MONEY)}
                            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Visit Onramp.money
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Tips */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary-dark/10 rounded-xl">
                    <h4 className="font-medium mb-2 text-primary">💡 Tips for Funding Your Wallet</h4>
                    <ul className="text-sm text-text-light space-y-1">
                       <li>• Ensure you're using the correct wallet address to avoid loss of funds</li>

                      <li>• Transactions may take a few minutes to appear in your wallet</li>

                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TransactionItem({ 
  transaction, 
  onView 
}: { 
  transaction: Transaction, 
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
      case 'purchase':
        return <CreditCard className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="card rounded-2xl p-4 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            transaction.type === 'received' 
              ? 'bg-green-500/10' 
              : 'bg-red-500/10'
          }`}>
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
              <span className="capitalize">{transaction.type}</span>
              {transaction.blockNumber && (
                <span className="text-xs">Block #{transaction.blockNumber}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-lg font-bold ${
            transaction.type === 'received'
              ? 'text-green-500'
              : 'text-red-500'
          }`}>
            {transaction.type === 'received' ? '+' : '-'}
            {transaction.amount} {transaction.currency}
          </div>
          <div className="text-sm text-text-light">{transaction.usdValue}</div>
          <button 
            onClick={() => onView(transaction.hash)}
            className="mt-2 text-primary text-sm flex items-center gap-1"
          >
            View on Explorer <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}