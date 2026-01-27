// app/dashboard/wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, Copy, QrCode, ExternalLink } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import Link from 'next/link'

interface WalletBalance {
  usdc: string
  eth: string
  usd: string
  ngn: string
}

interface Transaction {
  id: string
  type: 'received' | 'sent' | 'purchase'
  amount: string
  currency: string
  description: string
  timestamp: string
  usdValue: string
}

export default function WalletPage() {
  const { authenticated, ready } = usePrivy()
  const [balance, setBalance] = useState<WalletBalance>({
    usdc: '0.00',
    eth: '0.00',
    usd: '0.00',
    ngn: '0.00',
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (authenticated && ready) {
      fetchWalletData()
    }
  }, [authenticated, ready])

  const fetchWalletData = async () => {
    setIsLoading(true)
    try {
      // Mock data
      const mockBalance = {
        usdc: '100.00',
        eth: '0.00034',
        usd: '100.00',
        ngn: '146500.00',
      }

      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'received',
          amount: '0.5',
          currency: 'ETH',
          description: 'Ticket Sale',
          timestamp: '2 hours ago',
          usdValue: '$1,250'
        },
        {
          id: '2',
          type: 'sent',
          amount: '0.1',
          currency: 'ETH',
          description: 'Event Payment',
          timestamp: '1 day ago',
          usdValue: '$250'
        },
        {
          id: '3',
          type: 'purchase',
          amount: '50',
          currency: 'USDC',
          description: 'TechFest Ticket',
          timestamp: '3 days ago',
          usdValue: '$50'
        },
      ]

      setBalance(mockBalance)
      setTransactions(mockTransactions)
    } catch (error) {
      console.error('Failed to fetch wallet data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to view wallet</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Wallet</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your funds and transactions</p>
        </div>

        {/* Balance Card */}
        <div className="glass-card rounded-3xl p-6 mb-8 bg-gradient-to-r from-primary to-primary-dark text-white">
          <div className="text-white mb-6">
            <p className="text-sm opacity-90">Total Balance</p>
            <p className="text-3xl font-bold mt-1">${balance.usd}</p>
            <p className="text-sm opacity-90 mt-2">≈ ₦{balance.ngn}</p>
          </div>
          
          <div className="flex gap-3">
            <button className="flex-1 bg-white text-primary font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
              <CreditCard className="h-4 w-4" />
              Add Funds
            </button>
            <button className="flex-1 bg-white/20 text-white py-3 rounded-xl hover:bg-white/30 transition-colors">
              Withdraw
            </button>
          </div>
        </div>

        {/* Balances Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">USDC</p>
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              </div>
            </div>
            <p className="text-xl font-bold">{balance.usdc} USDC</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">≈ ${balance.usd}</p>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">ETH</p>
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              </div>
            </div>
            <p className="text-xl font-bold">{balance.eth} ETH</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">≈ $2,125</p>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="glass-card rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium">Wallet Address</p>
            <div className="flex gap-2">
              <button
                onClick={copyAddress}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Copy address"
              >
                {copied ? (
                  <span className="text-xs text-green-500">Copied!</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <QrCode className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
              0x742d35Cc6634C0532925a3b844Bc454e4438f44e
            </p>
          </div>
          <button className="w-full mt-3 text-primary text-sm font-medium flex items-center justify-center gap-1">
            View on Explorer <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Transactions</h2>
            <Link 
              href="/dashboard/transactions"
              className="text-primary text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 glass-card rounded-2xl">
              <p className="text-gray-500">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  return (
    <div className="glass-card rounded-2xl p-4 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            transaction.type === 'received' 
              ? 'bg-green-500/10' 
              : transaction.type === 'sent'
              ? 'bg-red-500/10'
              : 'bg-blue-500/10'
          }`}>
            {transaction.type === 'received' ? (
              <ArrowDownRight className="h-5 w-5 text-green-500" />
            ) : transaction.type === 'sent' ? (
              <ArrowUpRight className="h-5 w-5 text-red-500" />
            ) : (
              <CreditCard className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div>
            <div className="font-medium">{transaction.description}</div>
            <div className="text-sm text-gray-500">{transaction.timestamp}</div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`font-bold ${
            transaction.type === 'received' 
              ? 'text-green-500' 
              : transaction.type === 'sent'
              ? 'text-red-500'
              : 'text-blue-500'
          }`}>
            {transaction.type === 'received' ? '+' : '-'}{transaction.amount} {transaction.currency}
          </div>
          <div className="text-sm text-gray-500">{transaction.usdValue}</div>
        </div>
      </div>
    </div>
  )
}