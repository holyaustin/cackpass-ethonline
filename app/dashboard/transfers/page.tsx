// app/dashboard/transfers/page.tsx
'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Send, Search, User, Ticket, ArrowRight, Copy } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface TicketForTransfer {
  id: string
  eventName: string
  ticketType: string
  price: number
  eventDate: string
}

export default function TransfersPage() {
  const { authenticated, ready } = usePrivy()
  const [selectedTicket, setSelectedTicket] = useState<string>('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)

  const tickets: TicketForTransfer[] = [
    {
      id: '1',
      eventName: 'TechFest Lagos 2024',
      ticketType: 'VIP Pass',
      price: 150,
      eventDate: '2024-06-15T10:00:00Z',
    },
    {
      id: '2',
      eventName: 'AfroBeats Festival',
      ticketType: 'General Admission',
      price: 50,
      eventDate: '2024-05-20T18:00:00Z',
    },
    {
      id: '3',
      eventName: 'Jazz Night',
      ticketType: 'VIP',
      price: 75,
      eventDate: '2024-03-10T20:00:00Z',
    },
  ]

  const filteredTickets = tickets.filter(ticket =>
    ticket.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticketType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleTransfer = async () => {
    if (!selectedTicket || !recipientAddress.trim()) {
      alert('Please select a ticket and enter recipient address')
      return
    }

    setIsTransferring(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Ticket transferred successfully!')
      setSelectedTicket('')
      setRecipientAddress('')
    } catch (error) {
      console.error('Transfer failed:', error)
      alert('Failed to transfer ticket')
    } finally {
      setIsTransferring(false)
    }
  }

  const copyWalletAddress = () => {
    // Copy user's wallet address to clipboard
    navigator.clipboard.writeText('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')
    alert('Wallet address copied to clipboard!')
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to transfer tickets</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Transfer Tickets</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Share tickets with friends and family
              </p>
            </div>
          </div>
        </div>

        {/* Transfer Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Step 1: Select Ticket */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">1. Select Ticket</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedTicket === ticket.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <Ticket className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{ticket.eventName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {ticket.ticketType} • ${ticket.price}
                        </p>
                      </div>
                    </div>
                    {selectedTicket === ticket.id && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Enter Recipient */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">2. Enter Recipient Details</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Recipient Wallet Address
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
            </div>

            {/* Your Wallet Info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Your Wallet Address</span>
                </div>
                <button
                  onClick={copyWalletAddress}
                  className="flex items-center gap-1 text-primary text-sm"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                0x742d35Cc6634C0532925a3b844Bc454e4438f44e
              </p>
            </div>

            {/* Transfer Button */}
            <button
              onClick={handleTransfer}
              disabled={!selectedTicket || !recipientAddress.trim() || isTransferring}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isTransferring ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Transfer Ticket
                </>
              )}
            </button>

            {/* Transfer Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <span className="font-semibold">Note:</span> Ticket transfers are irreversible. 
                Make sure you trust the recipient before transferring.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Transfers */}
        <div className="mt-12">
          <h3 className="text-lg font-bold mb-4">Recent Transfers</h3>
          <div className="glass-card rounded-2xl p-6">
            <div className="text-center py-8">
              <Send className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No recent transfers. Transfer a ticket to see history here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}